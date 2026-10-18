// Gizli kullanıcı puanı (lib/points): formül, oy -> sayaç, KV okuma, öneri sırası.
//
// Kural: puan KULLANICIYA GÖSTERİLMEZ; istemciye giden hiçbir yanıtta puan alanı yok.
// Sayılar burada senaryoyu kurmak içindir, gerçek veri değil.

import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import {
  MAX_SWING,
  DEAD_ZONE,
  PRIOR_VOTES,
  START_POINTS,
  pointsFromVotes,
  rankByPoints,
  rankingPoints,
  totalVotes,
} from '../points/points';
import { applyVoteToPoints, kvPointsProvider, listPoints, parseCounts, pointsKey, type PointsProvider } from '../points/store';
import { saveVote, voteKey } from '../signals/store';
import { recommendV3 } from '../recommendV3';
import { apiResponseFromV3 } from '../types';
import { getDictionary } from '../i18n/index';
import { cleanEnvValue, countVotes, describeEnv, isAuthError, planWrites, tokenCandidates } from '../../scripts/points/backfill.mjs';
import { formatMismatchWarning, formatPointsReport } from '../../scripts/points/show.mjs';
import { planCounterReset, selectVoteKeys } from '../../scripts/points/reset.mjs';
import { arenaModels, ctx, product } from './catalogFixtures';

const noLLM = { allowLLM: false } as const;
const QUERY = 'resim oluşturmak istiyorum'; // -> image.generate (kural katmanı)

/** hincrby + hgetall + set(get) destekleyen bellek içi KV. */
function fakeKv() {
  const data = new Map<string, unknown>();
  const sets = new Map<string, Set<string>>();
  const hashes = new Map<string, Record<string, number>>();
  return {
    data, sets, hashes,
    async set(k: string, v: unknown, opts?: { ex: number; get?: boolean }) {
      const old = data.get(k) ?? null;
      data.set(k, v);
      return opts?.get ? old : 'OK';
    },
    async sadd(k: string, m: string) { (sets.get(k) ?? sets.set(k, new Set()).get(k)!).add(m); return 1; },
    async hincrby(k: string, field: string, n: number) {
      const h = hashes.get(k) ?? {};
      h[field] = (h[field] ?? 0) + n;
      hashes.set(k, h);
      return h[field];
    },
    async hgetall(k: string) { return hashes.get(k) ?? null; },
  };
}

const provider = (points: Record<string, number>): PointsProvider => ({ async load() { return new Map(Object.entries(points)); } });

describe('puan formülü (500 başlangıç, 0–1000, kademeli)', () => {
  it('oy yoksa tam 500; eşit 👍 ve 👎 de 500', () => {
    assert.strictEqual(pointsFromVotes({ up: 0, down: 0 }), START_POINTS);
    assert.strictEqual(pointsFromVotes({ up: 7, down: 7 }), START_POINTS);
  });

  it('ilk oylar puanı az oynatır, oy arttıkça etki büyür', () => {
    assert.strictEqual(pointsFromVotes({ up: 1, down: 0 }), 523.81);
    assert.strictEqual(pointsFromVotes({ up: 5, down: 0 }), 600);
    assert.strictEqual(pointsFromVotes({ up: 20, down: 0 }), 750);
    assert.strictEqual(pointsFromVotes({ up: 100, down: 0 }), 916.67);
    // 👎 simetrik
    assert.strictEqual(pointsFromVotes({ up: 0, down: 5 }), 400);
    assert.strictEqual(pointsFromVotes({ up: 0, down: 20 }), 250);
  });

  it('her zaman 0–1000 aralığında kalır', () => {
    for (const c of [{ up: 1e9, down: 0 }, { up: 0, down: 1e9 }, { up: 3, down: 1e6 }]) {
      const p = pointsFromVotes(c);
      assert.ok(p >= 0 && p <= START_POINTS + MAX_SWING, String(p));
    }
    assert.ok(pointsFromVotes({ up: 1e9, down: 0 }) < START_POINTS + MAX_SWING + 1e-9);
    assert.strictEqual(MAX_SWING, START_POINTS, 'aralık 0–1000');
  });

  it('bozuk sayaçlar (negatif, NaN, kesirli) 0 / tam sayı sayılır', () => {
    assert.strictEqual(pointsFromVotes({ up: -3, down: Number.NaN }), START_POINTS);
    assert.strictEqual(totalVotes({ up: 2.9, down: -1 }), 2);
  });

  it('yumuşak eşik: tek oy sıralamada etkisiz, sonrası kademeli (ölü bölge 25 puan)', () => {
    assert.strictEqual(DEAD_ZONE, 25);
    assert.strictEqual(rankingPoints(undefined), START_POINTS);
    assert.strictEqual(rankingPoints({ up: 0, down: 0 }), START_POINTS);
    assert.strictEqual(rankingPoints({ up: 1, down: 0 }), START_POINTS, 'tek 👍 ham 523,81 ama sıralamada 500');
    assert.strictEqual(rankingPoints({ up: 0, down: 1 }), START_POINTS, 'tek 👎 de etkisiz');
    assert.strictEqual(rankingPoints({ up: 2, down: 0 }), 521.53);
    assert.strictEqual(rankingPoints({ up: 5, down: 0 }), 578.95);
    assert.strictEqual(rankingPoints({ up: 20, down: 0 }), 736.84);
    assert.strictEqual(rankingPoints({ up: 0, down: 2 }), 478.47, '👎 simetrik');
    assert.strictEqual(rankingPoints({ up: 0, down: 5 }), 421.05);
    assert.ok(PRIOR_VOTES > 0);
  });

  it('yumuşak eşik: ölü bölge oy sayısıyla genişler (gürültü sayılmaz)', () => {
    assert.strictEqual(rankingPoints({ up: 11, down: 9 }), START_POINTS, '20 oyda net +2: etkisiz');
    assert.strictEqual(rankingPoints({ up: 2, down: 1 }), START_POINTS, 'net +1 etkisiz');
    assert.ok(rankingPoints({ up: 12, down: 9 }) > START_POINTS, '21 oyda net +3: etkili');
    assert.strictEqual(rankingPoints({ up: 7, down: 7 }), START_POINTS);
  });

  it('yumuşak eşik: sürekli (büyük sıçrama yok), tek yönde artar, 0–1000 aralığında kalır', () => {
    let previous = START_POINTS;
    let biggestJump = 0;
    for (let n = 1; n <= 3000; n++) {
      const p = rankingPoints({ up: n, down: 0 });
      assert.ok(p >= previous, `düşmez (n=${n})`);
      biggestJump = Math.max(biggestJump, p - previous);
      previous = p;
    }
    assert.ok(biggestJump < 25, `tek oyla sıçrama ${biggestJump} puanı geçmemeli`);
    assert.ok(previous < START_POINTS + MAX_SWING + 1e-9 && previous > 990, String(previous));
    // aynı oy sayısında net fark büyüdükçe puan artar
    assert.ok(rankingPoints({ up: 10, down: 0 }) > rankingPoints({ up: 8, down: 2 }));
    // hiçbir oy karışımı 0–1000 dışına çıkmaz; 👍/👎 simetriktir
    for (const [up, down] of [[0, 1e9], [1e9, 0], [3, 1e6], [50, 49]]) {
      const p = rankingPoints({ up, down });
      assert.ok(p >= 0 && p <= START_POINTS + MAX_SWING, String(p));
      assert.ok(Math.abs(rankingPoints({ up, down }) + rankingPoints({ up: down, down: up }) - 2 * START_POINTS) < 0.02);
    }
  });
});

describe('rankByPoints: yüksek puan önde, eşitlikte mevcut sıra', () => {
  it('puana göre azalan; eşit puanda legacyIndex küçük olan önde; girdiyi değiştirmez', () => {
    const input = [
      { value: 'a', legacyIndex: 0, points: 500 },
      { value: 'b', legacyIndex: 1, points: 650 },
      { value: 'c', legacyIndex: 2, points: 500 },
      { value: 'd', legacyIndex: 3, points: 420 },
    ];
    const copy = JSON.stringify(input);
    assert.deepStrictEqual(rankByPoints(input), ['b', 'a', 'c', 'd']);
    assert.strictEqual(JSON.stringify(input), copy);
  });
});

describe('oy -> sayaç (applyVoteToPoints / saveVote)', () => {
  it('ilk oy +1; oy değişince eski yön -1, yeni yön +1; aynı oy tekrarı sayacı oynatmaz', async () => {
    const kv = fakeKv();
    await applyVoteToPoints(kv, { taskId: 't.x', productId: 'a', vote: 'up', previous: null });
    assert.deepStrictEqual(kv.hashes.get(pointsKey('t.x')), { 'a|up': 1 });
    await applyVoteToPoints(kv, { taskId: 't.x', productId: 'a', vote: 'up', previous: 'up' });
    assert.deepStrictEqual(kv.hashes.get(pointsKey('t.x')), { 'a|up': 1 });
    await applyVoteToPoints(kv, { taskId: 't.x', productId: 'a', vote: 'down', previous: 'up' });
    assert.deepStrictEqual(kv.hashes.get(pointsKey('t.x')), { 'a|up': 0, 'a|down': 1 });
  });

  it('saveVote: oturum başına tek oy; farklı oturumlar toplanır; son oy geçerli', async () => {
    const kv = fakeKv();
    const base = { taskId: 'slides.create', productId: 'gamma-ai', toolName: 'Gamma AI' };
    await saveVote({ ...base, sessionId: 'sess_aaaaaaaa', vote: 'up' }, 1, kv);
    await saveVote({ ...base, sessionId: 'sess_aaaaaaaa', vote: 'up' }, 2, kv); // aynı oy tekrar
    await saveVote({ ...base, sessionId: 'sess_bbbbbbbb', vote: 'up' }, 3, kv);
    await saveVote({ ...base, sessionId: 'sess_cccccccc', vote: 'down' }, 4, kv);
    assert.deepStrictEqual(kv.hashes.get(pointsKey('slides.create')), { 'gamma-ai|up': 2, 'gamma-ai|down': 1 });
    // A fikrini değiştirir: up -> down
    await saveVote({ ...base, sessionId: 'sess_aaaaaaaa', vote: 'down' }, 5, kv);
    assert.deepStrictEqual(kv.hashes.get(pointsKey('slides.create')), { 'gamma-ai|up': 1, 'gamma-ai|down': 2 });
    assert.strictEqual(kv.data.size, 3, 'oturum başına tek oy kaydı');
    assert.ok(![...kv.data.keys()].some((k) => k.includes('sess_aaaaaaaa')), 'ham oturum kimliği anahtarda yok');
    assert.ok(kv.data.has(voteKey('sess_aaaaaaaa', 'slides.create', 'gamma-ai')));
  });

  it('KV eski kaydı JSON dizesi olarak döndürse de oy değişimi doğru işlenir', async () => {
    const kv = fakeKv();
    const rawStore = { ...kv, async set(k: string, v: unknown, opts?: { ex: number; get?: boolean }) { const old = await kv.set(k, v, opts); return typeof old === 'object' && old ? JSON.stringify(old) : old; } };
    const v = { sessionId: 'sess_aaaaaaaa', taskId: 'image.generate', productId: 'a', toolName: 'A' };
    await saveVote({ ...v, vote: 'up' }, 1, rawStore);
    await saveVote({ ...v, vote: 'down' }, 2, rawStore);
    assert.deepStrictEqual(kv.hashes.get(pointsKey('image.generate')), { 'a|up': 0, 'a|down': 1 });
  });

  it('görevler birbirinden bağımsız: aynı ürün başka görevde ayrı sayaç', async () => {
    const kv = fakeKv();
    const s = 'sess_aaaaaaaa';
    await saveVote({ sessionId: s, taskId: 'image.generate', productId: 'a', toolName: 'A', vote: 'up' }, 1, kv);
    await saveVote({ sessionId: s, taskId: 'image.logo', productId: 'a', toolName: 'A', vote: 'down' }, 2, kv);
    assert.deepStrictEqual(kv.hashes.get(pointsKey('image.generate')), { 'a|up': 1 });
    assert.deepStrictEqual(kv.hashes.get(pointsKey('image.logo')), { 'a|down': 1 });
  });
});

describe('KV okuma (kvPointsProvider / parseCounts / listPoints)', () => {
  it('parseCounts: bozuk alan ve negatif değerler 0 sayılır', () => {
    const m = parseCounts({ 'a|up': '6', 'a|down': -2, 'b|sideways': 4, bozuk: 9, 'c|up': 'x' });
    assert.deepStrictEqual(m.get('a'), { up: 6, down: 0 });
    assert.deepStrictEqual(m.get('c'), { up: 0, down: 0 });
    assert.ok(!m.has('b') && !m.has('bozuk'));
    assert.strictEqual(parseCounts(null).size, 0);
  });

  it('sağlayıcı sıralama puanı döndürür: ölü bölgedeki ürün 500', async () => {
    const store = { async hgetall() { return { 'a|up': 10, 'a|down': 0, 'b|up': 2, 'b|down': 1 }; } };
    const pts = await kvPointsProvider(store).load('image.generate');
    assert.strictEqual(pts.get('a'), rankingPoints({ up: 10, down: 0 }));
    assert.strictEqual(pts.get('b'), START_POINTS);
  });

  it('KV hatası ya da zaman aşımında boş harita (öneri bozulmaz), log kullanıcı verisi içermez', async () => {
    const logged: unknown[][] = [];
    const original = console.error;
    console.error = (...args: unknown[]) => { logged.push(args); };
    try {
      const failing = { async hgetall(): Promise<never> { throw new Error('bağlantı koptu'); } };
      assert.strictEqual((await kvPointsProvider(failing).load('image.generate')).size, 0);
      const slow = { hgetall: () => new Promise<null>((resolve) => setTimeout(() => resolve(null), 200)) };
      assert.strictEqual((await kvPointsProvider(slow, 10).load('image.generate')).size, 0);
    } finally {
      console.error = original;
    }
    assert.strictEqual(logged.length, 2);
    assert.ok(logged.every((l) => String(l[0]).includes('image.generate')));
  });

  it('listPoints (yönetici): ham puan ve sıralamada sayılıp sayılmadığı, puana göre azalan', async () => {
    const store = {
      async hgetall(key: string) {
        return key === 'pts:image.generate' ? { 'a|up': 8, 'a|down': 0, 'b|up': 1, 'b|down': 0, 'c|up': 0, 'c|down': 0 } : null;
      },
    };
    const rows = await listPoints(['image.generate', 'image.logo'], store);
    assert.deepStrictEqual(rows.map((r) => r.productId), ['a', 'b'], 'oysuz c listelenmez');
    assert.strictEqual(rows[0].rankingPoints, rankingPoints({ up: 8, down: 0 }));
    assert.ok(rows[0].rankingPoints < rows[0].points && rows[0].rankingPoints > START_POINTS, 'ham puandan düşük ama 500\'ün üstünde');
    assert.strictEqual(rows[1].points, 523.81);
    assert.strictEqual(rows[1].rankingPoints, START_POINTS, 'ölü bölgede: sıralamada 500');
  });
});

describe('recommendV3: puanlı sıralama', () => {
  // a: kanıtlı (arena); b, c: kanıtsız aktif ürünler.
  const fixture = () => ctx({ products: [product('a', { models: ['m1'] }), product('b'), product('c')], models: arenaModels([1, 2, 3]) });

  it('points seçeneği yoksa davranış eskisiyle aynı: sadece kanıtlı ürünler', async () => {
    const r = await recommendV3(QUERY, 'all', { ...noLLM, ctx: fixture() });
    assert.strictEqual(r.kind, 'recommendation');
    if (r.kind !== 'recommendation') return;
    assert.deepStrictEqual(r.items.map((i) => i.product.id), ['a']);
    assert.strictEqual(r.unverified, undefined);
  });

  it('oy yokken: kanıtlı önde (eski sıra), kanıtsızlar alfabetik sonda ve "unverified"', async () => {
    const r = await recommendV3(QUERY, 'all', { ...noLLM, ctx: fixture(), points: provider({}) });
    assert.strictEqual(r.kind, 'recommendation');
    if (r.kind !== 'recommendation') return;
    assert.deepStrictEqual(r.items.map((i) => [i.product.id, i.basis]), [['a', 'evidence'], ['b', 'unverified'], ['c', 'unverified']]);
  });

  it('puanı yüksek olan öne geçer, düşük olan geriye düşer; eşitlikte mevcut sıra', async () => {
    const up = await recommendV3(QUERY, 'all', { ...noLLM, ctx: fixture(), points: provider({ c: 700 }) });
    const down = await recommendV3(QUERY, 'all', { ...noLLM, ctx: fixture(), points: provider({ a: 400 }) });
    const order = (r: Awaited<ReturnType<typeof recommendV3>>) => (r.kind === 'recommendation' ? r.items.map((i) => i.product.id) : []);
    assert.deepStrictEqual(order(up), ['c', 'a', 'b']);
    assert.deepStrictEqual(order(down), ['b', 'c', 'a']);
  });

  it('kanıtsız görevde: oy yok -> dürüst no_evidence; yeterli oy varsa oylanan araç önde', async () => {
    const noData = ctx({ products: [product('a'), product('b')] });
    const none = await recommendV3(QUERY, 'all', { ...noLLM, ctx: noData, points: provider({}) });
    assert.strictEqual(none.kind, 'no_evidence');
    const voted = await recommendV3(QUERY, 'all', { ...noLLM, ctx: noData, points: provider({ b: 650 }) });
    assert.strictEqual(voted.kind, 'recommendation');
    if (voted.kind !== 'recommendation') return;
    assert.deepStrictEqual(voted.items.map((i) => [i.product.id, i.basis]), [['b', 'unverified'], ['a', 'unverified']]);
  });

  it('en çok 5 araç döner; kanıtsız artanlar unverified listesine gider', async () => {
    const many = ctx({ products: [product('a', { models: ['m1'] }), ...['b', 'c', 'd', 'e', 'f', 'g', 'h'].map((id) => product(id))], models: arenaModels([1, 2, 3]) });
    const r = await recommendV3(QUERY, 'all', { ...noLLM, ctx: many, points: provider({}) });
    assert.strictEqual(r.kind, 'recommendation');
    if (r.kind !== 'recommendation') return;
    assert.deepStrictEqual(r.items.map((i) => i.product.id), ['a', 'b', 'c', 'd', 'e']);
    assert.deepStrictEqual(r.unverified?.map((p) => p.id), ['f', 'g', 'h']);
  });

  it('arayüz fiyat filtresi puanla gevşemez: yüksek puanlı ücretli araç "ücretsiz" filtresinde çıkmaz', async () => {
    const c = ctx({ products: [product('a', { models: ['m1'], pricing: 'freemium' }), product('p', { pricing: 'paid' }), product('f', { pricing: 'free' })], models: arenaModels([1, 2, 3]) });
    const r = await recommendV3(QUERY, 'free', { ...noLLM, ctx: c, points: provider({ p: 950 }) });
    assert.strictEqual(r.kind, 'recommendation');
    if (r.kind !== 'recommendation') return;
    assert.ok(!r.items.some((i) => i.product.id === 'p'));
    assert.deepStrictEqual(r.items.map((i) => i.product.id), ['a', 'f']);
  });

  it('puan istemciye giden hiçbir yanıtta yok (ne ham sonuçta ne arayüz çevirisinde)', async () => {
    const r = await recommendV3(QUERY, 'all', { ...noLLM, ctx: fixture(), points: provider({ c: 912.34, a: 487.65 }) });
    const ui = apiResponseFromV3(r, getDictionary('tr'));
    for (const out of [JSON.stringify(r), JSON.stringify(ui)]) {
      // "rank" bilerek yok: benchmark_rank gerekçesinin LMArena sırası (kaynağıyla gösterilen veri) puan değildir.
      assert.ok(!/"(points|rankingPoints|userPoints|score)"/i.test(out), 'puan alanı yok');
      assert.ok(!out.includes('912.34') && !out.includes('487.65'), 'puan değeri yok');
    }
    assert.strictEqual(ui?.type, 'simple');
    if (ui?.type !== 'simple') return;
    assert.strictEqual(ui.taskId, 'image.generate');
    assert.ok(ui.main.productId && ui.main.basis);
  });
});

describe('scripts/points/backfill: oy kayıtlarından sayaçlar', () => {
  const valid = new Set(['t.x|a', 't.x|b', 't.y|a']);
  const records = [
    { taskId: 't.x', productId: 'a', vote: 'up' },
    { taskId: 't.x', productId: 'a', vote: 'up' },
    { taskId: 't.x', productId: 'a', vote: 'down' },
    { taskId: 't.x', productId: 'b', vote: 'down' },
    { taskId: 't.y', productId: 'a', vote: 'up' },
    { taskId: 't.x', productId: 'yok', vote: 'up' }, // katalogda yok
    { taskId: 't.x', productId: 'a', vote: 'belki' }, // bozuk yön
    null,
  ];

  it('geçerli çiftler sayılır, tanınmayanlar ve bozuk kayıtlar atlanır', () => {
    const { counts, skipped } = countVotes(records, valid);
    assert.strictEqual(skipped, 3);
    assert.deepStrictEqual(counts.get('t.x')?.get('a'), { up: 2, down: 1 });
    assert.deepStrictEqual(counts.get('t.x')?.get('b'), { up: 0, down: 1 });
    assert.deepStrictEqual(counts.get('t.y')?.get('a'), { up: 1, down: 0 });
  });

  it('plan sadece değişen alanları yazar; kayıtta karşılığı kalmayan sayaç 0 olur (silinmez); eşitse plan boş', () => {
    const { counts } = countVotes(records, valid);
    const current = new Map<string, Record<string, unknown>>([
      ['t.x', { 'a|up': 1, 'a|down': 1, 'eski|up': 4 }],
    ]);
    const plan = planWrites(counts, current);
    const x = plan.find((p: { taskId: string }) => p.taskId === 't.x');
    assert.deepStrictEqual(x?.fields, { 'a|up': 2, 'b|down': 1, 'eski|up': 0 });
    assert.strictEqual(x?.key, 'pts:t.x');
    assert.deepStrictEqual(plan.find((p: { taskId: string }) => p.taskId === 't.y')?.fields, { 'a|up': 1 });

    // Uygulandıktan sonra tekrar çalıştırmak hiçbir şey yazmaz (idempotent).
    const after = new Map<string, Record<string, unknown>>(
      plan.map((p: { taskId: string; fields: object }): [string, Record<string, unknown>] => [p.taskId, { ...(current.get(p.taskId) ?? {}), ...p.fields }])
    );
    assert.deepStrictEqual(planWrites(counts, after), []);
  });
});

describe('scripts/points/backfill: KV giriş bilgisi', () => {
  it('Upstash kimlik hatasını tanır, başka hatayı tanımaz', () => {
    assert.ok(isAuthError(new Error('WRONGPASS invalid or missing auth token. See https://docs.upstash.com/redis/troubleshooting/http_unauthorized for details., command was: ["smembers","sig:vote:index"]')));
    assert.ok(isAuthError('Unauthorized'));
    assert.ok(!isAuthError(new Error('fetch failed')));
    assert.ok(!isAuthError(new Error('ERR wrong number of arguments')));
  });

  it('boşluk ve sarmalayan tırnak temizlenir', () => {
    assert.strictEqual(cleanEnvValue('  "abc"  '), 'abc');
    assert.strictEqual(cleanEnvValue("'abc'"), 'abc');
    assert.strictEqual(cleanEnvValue(undefined), '');
  });

  it('göstermek için önce salt okunur sonra tam yetkili token; --apply için yalnızca tam yetkili; aynı değer tekrarlanmaz', () => {
    const env = { KV_REST_API_READ_ONLY_TOKEN: 'ro', KV_REST_API_TOKEN: 'rw' };
    assert.deepStrictEqual(tokenCandidates(env, false).map((c: { name: string }) => c.name), ['KV_REST_API_READ_ONLY_TOKEN', 'KV_REST_API_TOKEN']);
    assert.deepStrictEqual(tokenCandidates(env, true).map((c: { name: string }) => c.name), ['KV_REST_API_TOKEN']);
    assert.strictEqual(tokenCandidates({ KV_REST_API_READ_ONLY_TOKEN: 'x', KV_REST_API_TOKEN: 'x' }, false).length, 1);
    assert.strictEqual(tokenCandidates({ KV_REST_API_READ_ONLY_TOKEN: 'ro' }, true).length, 0, 'yazarken salt okunur token kullanılmaz');
    assert.strictEqual(tokenCandidates({}, false).length, 0);
  });

  it('teşhis çıktısı değer içermez, yalnızca ad ve uzunluk', () => {
    const lines = describeEnv({ KV_REST_API_URL: 'https://gizli-host.upstash.io', KV_REST_API_TOKEN: 'cok-gizli-token-degeri' });
    const text = lines.join('\n');
    assert.ok(text.includes('KV_REST_API_URL: dolu (') && text.includes('KV_REST_API_READ_ONLY_TOKEN: YOK'));
    assert.ok(!text.includes('gizli-host') && !text.includes('cok-gizli'), 'değer sızmaz');
  });
});

describe('scripts/points/show: puan tablosu', () => {
  const opts = { taskLabels: { 'image.generate': 'Görsel üretimi' }, productNames: { a: 'Araç A', b: 'B' }, deadZone: DEAD_ZONE, startPoints: START_POINTS };

  it('oy yokken tek satır: herkes 500', () => {
    assert.deepStrictEqual(formatPointsReport([], opts), ['Henüz oy yok; bütün araçlar 500 puanda.']);
  });

  it('görev başlığı, ürün adı, virgüllü puan ve eşik bilgisi; kaynak sırası korunur', () => {
    const rows = [
      { taskId: 'image.generate', productId: 'a', up: 8, down: 0, votes: 8, points: pointsFromVotes({ up: 8, down: 0 }), rankingPoints: rankingPoints({ up: 8, down: 0 }) },
      { taskId: 'image.generate', productId: 'b', up: 1, down: 0, votes: 1, points: pointsFromVotes({ up: 1, down: 0 }), rankingPoints: rankingPoints({ up: 1, down: 0 }) },
    ];
    const text = formatPointsReport(rows, opts).join('\n');
    assert.ok(text.includes('Görsel üretimi  (image.generate)'));
    const expected = rankingPoints({ up: 8, down: 0 }).toFixed(2).replace('.', ',');
    assert.ok(new RegExp(`Araç A\\s+8\\s+0\\s+8\\s+642,86\\s+${expected}\\s*$`, 'm').test(text), text);
    assert.ok(/B\s+1\s+0\s+1\s+523,81\s+500,00\s+\(etkisiz\)/.test(text), text);
    assert.ok(text.includes('25 puandan az uzaktaysa'), 'ölü bölge açıklaması');
    assert.ok(text.indexOf('Araç A') < text.indexOf('523,81'));
    assert.ok(text.includes('1 görevde 2 araç oy almış') && text.includes('Puan kullanıcıya gösterilmez'));
  });

  it('adı bilinmeyen ürün id ile gösterilir', () => {
    const rows = [{ taskId: 'x.y', productId: 'bilinmeyen', up: 5, down: 0, votes: 5, points: 600, rankingPoints: 600 }];
    const text = formatPointsReport(rows, { ...opts, taskLabels: {} }).join('\n');
    assert.ok(text.includes('bilinmeyen') && text.includes('600,00'));
  });
});

describe('scripts/points/reset: sıfırlama planı', () => {
  const current = new Map<string, Record<string, unknown>>([
    ['image.generate', { 'a|up': 5, 'a|down': 1, 'b|up': 3, 'b|down': 0, 'c|up': '0' }],
    ['image.logo', { 'a|up': 2, 'a|down': -1, bozuk: 7 }],
  ]);

  it('hepsi: yalnızca sıfırdan farklı sayaçlar 0 olur (negatif dahil), bozuk alana dokunulmaz, anahtar silinmez', () => {
    const plan = planCounterReset(current);
    assert.deepStrictEqual(plan.map((p: { key: string }) => p.key), ['pts:image.generate', 'pts:image.logo']);
    assert.deepStrictEqual(plan[0].fields, { 'a|up': 0, 'a|down': 0, 'b|up': 0 });
    assert.deepStrictEqual(plan[1].fields, { 'a|up': 0, 'a|down': 0 });
    assert.ok(!('bozuk' in plan[1].fields));
  });

  it('görev ve araç kapsamı yalnızca o görev / araçtaki sayaçları seçer', () => {
    const one = planCounterReset(current, { taskId: 'image.generate', productId: 'b' });
    assert.strictEqual(one.length, 1);
    assert.deepStrictEqual(one[0].fields, { 'b|up': 0 });
    assert.deepStrictEqual(planCounterReset(current, { productId: 'a' }).map((p: { taskId: string }) => p.taskId), ['image.generate', 'image.logo']);
    assert.deepStrictEqual(planCounterReset(current, { productId: 'yok' }), []);
  });

  it('sayaçlar zaten 0 ise plan boş (tekrar çalıştırmak güvenli)', () => {
    assert.deepStrictEqual(planCounterReset(new Map([['t.x', { 'a|up': 0, 'a|down': '0' }]])), []);
  });

  it('oy kaydı seçimi: kapsama uyanlar; kaydı okunamayan anahtara dokunulmaz', () => {
    const entries = [
      { key: 'k1', record: { taskId: 'image.generate', productId: 'a', vote: 'up' } },
      { key: 'k2', record: { taskId: 'image.generate', productId: 'b', vote: 'down' } },
      { key: 'k3', record: { taskId: 'image.logo', productId: 'a', vote: 'up' } },
      { key: 'k4', record: null },
      { key: 'k5', record: 'bozuk' },
      { key: 'k6', record: { taskId: 5, productId: 'a' } },
    ];
    assert.deepStrictEqual(selectVoteKeys(entries), ['k1', 'k2', 'k3']);
    assert.deepStrictEqual(selectVoteKeys(entries, { taskId: 'image.generate' }), ['k1', 'k2']);
    assert.deepStrictEqual(selectVoteKeys(entries, { productId: 'a' }), ['k1', 'k3']);
    assert.deepStrictEqual(selectVoteKeys(entries, { taskId: 'image.logo', productId: 'b' }), []);
  });
});

describe('sayaç / oy kaydı tutarlılığı (sıfırlama sonrası aynı oy yeniden girebilmeli)', () => {
  const vote = { sessionId: 'sess_aaaaaaaa', taskId: 'text.write-longform', productId: 'gemini-25-pro', toolName: 'Gemini', vote: 'up' as const };

  it('TUZAK: yalnızca sayaçlar sıfırlanırsa (kayıt kalırsa) aynı oturumun aynı oyu puana girmez; backfill kayıttan geri getirir', async () => {
    const kv = fakeKv();
    await saveVote(vote, 1, kv);
    assert.deepStrictEqual(kv.hashes.get(pointsKey(vote.taskId)), { 'gemini-25-pro|up': 1 });

    kv.hashes.set(pointsKey(vote.taskId), { 'gemini-25-pro|up': 0 }); // eski reset: sadece sayaç
    await saveVote(vote, 2, kv); // aynı oy tekrar: sunucu "zaten verilmiş" sayar
    assert.deepStrictEqual(kv.hashes.get(pointsKey(vote.taskId)), { 'gemini-25-pro|up': 0 });

    // points:show bunu yakalar, backfill düzeltir
    const records = [...kv.data.values()] as { taskId: string; productId: string; vote: string }[];
    const { counts } = countVotes(records, new Set([`${vote.taskId}|${vote.productId}`]));
    const plan = planWrites(counts, new Map([[vote.taskId, kv.hashes.get(pointsKey(vote.taskId))!]]));
    assert.strictEqual(plan.length, 1);
    assert.deepStrictEqual(plan[0].fields, { 'gemini-25-pro|up': 1 });
    assert.ok(formatMismatchWarning(plan).join('\n').includes('UYARI: 1 görevde 1 sayaç'));
  });

  it('tam sıfırlama (sayaç + oy kaydı) sonrası aynı oy yeniden girer', async () => {
    const kv = fakeKv();
    await saveVote(vote, 1, kv);
    // reset-points --apply: sayaç 0, kapsamdaki oy kaydı silinir
    const plan = planCounterReset(new Map([[vote.taskId, kv.hashes.get(pointsKey(vote.taskId))!]]));
    kv.hashes.set(pointsKey(vote.taskId), { ...kv.hashes.get(pointsKey(vote.taskId)), ...plan[0].fields });
    for (const key of selectVoteKeys([...kv.data].map(([key, record]) => ({ key, record })))) kv.data.delete(key);

    await saveVote(vote, 2, kv);
    assert.deepStrictEqual(kv.hashes.get(pointsKey(vote.taskId)), { 'gemini-25-pro|up': 1 });
  });

  it('tutarlıyken uyarı yok', () => {
    assert.deepStrictEqual(formatMismatchWarning([]), []);
  });
});

describe('kaynak yapısı (puan sisteminin güvenlik kuralları)', () => {
  const read = (p: string) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

  it('feedback rotası: katalogda olmayan ürün/görev çifti KV\'ye yazılmadan reddedilir', () => {
    const src = read('app/api/feedback/route.ts');
    const check = src.indexOf('Bilinmeyen araç ya da görev');
    const save = src.indexOf('await saveVote(');
    assert.ok(check > 0 && save > check, 'doğrulama saveVote\'tan önce');
  });

  it('recommend rotası: kapatma anahtarı POINTS_RANKING=off ve sağlayıcı recommendV3\'e verilir', () => {
    const src = read('app/api/recommend/route.ts');
    assert.ok(src.includes("POINTS_RANKING === 'off'"));
    assert.ok(/recommendV3\([^)]*points/.test(src));
  });

  it('reset-points: varsayılan sadece gösterir; kapsamsız --apply için --all şart; yazma yalnızca --apply sonrası', () => {
    const src = read('scripts/reset-points.mjs');
    assert.ok(src.includes("apply && !taskId && !productId && !all"), '--all koruması');
    const guard = src.indexOf('if (!apply) {');
    const firstWrite = Math.min(...['kv.hset(', 'kv.del(', 'kv.srem('].map((w) => src.indexOf(w)));
    assert.ok(guard > 0 && firstWrite > guard, 'yazma çağrıları dry-run dalından sonra');
  });

  it('reset-points: oy kayıtları sayaçla birlikte silinir (tutarsız yarım sıfırlama yok)', () => {
    const src = read('scripts/reset-points.mjs');
    assert.ok(src.includes('kv.hset(') && src.includes('kv.del(') && src.includes('kv.srem('));
    assert.ok(!src.includes('withVotes'), 'oy kaydını koşula bağlayan bayrak kalmadı');
  });

  it('VoteButtons: aynı butona tekrar basınca da istek gider (sıfırlama sonrası oy yeniden girebilsin)', () => {
    const src = read('components/VoteButtons.tsx');
    assert.ok(!/if \(voted === vote\) return/.test(src));
    assert.ok(src.includes('fetch("/api/feedback"'));
  });

  it('iş akışı adımı: kanıtsız ana ve alternatif araç "Doğrulanmadı" işaretli', () => {
    const src = read('components/WorkflowStepCard.tsx');
    assert.ok(/step\.primary\.basis === "unverified"[^\n]*UnverifiedBadge/.test(src), 'ana araç rozeti');
    assert.ok(/step\.alternative\.basis === "unverified"/.test(src) && src.includes('dict.v3.unverified'), 'alternatif işareti');
  });

  it('admin puan ucu yetki ister ve sadece okur', () => {
    const src = read('app/api/admin/points/route.ts');
    assert.ok(src.includes('requireAdmin'));
    assert.ok(!/\b(hset|hincrby|del|set)\(/.test(src), 'yazma çağrısı yok');
  });

  it('istemci bileşenleri puan ya da oy sayısı göstermez', () => {
    for (const f of ['components/VoteButtons.tsx', 'components/SimpleRecommendationDisplay.tsx', 'components/WorkflowStepCard.tsx', 'components/NoEvidenceDisplay.tsx']) {
      assert.ok(!/rankingPoints|pointsFromVotes|lib\/points\/store/.test(read(f)), f);
    }
  });
});
