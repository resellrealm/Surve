import React, { useState, useEffect, useCallback } from 'react';
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
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../constants/theme';
import { SPORTS } from '../constants/sports';
import { useStore } from '../lib/store';
import {
  searchProfiles,
  getFriends,
  getPendingRequests,
  sendFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  sendGameInvite,
  subscribeToFriendRequests,
  type Profile,
  type Friendship,
} from '../lib/friends';

export default function FriendsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[(colorScheme ?? 'light') as 'light' | 'dark'];
  const { session } = useStore();
  const userId = session?.user?.id;

  const [tab, setTab] = useState<'friends' | 'requests' | 'search'>('friends');
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [requests, setRequests] = useState<Friendship[]>([]);
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [challengeSport, setChallengeSport] = useState<string | null>(null);
  const [challengeFriend, setChallengeFriend] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    loadData();
    const unsub = subscribeToFriendRequests(userId, () => loadData());
    return unsub;
  }, [userId]);

  const loadData = useCallback(async () => {
    if (!userId) return;
    try {
      const [friendsList, requestsList] = await Promise.all([
        getFriends(userId),
        getPendingRequests(userId),
      ]);
      setFriends(friendsList);
      setRequests(requestsList);
    } catch (err) {
      console.error('Failed to load friends:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    if (!userId || query.length < 2) { setSearchResults([]); return; }
    try {
      const results = await searchProfiles(query, userId);
      setSearchResults(results);
    } catch (err) {
      console.error('Search failed:', err);
    }
  }, [userId]);

  const handleAddFriend = useCallback(async (profileId: string) => {
    if (!userId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await sendFriendRequest(userId, profileId);
      Alert.alert('Sent!', 'Friend request sent.');
    } catch (err) {
      Alert.alert('Error', 'Could not send friend request.');
    }
  }, [userId]);

  const handleAccept = useCallback(async (friendshipId: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      await acceptFriendRequest(friendshipId);
      loadData();
    } catch (err) {
      Alert.alert('Error', 'Could not accept request.');
    }
  }, [loadData]);

  const handleDecline = useCallback(async (friendshipId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await declineFriendRequest(friendshipId);
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
      Alert.alert('Challenge Sent!', `Game invite for ${sport} sent.`);
      setChallengeFriend(null);
      setChallengeSport(null);
    } catch (err) {
      Alert.alert('Error', 'Could not send challenge.');
    }
  }, [userId]);

  const handleShareInvite = useCallback(async () => {
    try {
      await Share.share({
        message: `Join me on Surve! Track scores together and challenge friends. Download: https://surve.app/invite/${userId}`,
      });
    } catch (err) {
      // User cancelled
    }
  }, [userId]);

  const getFriendUserId = (friendship: Friendship) =>
    friendship.requester_id === userId ? friendship.addressee_id : friendship.requester_id;

  const tabs = [
    { key: 'friends' as const, label: 'Friends', icon: Users, count: friends.length },
    { key: 'requests' as const, label: 'Requests', icon: UserPlus, count: requests.length },
    { key: 'search' as const, label: 'Search', icon: Search, count: 0 },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
          <ArrowLeft size={24} color={colors.text} strokeWidth={2} />
        </Pressable>
        <Text style={[Typography.title3, { color: colors.text }]}>Friends</Text>
        <Pressable onPress={handleShareInvite} style={styles.backBtn} hitSlop={12}>
          <Share2 size={20} color={colors.textSecondary} strokeWidth={2} />
        </Pressable>
      </View>

      {/* Tabs */}
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
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: Spacing.xxxl }} />
      ) : (
        <>
          {/* Search Tab */}
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
                  searchQuery.length >= 2 ? (
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

          {/* Friends Tab */}
          {tab === 'friends' && (
            <FlatList
              data={friends}
              keyExtractor={item => item.id}
              contentContainerStyle={styles.listContent}
              renderItem={({ item, index }) => {
                const friendId = getFriendUserId(item);
                const showChallengeFlow = challengeFriend === friendId;
                return (
                  <Animated.View entering={FadeInDown.delay(index * 40)}>
                    <Pressable
                      style={[styles.friendRow, { borderColor: colors.borderLight }]}
                      onPress={() => router.push(`/history?friendId=${friendId}`)}
                    >
                      <View style={[styles.avatar, { backgroundColor: colors.surfaceSecondary }]}>
                        <Text style={[Typography.headline, { color: colors.text }]}>
                          {friendId[0]?.toUpperCase() ?? '?'}
                        </Text>
                      </View>
                      <View style={styles.friendInfo}>
                        <Text style={[Typography.headline, { color: colors.text }]}>Friend</Text>
                        <Text style={[Typography.caption1, { color: colors.textSecondary }]}>Tap for head-to-head</Text>
                      </View>
                      <View style={styles.friendActions}>
                        <Pressable
                          style={[styles.actionBtn, { backgroundColor: '#059669' + '15' }]}
                          onPress={() => {
                            Haptics.selectionAsync();
                            setChallengeFriend(showChallengeFlow ? null : friendId);
                          }}
                        >
                          <Swords size={16} color="#059669" strokeWidth={2} />
                        </Pressable>
                        <ChevronRight size={16} color={colors.textTertiary} strokeWidth={2} />
                      </View>
                    </Pressable>
                    {showChallengeFlow && (
                      <View style={[styles.challengeRow, { backgroundColor: colors.surface }]}>
                        <Text style={[Typography.caption1, { color: colors.textSecondary, marginBottom: Spacing.sm }]}>
                          Pick a sport:
                        </Text>
                        <View style={styles.sportChips}>
                          {SPORTS.slice(0, 6).map(sport => (
                            <Pressable
                              key={sport.id}
                              style={[styles.sportChip, { backgroundColor: sport.accentColor + '20' }]}
                              onPress={() => handleChallenge(friendId, sport.id)}
                            >
                              <Text style={[Typography.caption1, { color: sport.accentColor, fontWeight: '600' }]}>
                                {sport.name}
                              </Text>
                            </Pressable>
                          ))}
                        </View>
                      </View>
                    )}
                  </Animated.View>
                );
              }}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Users size={48} color={colors.textTertiary} strokeWidth={1.5} />
                  <Text style={[Typography.headline, { color: colors.textSecondary, marginTop: Spacing.lg }]}>
                    No friends yet
                  </Text>
                  <Text style={[Typography.footnote, { color: colors.textTertiary, textAlign: 'center', marginTop: Spacing.xs }]}>
                    Search for friends or share your invite link
                  </Text>
                  <Pressable
                    style={[styles.addBtn, { backgroundColor: colors.primary + '15' }]}
                    onPress={() => setTab('search')}
                  >
                    <Text style={[Typography.footnote, { color: colors.primary, fontWeight: '600' }]}>Find Friends</Text>
                  </Pressable>
                </View>
              }
            />
          )}

          {/* Requests Tab */}
          {tab === 'requests' && (
            <FlatList
              data={requests}
              keyExtractor={item => item.id}
              contentContainerStyle={styles.listContent}
              renderItem={({ item, index }) => (
                <Animated.View entering={FadeInDown.delay(index * 40)}>
                  <View style={[styles.friendRow, { borderColor: colors.borderLight }]}>
                    <View style={[styles.avatar, { backgroundColor: colors.surfaceSecondary }]}>
                      <Text style={[Typography.headline, { color: colors.text }]}>?</Text>
                    </View>
                    <View style={styles.friendInfo}>
                      <Text style={[Typography.headline, { color: colors.text }]}>Friend Request</Text>
                      <Text style={[Typography.caption1, { color: colors.textSecondary }]}>
                        Wants to be your friend
                      </Text>
                    </View>
                    <View style={styles.friendActions}>
                      <Pressable
                        style={[styles.actionBtn, { backgroundColor: '#059669' + '15' }]}
                        onPress={() => handleAccept(item.id)}
                      >
                        <Check size={16} color="#059669" strokeWidth={2.5} />
                      </Pressable>
                      <Pressable
                        style={[styles.actionBtn, { backgroundColor: '#DC2626' + '15' }]}
                        onPress={() => handleDecline(item.id)}
                      >
                        <X size={16} color="#DC2626" strokeWidth={2.5} />
                      </Pressable>
                    </View>
                  </View>
                </Animated.View>
              )}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <UserPlus size={48} color={colors.textTertiary} strokeWidth={1.5} />
                  <Text style={[Typography.headline, { color: colors.textSecondary, marginTop: Spacing.lg }]}>
                    No pending requests
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  tabRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingHorizontal: Spacing.lg,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    gap: Spacing.xs,
  },
  badge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    marginLeft: Spacing.xs,
  },
  searchSection: { flex: 1, paddingHorizontal: Spacing.lg },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginTop: Spacing.md,
    marginBottom: Spacing.md,
  },
  listContent: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md },
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  friendInfo: { flex: 1, marginLeft: Spacing.md },
  friendActions: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'center' },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  challengeRow: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
  },
  sportChips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  sportChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Spacing.massive,
  },
  addBtn: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.lg,
  },
});
