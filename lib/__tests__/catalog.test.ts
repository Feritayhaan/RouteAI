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
      () => buildCatalog({ tasks: tasksJson, products: productsJson, models: [], briefs: briefsJson, reviews: [badReview] }),
      /reviews\.json geçersiz/
    );
  });

  it('fiyat bayrakları model ile çelişirse reddedilir', () => {
    const products = structuredClone(productsJson) as { pricing: { free: boolean } }[];
    products[0].pricing.free = true; // Midjourney: model 'paid'
    assert.throws(
      () => buildCatalog({ tasks: tasksJson, products, models: [], briefs: briefsJson, reviews: [] }),
      /products\.json geçersiz/
    );
  });
});
