// localStorage/sessionStorage erişimi her yerde try/catch: gizli sekme,
// engellenmiş depolama ya da sunucu tarafında hata vermeden bellek içine düşer.

export interface KeyValueStore {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
}

export function memoryStore(): KeyValueStore {
  const map = new Map<string, string>();
  return {
    get: (k) => map.get(k) ?? null,
    set: (k, v) => void map.set(k, v),
    remove: (k) => void map.delete(k),
  };
}

function browserStore(kind: 'localStorage' | 'sessionStorage'): KeyValueStore {
  const fallback = memoryStore();
  const storage = (): Storage | null => {
    try {
      return typeof window === 'undefined' ? null : window[kind];
    } catch {
      return null;
    }
  };
  return {
    get(k) {
      try {
        return storage()?.getItem(k) ?? fallback.get(k);
      } catch {
        return fallback.get(k);
      }
    },
    set(k, v) {
      try {
        const s = storage();
        if (s) s.setItem(k, v);
        else fallback.set(k, v);
      } catch {
        fallback.set(k, v);
      }
    },
    remove(k) {
      try {
        storage()?.removeItem(k);
      } catch {
        // yok say
      }
      fallback.remove(k);
    },
  };
}

let local: KeyValueStore | null = null;
let session: KeyValueStore | null = null;
export const localStore = () => (local ??= browserStore('localStorage'));
export const sessionStore = () => (session ??= browserStore('sessionStorage'));
