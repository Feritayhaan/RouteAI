// Sorgu-araç uyumu (7 boyut), karşılaştırmalı kanıt ve dinamik model çözümlemesi.
// Katalog parçaları elle kurulur (catalogFixtures): sayılar senaryo içindir,
// kanıtların bu sayılardan TÜRETİLDİĞİ (uydurulmadığı) doğrulanır.

import assert from 'node:assert';
import { describe, it } from 'node:test';
import { ctx, daysAgo, product, signal, task } from './catalogFixtures';
import { detectNeeds, headToHead, productFit } from '../catalog/queryFit';
import { arenaBenchmark } from '../catalog/score';
import { searchCatalog } from '../catalog/search';
import { normalizeModelKey, resolveCurrentModel, resolveModelIds } from '../catalog/currentModel';
import { recommendV3 } from '../recommendV3';
import { apiResponseFromV3 } from '../types';
import { getDictionary } from '../i18n/index';
import type { Model, Task } from '../catalog/schema';

const chatTask: Task = { ...task('chat.general-assistant', [{ source: 'lmarena', key: 'text' }]), modality: 'text', outputTypes: ['text'] };

const model = (id: string, scores: [string, number][], extra: Partial<Model> = {}): Model => ({
  id, name: id.toUpperCase(), creator: 'lab', aliases: [], modalities: ['text'],
  scores: scores.map(([key, value]) => ({ source: 'lmarena' as const, key, value, fetchedAt: daysAgo(2) })),
  ...extra,
});

// A: genel metinde en iyi, web araması ve doküman arenasında yok.
// B: metinde biraz geride, web araması ve uzun dokümanda birinci.
const MODELS: Model[] = [
  model('ma', [['text', 1300]]),
  model('mb', [['text', 1295], ['search', 1250], ['document', 1250]]),
  ...Array.from({ length: 8 }, (_, i) => model(`f${i}`, [['text', 1200 - i * 10], ['search', 1100 - i], ['document', 1100 - i]])),
];
const A = product('alpha', { models: ['ma'], tasks: [chatTask.id], pricing: 'paid', price: 20 });
const B = product('beta', { models: ['mb'], tasks: [chatTask.id], pricing: 'freemium' });
const C = ctx({ products: [A, B], tasks: [chatTask], models: MODELS });

describe('detectNeeds: 7 evrensel boyut (TR/EN)', () => {
  it('boyutlar sorgudan; görev türüne uymayan boyut eklenmez; kelime sınırı ("idea" ≠ "ide")', () => {
    const img: Pick<Task, 'id' | 'modality'> = { id: 'image.edit', modality: 'image' };
    const code: Pick<Task, 'id' | 'modality'> = { id: 'code.assistant-ide', modality: 'code' };
    assert.deepStrictEqual(detectNeeds('300 sayfalık sözleşmeyi Türkçe özetle', chatTask), { dimensions: ['language', 'longContext', 'signals'], language: 'tr' });
    assert.deepStrictEqual(detectNeeds('Summarize today\'s news with citations', chatTask).dimensions, ['liveWeb', 'signals']);
    assert.deepStrictEqual(detectNeeds('Karmaşık bir hukuk problemini adım adım çöz', chatTask).dimensions, ['reasoning', 'signals']);
    assert.deepStrictEqual(detectNeeds('I have an idea for a startup', chatTask).dimensions, ['signals']);
    assert.deepStrictEqual(detectNeeds('VS Code içinde React projemde yardım', code).outputArena, { source: 'lmarena', key: 'webdev' });
    assert.deepStrictEqual(detectNeeds('Ürün fotoğrafının arka planını sil, tamamen ücretsiz', img), { dimensions: ['outputControl', 'budget', 'signals'], outputArena: { source: 'lmarena', key: 'image_edit' }, budget: 'free' });
    assert.deepStrictEqual(detectNeeds('uzun bir doküman gibi poster', img).dimensions, ['signals'], 'görselde uzun doküman boyutu yok');
    assert.deepStrictEqual(detectNeeds('Üzerinde yazı olan poster', img), { dimensions: ['outputControl', 'signals'] }, 'arenası olmayan kontrol: ölçülmedi olarak işaretlenecek');
  });
});

describe('dinamik puanlama: aynı görev, farklı ihtiyaç -> farklı sıra', () => {
  const run = (query: string) => searchCatalog({ taskId: chatTask.id, needs: detectNeeds(query, chatTask) }, C);

  it('genel sorguda metin arenasında önde olan, web/kaynak ve uzun doküman isteyende o boyutta ölçülen öne geçer', () => {
    assert.deepStrictEqual(run('Bana yardımcı olacak bir asistan').items.map((i) => i.product.id), ['alpha', 'beta']);
    assert.deepStrictEqual(run('Güncel haberleri kaynaklarıyla özetleyen asistan').items.map((i) => i.product.id), ['beta', 'alpha']);
    assert.deepStrictEqual(run('Analyze a 300 page contract for me').items.map((i) => i.product.id), ['beta', 'alpha']);
    assert.deepStrictEqual(run('Ucuz, bütçeme uygun bir asistan').items.map((i) => i.product.id), ['beta', 'alpha'], 'bütçe: ücretsiz katman');
  });

  it('q değişmez, sadece sıralama anahtarı; ayarlama en fazla ±0.15', () => {
    const plain = searchCatalog({ taskId: chatTask.id }, C);
    const web = run('güncel haberler, kaynaklı');
    for (const item of web.items) {
      const base = plain.items.find((p) => p.product.id === item.product.id)!;
      assert.strictEqual(item.score.q, base.score.q);
      assert.ok(Math.abs(item.queryFit!.adjustment) <= 0.15);
    }
  });

  it('ölçülemeyen boyut uydurulmaz: dil verisi yoksa measured=false ve ayarlama 0', () => {
    const fit = productFit(A, chatTask, detectNeeds('Türkçe cevap veren asistan', chatTask), C);
    assert.deepStrictEqual(fit.measures.find((m) => m.dimension === 'language'), { dimension: 'language', measured: false });
    assert.strictEqual(fit.adjustment, 0);
    const withFacts = product('gamma', { models: ['ma'], tasks: [chatTask.id], facts: { languages: ['tr', 'en'], source: 'https://example.com/langs', checkedAt: daysAgo(10) } });
    const tr = productFit(withFacts, chatTask, detectNeeds('Türkçe cevap veren asistan', chatTask), C);
    assert.deepStrictEqual(tr.measures.find((m) => m.dimension === 'language'), { dimension: 'language', measured: true, value: 1, supports: true });
  });

  it('Bayesçi: kendi kanıtımız (iş sonucu) arttıkça sorgu uyumunun etkisi küçülür', () => {
    const needs = detectNeeds('güncel haberler, kaynaklı', chatTask);
    const cold = productFit(B, chatTask, needs, C, { ownN: 0 }).adjustment;
    const warm = productFit(B, chatTask, needs, C, { ownN: 90 }).adjustment;
    assert.ok(cold > 0 && warm > 0 && warm < cold / 5, `${cold} -> ${warm}`);
    // Çok iş sonucu olan ürün sinyaliyle öne geçer: kanıt esastır.
    const signals = [signal('alpha', { outcomes: { yes: 60, partial: 0, no: 0 } }, chatTask.id), signal('beta', { outcomes: { yes: 10, partial: 0, no: 50 } }, chatTask.id)];
    const res = searchCatalog({ taskId: chatTask.id, needs }, ctx({ products: [A, B], tasks: [chatTask], models: MODELS, signals }));
    assert.strictEqual(res.items[0].product.id, 'alpha');
  });
});

describe('karşılaştırmalı kanıt: sadece ölçülmüş farklar', () => {
  it('kenarlar katalogdaki gerçek arena sıralarından türetilir', async () => {
    const r = await recommendV3('Güncel haberleri kaynaklarıyla özetleyen asistan', 'all', { ctx: C, taskId: chatTask.id, allowLLM: false });
    if (r.kind !== 'recommendation') return assert.fail(r.kind);
    assert.deepStrictEqual(r.queryNeeds, [{ dimension: 'liveWeb', measured: true }]);
    const [c] = r.comparisons!;
    assert.deepStrictEqual([c.winnerId, c.altId], ['beta', 'alpha']);
    const search = arenaBenchmark(B, 'lmarena', 'search', MODELS)!;
    assert.deepStrictEqual(c.winnerEdges, [
      { code: 'arena_only', params: { dimension: 'liveWeb', source: 'lmarena', arena: 'search', rank: search.rank, total: search.total } },
      { code: 'free_tier', params: {} },
    ]);
    const text = (id: string) => arenaBenchmark(id === 'alpha' ? A : B, 'lmarena', 'text', MODELS)!;
    assert.deepStrictEqual(c.altEdges, [{ code: 'task_arena_ahead', params: { source: 'lmarena', arena: 'text', rank: text('alpha').rank, otherRank: text('beta').rank, total: 10 } }]);
  });

  it('TR ve EN metin: kaynak adı (LMArena) görünür; fark yoksa açıkça söylenir', async () => {
    const r = await recommendV3('Güncel haberleri kaynaklarıyla özetleyen asistan', 'all', { ctx: C, taskId: chatTask.id, allowLLM: false });
    const tr = apiResponseFromV3(r, getDictionary('tr'), 'tr');
    const en = apiResponseFromV3(r, getDictionary('en'), 'en');
    if (tr?.type !== 'simple' || en?.type !== 'simple') return assert.fail();
    assert.deepStrictEqual(tr.queryNeeds, { measured: ['Canlı web ve kaynak'], unmeasured: [] });
    assert.deepStrictEqual(en.queryNeeds, { measured: ['Live web and sources'], unmeasured: [] });
    assert.deepStrictEqual(tr.whyChosen![0].winner, ['Canlı web ve kaynak: LMArena Search sıralamasında 1/9 (ALPHA bu arenada ölçülmedi)', 'Ücretsiz katmanı var (ALPHA ücretli)']);
    assert.deepStrictEqual(en.whyChosen![0].winner, ['Live web and sources: #1 of 9 on LMArena Search (ALPHA not measured there)', 'Has a free tier (ALPHA is paid)']);
    assert.match(en.whyChosen![0].alt[0], /^#1 on LMArena Text \(BETA: #2 of 10 models\)$/);

    // İki eşit ürün: ölçülmüş fark yok -> kenar yok (arayüz "fark yok" der)
    const twin = product('twin', { models: ['ma'], tasks: [chatTask.id], pricing: 'paid', price: 20 });
    const same = headToHead({ product: A, score: { components: { benchmarks: [], outcomes: { yes: 0, partial: 0, no: 0 }, comparisons: { wins: 0, losses: 0 }, votes: { up: 0, down: 0 } } }, fit: { measures: [], adjustment: 0 } },
      [{ product: twin, score: { components: { benchmarks: [], outcomes: { yes: 0, partial: 0, no: 0 }, comparisons: { wins: 0, losses: 0 }, votes: { up: 0, down: 0 } } }, fit: { measures: [], adjustment: 0 } }]);
    assert.deepStrictEqual(same[0].winnerEdges, []);
    assert.ok(getDictionary('tr').fit.noDifference.includes('ölçülmüş belirgin bir fark yok'));
  });
});

describe('dinamik model çözümlemesi (models.json + model-aliases.json)', () => {
  it('takma ad kanonik id\'ye çözülür; güncel model, son doğrulama ve (varsa) bağlam penceresi kaynağıyla döner', () => {
    const models: Model[] = [
      model('gpt-x-pro', [['text', 1300]], { releaseDate: '2026-09-01', contextWindow: { tokens: 400000, source: 'artificialanalysis', fetchedAt: daysAgo(4) } }),
      model('gpt-x', [['text', 1250]], { releaseDate: '2026-05-01' }),
    ];
    assert.strictEqual(normalizeModelKey('GPT X.Pro'), 'gpt-x-pro');
    assert.deepStrictEqual(resolveModelIds(['GPT X Pro (latest)', 'yok'], models, { 'gpt-x-pro-latest': 'gpt-x-pro' }), ['gpt-x-pro']);
    const cm = resolveCurrentModel({ models: ['GPT X Pro (latest)', 'gpt-x'], modelRule: undefined }, models, { 'gpt-x-pro-latest': 'gpt-x-pro' })!;
    assert.strictEqual(cm.id, 'gpt-x-pro', 'en yeni çıkışlı');
    assert.strictEqual(cm.lastVerified, daysAgo(2));
    assert.deepStrictEqual(cm.contextWindow, { tokens: 400000, source: 'artificialanalysis', fetchedAt: daysAgo(4) });
    const old = resolveCurrentModel({ models: ['gpt-x'], modelRule: undefined }, models, {})!;
    assert.ok(!('contextWindow' in old), 'kaynaklı veri yoksa alan yok');
  });

  it('v3 öneri öğesi güncel modeli taşır (kart "Güncel model" satırı v3\'te de görünür)', async () => {
    const r = await recommendV3('bir asistan', 'all', { ctx: C, taskId: chatTask.id, allowLLM: false });
    if (r.kind !== 'recommendation') return assert.fail();
    assert.strictEqual(r.items[0].currentModel?.id, 'ma');
    const ui = apiResponseFromV3(r, getDictionary('tr'), 'tr');
    if (ui?.type !== 'simple') return assert.fail();
    assert.strictEqual(ui.main.currentModel?.name, 'MA');
  });
});
