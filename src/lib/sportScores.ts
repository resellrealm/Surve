import { supabase } from './supabase';
import type { SportScore, SportType, ScoreStatus } from '../types';

// ─── CRUD Operations ─────────────────────────────────────────────────────────

export async function createScore(params: {
  userId: string;
  sportType: SportType;
  homeTeam?: string;
  awayTeam?: string;
}): Promise<SportScore> {
  const { data, error } = await supabase
    .from('sport_scores')
    .insert({
      user_id: params.userId,
      sport_type: params.sportType,
      home_team: params.homeTeam ?? 'Home',
      away_team: params.awayTeam ?? 'Away',
      home_score: 0,
      away_score: 0,
      status: 'in_progress' as ScoreStatus,
      metadata: {},
    })
    .select()
    .single();

  if (error) throw error;
  return data as SportScore;
}

export async function updateScore(
  id: string,
  updates: {
    home_score?: number;
    away_score?: number;
    status?: ScoreStatus;
    completed_at?: string | null;
    metadata?: Record<string, unknown>;
  },
): Promise<SportScore> {
  const { data, error } = await supabase
    .from('sport_scores')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as SportScore;
}

export async function fetchScores(userId: string): Promise<SportScore[]> {
  const { data, error } = await supabase
    .from('sport_scores')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as SportScore[];
}

export async function fetchActiveScore(userId: string, sportType: SportType): Promise<SportScore | null> {
  const { data, error } = await supabase
    .from('sport_scores')
    .select('*')
    .eq('user_id', userId)
    .eq('sport_type', sportType)
    .eq('status', 'in_progress')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data as SportScore | null;
}

export async function deleteScore(id: string): Promise<void> {
  const { error } = await supabase
    .from('sport_scores')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// ─── Real-time Subscription ──────────────────────────────────────────────────

export function subscribeToScores(
  userId: string,
  onUpdate: (score: SportScore) => void,
  onInsert: (score: SportScore) => void,
  onDelete: (oldId: string) => void,
) {
  const channel = supabase
    .channel(`sport_scores:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'sport_scores',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => onUpdate(payload.new as SportScore),
    )
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'sport_scores',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => onInsert(payload.new as SportScore),
    )
    .on(
      'postgres_changes',
      {
        event: 'DELETE',
        schema: 'public',
        table: 'sport_scores',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => onDelete((payload.old as { id: string }).id),
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
