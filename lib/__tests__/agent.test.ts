import assert from 'node:assert';
import { describe, it } from 'node:test';

// Canlı servis yok: KV ve OpenAI değişkenleri modüller yüklenmeden silinir.
for (const key of Object.keys(process.env)) {
  if (/^(KV_|UPSTASH_|OPENAI_)/.test(key) || key === 'VECTOR_SEARCH_ENABLED') delete process.env[key];
}

const { runAgent } = await import('../agent/loop');
const { executeTool, stepTaskId } = await import('../agent/tools');
const { handleChat } = await import('../agent/handler');
const { isOverBudget, usageKey } = await import('../agent/budget');
const { fallbackRecommendation } = await import('../agent/fallback');
const { MAX_TOOL_CALLS } = await import('../agent/config');
const { loadCatalog } = await import('../catalog/index');
const fx = await import('./catalogFixtures');

import type { ChatChunk, ChatClient, ChatParams } from '../agent/client';
import type { ChatEvent } from '../agent/cards';

// ------------------------------------------------------------------
// Sahte OpenAI akışı: her tur için hazır parçalar
// ------------------------------------------------------------------
const text = (s: string): ChatChunk[] => [{ choices: [{ delta: { content: s.slice(0, 3) } }] }, { choices: [{ delta: { content: s.slice(3) } }] }];
const call = (index: number, name: string, args: object): ChatChunk[] => {
  const json = JSON.stringify(args);
  const half = Math.floor(json.length / 2);
  return [
    { choices: [{ delta: { tool_calls: [{ index, id: `call_${name}_${index}`, function: { name, arguments: json.slice(0, half) } }] } }] },
    { choices: [{ delta: { tool_calls: [{ index, function: { arguments: json.slice(half) } }] } }] },
  ];
};
const usage = (n: number): ChatChunk => ({ choices: [], usage: { prompt_tokens: n, completion_tokens: n, total_tokens: 2 * n } });

function fakeClient(rounds: ChatChunk[][] | ((params: ChatParams, i: number) => ChatChunk[])) {
  const seen: ChatParams[] = [];
  const client: ChatClient = {
    async stream(params) {
      seen.push(structuredClone(params));
      const i = seen.length - 1;
      const chunks = typeof rounds === 'function' ? rounds(params, i) : rounds[i] ?? text('ok');
      return (async function* () { yield* chunks; })();
    },
  };
  return { client, seen };
}

// Fixture katalog: image.generate görevinde iki ürün, benchmark verisiyle.
const T = fx.task();
const search = fx.ctx({
  products: [fx.product('alpha', { models: ['m2'] }), fx.product('beta', { models: ['m1'] })],
  models: fx.arenaModels([100, 200, 300]),
});
const tasks = [T];
const collect = () => {
  const events: ChatEvent[] = [];
  return { events, emit: (e: ChatEvent) => events.push(e) };
};
const user = (content: string) => ({ role: 'user' as const, content });

describe('ajan araçları: argüman doğrulaması', () => {
  const ctx = { search, locale: 'en' as const, questionsAsked: 0, maxQuestions: 2 };

  it('geçersiz kısıt, bilinmeyen görev ve bozuk JSON modele hata olarak döner', async () => {
    const bad = await executeTool('search_catalog', JSON.stringify({ taskId: T.id, constraints: { pricing: 'cheap' } }), ctx);
    assert.strictEqual(bad.result.error, 'invalid_arguments');
    assert.strictEqual(bad.card, undefined);
    assert.strictEqual((await executeTool('search_catalog', JSON.stringify({ taskId: 'yok.gorev' }), ctx)).result.error, 'unknown_task');
    assert.strictEqual((await executeTool('search_catalog', '{bozuk', ctx)).result.error, 'invalid_json');
    assert.strictEqual((await executeTool('ask_user', JSON.stringify({ question: 'Hangisi?', options: ['tek'] }), ctx)).result.error, 'invalid_arguments');
    assert.strictEqual((await executeTool('sil_her_seyi', '{}', ctx)).result.error, 'unknown_tool');
  });

  it("build_prompt P7'ye kadar not_available", async () => {
    const r = await executeTool('build_prompt', JSON.stringify({ productId: 'alpha', goal: 'a cat poster' }), ctx);
    assert.deepStrictEqual(r.result, { error: 'not_available' });
  });

  it('get_workflow adım araçlarını şablondaki sabit adlardan değil searchCatalog\'dan alır', async () => {
    const real = { ...ctx, search: fx.ctx({ products: loadCatalog().products, tasks: loadCatalog().tasks }) };
    const r = await executeTool('get_workflow', JSON.stringify({ goal: 'çizgi roman oluştur' }), real);
    assert.strictEqual(r.card?.type, 'workflow');
    if (r.card?.type !== 'workflow') return;
    assert.ok(r.card.steps.length > 0);
    // Katalogda henüz kanıt yok: hiçbir adımda ürün uydurulmaz.
    assert.ok(r.card.steps.every((s) => s.product === null));
    assert.ok(r.card.steps.every((s) => real.search.tasksById.has(s.taskId)));
  });

  it('şablon adımı -> görev eşlemesi', () => {
    const step = (capabilities: string[], category = 'metin') => ({ order: 1, name: '', description: '', category, inputType: 'text', outputType: 'text', capabilities }) as Parameters<typeof stepTaskId>[0];
    assert.strictEqual(stepTaskId(step(['logo design', 'branding'])), 'image.logo');
    assert.strictEqual(stepTaskId(step(['music generation', 'beat making'])), 'music.generate');
    assert.strictEqual(stepTaskId(step(['voice synthesis', 'text to speech'])), 'audio.tts-voiceover');
    assert.strictEqual(stepTaskId(step(['something new'], 'video')), 'video.text-to-video');
  });
});

describe('ajan döngüsü', () => {
  it('search_catalog sonucu kart olur; model katalogda olmayan ad yazsa da kart VERİDEN gelir', async () => {
    const { client } = fakeClient([
      [...call(0, 'search_catalog', { taskId: T.id }), usage(10)],
      [...text('Use FooBar AI, it is great.'), usage(5)],
    ]);
    const { events, emit } = collect();
    const out = await runAgent({ messages: [user('an image of a cat')], locale: 'en' }, { client, model: 'm', tasks, search }, emit);

    const cards = events.filter((e) => e.type === 'card');
    assert.strictEqual(cards.length, 1);
    const card = cards[0].type === 'card' ? cards[0].card : null;
    assert.strictEqual(card?.type, 'recommendation');
    if (card?.type !== 'recommendation') return;
    assert.deepStrictEqual(card.items.map((i) => i.name), ['ALPHA', 'BETA']);
    assert.ok(!JSON.stringify(card).includes('FooBar'));
    assert.deepStrictEqual(card.items[0].sources.map((s) => s.label), ['LMArena']);
    assert.strictEqual(out.taskId, T.id);
    assert.strictEqual(out.endedWith, 'text');
    assert.deepStrictEqual(out.usage, { promptTokens: 15, completionTokens: 15, totalTokens: 30 });
    assert.strictEqual(events.filter((e) => e.type === 'text').map((e) => (e.type === 'text' ? e.delta : '')).join(''), 'Use FooBar AI, it is great.');
  });

  it('ask_user soru kartı gönderir ve turu bitirir (ikinci model çağrısı yok)', async () => {
    const { client, seen } = fakeClient([[...call(0, 'ask_user', { question: 'Logo with text?', options: ['Yes', 'No'] })]]);
    const { events, emit } = collect();
    const out = await runAgent({ messages: [user('logo')], locale: 'en' }, { client, model: 'm', tasks, search }, emit);
    assert.strictEqual(out.endedWith, 'question');
    assert.strictEqual(seen.length, 1);
    const card = events.find((e) => e.type === 'card');
    assert.deepStrictEqual(card?.type === 'card' ? card.card : null, {
      type: 'question', question: 'Logo with text?', options: [{ id: 'o1', label: 'Yes' }, { id: 'o2', label: 'No' }], allowFreeText: true,
    });
  });

  it('konuşmada 2 soru sorulduysa ask_user reddedilir, ajan devam eder', async () => {
    const { client, seen } = fakeClient([
      [...call(0, 'ask_user', { question: 'Third?', options: ['a', 'b'] })],
      [...text('Assuming a.')],
    ]);
    const messages = [
      user('logo'), { role: 'assistant' as const, content: 'Q1', kind: 'question' as const },
      user('yes'), { role: 'assistant' as const, content: 'Q2', kind: 'question' as const },
      user('no'),
    ];
    const { events, emit } = collect();
    const out = await runAgent({ messages, locale: 'en' }, { client, model: 'm', tasks, search }, emit);
    assert.strictEqual(out.endedWith, 'text');
    assert.ok(!events.some((e) => e.type === 'card'));
    const toolMsg = seen[1].messages.find((m) => m.role === 'tool');
    assert.ok(toolMsg && toolMsg.role === 'tool' && toolMsg.content.includes('question_budget_exhausted'));
  });

  it(`tur başına en fazla ${MAX_TOOL_CALLS} araç çağrısı; sonra araçsız cevap`, async () => {
    const { client, seen } = fakeClient((params) =>
      params.tool_choice === 'none' ? text('Final answer.') : call(0, 'search_catalog', { taskId: T.id })
    );
    const { emit } = collect();
    const out = await runAgent({ messages: [user('cat')], locale: 'en' }, { client, model: 'm', tasks, search }, emit);
    assert.strictEqual(out.toolCalls.search_catalog, MAX_TOOL_CALLS);
    assert.strictEqual(out.endedWith, 'tool_limit');
    assert.strictEqual(seen.at(-1)?.tool_choice, 'none');
    assert.strictEqual(seen.length, MAX_TOOL_CALLS + 1);
  });

  it('tek cevapta 8 paralel çağrı: 6\'sı çalışır, kalanı modele limit hatası döner', async () => {
    const eight = Array.from({ length: 8 }, (_, i) => call(i, 'search_catalog', { taskId: T.id })).flat();
    const { client, seen } = fakeClient([eight, text('done')]);
    const { emit } = collect();
    const out = await runAgent({ messages: [user('cat')], locale: 'en' }, { client, model: 'm', tasks, search }, emit);
    assert.strictEqual(out.toolCalls.search_catalog, MAX_TOOL_CALLS);
    const toolMsgs = seen[1].messages.filter((m) => m.role === 'tool');
    assert.strictEqual(toolMsgs.length, 8);
    assert.strictEqual(toolMsgs.filter((m) => m.role === 'tool' && m.content.includes('tool_call_limit')).length, 2);
  });
});

describe('bütçe ve v1 yedek yolu', () => {
  const store = (used: number, fail = false) => ({
    added: [] as number[],
    async get() { if (fail) throw new Error('kv down'); return used; },
    async add(_k: string, n: number) { this.added.push(n); },
  });

  it('bütçe: tanımsızsa sınır yok; dolmuşsa ya da okunamazsa true', async () => {
    assert.strictEqual(await isOverBudget(store(10 ** 9), Date.now(), null), false);
    assert.strictEqual(await isOverBudget(store(999), Date.now(), 1000), false);
    assert.strictEqual(await isOverBudget(store(1000), Date.now(), 1000), true);
    assert.strictEqual(await isOverBudget(store(0, true), Date.now(), 1000), true);
    assert.strictEqual(usageKey(Date.parse('2026-09-24T00:00:00Z')), 'usage:2026-09');
  });

  it('bütçe aşımında OpenAI çağrılmaz, v1 kartı ve not gönderilir', async () => {
    process.env.OPENAI_MONTHLY_TOKEN_BUDGET = '1000';
    try {
      const { client, seen } = fakeClient([text('should not run')]);
      const s = store(5000);
      const { events, emit } = collect();
      const logs: string[] = [];
      const r = await handleChat({ messages: [user('sunum hazırla')], locale: 'tr' }, { client, model: 'm', tasks, store: s, timeoutMs: 1000, search, log: (l) => logs.push(l) }, emit);
      assert.strictEqual(seen.length, 0);
      assert.strictEqual(r.fallbackReason, 'budget');
      const card = events.find((e) => e.type === 'card');
      assert.ok(card?.type === 'card' && card.card.type === 'recommendation' && card.card.mode === 'fallback');
      if (card?.type === 'card' && card.card.type === 'recommendation') assert.strictEqual(card.card.items[0].name, 'Gamma AI');
      assert.deepStrictEqual(events.at(-1), { type: 'done', usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }, fallback: true });
      // Log'da kullanıcı metni yok
      assert.ok(logs.every((l) => !l.includes('sunum')));
    } finally {
      delete process.env.OPENAI_MONTHLY_TOKEN_BUDGET;
    }
  });

  it('OpenAI hatasında v1 yoluna düşülür; kullanım kaydedilir', async () => {
    const client: ChatClient = { async stream() { throw new Error('503'); } };
    const s = store(0);
    const { events, emit } = collect();
    const r = await handleChat({ messages: [user('python kodumda hata var')], locale: 'tr' }, { client, model: 'm', tasks, store: s, timeoutMs: 1000, search, log: () => {} }, emit);
    assert.strictEqual(r.fallbackReason, 'openai_error');
    assert.ok(events.some((e) => e.type === 'text' && e.delta.includes('Asistan şu an kullanılamıyor')));
  });

  it('başarılı turda token kullanımı KV\'ye eklenir', async () => {
    const { client } = fakeClient([[...text('hello'), usage(21)]]);
    const s = store(0);
    const { emit } = collect();
    await handleChat({ messages: [user('hi')], locale: 'en' }, { client, model: 'm', tasks, store: s, timeoutMs: 1000, search, log: () => {} }, emit);
    assert.deepStrictEqual(s.added, [42, 42]); // aylık + günlük sayaç
  });

  it('v1 yedek kartı LLM çağırmaz ve puansızdır', async () => {
    const card = await fallbackRecommendation('startup için pitch deck');
    assert.strictEqual(card?.mode, 'fallback');
    assert.strictEqual(card?.items[0].q, null);
    assert.strictEqual(card?.items[0].name, 'Gamma AI');
  });
});
