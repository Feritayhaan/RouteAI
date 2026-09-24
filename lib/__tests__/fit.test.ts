import assert from 'node:assert';
import { describe, it } from 'node:test';
import { fit } from '../catalog/fit';
import { product, review, task } from './catalogFixtures';

const T = task();

describe('fit: sert filtreler', () => {
  it("fiyat: 'free' sadece tamamen ücretsiz; 'freeTier' freemium'u da kabul eder", () => {
    assert.strictEqual(fit(product('f', { pricing: 'free' }), T, { pricing: 'free' }).ok, true);
    assert.deepStrictEqual(fit(product('fm', { pricing: 'freemium' }), T, { pricing: 'free' }), { ok: false, failed: 'pricing', adjustment: 0, reasons: [] });
    assert.strictEqual(fit(product('fm', { pricing: 'freemium' }), T, { pricing: 'freeTier' }).ok, true);
    assert.strictEqual(fit(product('p', { pricing: 'paid' }), T, { pricing: 'freeTier' }).ok, false);
    assert.strictEqual(fit(product('p', { pricing: 'paid' }), T, { pricing: 'any' }).ok, true);
  });

  it('aylık bütçe: ücretsiz katman her bütçeye uyar; fiyatı bilinmeyen geçer ama işaretlenir', () => {
    assert.strictEqual(fit(product('p', { pricing: 'paid', price: 20 }), T, { maxMonthlyUsd: 10 }).failed, 'maxMonthlyUsd');
    assert.strictEqual(fit(product('p', { pricing: 'paid', price: 10 }), T, { maxMonthlyUsd: 10 }).ok, true);
    assert.strictEqual(fit(product('fm', { pricing: 'freemium', price: 50 }), T, { maxMonthlyUsd: 10 }).ok, true);
    const unknown = fit(product('u', { pricing: 'paid', price: null }), T, { maxMonthlyUsd: 10 });
    assert.strictEqual(unknown.ok, true);
    assert.deepStrictEqual(unknown.reasons.map((r) => r.code), ['price_unknown']);
  });

  it("platform: bilinmiyorsa geçer ('access_unknown'), biliniyorsa eşleşmeli", () => {
    const unknown = fit(product('u'), T, { access: ['mobile'] });
    assert.strictEqual(unknown.ok, true);
    assert.deepStrictEqual(unknown.reasons.map((r) => r.code), ['access_unknown']);
    assert.strictEqual(fit(product('w', { access: ['web'] }), T, { access: ['mobile'] }).failed, 'access');
    assert.strictEqual(fit(product('w', { access: ['web', 'mobile'] }), T, { access: ['mobile'] }).ok, true);
  });

  it("ticari kullanım: bilinmiyorsa geçer ('commercial_use_unknown'), 'no' elenir, 'paid-only' ücretsiz istekle elenir", () => {
    const facts = (commercialUse: 'yes' | 'no' | 'paid-only') => ({ commercialUse, source: 'https://example.com/terms', checkedAt: '2026-09-01' });
    assert.deepStrictEqual(fit(product('u'), T, { commercialUse: true }).reasons.map((r) => r.code), ['commercial_use_unknown']);
    assert.strictEqual(fit(product('n', { facts: facts('no') }), T, { commercialUse: true }).failed, 'commercialUse');
    assert.strictEqual(fit(product('y', { facts: facts('yes') }), T, { commercialUse: true }).reasons.length, 0);
    assert.deepStrictEqual(fit(product('po', { facts: facts('paid-only') }), T, { commercialUse: true }).reasons.map((r) => r.code), ['commercial_paid_only']);
    assert.strictEqual(fit(product('po', { pricing: 'free', facts: facts('paid-only') }), T, { commercialUse: true, pricing: 'free' }).failed, 'commercialUse');
  });
});

describe('fit: yeni başlayan düzeltmesi', () => {
  it('ease en fazla ±0.05 oynatır; rubrik yoksa 0', () => {
    const p = product('a');
    const easy = fit(p, T, { skill: 'beginner' }, [review('a', { quality: 3, ease: 5, value: 3, speed: 3 })]);
    assert.strictEqual(easy.adjustment, 0.05);
    assert.deepStrictEqual(easy.reasons, [{ code: 'easy_for_beginners', params: { ease: 5 } }]);
    const hard = fit(p, T, { skill: 'beginner' }, [review('a', { quality: 3, ease: 1, value: 3, speed: 3 })]);
    assert.strictEqual(hard.adjustment, -0.05);
    assert.strictEqual(fit(p, T, { skill: 'beginner' }).adjustment, 0);
    assert.strictEqual(fit(p, T, {}, [review('a', { quality: 3, ease: 5, value: 3, speed: 3 })]).adjustment, 0);
  });
});
