import assert from 'node:assert';
import { describe, it } from 'node:test';
import { checkRateLimit, type RateLimitPipeline, type RateLimitStore } from '../rateLimit';

// Bellek içi sıralı küme + pipeline. exec sayısı "istek başına KV çağrısı"dır.
function memoryStore() {
  const sets = new Map<string, { score: number; member: string }[]>();
  const stats = { execs: 0 };
  const get = (k: string) => sets.get(k) ?? (sets.set(k, []), sets.get(k)!);
  const store: RateLimitStore & { stats: typeof stats; sets: typeof sets; fail?: boolean } = {
    stats,
    sets,
    pipeline() {
      const ops: (() => unknown)[] = [];
      const p: RateLimitPipeline = {
        zremrangebyscore(k, min, max) { ops.push(() => { const s = get(k); const kept = s.filter((e) => e.score < min || e.score > max); sets.set(k, kept); return s.length - kept.length; }); return p; },
        zadd(k, sm) { ops.push(() => { get(k).push(sm); return 1; }); return p; },
        zcard(k) { ops.push(() => get(k).length); return p; },
        zrange(k) { ops.push(() => { const s = [...get(k)].sort((a, b) => a.score - b.score); return s.length ? [s[0].member, s[0].score] : []; }); return p; },
        zrem(k, m) { ops.push(() => { const s = get(k); sets.set(k, s.filter((e) => e.member !== m)); return 1; }); return p; },
        expire() { ops.push(() => 1); return p; },
        async exec() { stats.execs++; if (store.fail) throw new Error('kv down'); return ops.map((op) => op()); },
      };
      return p;
    },
  };
  return store;
}

describe('rate limit (tek pipeline)', () => {
  it('chat: dakikada 20 istek geçer, 21. reddedilir; kalan hak ve sıfırlanma doğru', async () => {
    const store = memoryStore();
    let t = 1_000_000_000_000;
    const now = () => t;
    for (let i = 1; i <= 20; i++) {
      const r = await checkRateLimit('1.2.3.4', 'chat', { store, now });
      assert.strictEqual(r.success, true, `istek ${i}`);
      assert.strictEqual(r.remaining, 20 - i);
      t += 1000;
    }
    const blocked = await checkRateLimit('1.2.3.4', 'chat', { store, now });
    assert.strictEqual(blocked.success, false);
    assert.strictEqual(blocked.limit, 20);
    assert.strictEqual(blocked.reset, 40); // ilk istek 20 sn önceydi, pencere 60 sn
    // Reddedilen istek pencereye yazılmadı
    assert.strictEqual(store.sets.get('ratelimit:chat:1.2.3.4:minute')?.length, 20);
    // Pencere kayınca tekrar açılır
    t += 41_000;
    assert.strictEqual((await checkRateLimit('1.2.3.4', 'chat', { store, now })).success, true);
  });

  it('izin verilen istek TEK KV çağrısı; reddedilen iki', async () => {
    const store = memoryStore();
    const now = () => 1_000_000_000_000;
    await checkRateLimit('ip', 'recommend', { store, now });
    assert.strictEqual(store.stats.execs, 1);
    for (let i = 0; i < 9; i++) await checkRateLimit('ip', 'recommend', { store, now });
    const before = store.stats.execs;
    assert.strictEqual((await checkRateLimit('ip', 'recommend', { store, now })).success, false);
    assert.strictEqual(store.stats.execs - before, 2);
  });

  it('saat penceresi dolunca reddeder; eski davranış gibi dakika penceresi isteği sayar', async () => {
    const store = memoryStore();
    let t = 1_000_000_000_000;
    const now = () => t;
    for (let i = 0; i < 60; i++) {
      assert.strictEqual((await checkRateLimit('ip', 'recommend', { store, now })).success, true);
      t += 59_000; // 60 istek < 1 saat; dakika penceresinde en fazla 2 istek
    }
    const r = await checkRateLimit('ip', 'recommend', { store, now });
    assert.strictEqual(r.success, false);
    assert.strictEqual(r.limit, 60);
    // Reddedilen istek dakika penceresinde kalır (59 sn önceki + bu), saat penceresinden geri alınır
    assert.strictEqual(store.sets.get('ratelimit:recommend:ip:minute')?.length, 2);
    assert.strictEqual(store.sets.get('ratelimit:recommend:ip:hour')?.length, 60);
  });

  it('KV hatasında fail-closed', async () => {
    const store = memoryStore();
    store.fail = true;
    assert.deepStrictEqual(await checkRateLimit('ip', 'chat', { store }), { success: false, limit: 0, remaining: 0, reset: 60 });
  });
});
