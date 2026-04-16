// Thin MMKV wrapper — used for local-only persistence (drafts, scroll state).
// We lazy-load MMKV so this module is importable from tests that don't link native.

interface MMKVLike {
  set(key: string, value: boolean | string | number | ArrayBuffer): void;
  getString(key: string): string | undefined;
  getNumber(key: string): number | undefined;
  getBoolean(key: string): boolean | undefined;
  remove(key: string): boolean;
}

let _storage: MMKVLike | null = null;
function getStorage(): MMKVLike | null {
  if (_storage) return _storage;
  try {
    // Dynamic require so Jest (which can't parse ESM) doesn't choke.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { createMMKV } = require('react-native-mmkv') as {
      createMMKV: (cfg?: { id?: string }) => MMKVLike;
    };
    _storage = createMMKV({ id: 'surve.local' });
    return _storage;
  } catch {
    return null;
  }
}

export const storage = {
  set(key: string, value: string | number | boolean): void {
    try {
      getStorage()?.set(key, value as any);
    } catch {
      /* no-op */
    }
  },
  getString(key: string): string | undefined {
    try {
      return getStorage()?.getString(key);
    } catch {
      return undefined;
    }
  },
  getNumber(key: string): number | undefined {
    try {
      return getStorage()?.getNumber(key);
    } catch {
      return undefined;
    }
  },
  getBoolean(key: string): boolean | undefined {
    try {
      return getStorage()?.getBoolean(key);
    } catch {
      return undefined;
    }
  },
  delete(key: string): void {
    try {
      getStorage()?.remove(key);
    } catch {
      /* no-op */
    }
  },
  setJSON<T>(key: string, value: T): void {
    try {
      getStorage()?.set(key, JSON.stringify(value));
    } catch {
      /* no-op */
    }
  },
  getJSON<T>(key: string): T | undefined {
    try {
      const raw = getStorage()?.getString(key);
      if (!raw) return undefined;
      return JSON.parse(raw) as T;
    } catch {
      return undefined;
    }
  },
};
