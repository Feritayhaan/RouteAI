import assert from 'node:assert';
import { describe, it } from 'node:test';
import { buildCatalog, loadCatalog } from '../catalog/index';
import tasksJson from '../../data/tasks.json';
import productsJson from '../../data/products.json';
import briefsJson from '../../data/briefs.json';

describe('katalog (lib/catalog)', () => {
  const catalog = loadCatalog();

  it('JSON dosyaları şemaya uyuyor ve bir kez yükleniyor', () => {
    assert.strictEqual(catalog.tasks.length, 40);
    assert.strictEqual(catalog.products.length, 96);
    assert.strictEqual(catalog.products.filter((p) => p.status === 'active').length, 56);
    assert.strictEqual(loadCatalog(), catalog);
  });

  it('productsByTask sadece aktif ürünleri içerir', () => {
    for (const [taskId, list] of catalog.productsByTask) {
      for (const p of list) {
        assert.strictEqual(p.status, 'active', `${taskId}: ${p.id}`);
        assert.ok(p.tasks.includes(taskId));
      }
    }
    assert.ok(catalog.productsByTask.get('slides.create')?.some((p) => p.name === 'Gamma AI'));
  });

  it('her görevin en az bir aktif ürünü var', () => {
    const empty = [...catalog.productsByTask].filter(([, list]) => list.length === 0).map(([id]) => id);
    assert.deepStrictEqual(empty, []);
  });

  it('rubrik 1–5 dışındaysa yükleme açık hatayla durur', () => {
    const badReview = {
      productId: 'gamma-ai', taskId: 'slides.create', briefId: 'slides-create-1',
      rubric: { quality: 6, ease: 5, value: 4, speed: 5 }, notes: {}, reviewer: 'test', date: '2026-01-01',
    };
    assert.throws(
      () => buildCatalog({ tasks: tasksJson, products: productsJson, models: [], briefs: briefsJson, reviews: [badReview], signals: [] }),
      /reviews\.json geçersiz/
    );
  });

  it('fiyat bayrakları model ile çelişirse reddedilir', () => {
    const products = structuredClone(productsJson) as { pricing: { free: boolean } }[];
    products[0].pricing.free = true; // Midjourney: model 'paid'
    assert.throws(
      () => buildCatalog({ tasks: tasksJson, products, models: [], briefs: briefsJson, reviews: [], signals: [] }),
      /products\.json geçersiz/
    );
  });
});

describe('editör seçimleri (data/editor-picks.json)', () => {
  it('gerçek dosya yüklenir; her seçim o görevde aktif bir ürün, görev başına tek', async () => {
    const { loadCatalog } = await import('../catalog/index');
    const c = loadCatalog();
    const seen = new Set<string>();
    for (const p of c.editorPicks) {
      const product = c.productsById.get(p.productId);
      assert.ok(product && product.status === 'active' && product.tasks.includes(p.taskId), `${p.taskId} -> ${p.productId}`);
      assert.ok(!seen.has(p.taskId));
      seen.add(p.taskId);
    }
  });

  it('görevde olmayan ürünü seçen dosya yüklemede patlar', async () => {
    const { buildCatalog, loadCatalog } = await import('../catalog/index');
    const real = loadCatalog();
    assert.throws(() => buildCatalog({
      tasks: real.tasks, products: real.products, models: [], briefs: real.briefs, reviews: [], signals: [],
      editorPicks: [{ taskId: 'code.website-builder', productId: 'suno-ai', reason: { en: 'x', tr: 'x' }, by: 't', date: '2026-09-28' }],
    }), /aktif bir ürün değil/);
  });
});
