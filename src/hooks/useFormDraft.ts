// Auto-save form drafts to MMKV, debounced. Returns a `clear` helper that the
// caller invokes on successful submit. Restores drafts on mount and fires
// `onRestore` (to show a toast) when a draft was recovered.
import { useEffect, useRef } from 'react';
import { storage } from '../lib/storage';

interface UseFormDraftOptions<T> {
  key: string;
  values: T;
  setValues: (next: T) => void;
  enabled?: boolean;
  debounceMs?: number;
  onRestore?: () => void;
}

export function useFormDraft<T extends Record<string, unknown>>({
  key,
  values,
  setValues,
  enabled = true,
  debounceMs = 500,
  onRestore,
}: UseFormDraftOptions<T>): { clear: () => void } {
  const restoredRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Restore on mount.
  useEffect(() => {
    if (!enabled || restoredRef.current) return;
    restoredRef.current = true;
    const saved = storage.getJSON<T>(key);
    if (saved && typeof saved === 'object') {
      setValues({ ...values, ...saved });
      onRestore?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, key]);

  // Debounced persist on every value change.
  useEffect(() => {
    if (!enabled || !restoredRef.current) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      storage.setJSON(key, values);
    }, debounceMs);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [enabled, key, values, debounceMs]);

  return {
    clear: () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      storage.delete(key);
    },
  };
}
