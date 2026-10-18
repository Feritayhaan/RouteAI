import assert from 'node:assert';
import { describe, it } from 'node:test';

// Ayrı dosya: OpenAI istemcisi ilk kurulduğu andaki fetch'i saklıyor (bkz.
// taskClassifierLlmSuccess.test.ts'teki not) — bu dosyada TEK ağ-mocklu test var.
for (const key of Object.keys(process.env)) {
  if (/^(KV_|UPSTASH_|OPENAI_|AMBIGUITY_|UNDERSTANDING_)/.test(key) || key === 'VECTOR_SEARCH_ENABLED') delete process.env[key];
}

const { recommendV3 } = await import('../recommendV3');
const { defaultSearchContext } = await import('../catalog/search');

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

describe('recommendV3 + LLM: en/tr dışındaki dil', () => {
  it('katalog metni yalnız en/tr: LLM başka dil bildirip "exact" derse sözcük kontrolü uygulanmaz, LLM\'e güvenilir', async () => {
    // Katalog metni yalnız en/tr: LLM başka dil bildirip "exact" derse sözcük kontrolü uygulanmaz.
    const german = mockLLM({
      taskId: 'image.logo', confidence: 0.9, pricing: 'unspecified', language: 'de', needsClarification: false,
      candidates: [], fit: 'exact',
    });
    try {
      const ctx = defaultSearchContext();
      const r = await recommendV3('Entwirf mir ein Firmenzeichen für mein Café', 'all', { ctx });
      assert.ok(german.calls() >= 1, 'kural katmanı Almanca sorguda emin olmamalı: LLM\'e gidilmeli');
      assert.notStrictEqual(r.kind, 'clarify');
      assert.strictEqual((r as { taskId?: string }).taskId, 'image.logo');
    } finally {
      german.restore();
    }
  });
});
