import assert from 'node:assert';
import { describe, it } from 'node:test';

// Ayrı dosya (tek ağ-mocklu test; bkz. taskClassifierLlmSuccess.test.ts).
for (const key of Object.keys(process.env)) {
  if (/^(KV_|UPSTASH_|OPENAI_|AMBIGUITY_)/.test(key) || key === 'VECTOR_SEARCH_ENABLED') delete process.env[key];
}

const { classifyTask } = await import('../intent/taskClassifier');

describe('classifyTask: AMBIGUITY_CLARIFY=off kapatma anahtarı', () => {
  it('LLM belirsiz dese de eski davranış: tek görev (source llm)', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () => {
      const completion = {
        id: 'x', object: 'chat.completion', created: 0, model: 'gpt-4o-mini',
        choices: [{ index: 0, finish_reason: 'stop', message: { role: 'assistant', content: JSON.stringify({
          taskId: 'chat.general-assistant', confidence: 0.3, pricing: 'unspecified', language: 'tr',
          needsClarification: true, candidates: ['text.write-longform', 'research.web'],
        }) } }],
        usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
      };
      return new Response(JSON.stringify(completion), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }) as typeof fetch;
    process.env.OPENAI_API_KEY = 'sk-test-kullanilmamali';
    process.env.AMBIGUITY_CLARIFY = 'off';
    try {
      const r = await classifyTask('tamamen belirsiz ve anlaşılmaz bir cümle yazıyorum burada', { allowLLM: true });
      assert.ok(!('clarify' in r), 'anahtar kapalı: soru sorulmaz');
      if ('clarify' in r) return;
      assert.strictEqual(r.taskId, 'chat.general-assistant');
      assert.strictEqual(r.source, 'llm');
    } finally {
      globalThis.fetch = originalFetch;
      delete process.env.OPENAI_API_KEY;
      delete process.env.AMBIGUITY_CLARIFY;
    }
  });
});
