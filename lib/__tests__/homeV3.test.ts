// P13: /api/recommend (RECOMMENDER=v3) cevabı -> ana sayfa tipleri (lib/types.ts apiResponseFromV3).
import assert from 'node:assert';
import { describe, it } from 'node:test';
import { getDictionary } from '../i18n/index';
import { apiResponseFromV3 } from '../types';
import type { RecommendV3Result, RecommendationItem } from '../recommendV3';
import { product } from './catalogFixtures';

const dict = getDictionary('tr');
const label = { en: 'Generate an image', tr: 'Görsel üretme' };

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

describe('apiResponseFromV3', () => {
  it('recommendation -> simple kart: ana + alternatifler, v3 alanları (güven, gerekçe, tarih, kaynak), görev adı', () => {
    const r = apiResponseFromV3({
      kind: 'recommendation', taskId: 'image.generate', taskLabel: label, taskConfidence: 0.9, taskSource: 'rules',
      items: [item('a'), item('b', { confidence: 'low' })], relaxedConstraint: ['pricing'],
    }, dict);
    assert.ok(r && (r.type === 'simple'));
    if (!r || r.type !== 'simple') return;
    assert.strictEqual(r.taskLabel, 'Görsel üretme');
    assert.strictEqual(r.main.toolName, 'A');
    assert.strictEqual(r.main.description, 'a tr');
    assert.strictEqual(r.main.productId, 'a');
    assert.strictEqual(r.main.confidence, 'medium');
    assert.deepStrictEqual(r.main.sources, ['lmarena']);
    assert.strictEqual(r.main.dataDate, '2026-09-28');
    assert.strictEqual(r.main.why, undefined, 'v3 kartında kaynaksız "neden" metni yok');
    assert.deepStrictEqual(r.alternatives.map((a) => a.confidence), ['low']);
    assert.deepStrictEqual(r.relaxedConstraint, ['pricing']);
  });

  it('recommendation ama arayüz filtresi hepsini eledi (items boş) -> null (çağıran filtre mesajı gösterir)', () => {
    const r = apiResponseFromV3({ kind: 'recommendation', taskId: 'image.generate', taskLabel: label, taskConfidence: 1, taskSource: 'user', items: [] }, dict);
    assert.strictEqual(r, null);
  });

  it('clarify -> seçenekler (tekrarsız), dilin etiketiyle', () => {
    const r = apiResponseFromV3({
      kind: 'clarify',
      options: [
        { taskId: 'image.generate', label },
        { taskId: 'image.logo', label: { en: 'Logo', tr: 'Logo tasarımı' } },
        { taskId: 'image.generate', label },
      ],
    }, dict);
    assert.deepStrictEqual(r, { type: 'clarify', options: [{ taskId: 'image.generate', label: 'Görsel üretme' }, { taskId: 'image.logo', label: 'Logo tasarımı' }] });
  });

  it('no_evidence -> ürünler sırası korunur (sunucu alfabetik verir), puan/güven alanı YOK', () => {
    const r = apiResponseFromV3({ kind: 'no_evidence', taskId: 'image.generate', taskLabel: label, products: [product('a'), product('b')] }, dict);
    assert.ok(r && r.type === 'no_evidence');
    if (!r || r.type !== 'no_evidence') return;
    assert.deepStrictEqual(r.products.map((p) => p.toolName), ['A', 'B']);
    for (const p of r.products) {
      assert.strictEqual(p.confidence, undefined);
      assert.strictEqual(p.reasons, undefined);
    }
  });

  it('workflow -> kanıtlı adımda araç + alternatif; kanıtsız adımda durum metni + "Doğrulanmadı" listesi; filtreyle boşalan adımda filtre metni', () => {
    const result: RecommendV3Result = {
      kind: 'workflow', templateId: 'podcast-creation', templateName: 'Podcast',
      steps: [
        { order: 1, name: 'Bölüm metni', description: 'yaz', taskIds: ['text.write-longform'], items: [item('a'), item('b')], noEvidence: false },
        { order: 2, name: 'Seslendirme', description: 'seslendir', taskIds: ['audio.tts-voiceover'], items: [], noEvidence: true, products: [product('c'), product('d')], tips: ['ipucu'] },
        { order: 3, name: 'Kapak', description: 'kapak', taskIds: ['image.generate'], items: [], noEvidence: false },
      ],
    };
    const r = apiResponseFromV3(result, dict);
    assert.ok(r && r.type === 'workflow');
    if (!r || r.type !== 'workflow') return;
    const [s1, s2, s3] = r.workflow.steps;
    assert.strictEqual(s1.primary.toolName, 'A');
    assert.strictEqual(s1.alternative?.toolName, 'B');
    assert.strictEqual(s1.taskId, 'text.write-longform');
    assert.strictEqual(s2.primary.toolName, dict.workflow.noProduct);
    assert.strictEqual(s2.primary.description, 'Doğrulanmadı: C, D');
    assert.strictEqual(s2.primary.url, undefined, 'kanıtsız adımda link yok (araç önerilmiyor)');
    assert.deepStrictEqual(s2.tips, ['ipucu']);
    assert.strictEqual(s3.primary.toolName, dict.v3.stepFiltered);
    assert.strictEqual(r.workflow.totalSteps, 3);
  });
});

describe('apiResponseFromV3: editör seçimi', () => {
  it('basis editor ve gerekçe (dilde) karta taşınır; doğrulanmamış araçlar ayrı liste', () => {
    const r = apiResponseFromV3({
      kind: 'recommendation', taskId: 'code.website-builder', taskLabel: label, taskConfidence: 0.9, taskSource: 'rules',
      items: [item('a', { basis: 'editor', reasons: [], sources: [], editorNote: { en: 'why', tr: 'neden' } })],
      unverified: [product('b')],
    }, dict);
    assert.ok(r && r.type === 'simple');
    if (!r || r.type !== 'simple') return;
    assert.strictEqual(r.main.basis, 'editor');
    assert.strictEqual(r.main.editorNote, 'neden');
    assert.deepStrictEqual(r.unverified?.map((u) => u.toolName), ['B']);
  });
});
