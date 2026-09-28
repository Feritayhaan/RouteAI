// P14: tarihsiz ya da 60 günden eski fiyat ekranda tutar olarak gösterilmez.
import assert from 'node:assert';
import { describe, it } from 'node:test';
import { PRICE_UNVERIFIED_LABEL, displayPriceLabel, isPriceVerified, makePricing } from '../pricing';

const NOW = Date.parse('2026-09-28T12:00:00Z');

describe('fiyat tazeliği (PRICE_STALE_AFTER_DAYS = 60)', () => {
  it('60 gün içinde doğrulanmış tutar gösterilir', () => {
    const p = makePricing('freemium', 20, '2026-09-01');
    assert.strictEqual(isPriceVerified(p, NOW), true);
    assert.strictEqual(displayPriceLabel(p, NOW), '$20/ay');
  });

  it('60 günden eski ya da tarihsiz tutar gösterilmez: "Fiyat doğrulanmadı"', () => {
    const old = makePricing('paid', 10, '2025-11-28');
    const undated = makePricing('freemium', 15, null);
    assert.strictEqual(isPriceVerified(old, NOW), false);
    assert.strictEqual(displayPriceLabel(old, NOW), PRICE_UNVERIFIED_LABEL);
    assert.strictEqual(displayPriceLabel(undated, NOW), PRICE_UNVERIFIED_LABEL);
    assert.strictEqual(displayPriceLabel(undefined, NOW), PRICE_UNVERIFIED_LABEL);
  });

  it('ücretsiz model tutar içermez: "Ücretsiz" kalır', () => {
    assert.strictEqual(displayPriceLabel(makePricing('free'), NOW), 'Ücretsiz');
  });

  it('gerçek katalog: bugün hiçbir aktif ürünün tutarı eski rakamla gösterilmez', async () => {
    const { loadCatalog } = await import('../catalog/index');
    for (const p of loadCatalog().products.filter((x) => x.status === 'active')) {
      const label = displayPriceLabel(p.pricing, NOW);
      if (!isPriceVerified(p.pricing, NOW)) assert.ok(label === PRICE_UNVERIFIED_LABEL || label === 'Ücretsiz', `${p.id}: ${label}`);
    }
  });
});
