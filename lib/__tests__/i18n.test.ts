import assert from 'node:assert';
import { describe, it } from 'node:test';
import { en } from '../i18n/en';
import { tr } from '../i18n/tr';
import { format, priceText, reasonText, resolveLocale } from '../i18n/index';
import { makePricing } from '../pricing';

function keys(obj: object, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === 'object' && !Array.isArray(v) ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`]
  ).sort();
}

describe('i18n', () => {
  it('en ve tr aynı anahtar kümesini taşır (derleme zamanında da zorunlu)', () => {
    assert.deepStrictEqual(keys(tr), keys(en));
    assert.strictEqual(tr.home.examples.length, en.home.examples.length);
  });

  it('dil seçimi: ?lang > Accept-Language (q sırası) > en', () => {
    assert.strictEqual(resolveLocale({ lang: 'tr', acceptLanguage: 'en-US' }), 'tr');
    assert.strictEqual(resolveLocale({ lang: 'de', acceptLanguage: 'tr-TR,tr;q=0.9' }), 'tr');
    assert.strictEqual(resolveLocale({ acceptLanguage: 'de-DE,en;q=0.5,tr;q=0.8' }), 'tr');
    assert.strictEqual(resolveLocale({ acceptLanguage: 'fr-FR' }), 'en');
    assert.strictEqual(resolveLocale({}), 'en');
  });

  it('gerekçe şablonları: arena ve kaynak adı sözlükten değil sabitlerden, atıf görünür', () => {
    const r = { code: 'benchmark_rank', params: { source: 'lmarena', arena: 'text_to_image', rank: 3, total: 40 } };
    assert.strictEqual(reasonText(en, r), '#3 of 40 on Text-to-Image (LMArena)');
    assert.strictEqual(reasonText(tr, r), 'Text-to-Image sıralamasında 40 model içinde 3. (LMArena)');
    assert.strictEqual(reasonText(en, { code: 'comparison_wins', params: { wins: 6, losses: 2 } }), 'Won 6 of 8 head-to-head comparisons');
    assert.strictEqual(reasonText(tr, { code: 'outcome_success', params: { pct: 43, n: 12 } }), 'İşini gördü diyenler: %43 (12 kullanıcı)');
    assert.strictEqual(reasonText(en, { code: 'bilinmeyen' }), null);
  });

  it('her skor/fit gerekçe kodunun iki dilde de şablonu var', () => {
    const codes = ['outcome_success', 'comparison_wins', 'expert_rubric', 'benchmark_rank', 'users_like', 'free_tier', 'price_stale', 'benchmark_only',
      'commercial_use_unknown', 'commercial_paid_only', 'access_unknown', 'price_unknown', 'easy_for_beginners'];
    for (const code of codes) {
      assert.ok(code in en.reasons && code in tr.reasons, code);
    }
  });

  it('fiyat metni lib/pricing kuralıyla, dile göre', () => {
    assert.strictEqual(priceText(tr, makePricing('free')), 'Ücretsiz');
    assert.strictEqual(priceText(en, makePricing('paid', 12, '2026-09-01')), 'from $12/mo');
    assert.strictEqual(priceText(tr, makePricing('freemium', null)), 'Fiyat bilinmiyor');
  });

  it('format: bilinmeyen yer tutucu olduğu gibi kalır', () => {
    assert.strictEqual(format('{a} ve {b}', { a: 1 }), '1 ve {b}');
  });
});
