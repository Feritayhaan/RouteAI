import assert from 'node:assert';
import { describe, it } from 'node:test';
import { autoMergeDecision } from '../../scripts/sync/automerge.mjs';

// Sahte modeller (gerçek veri değil): sadece karar kurallarını sınar.
const m = (id: string, releaseDate = '2026-01-01') => ({
  id, name: id, creator: 'OpenAI', aliases: [], modalities: ['text'], releaseDate,
  scores: [{ source: 'artificialanalysis', key: 'aa-index', value: 50, fetchedAt: '2026-09-20' }],
});
const many = (n: number) => Array.from({ length: n }, (_, i) => m(`model-${i}`));
const products = [{ id: 'p', name: 'Ürün', status: 'active', models: [], modelRule: { include: ['gpt'] } }];
const base = { changedFiles: ['data/models.json', 'data/sync-report.md'], products: [], anomaliesMd: '# x\n\n- yok\n' };

describe('gece PR otomatik merge kararı', () => {
  it('sadece veri dosyaları, sayı düşmedi, anormallik yok -> merge', () => {
    const d = autoMergeDecision({ ...base, oldModels: many(100), newModels: many(95) });
    assert.deepEqual(d, { ok: true, reasons: [] });
  });

  it('veri dışı dosya değiştiyse elle', () => {
    const d = autoMergeDecision({ ...base, changedFiles: ['data/models.json', 'data/products.json'], oldModels: many(10), newModels: many(10) });
    assert.equal(d.ok, false);
    assert.match(d.reasons[0], /data\/products\.json/);
  });

  it('ilk senkron her zaman elle', () => {
    const d = autoMergeDecision({ ...base, oldModels: [], newModels: many(50) });
    assert.equal(d.ok, false);
    assert.match(d.reasons[0], /İlk model senkronu/);
  });

  it("model sayısı %20'den fazla düşerse elle", () => {
    const d = autoMergeDecision({ ...base, oldModels: many(100), newModels: many(70) });
    assert.equal(d.ok, false);
    assert.match(d.reasons[0], /%30 düştü \(100 → 70\)/);
  });

  it('bir ürünün güncel modeli kaybolursa elle', () => {
    const d = autoMergeDecision({ ...base, products, oldModels: [...many(10), m('gpt-x')], newModels: many(11) });
    assert.equal(d.ok, false);
    assert.match(d.reasons.join(' '), /Güncel modeli kaybolan ürün: Ürün/);
  });

  it('sinyal anormalliği varsa elle', () => {
    const d = autoMergeDecision({ ...base, oldModels: many(10), newModels: many(10), anomaliesMd: '# x\n\n- p / t: son 24 saatte 9 olumlu\n' });
    assert.equal(d.ok, false);
    assert.match(d.reasons[0], /anormalli/);
  });
});
