import assert from 'node:assert';
import { describe, it } from 'node:test';
import { aggregateSignals, findAnomalies } from '../../scripts/signals/aggregate.mjs';
import { classify, dedupe, fetchHackerNews, fetchProductHunt, parseShowHnTitle, toCandidate } from '../../scripts/discovery/core.mjs';
import { comparePrice, extractPrice, htmlToText } from '../../scripts/prices/core.mjs';
import { saveVote, voteKey, VOTE_INDEX } from '../signals/store';
import { recordEvent } from '../analytics/store';
import { memoryAnalyticsStore } from '../analytics/memory';
import { computeStats } from '../analytics/stats';
import { sampleStatsSource } from '../analytics/sample';
import { eventRequestSchema } from '../analytics/events';
import { defaultSearchContext, searchCatalog } from '../catalog/search';
import { makePricing } from '../pricing';
import { arenaModels, ctx, product } from './catalogFixtures';

const NOW = Date.parse('2026-09-24T12:00:00Z');
const DAY = 86400000;
const iso = (daysAgo: number) => new Date(NOW - daysAgo * DAY).toISOString();
const products = [{ id: 'gamma-ai', tasks: ['slides.create'] }, { id: 'tome', tasks: ['slides.create'] }];

describe('sinyal toplama (data/signals.json)', () => {
  it('iş sonucu, karşılaştırma ve oylar ürün+görev başına toplanır; katalogda olmayan çift atlanır', () => {
    const { signals, anomalies } = aggregateSignals({
      now: NOW, products,
      outcomes: [
        { productId: 'gamma-ai', taskId: 'slides.create', answer: 'yes', at: iso(2) },
        { productId: 'gamma-ai', taskId: 'slides.create', answer: 'partial', at: iso(3) },
        { productId: 'gamma-ai', taskId: 'image.logo', answer: 'yes', at: iso(1) }, // görev ürünün değil
      ],
      comparisons: [
        { taskId: 'slides.create', a: 'gamma-ai', b: 'tome', winner: 'gamma-ai', at: iso(1) },
        { taskId: 'slides.create', a: 'gamma-ai', b: 'tome', winner: 'tie', at: iso(1) },
      ],
      votes: [{ productId: 'tome', taskId: 'slides.create', vote: 'down', at: iso(5) }],
    });
    assert.deepStrictEqual(anomalies, []);
    assert.deepStrictEqual(signals, [
      { productId: 'gamma-ai', taskId: 'slides.create', outcomes: { yes: 1, partial: 1, no: 0 }, comparisons: { wins: 1, losses: 0 }, votes: { up: 0, down: 0 }, lastAt: iso(1).slice(0, 10) },
      { productId: 'tome', taskId: 'slides.create', outcomes: { yes: 0, partial: 0, no: 0 }, comparisons: { wins: 0, losses: 1 }, votes: { up: 0, down: 1 }, lastAt: iso(1).slice(0, 10) },
    ]);
  });

  it('24 saatte normalin 5 katından fazla olumlu sonuç: anormallik, o 24 saat dahil edilmez', () => {
    const burst = Array.from({ length: 8 }, (_, i) => ({ productId: 'tome', taskId: 'slides.create', answer: 'yes', at: new Date(NOW - i * 3600000).toISOString() }));
    const old = [{ productId: 'tome', taskId: 'slides.create', answer: 'yes', at: iso(10) }];
    assert.strictEqual(findAnomalies([...burst, ...old], NOW).length, 1);
    const { signals, anomalies } = aggregateSignals({ now: NOW, products, outcomes: [...burst, ...old], comparisons: [], votes: [] });
    assert.deepStrictEqual(anomalies.map((a) => [a.productId, a.last24h]), [['tome', 8]]);
    assert.strictEqual(signals[0].outcomes.yes, 1, 'sadece eski kayıt sayıldı');
    // Normal hacim anormallik değil
    const steady = Array.from({ length: 60 }, (_, i) => ({ productId: 'tome', taskId: 'slides.create', answer: 'yes', at: iso(1 + i * 0.5) }));
    assert.deepStrictEqual(findAnomalies([...steady, ...burst.slice(0, 5)], NOW), []);
  });
});

describe('oylar: oturum + ürün + görev başına tek kayıt', () => {
  it('son oy geçerli, ham oturum kimliği anahtarda yok', async () => {
    const data = new Map<string, unknown>();
    const sets = new Map<string, Set<string>>();
    const store = {
      async set(k: string, v: unknown) { data.set(k, v); return 'OK'; },
      async sadd(k: string, m: string) { (sets.get(k) ?? sets.set(k, new Set()).get(k)!).add(m); return 1; },
    };
    const v = { sessionId: 'sess_12345678', taskId: 'slides.create', productId: 'gamma-ai', toolName: 'Gamma AI' };
    await saveVote({ ...v, vote: 'up' }, 1, store);
    await saveVote({ ...v, vote: 'down' }, 2, store);
    assert.strictEqual(data.size, 1);
    const key = voteKey('sess_12345678', 'slides.create', 'gamma-ai');
    assert.ok(!key.includes('sess_12345678'));
    assert.strictEqual((data.get(key) as { vote: string }).vote, 'down');
    assert.strictEqual(sets.get(VOTE_INDEX)?.size, 1);
  });
});

describe('analitik', () => {
  it('olay şeması serbest metni reddeder', () => {
    assert.ok(eventRequestSchema.safeParse({ name: 'tool_click', sessionId: 'sess_12345678', taskId: 'image.logo' }).success);
    assert.ok(!eventRequestSchema.safeParse({ name: 'tool_click', sessionId: 'sess_12345678', message: 'kullanıcı metni' }).success);
    assert.ok(!eventRequestSchema.safeParse({ name: 'bilinmeyen', sessionId: 'sess_12345678' }).success);
  });

  it('sayaçlar ve ROADMAP metrikleri (bellek içi KV)', async () => {
    const store = memoryAnalyticsStore();
    const e = (name: Parameters<typeof recordEvent>[0]['name'], day: number, s: string, extra = {}) => recordEvent({ name, sessionId: s, ...extra }, NOW - day * DAY, store);
    await e('chat_start', 10, 'sess_aaaaaaaa');
    await e('chat_start', 10, 'sess_bbbbbbbb');
    await e('clarify_shown', 10, 'sess_aaaaaaaa');
    await e('recommendation_shown', 10, 'sess_aaaaaaaa', { taskId: 'slides.create' });
    await e('recommendation_shown', 10, 'sess_bbbbbbbb', { taskId: 'slides.create' });
    await e('tool_click', 10, 'sess_aaaaaaaa', { taskId: 'slides.create' });
    await e('prompt_generated', 10, 'sess_aaaaaaaa', { guideId: 'gamma', guideVersion: 1 });
    await e('prompt_copied', 10, 'sess_aaaaaaaa', { guideId: 'gamma', guideVersion: 1, variant: 'safe' });
    await e('prompt_refined', 10, 'sess_aaaaaaaa', { guideId: 'gamma', guideVersion: 1, refinementId: 'shorter' });
    await e('chat_start', 7, 'sess_aaaaaaaa'); // 3 gün sonra geri döndü
    store.set('usage:day:' + new Date(NOW - 10 * DAY).toISOString().slice(0, 10), 1234);

    const search = ctx({ products: [product('a', { models: ['m2'] })], models: arenaModels([1, 2, 3]) });
    const s = await computeStats({ source: store, now: NOW, days: 30, search });
    assert.deepStrictEqual(s.metrics.clarifyRate, { num: 1, den: 3, rate: 0.333 });
    assert.deepStrictEqual(s.metrics.toolClickRate, { num: 1, den: 2, rate: 0.5 });
    assert.deepStrictEqual(s.metrics.promptCopyRate, { num: 1, den: 1, rate: 1 });
    // Kohort: 10 gün önce 2 oturum (biri 3 gün sonra döndü) + 7 gün önce 1 oturum (dönmedi)
    assert.deepStrictEqual(s.metrics.return7d, { num: 1, den: 3, rate: 0.333 });
    assert.strictEqual(s.metrics.tokensDaily[new Date(NOW - 10 * DAY).toISOString().slice(0, 10)], 1234);
    assert.deepStrictEqual(s.metrics.tasksBenchmarkShareBelowHalf, { count: 0, of: 1 });
    assert.deepStrictEqual((s.guides.gamma as { topRefinements: unknown }).topRefinements, [{ id: 'shorter', n: 1 }]);
  });

  it('örnek veri kaynağıyla (yerel ?sample=1) istatistik hesaplanır', async () => {
    const source = await sampleStatsSource(NOW);
    const s = await computeStats({ source, now: NOW, days: 30, search: defaultSearchContext(NOW) });
    assert.strictEqual(s.window.days, 30);
    assert.ok((s.events.chat_start ?? 0) > 0);
    assert.ok(s.metrics.outcomeResponseRate.rate !== null);
    assert.ok(s.metrics.didTheJobByTask['slides.create']);
    assert.ok(s.didTheJobByGuideVersion['gamma@v1']);
    assert.ok(s.metrics.return7d.den > 0);
  });
});

describe('keşif', () => {
  it('Show HN başlığı, katalogla çakışanlar düşer, adaylar ayrı dosyada', async () => {
    assert.deepStrictEqual(parseShowHnTitle('Show HN: Foo – AI slides from notes'), { name: 'Foo', tagline: 'AI slides from notes' });
    const fetchJson = async () => ({ hits: [
      { objectID: '1', title: 'Show HN: Gamma Clone – decks', url: 'https://gamma.app/new' },
      { objectID: '2', title: 'Show HN: Deckly – AI decks', url: 'https://deckly.example' },
      { objectID: '3', title: 'Show HN: Deckly – again', url: 'https://www.deckly.example/x' },
      { objectID: '4', title: 'Ask HN: no url' },
    ] });
    const items = await fetchHackerNews({ fetchJson, sinceSec: 0 });
    const fresh = dedupe(items, { products: [{ name: 'Gamma AI', url: 'https://gamma.app' }], candidates: [] });
    assert.deepStrictEqual(fresh.map((f: { name: string }) => f.name), ['Deckly']);
    const cls = await classify(fresh[0], { llm: null, taskIds: ['slides.create'] });
    assert.deepStrictEqual(cls.tasks, []);
    const c = toCandidate(fresh[0], cls, '2026-09-24', new Set());
    assert.strictEqual(c.status, 'candidate');
    assert.strictEqual(c.pricingModel, 'unknown');
    assert.strictEqual(await fetchProductHunt({ fetchJson, token: undefined, sinceIso: '' }), null);
  });

  it('sınıflandırma sadece bilinen görevleri kabul eder', async () => {
    const llm = async () => ({ data: { tasks: ['slides.create', 'uydurma.gorev'], isWebProduct: true, descriptionEn: 'x', descriptionTr: 'y' }, tokens: 1 });
    const cls = await classify({ name: 'D', tagline: 't', url: 'https://d.example' }, { llm, taskIds: ['slides.create'] });
    assert.deepStrictEqual(cls.tasks, ['slides.create']);
  });

  it("status 'candidate' olan ürün aramada ASLA görünmez", () => {
    const models = arenaModels([1, 2, 3]);
    const cand = { ...product('cand', { models: ['m2'] }), status: 'candidate' as const };
    const r = searchCatalog({ taskId: 'image.generate' }, ctx({ products: [cand, product('ok', { models: ['m1'] })], models }));
    assert.deepStrictEqual(r.items.map((i) => i.product.id), ['ok']);
  });
});

describe('fiyat kontrolü', () => {
  it('HTML metne, USD olmayan ve emin olunmayan fiyata dokunulmaz', async () => {
    assert.strictEqual(htmlToText('<style>x</style><p>Pro&nbsp;<b>$10</b>/mo</p><script>y</script>'), 'Pro $10 /mo');
    const p = { pricing: makePricing('freemium', 10, '2026-01-01') };
    assert.deepStrictEqual(comparePrice(p, { model: 'freemium', startingPrice: 10, currency: 'USD' }), { status: 'same', model: 'freemium', startingPrice: 10 });
    assert.deepStrictEqual(comparePrice(p, { model: 'freemium', startingPrice: 12, currency: 'USD' }), { status: 'changed', model: 'freemium', startingPrice: 12 });
    assert.strictEqual(comparePrice(p, { model: 'paid', startingPrice: 9, currency: 'EUR' }).status, 'unknown');
    assert.strictEqual(comparePrice(p, { model: 'unknown', startingPrice: null, currency: null }).status, 'unknown');
    const llm = async () => ({ data: { model: 'paid', startingPrice: 20, currency: 'USD', evidence: 'Pro $20/mo' }, tokens: 5 });
    assert.strictEqual((await extractPrice({ text: 'Pro $20/mo', productName: 'X', llm })).evidence, 'Pro $20/mo');
  });
});
