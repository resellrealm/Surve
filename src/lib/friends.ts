import { supabase } from './supabase';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  favorite_sports: string[];
  total_wins: number;
  total_losses: number;
  total_draws: number;
  created_at: string;
}

export interface Friendship {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: 'pending' | 'accepted' | 'blocked';
  created_at: string;
  profile?: Profile; // Joined profile of the other user
}

export interface GameInvite {
  id: string;
  from_user_id: string;
  to_user_id: string;
  sport: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  game_id: string | null;
  created_at: string;
  from_profile?: Profile;
  to_profile?: Profile;
}

export interface Game {
  id: string;
  sport: string;
  team_a_name: string;
  team_b_name: string;
  team_a_score: number;
  team_b_score: number;
  team_a_user_id: string | null;
  team_b_user_id: string | null;
  status: 'active' | 'completed' | 'cancelled';
  winner: 'team_a' | 'team_b' | 'draw' | null;
  started_at: string;
  ended_at: string | null;
  created_by: string;
}

export interface GameEvent {
  id: string;
  game_id: string;
  event_type: 'score' | 'undo' | 'timeout' | 'period_end';
  team: 'team_a' | 'team_b';
  points: number;
  scored_by: string | null;
  timestamp: string;
}

// ─── Profile ────────────────────────────────────────────────────────────────

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return data as Profile | null;
}

export async function upsertProfile(profile: Partial<Profile> & { id: string }): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .upsert(profile)
    .select()
    .single();
  if (error) throw error;
  return data as Profile;
}

export async function searchProfiles(query: string, currentUserId: string): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .neq('id', currentUserId)
    .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
    .limit(20);
  if (error) throw error;
  return (data ?? []) as Profile[];
}

// ─── Friends ────────────────────────────────────────────────────────────────

export async function getFriends(userId: string): Promise<Friendship[]> {
  const { data, error } = await supabase
    .from('friendships')
    .select('*')
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
    .eq('status', 'accepted');
  if (error) throw error;
  return (data ?? []) as Friendship[];
}

export async function getPendingRequests(userId: string): Promise<Friendship[]> {
  const { data, error } = await supabase
    .from('friendships')
    .select('*')
    .eq('addressee_id', userId)
    .eq('status', 'pending');
  if (error) throw error;
  return (data ?? []) as Friendship[];
}

export async function sendFriendRequest(requesterId: string, addresseeId: string): Promise<Friendship> {
  const { data, error } = await supabase
    .from('friendships')
    .insert({ requester_id: requesterId, addressee_id: addresseeId, status: 'pending' })
    .select()
    .single();
  if (error) throw error;
  return data as Friendship;
}

export async function acceptFriendRequest(friendshipId: string): Promise<Friendship> {
  const { data, error } = await supabase
    .from('friendships')
    .update({ status: 'accepted' })
    .eq('id', friendshipId)
    .select()
    .single();
  if (error) throw error;
  return data as Friendship;
}

export async function declineFriendRequest(friendshipId: string): Promise<void> {
  const { error } = await supabase
    .from('friendships')
    .delete()
    .eq('id', friendshipId);
  if (error) throw error;
}

// ─── Game Invites ───────────────────────────────────────────────────────────

export async function sendGameInvite(fromUserId: string, toUserId: string, sport: string): Promise<GameInvite> {
  const { data, error } = await supabase
    .from('game_invites')
    .insert({ from_user_id: fromUserId, to_user_id: toUserId, sport, status: 'pending' })
    .select()
    .single();
  if (error) throw error;
  return data as GameInvite;
}

export async function getPendingInvites(userId: string): Promise<GameInvite[]> {
  const { data, error } = await supabase
    .from('game_invites')
    .select('*')
    .eq('to_user_id', userId)
    .eq('status', 'pending');
  if (error) throw error;
  return (data ?? []) as GameInvite[];
}

export async function respondToInvite(inviteId: string, accept: boolean): Promise<GameInvite> {
  const { data, error } = await supabase
    .from('game_invites')
    .update({ status: accept ? 'accepted' : 'declined' })
    .eq('id', inviteId)
    .select()
    .single();
  if (error) throw error;
  return data as GameInvite;
}

// ─── Games ──────────────────────────────────────────────────────────────────

export async function createGame(params: {
  sport: string;
  teamAName: string;
  teamBName: string;
  teamAUserId?: string;
  teamBUserId?: string;
  createdBy: string;
}): Promise<Game> {
  const { data, error } = await supabase
    .from('games')
    .insert({
      sport: params.sport,
      team_a_name: params.teamAName,
      team_b_name: params.teamBName,
      team_a_user_id: params.teamAUserId ?? null,
      team_b_user_id: params.teamBUserId ?? null,
      created_by: params.createdBy,
      status: 'active',
    })
    .select()
    .single();
  if (error) throw error;
  return data as Game;
}

export async function getGameHistory(userId: string): Promise<Game[]> {
  const { data, error } = await supabase
    .from('games')
    .select('*')
    .or(`team_a_user_id.eq.${userId},team_b_user_id.eq.${userId},created_by.eq.${userId}`)
    .eq('status', 'completed')
    .order('ended_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Game[];
}

export async function getGameEvents(gameId: string): Promise<GameEvent[]> {
  const { data, error } = await supabase
    .from('game_events')
    .select('*')
    .eq('game_id', gameId)
    .order('timestamp', { ascending: true });
  if (error) throw error;
  return (data ?? []) as GameEvent[];
}

export async function getHeadToHead(userId: string, friendId: string): Promise<{
  wins: number;
  losses: number;
  draws: number;
  games: Game[];
}> {
  const { data, error } = await supabase
    .from('games')
    .select('*')
    .eq('status', 'completed')
    .or(
      `and(team_a_user_id.eq.${userId},team_b_user_id.eq.${friendId}),and(team_a_user_id.eq.${friendId},team_b_user_id.eq.${userId})`
    )
    .order('ended_at', { ascending: false });

  if (error) throw error;
  const games = (data ?? []) as Game[];

  let wins = 0;
  let losses = 0;
  let draws = 0;

  for (const game of games) {
    if (game.winner === 'draw') { draws++; continue; }
    const isTeamA = game.team_a_user_id === userId;
    const userWon = (isTeamA && game.winner === 'team_a') || (!isTeamA && game.winner === 'team_b');
    if (userWon) wins++;
    else losses++;
  }

  return { wins, losses, draws, games };
}

// ─── Real-time Subscriptions ────────────────────────────────────────────────

export function subscribeToGame(
  gameId: string,
  onUpdate: (game: Game) => void,
) {
  const channel = supabase
    .channel(`game:${gameId}`)
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'games', filter: `id=eq.${gameId}` },
      (payload) => onUpdate(payload.new as Game),
    )
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}

export function subscribeToFriendRequests(
  userId: string,
  onInsert: (friendship: Friendship) => void,
) {
  const channel = supabase
    .channel(`friend_requests:${userId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'friendships', filter: `addressee_id=eq.${userId}` },
      (payload) => onInsert(payload.new as Friendship),
    )
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}

export function subscribeToGameInvites(
  userId: string,
  onInsert: (invite: GameInvite) => void,
) {
  const channel = supabase
    .channel(`game_invites:${userId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'game_invites', filter: `to_user_id=eq.${userId}` },
      (payload) => onInsert(payload.new as GameInvite),
    )
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}
