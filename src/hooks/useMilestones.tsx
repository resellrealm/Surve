import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import ConfettiCannon from 'react-native-confetti-cannon';
import { useStore } from '../lib/store';
import { supabase } from '../lib/supabase';
import { useHaptics } from './useHaptics';
import { toast } from '../lib/toast';
import type { MilestoneKey } from '../types';

const MILESTONE_LABELS: Record<MilestoneKey, string> = {
  first_booking_confirmed: 'First booking confirmed!',
  first_review_left: 'First review posted!',
  first_payout_received: 'First payout received!',
};

interface MilestoneContextValue {
  tryUnlock: (key: MilestoneKey) => Promise<boolean>;
}

const MilestoneContext = createContext<MilestoneContextValue>({
  tryUnlock: async () => false,
});

export function useMilestones() {
  return useContext(MilestoneContext);
}

export function MilestoneProvider({ children }: { children: React.ReactNode }) {
  const confettiRef = useRef<ConfettiCannon | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const haptics = useHaptics();
  const reducedMotion = useReducedMotion();

  const tryUnlock = useCallback(async (key: MilestoneKey): Promise<boolean> => {
    const user = useStore.getState().user;
    if (!user) return false;

    if (user.milestones?.[key]) return false;

    const now = new Date().toISOString();
    const updated = { ...user.milestones, [key]: now };

    await supabase
      .from('users')
      .update({ milestones: updated })
      .eq('id', user.id);

    useStore.getState().setUser({ ...user, milestones: updated });

    haptics.success();
    toast.success(MILESTONE_LABELS[key]);

    if (!reducedMotion) {
      setShowConfetti(true);
      setTimeout(() => confettiRef.current?.start(), 50);
      setTimeout(() => setShowConfetti(false), 4000);
    }

    return true;
  }, [haptics]);

  return (
    <MilestoneContext.Provider value={{ tryUnlock }}>
      {children}
      {showConfetti && (
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <ConfettiCannon
            ref={confettiRef}
            count={120}
            origin={{ x: -10, y: 0 }}
            autoStart
            fadeOut
            fallSpeed={3000}
            explosionSpeed={350}
            colors={['#2c428f', '#4A6CF7', '#FFD700', '#FF6B6B', '#00C853', '#FF9100']}
          />
        </View>
      )}
    </MilestoneContext.Provider>
  );
}
