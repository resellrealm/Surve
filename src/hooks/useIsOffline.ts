import { useStore } from '../lib/store';

export function useIsOffline() {
  return useStore((s) => s.isOffline);
}
