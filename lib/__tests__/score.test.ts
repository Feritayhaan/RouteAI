import assert from 'node:assert';
import { describe, it } from 'node:test';
import { scoreProduct } from '../catalog/score';
import { searchCatalog } from '../catalog/search';
import type { Model } from '../catalog/schema';
import { rubricToE } from '../catalog/weights';
import { NOW, arenaModels, ctx, daysAgo, product, review, signal, task } from './catalogFixtures';

const T = task();
const score = (p: ReturnType<typeof product>, parts: Parameters<typeof ctx>[0]) => scoreProduct(p, T, ctx(parts));

describe('RouteAI Skoru: kanıt kuralı ve benchmark payı', () => {
  it('hiç kanıt yok -> önerilmez', () => {
    const p = product('a');
    const s = score(p, { products: [p] });
    assert.strictEqual(s.hasEvidence, false);
    assert.strictEqual(s.q, 0);
    assert.strictEqual(searchCatalog({ taskId: T.id }, ctx({ products: [p] })).items.length, 0);
  });

  it("2 kendi gözlem kanıt sayılmaz, 3 sayılır (MIN_OWN_N_AS_EVIDENCE)", () => {
    const p = product('a');
    assert.strictEqual(score(p, { products: [p], signals: [signal('a', { outcomes: { yes: 2, partial: 0, no: 0 } })] }).hasEvidence, false);
    assert.strictEqual(score(p, { products: [p], signals: [signal('a', { outcomes: { yes: 3, partial: 0, no: 0 } })] }).hasEvidence, true);
  });

  it("sadece benchmark -> benchmarkShare 1 ve 'benchmark_only'", () => {
    const p = product('a', { models: ['m2'] });
    const s = score(p, { products: [p], models: arenaModels([100, 200, 300]) });
    assert.strictEqual(s.benchmarkShare, 1);
    assert.strictEqual(s.components.B, 1);
    assert.strictEqual(s.q, 1);
    assert.ok(s.reasons.some((r) => r.code === 'benchmark_only'));
    assert.deepStrictEqual(s.reasons.find((r) => r.code === 'benchmark_rank')?.params, { source: 'lmarena', arena: 'text_to_image', rank: 1, total: 3, model: 'M2' });
  });

  it('models boşsa modelRule\'a uyan modeller benchmark kanıtı olur (Güncel model satırıyla aynı kaynak)', () => {
    const models = [
      ...arenaModels([100, 200, 300]),
      { id: 'acme-img-2', name: 'acme-img-2', creator: 'acme', aliases: [], modalities: ['image' as const], scores: [{ source: 'lmarena' as const, key: 'text_to_image', value: 250, fetchedAt: daysAgo(3) }] },
    ];
    const p = { ...product('a'), modelRule: { creator: 'Acme', include: ['acme-img'], modality: 'image' as const } };
    const s = score(p, { products: [p], models });
    assert.strictEqual(s.hasEvidence, true);
    assert.deepStrictEqual(s.reasons.find((r) => r.code === 'benchmark_rank')?.params, { source: 'lmarena', arena: 'text_to_image', rank: 2, total: 4, model: 'acme-img-2' });
  });

  it('elle bağlı models varsa modelRule kullanılmaz; ikisi de yoksa benchmark kanıtı yok', () => {
    const models = arenaModels([100, 200, 300]);
    const linked = { ...product('a', { models: ['m0'] }), modelRule: { include: ['M2'] } };
    assert.strictEqual(score(linked, { products: [linked], models }).components.benchmarks[0].modelId, 'm0');
    const bare = product('b');
    assert.strictEqual(score(bare, { products: [bare], models }).hasEvidence, false);
    const noMatch = { ...product('c'), modelRule: { include: ['yok-boyle-model'] } };
    assert.strictEqual(score(noMatch, { products: [noMatch], models }).hasEvidence, false);
  });

  it('yüzdelik: en iyi model, arenadaki TÜM modeller arasında; eşitler yarım sayılır', () => {
    const p = product('a', { models: ['m1'] });
    assert.strictEqual(score(p, { products: [p], models: arenaModels([100, 200, 300]) }).components.B, 0.5);
    const tie = product('b', { models: ['m0'] });
    assert.strictEqual(score(tie, { products: [tie], models: arenaModels([200, 200, 100]) }).components.B, 0.75);
  });

  it('benchmark + 90 "evet" -> pay 10/100 = 0.1; 91 ile %10\'un altı', () => {
    const p = product('a', { models: ['m2'] });
    const models = arenaModels([100, 200, 300]);
    const at90 = score(p, { products: [p], models, signals: [signal('a', { outcomes: { yes: 90, partial: 0, no: 0 } })] });
    assert.ok(at90.benchmarkShare <= 0.1);
    const at91 = score(p, { products: [p], models, signals: [signal('a', { outcomes: { yes: 91, partial: 0, no: 0 } })] });
    assert.ok(at91.benchmarkShare < 0.1);
    assert.ok(!at91.reasons.some((r) => r.code === 'benchmark_only'));
  });

  it('ASIL İLKE: benchmarkı yüksek ama iş sonucu kötü ürün, benchmarkı orta ama iş sonucu iyi ürünün gerisine düşer', () => {
    const models = arenaModels([100, 200, 300]);
    const high = product('high', { models: ['m2'] }); // B = 1
    const mid = product('mid', { models: ['m1'] }); // B = 0.5
    const parts = {
      products: [high, mid],
      models,
      signals: [
        signal('high', { outcomes: { yes: 5, partial: 0, no: 25 } }),
        signal('mid', { outcomes: { yes: 25, partial: 0, no: 5 } }),
      ],
    };
    const result = searchCatalog({ taskId: T.id }, ctx(parts));
    assert.deepStrictEqual(result.items.map((i) => i.product.id), ['mid', 'high']);

    // Gözlem yokken sıra benchmark'a göre
    const cold = searchCatalog({ taskId: T.id }, ctx({ ...parts, signals: [] }));
    assert.deepStrictEqual(cold.items.map((i) => i.product.id), ['high', 'mid']);
  });

  it('karşılaştırma kazanımları sırayı değiştirir', () => {
    const models = arenaModels([100, 200, 200, 300]);
    const a = product('a', { models: ['m1'] });
    const b = product('b', { models: ['m2'] });
    const base = searchCatalog({ taskId: T.id }, ctx({ products: [a, b], models }));
    assert.deepStrictEqual(base.items.map((i) => i.product.id), ['a', 'b']); // eşit q, ad sırası
    const after = searchCatalog({ taskId: T.id }, ctx({ products: [a, b], models, signals: [signal('b', { comparisons: { wins: 6, losses: 0 } }), signal('a', { comparisons: { wins: 0, losses: 6 } })] }));
    assert.deepStrictEqual(after.items.map((i) => i.product.id), ['b', 'a']);
    assert.deepStrictEqual(after.items[0].score.reasons.find((r) => r.code === 'comparison_wins')?.params, { wins: 6, losses: 0 });
  });

  it('uzman rubriği -> E: 5,5,5,5 = 1; 1,1,1,1 = 0; tüm 3 = 0.5', () => {
    assert.strictEqual(rubricToE({ quality: 5, ease: 5, value: 5, speed: 5 }), 1);
    assert.strictEqual(rubricToE({ quality: 1, ease: 1, value: 1, speed: 1 }), 0);
    assert.strictEqual(rubricToE({ quality: 3, ease: 3, value: 3, speed: 3 }), 0.5);
    const p = product('a');
    const s = score(p, { products: [p], reviews: [review('a', { quality: 5, ease: 5, value: 5, speed: 5 }), review('a', { quality: 1, ease: 1, value: 1, speed: 1 })] });
    assert.strictEqual(s.components.E, 0.5);
    assert.strictEqual(s.hasEvidence, true);
  });
});

describe('RouteAI Skoru: güven eşikleri', () => {
  const outcomes = (n: number, lastAt = daysAgo(1)) => signal('a', { outcomes: { yes: n, partial: 0, no: 0 }, lastAt });
  const p = product('a');

  it('kendi gözlem 9 / 10 / 11 -> low / medium / medium', () => {
    assert.strictEqual(score(p, { products: [p], signals: [outcomes(9)] }).confidence, 'low');
    assert.strictEqual(score(p, { products: [p], signals: [outcomes(10)] }).confidence, 'medium');
    assert.strictEqual(score(p, { products: [p], signals: [outcomes(11)] }).confidence, 'medium');
  });

  it('30 gözlem + en yeni gözlem 29 / 30 / 31 gün -> high / high / medium', () => {
    assert.strictEqual(score(p, { products: [p], signals: [outcomes(30, daysAgo(29))] }).confidence, 'high');
    assert.strictEqual(score(p, { products: [p], signals: [outcomes(30, daysAgo(30))] }).confidence, 'high');
    assert.strictEqual(score(p, { products: [p], signals: [outcomes(30, daysAgo(31))] }).confidence, 'medium');
    assert.strictEqual(score(p, { products: [p], signals: [outcomes(29, daysAgo(1))] }).confidence, 'medium');
  });

  it('benchmark ≤ 30 gün VE uzman değerlendirmesi -> medium; 31 gün -> low', () => {
    const withModel = product('a', { models: ['m1'] });
    const r = [review('a', { quality: 4, ease: 4, value: 4, speed: 4 })];
    assert.strictEqual(score(withModel, { products: [withModel], reviews: r, models: arenaModels([1, 2, 3], 'text_to_image', daysAgo(30)) }).confidence, 'medium');
    assert.strictEqual(score(withModel, { products: [withModel], reviews: r, models: arenaModels([1, 2, 3], 'text_to_image', daysAgo(31)) }).confidence, 'low');
    assert.strictEqual(score(withModel, { products: [withModel], models: arenaModels([1, 2, 3], 'text_to_image', daysAgo(1)) }).confidence, 'low');
  });
});

describe('RouteAI Skoru: gerekçeler, tarih, determinizm', () => {
  it('gerekçe kodları ve veri tarihleri', () => {
    const p = product('a', { models: ['m1'], pricing: 'freemium', checkedAt: daysAgo(90) });
    const s = score(p, {
      products: [p],
      models: arenaModels([1, 2, 3], 'text_to_image', daysAgo(10)),
      reviews: [review('a', { quality: 4, ease: 5, value: 3, speed: 4 }, 'image.generate', daysAgo(20))],
      signals: [signal('a', { outcomes: { yes: 3, partial: 2, no: 1 }, votes: { up: 3, down: 1 }, lastAt: daysAgo(2) })],
    });
    const codes = s.reasons.map((r) => r.code);
    assert.deepStrictEqual(codes, ['outcome_success', 'expert_rubric', 'benchmark_rank', 'users_like', 'free_tier', 'price_stale']);
    assert.deepStrictEqual(s.reasons[0].params, { pct: 67, n: 6 });
    assert.deepStrictEqual(s.reasons[3].params, { pct: 75, n: 4 });
    assert.deepStrictEqual(s.reasons[5].params, { days: 90 });
    assert.strictEqual(s.ownN, 7.2); // 6*1 + 4*0.3
    assert.strictEqual(s.dataDate, daysAgo(2));
    assert.strictEqual(s.oldestDataDate, daysAgo(20));
  });

  it('determinizm: aynı girdi aynı sonucu, ürün sırası sonucu değiştirmez', () => {
    const models = arenaModels([1, 2, 3, 4]);
    const ps = ['a', 'b', 'c', 'd'].map((id, i) => product(id, { models: [`m${i}`] }));
    const signals = [signal('c', { outcomes: { yes: 4, partial: 0, no: 0 } })];
    const r1 = searchCatalog({ taskId: T.id }, ctx({ products: ps, models, signals }));
    const r2 = searchCatalog({ taskId: T.id }, ctx({ products: [...ps].reverse(), models, signals }));
    assert.deepStrictEqual(r1, r2);
    assert.deepStrictEqual(scoreProduct(ps[0], T, ctx({ products: ps, models })), scoreProduct(ps[0], T, ctx({ products: ps, models })));
    assert.ok(NOW > 0);
  });
});

describe('RouteAI Skoru: LMArena alt kategori arenaları ve genel arenaya düşme', () => {
  const PARENT = 'text_to_image';
  const CAT = 'text_to_image/photorealistic';
  const CAT2 = 'text_to_image/text_rendering';
  const model = (id: string, scores: Record<string, number>): Model => ({
    id, name: id.toUpperCase(), creator: 'lab', aliases: [], modalities: ['image'],
    scores: Object.entries(scores).map(([key, value]) => ({ source: 'lmarena' as const, key, value, fetchedAt: daysAgo(3) })),
  });
  const taskOf = (...keys: string[]) => task('image.generate', keys.map((key) => ({ source: 'lmarena' as const, key })));
  const run = (t: ReturnType<typeof task>, ps: ReturnType<typeof product>[], models: Model[], extra: { categoryFallback?: boolean } = {}) =>
    ps.map((p) => scoreProduct(p, t, { ...ctx({ products: ps, tasks: [t], models }), ...extra }));
  const A = product('a', { models: ['m0'] });
  const B = product('b', { models: ['m2'] });

  it('kategoride veri varsa sıra kategoriden gelir (genel arenanın tersi olsa bile) ve gerekçe kategori anahtarını yazar', () => {
    const models = [model('m0', { [PARENT]: 100, [CAT]: 300 }), model('m1', { [PARENT]: 200, [CAT]: 200 }), model('m2', { [PARENT]: 300, [CAT]: 100 })];
    const [a, b] = run(taskOf(CAT), [A, B], models);
    assert.strictEqual(a.components.B, 1);
    assert.strictEqual(b.components.B, 0);
    assert.deepStrictEqual(a.reasons.find((r) => r.code === 'benchmark_rank')?.params, { source: 'lmarena', arena: CAT, rank: 1, total: 3, model: 'M0' });
    const [pa, pb] = run(taskOf(PARENT), [A, B], models);
    assert.strictEqual(pa.components.B, 0);
    assert.strictEqual(pb.components.B, 1);
  });

  it('kategoride hiç veri yoksa sonuç, görevin doğrudan genel arenaya bağlı olduğu hâlle BİREBİR aynıdır (sıralama değişmez)', () => {
    const models = arenaModels([100, 200, 300], PARENT);
    assert.deepStrictEqual(run(taskOf(CAT), [A, B], models), run(taskOf(PARENT), [A, B], models));
    const search = (t: ReturnType<typeof task>) => searchCatalog({ taskId: t.id }, ctx({ products: [A, B], tasks: [t], models })).items.map((i) => i.product.id);
    assert.deepStrictEqual(search(taskOf(CAT)), search(taskOf(PARENT)));
  });

  it('kategoride tek model varsa (MIN_ARENA_MODELS altı) genel arenaya düşer', () => {
    const models = [model('m0', { [PARENT]: 100, [CAT]: 999 }), model('m1', { [PARENT]: 200 }), model('m2', { [PARENT]: 300 })];
    const [a, b] = run(taskOf(CAT), [A, B], models);
    assert.strictEqual(a.components.benchmarks[0].arena, PARENT);
    assert.strictEqual(a.components.B, 0);
    assert.strictEqual(b.components.B, 1);
  });

  it('ürünün bağlı modeli kategoride yoksa o ürün genel arenadan ölçülür (kanıtı kaybolmaz); yedek kapalıysa B yok', () => {
    const models = [model('m0', { [PARENT]: 100 }), model('m1', { [PARENT]: 200, [CAT]: 10 }), model('m2', { [PARENT]: 300, [CAT]: 20 })];
    const [a, b] = run(taskOf(CAT), [A, B], models);
    assert.strictEqual(a.hasEvidence, true);
    assert.strictEqual(a.components.benchmarks[0].arena, PARENT, 'A kategoride yok -> genel arena');
    assert.strictEqual(b.components.benchmarks[0].arena, CAT, 'B kategoride var -> kategori');
    const [aOff, bOff] = run(taskOf(CAT), [A, B], models, { categoryFallback: false });
    assert.strictEqual(aOff.hasEvidence, false, 'yedek kapalı: kategoride olmayan ürün B\'siz kalır (denetimin "ne olurdu" hesabı)');
    assert.strictEqual(aOff.components.B, undefined);
    assert.strictEqual(bOff.components.benchmarks[0].arena, CAT);
  });

  it('düşülen genel arena görevde zaten varsa tekrar sayılmaz (yinelenen girdi yok)', () => {
    const models = arenaModels([100, 200, 300], PARENT);
    const [both] = run(taskOf(PARENT, CAT, CAT2), [A], models);
    const [single] = run(taskOf(PARENT), [A], models);
    assert.strictEqual(both.components.benchmarks.length, 1);
    assert.deepStrictEqual(both.components, single.components);
    const [onlyCats] = run(taskOf(CAT, CAT2), [A], models);
    assert.strictEqual(onlyCats.components.benchmarks.length, 1, 'iki kategori de genel arenaya düşse tek benchmark girdisi olur');
  });

  it('genel arena bir kategoriye düşmez: anahtarı "/" içermeyen arenada yedek yok', () => {
    const [a] = run(taskOf('text'), [A], arenaModels([100, 200, 300], PARENT));
    assert.strictEqual(a.hasEvidence, false);
  });

  it('iki kategori ve Artificial Analysis girdisi eşit ağırlıkla ortalanır (B 4 basamağa yuvarlanır)', () => {
    const withAa = (id: string, scores: Record<string, number>, aa: number): Model => {
      const m = model(id, scores);
      return { ...m, scores: [...m.scores, { source: 'artificialanalysis' as const, key: 'text-to-image', value: aa, fetchedAt: daysAgo(3) }] };
    };
    const models = [withAa('m0', { [CAT]: 300, [CAT2]: 100 }, 1000), withAa('m1', { [CAT]: 200, [CAT2]: 200 }, 1100), withAa('m2', { [CAT]: 100, [CAT2]: 300 }, 1200)];
    const t = task('image.generate', [{ source: 'lmarena', key: CAT }, { source: 'lmarena', key: CAT2 }, { source: 'artificialanalysis', key: 'text-to-image' }]);
    const [a] = run(t, [A], models);
    assert.strictEqual(a.components.benchmarks.length, 3);
    // m0: CAT 1, CAT2 0, AA 0 -> 1/3. Not: iki LMArena girdisi AA'nın payını 1/2'den 1/3'e düşürür (bilinen yan etki).
    assert.strictEqual(a.components.B, 0.3333);
  });
});
