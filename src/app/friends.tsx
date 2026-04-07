import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  useColorScheme,
  TextInput,
  FlatList,
  Alert,
  ActivityIndicator,
  Share,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft,
  Search,
  UserPlus,
  Users,
  Swords,
  Check,
  X,
  Share2,
  ChevronRight,
} from 'lucide-react-native';
import { Colors, Typography, Spacing, BorderRadius } from '../constants/theme';
import { SPORTS } from '../constants/sports';
import { useStore } from '../lib/store';
import { useToast } from '../components/ui/Toast';
import {
  searchProfiles,
  getFriends,
  getPendingRequests,
  sendFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  sendGameInvite,
  getProfile,
  subscribeToFriendRequests,
  type Profile,
  type Friendship,
} from '../lib/friends';

interface FriendWithProfile {
  friendship: Friendship;
  friendId: string;
  profile: Profile | null;
}

interface RequestWithProfile {
  friendship: Friendship;
  requesterId: string;
  profile: Profile | null;
}

export default function FriendsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[(colorScheme ?? 'light') as 'light' | 'dark'];
  const { session } = useStore();
  const toast = useToast();
  const userId = session?.user?.id;

  const [tab, setTab] = useState<'friends' | 'requests' | 'search'>('friends');
  const [friends, setFriends] = useState<FriendWithProfile[]>([]);
  const [requests, setRequests] = useState<RequestWithProfile[]>([]);
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [challengeFriend, setChallengeFriend] = useState<string | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (!userId) return;
    loadData();
    const unsub = subscribeToFriendRequests(userId, () => {
      toast.info('New Friend Request', 'Someone wants to be your friend!');
      loadData();
    });
    return unsub;
  }, [userId]);

  const loadData = useCallback(async () => {
    if (!userId) return;
    try {
      const [friendsList, requestsList] = await Promise.all([
        getFriends(userId),
        getPendingRequests(userId),
      ]);

      const friendIds = friendsList.map(f =>
        f.requester_id === userId ? f.addressee_id : f.requester_id
      );
      const friendProfiles = await Promise.all(
        friendIds.map(id => getProfile(id).catch(() => null))
      );
      const friendsWithProfiles: FriendWithProfile[] = friendsList.map((f, i) => ({
        friendship: f,
        friendId: friendIds[i],
        profile: friendProfiles[i],
      }));

      const requesterIds = requestsList.map(r => r.requester_id);
      const requesterProfiles = await Promise.all(
        requesterIds.map(id => getProfile(id).catch(() => null))
      );
      const requestsWithProfiles: RequestWithProfile[] = requestsList.map((r, i) => ({
        friendship: r,
        requesterId: requesterIds[i],
        profile: requesterProfiles[i],
      }));

      setFriends(friendsWithProfiles);
      setRequests(requestsWithProfiles);
    } catch (err) {
      console.error('Failed to load friends:', err);
      toast.error('Load Failed', 'Could not load friends data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  const onRefresh = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!userId || query.length < 2) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    searchTimer.current = setTimeout(async () => {
      try {
        const results = await searchProfiles(query, userId);
        setSearchResults(results);
      } catch (err) {
        console.error('Search failed:', err);
      } finally {
        setSearching(false);
      }
    }, 300);
  }, [userId]);

  const handleAddFriend = useCallback(async (profileId: string) => {
    if (!userId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await sendFriendRequest(userId, profileId);
      toast.success('Request Sent', 'Friend request sent successfully.');
    } catch (err: any) {
      const msg = err?.message?.includes('duplicate')
        ? 'You already sent a request to this user.'
        : 'Could not send friend request.';
      Alert.alert('Error', msg);
    }
  }, [userId]);

  const handleAccept = useCallback(async (friendshipId: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      await acceptFriendRequest(friendshipId);
      toast.success('Accepted', 'You are now friends!');
      loadData();
    } catch (err) {
      Alert.alert('Error', 'Could not accept request.');
    }
  }, [loadData]);

  const handleDecline = useCallback(async (friendshipId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await declineFriendRequest(friendshipId);
      toast.info('Declined', 'Friend request declined.');
      loadData();
    } catch (err) {
      Alert.alert('Error', 'Could not decline request.');
    }
  }, [loadData]);

  const handleChallenge = useCallback(async (friendUserId: string, sport: string) => {
    if (!userId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    try {
      await sendGameInvite(userId, friendUserId, sport);
      const sportName = SPORTS.find(s => s.id === sport)?.name ?? sport;
      toast.success('Challenge Sent!', `${sportName} game invite sent.`);
      setChallengeFriend(null);
    } catch (err) {
      Alert.alert('Error', 'Could not send challenge.');
    }
  }, [userId]);

  const handleShareInvite = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await Share.share({
        message: `Join me on Point!! Track scores together and challenge friends. Download: https://pointapp.io/invite/${userId}`,
      });
    } catch {
      // User cancelled
    }
  }, [userId]);

  const getInitial = (profile: Profile | null, fallbackId: string): string => {
    if (profile?.display_name) return profile.display_name[0].toUpperCase();
    if (profile?.username) return profile.username[0].toUpperCase();
    return fallbackId[0]?.toUpperCase() ?? '?';
  };

  const getDisplayName = (profile: Profile | null): string => {
    return profile?.display_name ?? profile?.username ?? 'Unknown';
  };

  const tabs = [
    { key: 'friends' as const, label: 'Friends', icon: Users, count: friends.length },
    { key: 'requests' as const, label: 'Requests', icon: UserPlus, count: requests.length },
    { key: 'search' as const, label: 'Search', icon: Search, count: 0 },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }} style={styles.backBtn} hitSlop={12}>
          <ArrowLeft size={24} color={colors.text} strokeWidth={2} />
        </Pressable>
        <Text style={[Typography.title3, { color: colors.text }]}>Friends</Text>
        <Pressable onPress={handleShareInvite} style={styles.backBtn} hitSlop={12}>
          <Share2 size={20} color={colors.textSecondary} strokeWidth={2} />
        </Pressable>
      </View>

      <View style={[styles.tabRow, { borderColor: colors.borderLight }]}>
        {tabs.map(t => (
          <Pressable
            key={t.key}
            style={[styles.tab, tab === t.key && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
            onPress={() => { setTab(t.key); Haptics.selectionAsync(); }}
          >
            <t.icon size={16} color={tab === t.key ? colors.text : colors.textTertiary} strokeWidth={2} />
            <Text style={[Typography.footnote, { color: tab === t.key ? colors.text : colors.textTertiary, fontWeight: tab === t.key ? '600' : '400', marginLeft: Spacing.xs }]}>
              {t.label}
            </Text>
            {t.count > 0 && (
              <View style={[styles.badge, { backgroundColor: colors.primary }]}>
                <Text style={[Typography.caption2, { color: '#fff', fontWeight: '700' }]}>{t.count}</Text>
              </View>
            )}
          </Pressable>
        ))}
      </View>

      {loading ? (
        <View style={styles.listContent}>
          {[0, 1, 2, 3].map((i) => (
            <Animated.View
              key={i}
              entering={FadeInDown.delay(i * 80).duration(400)}
              style={[styles.friendRow, { borderColor: colors.borderLight }]}
            >
              <View style={[styles.avatar, { backgroundColor: colors.surfaceSecondary, opacity: 0.6 }]} />
              <View style={[styles.friendInfo, { gap: 6 }]}>
                <View style={{ width: '60%', height: 14, borderRadius: 6, backgroundColor: colors.surfaceSecondary }} />
                <View style={{ width: '40%', height: 10, borderRadius: 4, backgroundColor: colors.surfaceSecondary }} />
              </View>
            </Animated.View>
          ))}
        </View>
      ) : (
        <>
          {tab === 'search' && (
            <Animated.View entering={FadeIn.duration(200)} style={styles.searchSection}>
              <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
                <Search size={18} color={colors.textTertiary} strokeWidth={2} />
                <TextInput
                  style={[Typography.body, { flex: 1, color: colors.text, marginLeft: Spacing.sm }]}
                  placeholder="Search by username..."
                  placeholderTextColor={colors.textTertiary}
                  value={searchQuery}
                  onChangeText={handleSearch}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {searching && <ActivityIndicator size="small" color={colors.primary} />}
              </View>
              <FlatList
                data={searchResults}
                keyExtractor={item => item.id}
                renderItem={({ item }) => (
                  <View style={[styles.friendRow, { borderColor: colors.borderLight }]}>
                    <View style={[styles.avatar, { backgroundColor: colors.surfaceSecondary }]}>
                      <Text style={[Typography.headline, { color: colors.text }]}>
                        {(item.display_name ?? item.username)?.[0]?.toUpperCase() ?? '?'}
                      </Text>
                    </View>
                    <View style={styles.friendInfo}>
                      <Text style={[Typography.headline, { color: colors.text }]}>{item.display_name ?? item.username}</Text>
                      <Text style={[Typography.caption1, { color: colors.textSecondary }]}>@{item.username}</Text>
                    </View>
                    <Pressable style={[styles.actionBtn, { backgroundColor: colors.primary + '15' }]} onPress={() => handleAddFriend(item.id)}>
                      <UserPlus size={16} color={colors.primary} strokeWidth={2} />
                    </Pressable>
                  </View>
                )}
                ListEmptyComponent={
                  searching ? (
                    <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: Spacing.xxl }} />
                  ) : searchQuery.length >= 2 ? (
                    <Text style={[Typography.footnote, { color: colors.textTertiary, textAlign: 'center', marginTop: Spacing.xxl }]}>
                      No users found
                    </Text>
                  ) : (
                    <Text style={[Typography.footnote, { color: colors.textTertiary, textAlign: 'center', marginTop: Spacing.xxl }]}>
                      Type at least 2 characters to search
                    </Text>
                  )
                }
              />
            </Animated.View>
          )}

          {tab === 'friends' && (
            <FlatList
              data={friends}
              keyExtractor={item => item.friendship.id}
              contentContainerStyle={styles.listContent}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />
              }
              renderItem={({ item, index }) => {
                const { friendId, profile } = item;
                const showChallengeFlow = challengeFriend === friendId;
                return (
                  <Animated.View entering={FadeInDown.delay(index * 40)}>
                    <Pressable
                      style={[styles.friendRow, { borderColor: colors.borderLight }]}
                      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push(`/history?friendId=${friendId}`); }}
                    >
                      <View style={[styles.avatar, { backgroundColor: colors.surfaceSecondary }]}>
                        <Text style={[Typography.headline, { color: colors.text }]}>{getInitial(profile, friendId)}</Text>
                      </View>
                      <View style={styles.friendInfo}>
                        <Text style={[Typography.headline, { color: colors.text }]}>{getDisplayName(profile)}</Text>
                        <Text style={[Typography.caption1, { color: colors.textSecondary }]}>
                          {profile?.username ? `@${profile.username}` : 'Tap for head-to-head'}
                        </Text>
                      </View>
                      <View style={styles.friendActions}>
                        <Pressable
                          style={[styles.actionBtn, { backgroundColor: '#059669' + '15' }]}
                          onPress={() => { Haptics.selectionAsync(); setChallengeFriend(showChallengeFlow ? null : friendId); }}
                        >
                          <Swords size={16} color="#059669" strokeWidth={2} />
                        </Pressable>
                        <ChevronRight size={16} color={colors.textTertiary} strokeWidth={2} />
                      </View>
                    </Pressable>
                    {showChallengeFlow && (
                      <Animated.View entering={FadeInDown.duration(200)} style={[styles.challengeRow, { backgroundColor: colors.surface }]}>
                        <Text style={[Typography.caption1, { color: colors.textSecondary, marginBottom: Spacing.sm }]}>Pick a sport:</Text>
                        <View style={styles.sportChips}>
                          {SPORTS.slice(0, 6).map(sport => (
                            <Pressable
                              key={sport.id}
                              style={[styles.sportChip, { backgroundColor: sport.accentColor + '20' }]}
                              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); handleChallenge(friendId, sport.id); }}
                            >
                              <Text style={[Typography.caption1, { color: sport.accentColor, fontWeight: '600' }]}>{sport.name}</Text>
                            </Pressable>
                          ))}
                        </View>
                      </Animated.View>
                    )}
                  </Animated.View>
                );
              }}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Users size={48} color={colors.textTertiary} strokeWidth={1.5} />
                  <Text style={[Typography.headline, { color: colors.textSecondary, marginTop: Spacing.lg }]}>No friends yet</Text>
                  <Text style={[Typography.footnote, { color: colors.textTertiary, textAlign: 'center', marginTop: Spacing.xs }]}>
                    Search for friends or share your invite link
                  </Text>
                  <Pressable style={[styles.addBtn, { backgroundColor: colors.primary + '15' }]} onPress={() => { Haptics.selectionAsync(); setTab('search'); }}>
                    <Text style={[Typography.footnote, { color: colors.primary, fontWeight: '600' }]}>Find Friends</Text>
                  </Pressable>
                </View>
              }
            />
          )}

          {tab === 'requests' && (
            <FlatList
              data={requests}
              keyExtractor={item => item.friendship.id}
              contentContainerStyle={styles.listContent}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />
              }
              renderItem={({ item, index }) => {
                const { friendship, profile, requesterId } = item;
                return (
                  <Animated.View entering={FadeInDown.delay(index * 40)}>
                    <View style={[styles.friendRow, { borderColor: colors.borderLight }]}>
                      <View style={[styles.avatar, { backgroundColor: colors.surfaceSecondary }]}>
                        <Text style={[Typography.headline, { color: colors.text }]}>{getInitial(profile, requesterId)}</Text>
                      </View>
                      <View style={styles.friendInfo}>
                        <Text style={[Typography.headline, { color: colors.text }]}>{getDisplayName(profile)}</Text>
                        <Text style={[Typography.caption1, { color: colors.textSecondary }]}>
                          {profile?.username ? `@${profile.username}` : 'Wants to be your friend'}
                        </Text>
                      </View>
                      <View style={styles.friendActions}>
                        <Pressable style={[styles.actionBtn, { backgroundColor: '#059669' + '15' }]} onPress={() => handleAccept(friendship.id)}>
                          <Check size={16} color="#059669" strokeWidth={2.5} />
                        </Pressable>
                        <Pressable style={[styles.actionBtn, { backgroundColor: '#DC2626' + '15' }]} onPress={() => handleDecline(friendship.id)}>
                          <X size={16} color="#DC2626" strokeWidth={2.5} />
                        </Pressable>
                      </View>
                    </View>
                  </Animated.View>
                );
              }}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <UserPlus size={48} color={colors.textTertiary} strokeWidth={1.5} />
                  <Text style={[Typography.headline, { color: colors.textSecondary, marginTop: Spacing.lg }]}>No pending requests</Text>
                  <Text style={[Typography.footnote, { color: colors.textTertiary, textAlign: 'center', marginTop: Spacing.xs }]}>
                    When someone sends you a request, it will appear here
                  </Text>
                </View>
              }
            />
          )}
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  tabRow: { flexDirection: 'row', borderBottomWidth: 1, paddingHorizontal: Spacing.lg },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.md, gap: Spacing.xs },
  badge: { minWidth: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, marginLeft: Spacing.xs },
  searchSection: { flex: 1, paddingHorizontal: Spacing.lg },
  searchBar: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, marginTop: Spacing.md, marginBottom: Spacing.md },
  listContent: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.massive },
  friendRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.md, borderBottomWidth: 1 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  friendInfo: { flex: 1, marginLeft: Spacing.md },
  friendActions: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'center' },
  actionBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  challengeRow: { padding: Spacing.md, borderRadius: BorderRadius.md, marginBottom: Spacing.sm },
  sportChips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  sportChip: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.full },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingTop: Spacing.massive },
  addBtn: { paddingHorizontal: Spacing.xl, paddingVertical: Spacing.sm, borderRadius: BorderRadius.full, marginTop: Spacing.lg },
});
