// Alternatif araçlar açılır kutu: tıklayınca siteye gitmez, ana araçtakiyle aynı ayrıntı açılır.
// Ekran bileşeni (components/ToolDetail.tsx) tarayıcıda denenir; burada kural ve veri sözleşmesi kilitlenir.
import assert from 'node:assert';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { getDictionary } from '../i18n/index';
import { apiResponseFromV3 } from '../types';
import type { RecommendationTool } from '../types';
import type { RecommendationItem } from '../recommendV3';
import { reasonsKind } from '../toolDetail';
import { product } from './catalogFixtures';

const dict = getDictionary('tr');
const label = { en: 'Generate an image', tr: 'Görsel üretme' };
const tool = (extra: Partial<RecommendationTool> = {}): RecommendationTool => ({ toolName: 'A', description: 'a', ...extra });

function item(id: string, extra: Partial<RecommendationItem> = {}): RecommendationItem {
  return {
    product: { ...product(id), description: { en: `${id} en`, tr: `${id} tr` } },
    confidence: 'medium',
    reasons: [{ code: 'benchmark_rank', params: { source: 'lmarena', arena: 'text_to_image', rank: 2, total: 40 } }],
    dataDate: '2026-09-28',
    sources: ['lmarena'],
    basis: 'evidence',
    ...extra,
  };
}

describe('ayrıntıda hangi "neden" gösterilir (ana öneri ve alternatifler aynı kural)', () => {
  it('editör > doğrulanmadı > skor gerekçeleri > eski tek cümle > hiçbiri', () => {
    assert.strictEqual(reasonsKind(tool({ basis: 'editor', reasons: [{ code: 'x' }], why: 'w' })), 'editor');
    assert.strictEqual(reasonsKind(tool({ basis: 'unverified', reasons: [{ code: 'x' }] })), 'unverified');
    assert.strictEqual(reasonsKind(tool({ basis: 'evidence', reasons: [{ code: 'x' }], why: 'w' })), 'reasons');
    assert.strictEqual(reasonsKind(tool({ reasons: [] })), 'reasons', 'boş gerekçe listesi de v3 kartıdır');
    assert.strictEqual(reasonsKind(tool({ why: 'w' })), 'why');
    assert.strictEqual(reasonsKind(tool()), 'none');
  });

  it('"Diğer araçlar" listesi basis alanı olmasa da doğrulanmamış sayılır; editör seçimi yine editör kalır', () => {
    assert.strictEqual(reasonsKind(tool(), true), 'unverified');
    assert.strictEqual(reasonsKind(tool({ reasons: [{ code: 'x' }] }), true), 'unverified');
    assert.strictEqual(reasonsKind(tool({ basis: 'editor' }), true), 'editor');
  });
});

describe('açılır alternatifin ihtiyaç duyduğu veri', () => {
  const result = apiResponseFromV3({
    kind: 'recommendation', taskId: 'image.generate', taskLabel: label, taskConfidence: 0.9, taskSource: 'rules',
    items: [item('a'), item('b', { confidence: 'low' }), item('c', { confidence: 'high', basis: 'editor', editorNote: { en: 'note', tr: 'not' } })],
    unverified: [product('d'), product('e')],
  }, dict);

  it('her alternatif ve "diğer araç": ad, açıklama, site, fiyat ve ürün id taşır (ayrıntı boş kalmaz)', () => {
    assert.ok(result && result.type === 'simple');
    if (!result || result.type !== 'simple') return;
    for (const t of [...result.alternatives, ...(result.unverified ?? [])]) {
      assert.ok(t.toolName && t.description && t.url && t.pricing && t.productId, JSON.stringify(t));
    }
    assert.strictEqual(result.alternatives.length, 2);
    assert.strictEqual(result.unverified?.length, 2);
  });

  it('alternatifte güven, gerekçe ve veri tarihi var; "diğer araç"ta basis yok (liste doğrulanmadı bayrağıyla çizilir)', () => {
    if (!result || result.type !== 'simple') return assert.fail();
    const [b, c] = result.alternatives;
    assert.strictEqual(b.confidence, 'low');
    assert.ok(b.reasons && b.dataDate && b.sources);
    assert.strictEqual(reasonsKind(b), 'reasons');
    assert.strictEqual(reasonsKind(c), 'editor');
    for (const u of result.unverified ?? []) {
      assert.strictEqual(u.basis, undefined);
      assert.strictEqual(reasonsKind(u), 'none');
      assert.strictEqual(reasonsKind(u, true), 'unverified');
    }
  });
});

describe('ekran kaynak kilidi', () => {
  const home = readFileSync('components/SimpleRecommendationDisplay.tsx', 'utf8');
  const detail = readFileSync('components/ToolDetail.tsx', 'utf8');

  it('alternatif listeleri düz bağlantı değil AlternativeTool; "Araca Git" sadece ayrıntı parçasında', () => {
    assert.doesNotMatch(home, /href=\{alt\.url\}/, 'alternatif satırı artık siteye gitmez');
    assert.strictEqual((home.match(/<AlternativeTool/g) ?? []).length, 2, 'alternatifler + diğer araçlar');
    assert.match(home, /<AlternativeTool[^>]*unverified/, '"Diğer araçlar" doğrulanmamış bayrağıyla');
    assert.doesNotMatch(home, /Araca Git/, 'düğme ToolActions içinde, tek yerde');
    assert.strictEqual((detail.match(/<span>Araca Git<\/span>/g) ?? []).length, 1);
  });

  it('satır bir düğme: aria-expanded, açıkken aria-controls, panel region; oy düğmeleri satırın yanında', () => {
    assert.match(detail, /<button[\s\S]{0,200}aria-expanded=\{open\}/);
    assert.match(detail, /aria-controls=\{open \? panelId : undefined\}/);
    assert.match(detail, /role="region" aria-labelledby=\{buttonId\}/);
    assert.match(detail, /<VoteButtons /);
  });

  it('açıklama metni iki dilde var', () => {
    assert.ok(getDictionary('tr').rec.altHint.length > 0);
    assert.ok(getDictionary('en').rec.altHint.length > 0);
  });
});
