import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme, View, Text, Pressable, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AlertTriangle, X } from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import { useStore } from '../lib/store';
import { Colors, Typography, Spacing, BorderRadius } from '../constants/theme';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { useState } from 'react';

export default function RootLayout() {
  const colorScheme = (useColorScheme() ?? 'light') as 'light' | 'dark';
  const colors = Colors[colorScheme];
  const {
    setUser,
    setSession,
    setAuthLoading,
    setInitialized,
    fetchListings,
    fetchBookings,
    fetchConversations,
    user,
    initialized,
  } = useStore();

  useEffect(() => {
    // Restore session on mount
    const restoreSession = async () => {
      setAuthLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          // Fetch user profile from our users table
          const { data: userData } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (userData) {
            const appUser = {
              id: userData.id,
              email: userData.email ?? session.user.email ?? '',
              full_name: userData.full_name,
              avatar_url: userData.avatar_url,
              role: userData.role as 'creator' | 'business',
              onboarding_completed_at: userData.onboarding_completed_at ?? null,
              email_verified_at: userData.email_verified_at ?? null,
              accepted_terms_at: userData.accepted_terms_at ?? null,
              terms_version: userData.terms_version ?? null,
              created_at: userData.created_at,
              updated_at: userData.updated_at,
            };
            setUser(appUser);
            setSession({
              access_token: session.access_token,
              refresh_token: session.refresh_token,
              expires_at: session.expires_at ?? 0,
              user: appUser,
            });
          }
        }
      } catch (e) {
        console.error('Session restore error:', e);
      } finally {
        setAuthLoading(false);
        setInitialized(true);
      }
    };

    restoreSession();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT' || !session) {
          setUser(null);
          setSession(null);
          return;
        }

        if (session) {
          const { data: userData } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (userData) {
            const appUser = {
              id: userData.id,
              email: userData.email ?? session.user.email ?? '',
              full_name: userData.full_name,
              avatar_url: userData.avatar_url,
              role: userData.role as 'creator' | 'business',
              onboarding_completed_at: userData.onboarding_completed_at ?? null,
              email_verified_at: userData.email_verified_at ?? null,
              accepted_terms_at: userData.accepted_terms_at ?? null,
              terms_version: userData.terms_version ?? null,
              created_at: userData.created_at,
              updated_at: userData.updated_at,
            };
            setUser(appUser);
            setSession({
              access_token: session.access_token,
              refresh_token: session.refresh_token,
              expires_at: session.expires_at ?? 0,
              user: appUser,
            });
          }
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [setUser, setSession, setAuthLoading, setInitialized]);

  const router = useRouter();
  const segments = useSegments();
  const [bannerDismissed, setBannerDismissed] = useState(false);

  // Onboarding redirect gate
  useEffect(() => {
    if (!initialized || !user) return;

    const inAuthGroup = segments[0] === 'auth';
    const inOnboarding = segments[0] === 'onboarding';

    if (!user.onboarding_completed_at && !inAuthGroup && !inOnboarding) {
      router.replace(`/onboarding/${user.role}` as any);
    }
  }, [initialized, user, segments, router]);

  // Fetch data when user is available
  useEffect(() => {
    if (user && initialized) {
      fetchListings();
      fetchBookings();
      fetchConversations();
    }
  }, [user?.id, initialized, fetchListings, fetchBookings, fetchConversations]);

  if (!initialized) return null;

  const showEmailBanner =
    user &&
    !user.email_verified_at &&
    !bannerDismissed &&
    new Date(user.created_at).getTime() < Date.now() - 24 * 60 * 60 * 1000;

  return (
    <ErrorBoundary>
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      {showEmailBanner && (
        <EmailVerificationBanner
          colors={colors}
          onDismiss={() => setBannerDismissed(true)}
          onVerify={() => router.push('/auth/verify-email' as any)}
        />
      )}
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="auth"
          options={{ headerShown: false, presentation: 'fullScreenModal' }}
        />
        <Stack.Screen
          name="(listing)"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="(creator)"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="(chat)"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="(booking)"
          options={{ headerShown: false }}
        />
      </Stack>
    </GestureHandlerRootView>
    </ErrorBoundary>
  );
}

function EmailVerificationBanner({
  colors,
  onDismiss,
  onVerify,
}: {
  colors: typeof Colors.light;
  onDismiss: () => void;
  onVerify: () => void;
}) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        bannerStyles.container,
        {
          backgroundColor: colors.warningLight,
          borderBottomColor: colors.warning,
          paddingTop: insets.top + Spacing.sm,
        },
      ]}
    >
      <View style={bannerStyles.content}>
        <AlertTriangle size={18} color={colors.warning} strokeWidth={2} />
        <Pressable onPress={onVerify} style={bannerStyles.textContainer}>
          <Text style={[bannerStyles.text, { color: colors.text }]}>
            Verify your email
          </Text>
          <Text style={[bannerStyles.subtext, { color: colors.textSecondary }]}>
            Tap to verify your email address
          </Text>
        </Pressable>
        <Pressable onPress={onDismiss} hitSlop={8}>
          <X size={18} color={colors.textTertiary} strokeWidth={2} />
        </Pressable>
      </View>
    </View>
  );
}

const bannerStyles = StyleSheet.create({
  container: {
    borderBottomWidth: 1,
    paddingBottom: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  textContainer: {
    flex: 1,
  },
  text: {
    ...Typography.subheadline,
    fontWeight: '600',
  },
  subtext: {
    ...Typography.caption1,
  },
});
