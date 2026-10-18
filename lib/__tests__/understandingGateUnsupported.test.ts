import assert from 'node:assert';
import { describe, it } from 'node:test';

// Ayrı dosya: OpenAI istemcisi ilk kurulduğu andaki fetch'i saklıyor (bkz.
// taskClassifierLlmSuccess.test.ts'teki not) — bu dosyada TEK ağ-mocklu test var.
for (const key of Object.keys(process.env)) {
  if (/^(KV_|UPSTASH_|OPENAI_|AMBIGUITY_|UNDERSTANDING_)/.test(key) || key === 'VECTOR_SEARCH_ENABLED') delete process.env[key];
}

const { recommendV3 } = await import('../recommendV3');
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

describe('recommendV3 + LLM: LLM "tam uyuyor" dese bile sorgunun hiçbir kelimesi o işte geçmiyorsa düz öneri verilmez', () => {
  it('fit exact + desteksiz görev -> etiketli tahmini eşleşme (sözcük kontrolü LLM\'e güvenmeden doğrular)', async () => {
    // LLM yanlışlıkla "exact" diyor ve aday vermiyor: deterministik sözcük kontrolü ağ vazifesi görür.
    const llm = mockLLM({
      taskId: 'code.app-builder', confidence: 0.95, pricing: 'unspecified', language: 'en', needsClarification: false,
      candidates: [], fit: 'exact',
    });
    try {
      const fake = fixtureCtx({
        products: [product('app1', { tasks: ['code.app-builder'], models: ['m0'] })],
        tasks: [task('code.app-builder')],
        models: arenaModels([1, 2, 3]),
      });
      const r = await recommendV3('kubernetes terraform', 'all', { ctx: fake });
      assert.ok(llm.calls() >= 1);
      assert.strictEqual(r.kind, 'recommendation');
      if (r.kind !== 'recommendation') return;
      assert.ok(r.approximate, 'etiketsiz düz öneri olamaz');
      assert.deepStrictEqual(r.approximate.unknownTerms, ['kubernetes', 'terraform']);
      assert.deepStrictEqual(r.approximate.otherTasks, [], 'başka aday yok');

      // Ürünü olmayan/kanıtsız ortamda aynı sorgu sorulur.
      const bare = fixtureCtx({ products: [product('x', { tasks: ['code.app-builder'] })], tasks: [task('code.app-builder')] });
      const asked = await recommendV3('kubernetes terraform', 'all', { ctx: bare });
      assert.strictEqual(asked.kind, 'clarify');
      if (asked.kind === 'clarify') assert.strictEqual(asked.reason, 'no_match');
    } finally {
      llm.restore();
    }
  });
});
