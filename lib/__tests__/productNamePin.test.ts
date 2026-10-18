// Ürün adı aranınca o ürün en üste sabitlenir (lib/recommendV3.ts recommendForProductName).
// Gerçek katalog; OpenAI çağrısı yok (ad dalı LLM'e inmeden döner).
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { recommendV3, type RecommendV3Recommendation, type RecommendV3Result } from '../recommendV3';
import { defaultSearchContext } from '../catalog/search';
import { loadCatalog } from '../catalog/index';
import { apiResponseFromV3 } from '../types';
import { getDictionary } from '../i18n/index';

const catalog = loadCatalog();
const baseOptions = () => ({ allowLLM: false, ctx: defaultSearchContext(), editorPicks: catalog.editorPicks }) as const;
const run = (query: string, extra: object = {}, filter: 'all' | 'free' | 'paid' = 'all') => recommendV3(query, filter, { ...baseOptions(), ...extra });

function asRecommendation(r: RecommendV3Result): RecommendV3Recommendation {
  assert.strictEqual(r.kind, 'recommendation');
  return r as RecommendV3Recommendation;
}

describe('ürün adı araması: recommendV3', () => {
  it('"claude" Claude\'u items[0]\'a sabitler; görev Claude\'un görevlerinden biri; kaynak "name"', async () => {
    const r = asRecommendation(await run('claude'));
    const claude = catalog.products.find((p) => p.id === 'claude-ai-claude-4')!;
    assert.strictEqual(r.taskSource, 'name');
    assert.strictEqual(r.searchedProductId, claude.id);
    assert.strictEqual(r.items[0].product.id, claude.id);
    assert.ok(claude.tasks.includes(r.taskId), `${r.taskId} Claude'un görevi olmalı`);
    const ids = r.items.map((i) => i.product.id);
    assert.strictEqual(new Set(ids).size, ids.length, 'ürün iki kez listelenmez');
    assert.ok(ids.length >= 2, 'altında aynı görevin diğer araçları var');
  });

  it('seçilen görev, ürünün gerçekten en yüksek sırada olduğu görevdir (diğer görevlerde daha iyi sırası yok)', async () => {
    for (const [query, id] of [['claude', 'claude-ai-claude-4'], ['chatgpt', 'chatgpt-gpt-5'], ['gemini', 'gemini-25-pro'], ['grok', 'grok-41']] as const) {
      const pinned = asRecommendation(await run(query));
      const product = catalog.products.find((p) => p.id === id)!;
      const rankIn = async (taskId: string) => {
        const normal = await run('x', { taskId });
        // Hiç kanıtı olmayan görev (no_evidence; ör. yeni eklenen education.tutor) sıralama sunmaz: ürün orada
        // "en yüksek sıra" adayı olamaz, bu yüzden sabitleme için kötü sayılır (Infinity).
        if (normal.kind !== 'recommendation') return Infinity;
        const item = normal.items.find((i) => i.product.id === id);
        return !item ? Infinity : item.basis === 'evidence' ? normal.items.indexOf(item) : 1000 + normal.items.indexOf(item);
      };
      const pinnedRank = await rankIn(pinned.taskId);
      for (const taskId of product.tasks) {
        assert.ok(pinnedRank <= (await rankIn(taskId)), `${query}: ${pinned.taskId} (${pinnedRank}) ${taskId} görevinden kötü`);
      }
    }
  });

  it('altındaki araçlar o görevin normal sıralamasıyla aynıdır (sıralama bozulmaz, yalnızca ürün öne alınır)', async () => {
    const pinned = asRecommendation(await run('chatgpt'));
    const normal = asRecommendation(await run('x', { taskId: pinned.taskId }));
    const without = (r: RecommendV3Recommendation) => r.items.filter((i) => i.product.id !== 'chatgpt-gpt-5').map((i) => i.product.id);
    assert.deepStrictEqual(without(pinned), without(normal));
  });

  it('parantezli ürünler ayrıdır: "gemini" ile "gemini görsel" farklı ürünleri sabitler', async () => {
    assert.strictEqual(asRecommendation(await run('gemini')).searchedProductId, 'gemini-25-pro');
    const image = asRecommendation(await run('gemini görsel'));
    assert.strictEqual(image.searchedProductId, 'gemini-3-pro-image');
    assert.strictEqual(image.items[0].product.id, 'gemini-3-pro-image');
  });

  it('kanıtsız (puansız) ürün de gösterilir ama "doğrulanmadı" olarak; kanıt uydurulmaz', async () => {
    const r = asRecommendation(await run('midjourney'));
    assert.strictEqual(r.items[0].product.id, 'midjourney-v7');
    assert.strictEqual(r.items[0].basis, 'unverified');
    assert.deepStrictEqual(r.items[0].reasons, []);
    assert.strictEqual(r.items[0].dataDate, null);
  });

  it('adın yanında başka kelime varsa ad dalı susar, normal akış sürer', async () => {
    const r = asRecommendation(await run('claude ile logo yap'));
    assert.strictEqual(r.taskSource, 'rules');
    assert.strictEqual(r.taskId, 'image.logo');
    assert.strictEqual(r.searchedProductId, undefined);
  });

  it('kullanıcı clarify seçeneğiyle görev seçtiyse ad dalı devreye girmez (taskId önceliklidir)', async () => {
    const r = asRecommendation(await run('claude', { taskId: 'image.logo' }));
    assert.strictEqual(r.taskSource, 'user');
    assert.strictEqual(r.searchedProductId, undefined);
  });

  it('kapanmış ürün adı aranınca sabitlenmez (Sora kapalı)', async () => {
    const r = await run('sora');
    assert.ok(r.kind !== 'recommendation' || r.searchedProductId === undefined);
  });

  it('puanlı (ranked) sıralamada da çalışır ve ürünü öne alır', async () => {
    const points = { load: async () => new Map<string, number>() };
    const r = asRecommendation(await run('claude', { points }));
    assert.strictEqual(r.searchedProductId, 'claude-ai-claude-4');
    assert.strictEqual(r.items[0].product.id, 'claude-ai-claude-4');
    assert.ok(r.items.length <= 5, 'puanlı sıralamanın en fazla 5 araç sınırı korunur');
  });

  it('arayüz fiyat filtresi gevşemez: filtreye uymayan ürün sabitlenmez', async () => {
    // Midjourney'in fiyat modeli ücretli: "free" filtresi (ücretsiz katmanı olanlar) onu eler.
    const midjourney = catalog.products.find((p) => p.id === 'midjourney-v7')!;
    assert.strictEqual(midjourney.pricing.model, 'paid');
    const r = await run('midjourney', {}, 'free');
    assert.ok(r.kind !== 'recommendation' || r.items.every((i) => i.product.id !== 'midjourney-v7' || r.searchedProductId === undefined), 'filtreye uymayan ürün sabitlenmemeli');
    if (r.kind === 'recommendation') assert.ok(r.items.every((i) => i.product.pricing.model !== 'paid'), 'free filtresinde ücretli ürün gösterilmez');
  });

  it('altın setteki hiçbir sorgu ad dalına düşmez: sonuçlar eskisi gibi', async () => {
    const lines = readFileSync(new URL('../../evals/golden.jsonl', import.meta.url), 'utf8').split('\n').filter(Boolean);
    for (const line of lines) {
      const row = JSON.parse(line) as { query: string };
      const r = await run(row.query);
      assert.ok(r.kind !== 'recommendation' || r.taskSource !== 'name', row.query);
    }
  });
});

describe('ürün adı araması: ekran verisi (apiResponseFromV3)', () => {
  const dict = getDictionary('tr');

  it('aranan ürün main olur, searched:true; alternatifler ürünü içermez', async () => {
    const r = await run('claude');
    const api = apiResponseFromV3(r, dict, 'tr');
    assert.ok(api && api.type === 'simple');
    if (!api || api.type !== 'simple') return;
    assert.strictEqual(api.main.productId, 'claude-ai-claude-4');
    assert.strictEqual(api.searched, true);
    assert.ok(api.alternatives.every((a) => a.productId !== 'claude-ai-claude-4'));
    assert.ok(api.taskLabel);
  });

  it('normal öneride searched yoktur ("RouteAI tavsiyesi" etiketi bozulmaz)', async () => {
    const api = apiResponseFromV3(await run('x', { taskId: 'image.logo' }), dict, 'tr');
    assert.ok(api && api.type === 'simple');
    if (!api || api.type !== 'simple') return;
    assert.strictEqual(api.searched, undefined);
  });

  it('arayüz etiketi: aranan üründe "RouteAI tavsiyesi" yazılmaz, "Aradığın ürün" yazılır (tr ve en)', () => {
    assert.strictEqual(getDictionary('tr').v3.searched, 'Aradığın ürün');
    assert.ok(getDictionary('en').v3.searched.length > 0);
    assert.notStrictEqual(getDictionary('tr').v3.searched, getDictionary('tr').v3.pick);
    const source = readFileSync(new URL('../../components/SimpleRecommendationDisplay.tsx', import.meta.url), 'utf8');
    assert.match(source, /recommendation\.searched \? dict\.v3\.searched : approximate \? dict\.v3\.approxPick : dict\.v3\.pick/);
    assert.match(source, /recommendation\.searched && \(/);
  });

  it('ad aramasında görev sinyali yazılmaz: oy, "işini gördü mü?" kaydı, görev olayı ve geri bildirim kapalı', () => {
    // Görevi kullanıcı değil biz seçtik; o göreve oy/sonuç yazmak RouteAI Skoru'nu ve gizli kullanıcı puanını kirletir.
    const source = readFileSync(new URL('../../components/SimpleRecommendationDisplay.tsx', import.meta.url), 'utf8');
    // Tahmini eşleşme (approximate) de aynı kuralı izler: kullanıcının isteği o iş değil, sinyal yazılmaz.
    assert.match(source, /const signalTaskId = searched \|\| approximate \? undefined : taskId/);
    const toolOpens = source.match(/onToolOpen\([^)]*\)/g) ?? [];
    assert.ok(toolOpens.length >= 3);
    for (const call of toolOpens) assert.ok(call.endsWith('signalTaskId)'), `${call}: ham taskId ile çağrılmamalı`);
    const votes = source.match(/<VoteButtons taskId=\{[^}]*\}/g) ?? [];
    assert.ok(votes.length >= 2);
    for (const v of votes) assert.ok(v.includes('signalTaskId'), `${v}: ham taskId kullanılmamalı`);
    assert.match(source, /trackEvent\("recommendation_shown", \{ taskId: signalTaskId \}\)/);
    assert.match(source, /\{searched \|\| approximate \? null : sessionId && taskId && main\.productId \? \(/, 'geri bildirim düğmeleri (ve arama metnini gönderen eski düğme) kapalı');
  });
});
