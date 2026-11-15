/**
 * Cache TTL kecil dengan de-duplikasi permintaan yang sedang berjalan.
 * Dipakai agar Layout, Header, dan HamburgerMenu tidak memicu query Supabase
 * identik berkali-kali dalam satu render halaman.
 */
export interface TtlLoadResult<T> {
  value: T;
  /** false = jangan simpan (mis. hasil fallback akibat error), panggilan berikutnya mencoba lagi. */
  cacheable: boolean;
}

export interface TtlCache<T> {
  get(key: string, loader: () => Promise<TtlLoadResult<T>>): Promise<T>;
  clear(): void;
}

interface Entry<T> {
  expiresAt: number;
  promise: Promise<T>;
}

export function createTtlCache<T>(ttlMs: number, now: () => number = Date.now): TtlCache<T> {
  const entries = new Map<string, Entry<T>>();

  return {
    get(key, loader) {
      const hit = entries.get(key);
      if (hit && hit.expiresAt > now()) return hit.promise;

      const entry: Entry<T> = { expiresAt: Number.POSITIVE_INFINITY, promise: undefined as unknown as Promise<T> };
      entry.promise = loader().then(
        (result) => {
          if (result.cacheable) entry.expiresAt = now() + ttlMs;
          else if (entries.get(key) === entry) entries.delete(key);
          return result.value;
        },
        (error) => {
          if (entries.get(key) === entry) entries.delete(key);
          throw error;
        },
      );
      entries.set(key, entry);
      return entry.promise;
    },
    clear() {
      entries.clear();
    },
  };
}
