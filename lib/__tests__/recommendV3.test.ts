// P12: recommendV3 — görev tabanlı, kanıta dayalı öneri motoru.
//
// classifyTask (P11) daima GERÇEK katalogdan (data/tasks.json) okur, ctx
// parametresi almaz: bu yüzden sorgular gerçek anahtar kelimelerle kurulur.
// searchCatalog kısmı ise sentetik ctx (catalogFixtures) ile test edilir —
// kanıt/no_evidence/fiyat davranışını gerçek katalog verisinden bağımsız,
// deterministik kurmak için.

import assert from 'node:assert';
import { describe, it } from 'node:test';
import { recommendV3 } from '../recommendV3';
import { defaultSearchContext } from '../catalog/search';
import { arenaModels, ctx, product } from './catalogFixtures';

const noLLM = { allowLLM: false } as const;

describe('recommendV3: recommendation (kanıtlı ürün)', () => {
  it('kesin görev + kanıtlı ürün -> recommendation, ürün items\'ta', async () => {
    const fakeCtx = ctx({ products: [product('a', { models: ['m1'], pricing: 'freemium' })], models: arenaModels([1, 2, 3]) });
    const r = await recommendV3('resim oluşturmak istiyorum', 'all', { ...noLLM, ctx: fakeCtx });
    assert.strictEqual(r.kind, 'recommendation');
    if (r.kind !== 'recommendation') return;
    assert.strictEqual(r.taskId, 'image.generate');
    assert.strictEqual(r.taskSource, 'rules');
    assert.deepStrictEqual(r.items.map((i) => i.product.id), ['a']);
    assert.strictEqual(r.relaxedConstraint, undefined);
  });
});

describe('recommendV3: no_evidence (kanıtsız görev)', () => {
  it('görevin aktif ürünü var ama kanıtı yok -> no_evidence, ürünler alfabetik', async () => {
    const fakeCtx = ctx({ products: [product('b'), product('a')] }); // model/review/signal yok -> hasEvidence false
    const r = await recommendV3('resim oluşturmak istiyorum', 'all', { ...noLLM, ctx: fakeCtx });
    assert.strictEqual(r.kind, 'no_evidence');
    if (r.kind !== 'no_evidence') return;
    assert.strictEqual(r.taskId, 'image.generate');
    assert.deepStrictEqual(r.products.map((p) => p.id), ['a', 'b']);
  });
});

describe('recommendV3: clarify (belirsiz görev, iş akışı şablonu da yok)', () => {
  it('tamamen belirsiz sorgu -> clarify, üç seçenek', async () => {
    // Gerçek katalog: classifyTask'ın seçtiği 3 görev id'si her ne olursa
    // olsun tasksById içinde bulunur (40 görevin tamamı burada).
    const r = await recommendV3('bir şeyler yapmak istiyorum ama ne yapacağımı bilmiyorum', 'all', {
      ...noLLM,
      ctx: defaultSearchContext(),
    });
    assert.strictEqual(r.kind, 'clarify');
    if (r.kind !== 'clarify') return;
    assert.strictEqual(r.options.length, 3);
    for (const o of r.options) {
      assert.match(o.taskId, /^[a-z0-9]+\.[a-z0-9-]+$/);
      assert.ok(o.label.en && o.label.tr);
    }
  });
});

describe('recommendV3: workflow (projenin TÜMÜ isteniyor, tek görev değil)', () => {
  it('"podcast oluşturmak istiyorum" -> classifyTask belirsiz kalır, şablon workflow döner (P12 regresyon: tek parça değil)', async () => {
    const r = await recommendV3('podcast oluşturmak istiyorum', 'all', { ...noLLM, ctx: defaultSearchContext() });
    assert.strictEqual(r.kind, 'workflow');
    if (r.kind !== 'workflow') return;
    assert.strictEqual(r.templateId, 'podcast-creation');
    assert.ok(r.steps.length > 0 && r.steps.length <= 3);
    for (const step of r.steps) {
      assert.ok(step.taskIds.length > 0);
      assert.strictEqual(typeof step.noEvidence, 'boolean');
    }
  });

  it('"podcast kapağı" (projenin TEK PARÇASI) -> workflow DEĞİL, tek görev sonucu (P12 asıl düzeltme)', async () => {
    const fakeCtx = ctx({ products: [product('a', { models: ['m1'] })], models: arenaModels([1, 2, 3]) });
    const r = await recommendV3('podcast kapağı', 'all', { ...noLLM, ctx: fakeCtx });
    assert.notStrictEqual(r.kind, 'workflow');
    assert.strictEqual((r as { taskId?: string }).taskId, 'image.generate');
  });
});

describe('recommendV3: taskId (P13 clarify seçimi — aynı sorgu + görev)', () => {
  it('katalogdaki taskId verilirse sınıflandırma ve iş akışı atlanır; taskSource "user", taskLabel dolu', async () => {
    const fakeCtx = ctx({ products: [product('a', { models: ['m1'] })], models: arenaModels([1, 2, 3]) });
    // "podcast oluşturmak istiyorum" normalde workflow'a gider; kullanıcı image.generate seçti.
    const r = await recommendV3('podcast oluşturmak istiyorum', 'all', { ...noLLM, ctx: fakeCtx, taskId: 'image.generate' });
    assert.strictEqual(r.kind, 'recommendation');
    if (r.kind !== 'recommendation') return;
    assert.strictEqual(r.taskId, 'image.generate');
    assert.strictEqual(r.taskSource, 'user');
    assert.strictEqual(r.taskConfidence, 1);
    assert.deepStrictEqual(r.taskLabel, { en: 'image.generate', tr: 'image.generate' });
  });

  it('seçilen görevde kanıt yoksa no_evidence (taskLabel ile)', async () => {
    const fakeCtx = ctx({ products: [product('a')] });
    const r = await recommendV3('bir şeyler yapmak istiyorum', 'all', { ...noLLM, ctx: fakeCtx, taskId: 'image.generate' });
    assert.strictEqual(r.kind, 'no_evidence');
    if (r.kind !== 'no_evidence') return;
    assert.ok(r.taskLabel.tr);
  });

  it('sorgudaki fiyat kısıtı seçilen görevde de uygulanır (yumuşak, gevşerse bildirilir)', async () => {
    const fakeCtx = ctx({ products: [product('a', { models: ['m1'], pricing: 'paid' })], models: arenaModels([1, 2, 3]) });
    const r = await recommendV3('ücretsiz bir şey lazım', 'all', { ...noLLM, ctx: fakeCtx, taskId: 'image.generate' });
    assert.strictEqual(r.kind, 'recommendation');
    if (r.kind !== 'recommendation') return;
    assert.deepStrictEqual(r.relaxedConstraint, ['pricing']);
  });

  it('katalogda olmayan taskId yok sayılır: normal akış (hata fırlatmaz)', async () => {
    const r = await recommendV3('bir şeyler yapmak istiyorum ama ne yapacağımı bilmiyorum', 'all', {
      ...noLLM,
      ctx: defaultSearchContext(),
      taskId: 'yok.boyle-gorev',
    });
    assert.strictEqual(r.kind, 'clarify');
  });
});

describe('recommendV3: fiyat kısıtı — arayüz ASLA gevşemez, sorgudaki kısıt gevşer', () => {
  it('arayüz filtresi (free) sonucu boşaltabilir; bu bir hata değildir, relaxedConstraint arayüz filtresinden gelmez', async () => {
    // Sorgu fiyatı açıkça "ücretli" -> toSoftPricing 'paid' -> undefined (yumuşak kısıt YOK).
    // Tek kanıtlı ürün 'paid': searchCatalog'un kendi gevşetmesine hiç gerek kalmaz.
    const fakeCtx = ctx({ products: [product('a', { models: ['m1'], pricing: 'paid' })], models: arenaModels([1, 2, 3]) });
    const r = await recommendV3('ücretli resim oluşturmak istiyorum', 'free', { ...noLLM, ctx: fakeCtx });
    assert.strictEqual(r.kind, 'recommendation');
    if (r.kind !== 'recommendation') return;
    assert.deepStrictEqual(r.items, []); // arayüz filtresi ürünü elemiş, gevşetilmemiş
    assert.strictEqual(r.relaxedConstraint, undefined); // searchCatalog'un kendi tarafında gevşetme YOK
  });

  it('sorguda fiyat YOKSA kısıt da yok: ücretli ürün elenmez, "gevşettim" denmez (parser varsayılanı freemium kısıt değildir)', async () => {
    const fakeCtx = ctx({
      products: [product('a', { models: ['m2'], pricing: 'paid' }), product('b', { models: ['m1'], pricing: 'freemium' })],
      models: arenaModels([1, 2, 3]),
    });
    const r = await recommendV3('resim oluşturmak istiyorum', 'all', { ...noLLM, ctx: fakeCtx });
    assert.strictEqual(r.kind, 'recommendation');
    if (r.kind !== 'recommendation') return;
    assert.deepStrictEqual(r.items.map((i) => i.product.id), ['a', 'b']);
    assert.strictEqual(r.relaxedConstraint, undefined);
  });

  it('sorgudaki yumuşak kısıt ("ücretsiz") boş kalınca gevşer ve relaxedConstraint döner; arayüz filtresi ayrıca uygulanır', async () => {
    // Sorgu açıkça "ücretsiz" -> yumuşak 'free'. Tek kanıtlı ürün 'paid':
    // searchCatalog kendi kısıtını gevşetip 'a'yı bulur ve bunu bildirir.
    const fakeCtx = ctx({ products: [product('a', { models: ['m1'], pricing: 'paid' })], models: arenaModels([1, 2, 3]) });

    const allFilter = await recommendV3('ücretsiz resim oluşturmak istiyorum', 'all', { ...noLLM, ctx: fakeCtx });
    assert.strictEqual(allFilter.kind, 'recommendation');
    if (allFilter.kind !== 'recommendation') return;
    assert.deepStrictEqual(allFilter.items.map((i) => i.product.id), ['a']);
    assert.deepStrictEqual(allFilter.relaxedConstraint, ['pricing']);

    // Aynı senaryoda arayüz 'free' isterse: searchCatalog yine 'a'yı bulur
    // (kendi kısıtını gevşeterek), ama arayüz filtresi 'a' paid olduğu için
    // sonucu YİNE de boşaltır — arayüz kısıtı ASLA gevşemez.
    const freeFilter = await recommendV3('ücretsiz resim oluşturmak istiyorum', 'free', { ...noLLM, ctx: fakeCtx });
    assert.strictEqual(freeFilter.kind, 'recommendation');
    if (freeFilter.kind !== 'recommendation') return;
    assert.deepStrictEqual(freeFilter.items, []);
    assert.deepStrictEqual(freeFilter.relaxedConstraint, ['pricing']);
  });
});
