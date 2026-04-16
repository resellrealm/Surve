import { useCallback } from 'react';
import { Audio } from 'expo-av';
import { useStore } from '../lib/store';

// Lazy-load: create → play → auto-unload on finish.
// This avoids keeping a Sound object alive for the full screen lifetime
// and makes the hook stateless (safe to call from any screen).
const CHIME_ASSET = require('../../assets/sounds/chime.mp3') as number;

export function useChime() {
  const soundEnabled = useStore((s) => s.soundEnabled);

  const playChime = useCallback(async () => {
    if (!soundEnabled) return;
    try {
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: false });
      const { sound } = await Audio.Sound.createAsync(CHIME_ASSET, {
        shouldPlay: true,
        volume: 0.6,
      });
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync().catch(() => undefined);
        }
      });
    } catch {
      // Audio errors are non-fatal — silent fallback
    }
  }, [soundEnabled]);

  return { playChime };
}
