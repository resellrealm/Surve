// Optional UI sound effects. Guarded — never throws if expo-av or asset missing.
// Respect the `soundEnabled` preference from the store.
import { useStore } from './store';

type AudioModule = {
  Sound: {
    createAsync: (
      source: any,
      options?: { shouldPlay?: boolean; volume?: number }
    ) => Promise<{ sound: { unloadAsync: () => Promise<void> } }>;
  };
};

let _audio: AudioModule | null | undefined; // undefined = not yet tried
function loadAudio(): AudioModule | null {
  if (_audio !== undefined) return _audio;
  try {
    // Dynamic require so the module isn't evaluated unless expo-av is installed.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('expo-av');
    _audio = (mod?.Audio ?? null) as AudioModule | null;
  } catch {
    _audio = null;
  }
  return _audio;
}

let _chimeAsset: number | null | undefined; // undefined = not yet tried
function loadChimeAsset(): number | null {
  if (_chimeAsset !== undefined) return _chimeAsset;
  try {
    // Placeholder path — asset may not ship in every build. Guarded.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    _chimeAsset = require('../../assets/sounds/chime.mp3') as number;
  } catch {
    _chimeAsset = null;
  }
  return _chimeAsset ?? null;
}

/** Play a soft chime if the user has opted in. No-op on failure. */
export async function playChime(): Promise<void> {
  try {
    const enabled = useStore.getState().soundEnabled;
    if (!enabled) return;
    const Audio = loadAudio();
    if (!Audio) return;
    const asset = loadChimeAsset();
    if (!asset) return;
    const { sound } = await Audio.Sound.createAsync(asset, {
      shouldPlay: true,
      volume: 0.4,
    });
    // Release native resources after a short delay so the clip finishes.
    setTimeout(() => {
      sound.unloadAsync().catch(() => {});
    }, 4000);
  } catch {
    /* swallow — UI sounds must never surface errors */
  }
}
