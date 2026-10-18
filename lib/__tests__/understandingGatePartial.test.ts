import assert from 'node:assert';
import { describe, it } from 'node:test';

// Ayrı dosya: OpenAI istemcisi ilk kurulduğu andaki fetch'i saklıyor (bkz.
// taskClassifierLlmSuccess.test.ts'teki not) — bu dosyada TEK ağ-mocklu test var.
for (const key of Object.keys(process.env)) {
  if (/^(KV_|UPSTASH_|OPENAI_|AMBIGUITY_|UNDERSTANDING_)/.test(key) || key === 'VECTOR_SEARCH_ENABLED') delete process.env[key];
}

const { recommendV3 } = await import('../recommendV3');
const { defaultSearchContext } = await import('../catalog/search');
const { arenaModels, ctx: fixtureCtx, product, task } = await import('./catalogFixtures');

/** OpenAI sınıflandırıcı cevabını taklit eder; kaç kez çağrıldığını sayar. */
function mockLLM(answer: object | (() => object)): { calls: () => number; restore: () => void } {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = (async () => {
    calls++;
    const completion = {
      id: 'x', object: 'chat.completion', created: 0, model: 'gpt-4o-mini',
      choices: [{ index: 0, finish_reason: 'stop', message: { role: 'assistant', content: JSON.stringify(typeof answer === 'function' ? answer() : answer) } }],
      usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
    };
    return new Response(JSON.stringify(completion), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }) as typeof fetch;
  process.env.OPENAI_API_KEY = 'sk-test-kullanilmamali';
  return {
    calls: () => calls,
    restore: () => {
      globalThis.fetch = originalFetch;
      delete process.env.OPENAI_API_KEY;
    },
  };
}

/** Kod asistanı (puanlı 2 ürün), uygulama oluşturucu (puanlı 1 ürün), 3D (kanıtsız ürün). Puanlar yalnızca senaryo içindir. */
const TASKS = ['code.assistant-ide', 'code.app-builder', '3d.generate'];
const fake = () =>
  fixtureCtx({
    products: [
      product('ide1', { tasks: ['code.assistant-ide'], models: ['m1'] }),
      product('ide2', { tasks: ['code.assistant-ide'], models: ['m2'] }),
      product('app1', { tasks: ['code.app-builder'], models: ['m0'] }),
      product('d3', { tasks: ['3d.generate'] }),
    ],
    tasks: TASKS.map((id) => task(id)),
    models: arenaModels([1, 2, 3]),
  });
const answer = (o: object) => ({
  taskId: 'code.app-builder', confidence: 0.7, pricing: 'unspecified', language: 'en', needsClarification: false,
  candidates: ['code.assistant-ide', '3d.generate'], fit: 'partial', ...o,
});

describe('recommendV3 + LLM: "tam uymuyor" (fit partial) -> tahmini eşleşme ya da soru, asla düz öneri değil', () => {
  it('en yakın işin araçları o işin puanıyla ve "tahmini" etiketiyle gösterilir; fit none / kanıt yok / kapatma anahtarları ayrı davranır', async () => {
    let current: object = answer({});
    const llm = mockLLM(() => current);
    try {
      // 1) LLM'in "en yararlı" sıradaki ilk işi (kod asistanı) gösterilir; uygulama oluşturucu (LLM'in tek tahmini) sona kalır.
      const r = await recommendV3('kubernetes terraform', 'all', { ctx: fake() });
      assert.ok(llm.calls() >= 1, 'kural katmanı emin değildi: LLM soruldu');
      assert.strictEqual(r.kind, 'recommendation');
      if (r.kind !== 'recommendation') return;
      assert.strictEqual(r.taskId, 'code.assistant-ide');
      assert.deepStrictEqual(r.items.map((i) => i.product.id), ['ide2', 'ide1'], 'o işin kendi puanına göre');
      assert.deepStrictEqual(r.approximate?.unknownTerms, ['kubernetes', 'terraform']);
      assert.deepStrictEqual(r.approximate?.otherTasks.map((t) => t.taskId), ['3d.generate', 'code.app-builder']);

      // 2) LLM "hiçbir iş uymuyor" derse göstermek yerine sorulur.
      current = answer({ fit: 'none' });
      const none = await recommendV3('kubernetes terraform', 'all', { ctx: fake() });
      assert.strictEqual(none.kind, 'clarify');
      if (none.kind === 'clarify') assert.strictEqual(none.reason, 'no_match');

      // 3) Kapatma anahtarı APPROXIMATE_RESULTS=off: yalnız soru (kapı açık kalır).
      current = answer({});
      process.env.APPROXIMATE_RESULTS = 'off';
      const asked = await recommendV3('kubernetes terraform', 'all', { ctx: fake() });
      delete process.env.APPROXIMATE_RESULTS;
      assert.strictEqual(asked.kind, 'clarify');
      if (asked.kind === 'clarify') assert.deepStrictEqual(asked.options.map((o) => o.taskId), ['code.assistant-ide', '3d.generate', 'code.app-builder']);

      // 4) Adaylardan hiçbirinde kanıtlı ürün yoksa sorulur (uydurma sıra yok).
      const noEvidence = fixtureCtx({
        products: [product('x', { tasks: TASKS })],
        tasks: TASKS.map((id) => task(id)),
      });
      const empty = await recommendV3('kubernetes terraform', 'all', { ctx: noEvidence });
      assert.strictEqual(empty.kind, 'clarify');

      // 5) Ana kapatma anahtarı UNDERSTANDING_GATE=off: eski davranış, LLM'in tek tahmini düz öneri olarak gösterilir.
      process.env.UNDERSTANDING_GATE = 'off';
      const old = await recommendV3('kubernetes terraform', 'all', { ctx: fake() });
      delete process.env.UNDERSTANDING_GATE;
      assert.strictEqual(old.kind, 'recommendation');
      if (old.kind === 'recommendation') {
        assert.strictEqual(old.taskId, 'code.app-builder');
        assert.strictEqual(old.approximate, undefined);
      }

      // 6) Gerçek katalog: sorguda "replit agent" kelimeleri uygulama oluşturucuda geçse bile (sözcük kontrolü tek başına yetmez)
      //    sonuç "düz öneri" OLMAZ: ya etiketli tahmini eşleşme ya da soru. Kullanıcının bildirdiği asıl vaka.
      const real = await recommendV3('kubernetes terraform replit agent', 'all', { ctx: defaultSearchContext() });
      if (real.kind === 'recommendation') assert.ok(real.approximate, 'etiketsiz düz öneri olamaz');
      else assert.strictEqual(real.kind, 'clarify');
    } finally {
      delete process.env.APPROXIMATE_RESULTS;
      delete process.env.UNDERSTANDING_GATE;
      llm.restore();
    }
  });
});
