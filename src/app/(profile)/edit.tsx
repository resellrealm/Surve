import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as ImagePicker from 'expo-image-picker';
import { Camera, AtSign, User, MapPin, Check, X } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { useHaptics } from '../../hooks/useHaptics';
import { usePermissionPrime } from '../../hooks/usePermissionPrime';
import { useStore } from '../../lib/store';
import { toast } from '../../lib/toast';
import {
  isUsernameAvailable,
  updateProfile,
  uploadAvatar,
} from '../../lib/api';
import { Avatar } from '../../components/ui/Avatar';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { PressableScale } from '../../components/ui/PressableScale';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { PermissionPrime } from '../../components/ui/PermissionPrime';
import {
  Typography,
  Spacing,
  BorderRadius,
  Shadows,
} from '../../constants/theme';

const USERNAME_RE = /^[a-z][a-z0-9_]{2,23}$/;

export default function EditProfileScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const haptics = useHaptics();
  const user = useStore((s) => s.user);
  const setUser = useStore((s) => s.setUser);

  const [fullName, setFullName] = useState(user?.full_name ?? '');
  const [username, setUsername] = useState(user?.username ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');
  const [location, setLocation] = useState(user?.location ?? '');
  const [avatarUri, setAvatarUri] = useState<string | null>(user?.avatar_url ?? null);
  const [avatarDirty, setAvatarDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  const [usernameCheck, setUsernameCheck] = useState<
    'idle' | 'checking' | 'available' | 'taken' | 'invalid'
  >('idle');

  const usernameDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (usernameDebounce.current) clearTimeout(usernameDebounce.current);
    const trimmed = username.toLowerCase().trim();
    if (trimmed === (user?.username ?? '')) {
      setUsernameCheck('idle');
      return;
    }
    if (!USERNAME_RE.test(trimmed)) {
      setUsernameCheck('invalid');
      return;
    }
    setUsernameCheck('checking');
    usernameDebounce.current = setTimeout(async () => {
      const available = await isUsernameAvailable(trimmed, user?.id);
      setUsernameCheck(available ? 'available' : 'taken');
    }, 400);
    return () => {
      if (usernameDebounce.current) clearTimeout(usernameDebounce.current);
    };
  }, [username, user?.id, user?.username]);

  const photoPrime = usePermissionPrime('photo-library');

  const launchAvatarPicker = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;
    setAvatarUri(result.assets[0].uri);
    setAvatarDirty(true);
  }, []);

  const pickAvatar = useCallback(async () => {
    haptics.tap();
    await photoPrime.prime(launchAvatarPicker);
  }, [haptics, photoPrime, launchAvatarPicker]);

  const canSave =
    !saving &&
    fullName.trim().length >= 2 &&
    (usernameCheck === 'available' || usernameCheck === 'idle') &&
    (avatarDirty ||
      fullName.trim() !== (user?.full_name ?? '') ||
      username.toLowerCase().trim() !== (user?.username ?? '') ||
      bio !== (user?.bio ?? '') ||
      location !== (user?.location ?? ''));

  const save = useCallback(async () => {
    if (!user || !canSave) return;
    setSaving(true);
    haptics.confirm();

    let finalAvatarUrl = user.avatar_url;
    if (avatarDirty && avatarUri && !avatarUri.startsWith('http')) {
      const uploaded = await uploadAvatar(user.id, avatarUri);
      if (!uploaded) {
        setSaving(false);
        haptics.error();
        toast.error('Upload failed: Could not upload your new photo.');
        return;
      }
      finalAvatarUrl = uploaded;
    }

    const patch: Parameters<typeof updateProfile>[1] = {
      full_name: fullName.trim(),
      bio: bio.trim() || null,
      location: location.trim() || null,
    };
    if (username.trim() !== (user.username ?? '')) {
      patch.username = username.toLowerCase().trim();
    }
    if (finalAvatarUrl !== user.avatar_url) {
      patch.avatar_url = finalAvatarUrl;
    }

    const result = await updateProfile(user.id, patch);
    setSaving(false);

    if (!result.ok) {
      haptics.error();
      toast.error(`Could not save: ${result.message}`);
      return;
    }

    haptics.success();
    setUser({
      ...user,
      full_name: patch.full_name ?? user.full_name,
      username: patch.username ?? user.username,
      bio: patch.bio ?? user.bio,
      location: patch.location ?? user.location,
      avatar_url: finalAvatarUrl,
    });
    router.back();
  }, [user, canSave, avatarDirty, avatarUri, fullName, bio, location, username, haptics, setUser, router]);

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <PermissionPrime
        kind="photo-library"
        visible={photoPrime.visible}
        onConfirm={photoPrime.confirm}
        onDismiss={photoPrime.dismiss}
      />
      <ScreenHeader title="Edit profile" />

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          padding: Spacing.lg,
          paddingBottom: insets.bottom + Spacing.huge,
          gap: Spacing.xl,
        }}
      >
        <Animated.View
          entering={FadeInDown.duration(400)}
          style={styles.avatarBlock}
        >
          <PressableScale onPress={pickAvatar} style={styles.avatarWrap} scaleValue={0.95} accessibilityRole="button" accessibilityLabel="Change profile photo" accessibilityHint="Double tap to choose a new photo">
            <Avatar
              uri={avatarUri}
              name={fullName || user?.full_name || 'U'}
              size={128}
            />
            <View
              style={[
                styles.cameraBadge,
                { backgroundColor: colors.primary, borderColor: colors.background },
              ]}
            >
              <Camera size={18} color={colors.onPrimary} strokeWidth={2} />
            </View>
          </PressableScale>
          <PressableScale onPress={pickAvatar} hitSlop={8} scaleValue={0.95} accessibilityRole="button" accessibilityLabel="Change photo">
            <Text style={[styles.avatarLabel, { color: colors.primary }]}>
              Change photo
            </Text>
          </PressableScale>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.duration(400).delay(80)}
          style={{ gap: Spacing.md }}
        >
          <Input
            label="Display name"
            value={fullName}
            onChangeText={setFullName}
            placeholder="Your name"
            autoCapitalize="words"
            maxLength={60}
            icon={<User size={18} color={colors.textTertiary} strokeWidth={2} />}
          />

          <View>
            <Input
              label="Username"
              value={username}
              onChangeText={(t) =>
                setUsername(
                  t.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 24)
                )
              }
              placeholder="yourhandle"
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={24}
              icon={
                <AtSign size={18} color={colors.textTertiary} strokeWidth={2} />
              }
            />
            <UsernameHint status={usernameCheck} colors={colors} />
          </View>

          <Input
            label="Location"
            value={location}
            onChangeText={setLocation}
            placeholder="City, country"
            autoCapitalize="words"
            maxLength={80}
            icon={<MapPin size={18} color={colors.textTertiary} strokeWidth={2} />}
          />

          <View>
            <Text style={[styles.fieldLabel, { color: colors.text }]}>Bio</Text>
            <View
              style={[
                styles.bioBox,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text
                onLayout={() => {}}
                suppressHighlighting
                style={{ height: 0, width: 0 }}
              />
              <BioEditor bio={bio} setBio={setBio} colors={colors} />
            </View>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(400).delay(160)}>
          <Button
            title={saving ? 'Saving…' : 'Save changes'}
            onPress={save}
            size="lg"
            fullWidth
            loading={saving}
            disabled={!canSave}
            accessibilityLabel="Save profile changes"
          />
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function UsernameHint({
  status,
  colors,
}: {
  status: 'idle' | 'checking' | 'available' | 'taken' | 'invalid';
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  if (status === 'idle') {
    return (
      <Text style={[styles.hint, { color: colors.textTertiary }]}>
        Lowercase letters, numbers, underscores — 3–24 chars, start with a letter.
      </Text>
    );
  }
  if (status === 'checking') {
    return (
      <View style={styles.hintRow}>
        <ActivityIndicator size="small" color={colors.textTertiary} />
        <Text style={[styles.hint, { color: colors.textTertiary }]}>
          Checking availability…
        </Text>
      </View>
    );
  }
  if (status === 'available') {
    return (
      <View style={styles.hintRow}>
        <Check size={14} color={colors.success} strokeWidth={2.5} />
        <Text style={[styles.hint, { color: colors.success }]}>
          Available
        </Text>
      </View>
    );
  }
  if (status === 'taken') {
    return (
      <View style={styles.hintRow}>
        <X size={14} color={colors.error} strokeWidth={2.5} />
        <Text style={[styles.hint, { color: colors.error }]}>
          Taken — try another
        </Text>
      </View>
    );
  }
  return (
    <View style={styles.hintRow}>
      <X size={14} color={colors.error} strokeWidth={2.5} />
      <Text style={[styles.hint, { color: colors.error }]}>
        Invalid format
      </Text>
    </View>
  );
}

function BioEditor({
  bio,
  setBio,
  colors,
}: {
  bio: string;
  setBio: (v: string) => void;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  const { TextInput } = require('react-native');
  return (
    <>
      <TextInput
        value={bio}
        onChangeText={(t: string) => t.length <= 200 && setBio(t)}
        placeholder="Tell people who you are in a sentence…"
        placeholderTextColor={colors.textTertiary}
        multiline
        numberOfLines={4}
        textAlignVertical="top"
        accessibilityLabel="Bio"
        accessibilityHint="Enter a short description about yourself, up to 200 characters"
        style={[
          styles.bioInput,
          { color: colors.text },
        ]}
      />
      <Text
        style={[
          styles.bioCount,
          {
            color:
              bio.length >= 200
                ? colors.error
                : bio.length >= 180
                  ? colors.warning
                  : colors.textTertiary,
          },
        ]}
      >
        {bio.length}/200
      </Text>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  avatarBlock: { alignItems: 'center', gap: Spacing.sm },
  avatarWrap: {
    width: 128,
    height: 128,
    position: 'relative',
    ...Shadows.lg,
  },
  cameraBadge: {
    position: 'absolute',
    right: 0,
    bottom: 4,
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLabel: { ...Typography.subheadline, fontWeight: '600', marginTop: Spacing.xs },
  fieldLabel: {
    ...Typography.footnote,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  bioBox: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.md,
  },
  bioInput: {
    ...Typography.body,
    minHeight: 80,
  },
  bioCount: {
    ...Typography.caption1,
    textAlign: 'right',
    marginTop: Spacing.xs,
  },
  hint: { ...Typography.caption1, marginTop: Spacing.xs },
  hintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: Spacing.xs,
  },
});
