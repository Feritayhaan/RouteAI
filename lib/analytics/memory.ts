// Bellek içi KV taklidi: hem olay yazımı (EventStore) hem istatistik okuması
// (StatsSource). Yerel örnek veri (/api/admin/stats?sample=1) ve testler için.

import type { EventPipeline, EventStore } from './store';
import type { StatsSource } from './stats';

export function memoryAnalyticsStore(): EventStore & StatsSource & { set(key: string, value: unknown): void; sadd(key: string, member: string): void } {
  const hashes = new Map<string, Record<string, number>>();
  const sets = new Map<string, Set<string>>();
  const values = new Map<string, unknown>();
  const store = {
    pipeline(): EventPipeline {
      const ops: (() => void)[] = [];
      const p: EventPipeline = {
        hincrby(key, field, by) { ops.push(() => { const h = hashes.get(key) ?? {}; h[field] = (h[field] ?? 0) + by; hashes.set(key, h); }); return p; },
        sadd(key, member) { ops.push(() => store.sadd(key, member)); return p; },
        expire() { return p; },
        async exec() { ops.forEach((op) => op()); return []; },
      };
      return p;
    },
    async hgetall(key: string) { return hashes.get(key) ?? null; },
    async smembers(key: string) { return [...(sets.get(key) ?? [])]; },
    async mget(keys: string[]) { return keys.map((k) => values.get(k) ?? null); },
    async get(key: string) { return (values.get(key) as number | string | undefined) ?? null; },
    set(key: string, value: unknown) { values.set(key, value); },
    sadd(key: string, member: string) { const s = sets.get(key) ?? new Set<string>(); s.add(member); sets.set(key, s); },
  };
  return store;
}
