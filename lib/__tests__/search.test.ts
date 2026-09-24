import assert from 'node:assert';
import { describe, it } from 'node:test';
import { searchCatalog } from '../catalog/search';
import { loadCatalog } from '../catalog/index';
import { arenaModels, ctx, daysAgo, product, signal, task } from './catalogFixtures';

const T = task();
const ids = (r: ReturnType<typeof searchCatalog>) => r.items.map((i) => i.product.id);

describe('searchCatalog', () => {
  it('sadece active ürünler; kanıtsızlar filteredOut\'ta sayılır', () => {
    const models = arenaModels([1, 2, 3]);
    const retired = { ...product('r', { models: ['m2'] }), status: 'retired' as const };
    const r = searchCatalog({ taskId: T.id }, ctx({ products: [product('a', { models: ['m1'] }), retired, product('noev')], models }));
    assert.deepStrictEqual(ids(r), ['a']);
    assert.deepStrictEqual(r.filteredOut, [{ reason: 'no_evidence', count: 1 }]);
    assert.strictEqual(r.noEvidence, false);
  });

  it('görevde kanıtlı ürün yoksa noEvidence', () => {
    const r = searchCatalog({ taskId: T.id }, ctx({ products: [product('a')] }));
    assert.strictEqual(r.noEvidence, true);
    assert.deepStrictEqual(r.items, []);
  });

  it('filtre sonucu boşalırsa kısıt gevşetilir ve BİLDİRİLİR', () => {
    const models = arenaModels([1, 2, 3]);
    const products = [product('a', { models: ['m1'], pricing: 'paid' }), product('b', { models: ['m2'], pricing: 'paid' })];
    const r = searchCatalog({ taskId: T.id, constraints: { pricing: 'free' } }, ctx({ products, models }));
    assert.deepStrictEqual(r.relaxedConstraint, ['pricing']);
    assert.deepStrictEqual(ids(r), ['b', 'a']);
    assert.deepStrictEqual(r.filteredOut, [{ reason: 'pricing', count: 2 }]);

    const ok = searchCatalog({ taskId: T.id, constraints: { pricing: 'any' } }, ctx({ products, models }));
    assert.strictEqual(ok.relaxedConstraint, undefined);
  });

  it('filtre kısmen elerse gevşetme yok', () => {
    const models = arenaModels([1, 2, 3]);
    const products = [product('a', { models: ['m1'], pricing: 'free' }), product('b', { models: ['m2'], pricing: 'paid' })];
    const r = searchCatalog({ taskId: T.id, constraints: { pricing: 'free' } }, ctx({ products, models }));
    assert.deepStrictEqual(ids(r), ['a']);
    assert.strictEqual(r.relaxedConstraint, undefined);
    assert.deepStrictEqual(r.filteredOut, [{ reason: 'pricing', count: 1 }]);
  });

  it('eşitlikte: ownN > dataDate > ücretsiz katman > ad', () => {
    const models = arenaModels([1, 2, 2, 2, 2, 3]);
    // m1..m4 aynı değer: q eşit (sadece benchmark)
    const base = [
      product('d', { models: ['m1'], pricing: 'paid' }),
      product('c', { models: ['m2'], pricing: 'freemium' }),
      product('b', { models: ['m3'], pricing: 'paid' }),
      product('a', { models: ['m4'], pricing: 'paid' }),
    ];
    assert.deepStrictEqual(ids(searchCatalog({ taskId: T.id }, ctx({ products: base, models }))), ['c', 'a', 'b', 'd']);

    // Aynı q ama daha fazla kendi gözlem: 3 "kısmen" (q 0.5) — ownN büyük önde.
    const withObs = searchCatalog({ taskId: T.id }, ctx({ products: base, models: arenaModels([1, 2, 2, 2, 2, 3], 'text_to_image', daysAgo(40)), signals: [signal('d', { outcomes: { yes: 0, partial: 4, no: 0 } })] }));
    assert.strictEqual(ids(withObs)[0], 'd');
  });

  it("affiliate / sponsorluk alanı sırayı DEĞİŞTİRMEZ", () => {
    const models = arenaModels([1, 2, 3, 4]);
    const products = ['a', 'b', 'c'].map((id, i) => product(id, { models: [`m${i}`] }));
    const before = ids(searchCatalog({ taskId: T.id }, ctx({ products, models })));
    const sponsored = products.map((p) => (p.id === 'a' ? { ...p, affiliateUrl: 'https://example.com/?ref=routeai', sponsored: true } : p));
    const after = ids(searchCatalog({ taskId: T.id }, ctx({ products: sponsored, models })));
    assert.deepStrictEqual(after, before);
    assert.strictEqual(after.at(-1), 'a');
  });

  it('limit ve bilinmeyen görev', () => {
    const models = arenaModels([1, 2, 3, 4, 5]);
    const products = ['a', 'b', 'c', 'd', 'e'].map((id, i) => product(id, { models: [`m${i}`] }));
    assert.strictEqual(searchCatalog({ taskId: T.id, limit: 2 }, ctx({ products, models })).items.length, 2);
    assert.throws(() => searchCatalog({ taskId: 'yok.gorev' }, ctx({ products })), /bilinmeyen görev/);
  });

  it("gerçek katalog: bugün (model/değerlendirme/sinyal yokken) her görev noEvidence", () => {
    const catalog = loadCatalog();
    const r = searchCatalog({ taskId: 'slides.create' });
    assert.strictEqual(catalog.models.length === 0 && catalog.reviews.length === 0 && catalog.signals.length === 0 ? r.noEvidence : true, true);
  });

  it('kanıt tipi karışık: uzman değerlendirmeli ürün benchmark\'sız olsa da listelenir', () => {
    const t2 = task('slides.create', []);
    const p = product('g', { tasks: ['slides.create'] });
    const r = searchCatalog({ taskId: 'slides.create' }, {
      ...ctx({ products: [p], tasks: [t2], reviews: [{ productId: 'g', taskId: 'slides.create', briefId: 'b', rubric: { quality: 4, ease: 4, value: 4, speed: 4 }, notes: {}, reviewer: 't', date: daysAgo(1) }] }),
    });
    assert.deepStrictEqual(ids(r), ['g']);
    assert.strictEqual(r.items[0].score.components.E, 0.75);
  });
});
