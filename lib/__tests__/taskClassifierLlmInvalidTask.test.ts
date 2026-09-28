import assert from 'node:assert';
import { describe, it } from 'node:test';

// Ayrı dosya (bkz. intentParser.test.ts'teki not): bu dosyada TEK ağ-mocklu test var.
for (const key of Object.keys(process.env)) {
  if (/^(KV_|UPSTASH_|OPENAI_)/.test(key) || key === 'VECTOR_SEARCH_ENABLED') delete process.env[key];
}

const { classifyTask } = await import('../intent/taskClassifier');

describe('classifyTask: LLM şema dışı bir taskId döndürürse', () => {
  it('bilinmeyen taskId reddedilir (uydurma görev yok); clarify döner', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () => {
      const completion = {
        id: 'x', object: 'chat.completion', created: 0, model: 'gpt-4o-mini',
        choices: [{ index: 0, finish_reason: 'stop', message: { role: 'assistant', content: JSON.stringify({ taskId: 'not.a-real-task', confidence: 0.9, pricing: 'unspecified', language: 'en' }) } }],
        usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
      };
      return new Response(JSON.stringify(completion), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }) as typeof fetch;
    process.env.OPENAI_API_KEY = 'sk-test-kullanilmamali';
    try {
      const r = await classifyTask('tamamen belirsiz ve anlaşılmaz bir cümle yazıyorum burada', { allowLLM: true });
      assert.ok('clarify' in r);
    } finally {
      globalThis.fetch = originalFetch;
      delete process.env.OPENAI_API_KEY;
    }
  });
});
