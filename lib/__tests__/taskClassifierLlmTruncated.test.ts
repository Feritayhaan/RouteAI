import assert from 'node:assert';
import { describe, it } from 'node:test';

// Ayrı dosya (bkz. intentParser.test.ts'teki not): bu dosyada TEK ağ-mocklu test var.
for (const key of Object.keys(process.env)) {
  if (/^(KV_|UPSTASH_|OPENAI_)/.test(key) || key === 'VECTOR_SEARCH_ENABLED') delete process.env[key];
}

const { classifyTask } = await import('../intent/taskClassifier');

describe('classifyTask: LLM yanıtı kesilirse (finish_reason length)', () => {
  it('kesik cevap görev gibi kullanılmaz; kural katmanının clarify\'ine düşer (parser.ts\'teki gibi)', async () => {
    const originalFetch = globalThis.fetch;
    const bodies: { max_tokens?: number }[] = [];
    globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
      const req = input instanceof Request ? input : new Request(String(input), init);
      bodies.push(JSON.parse(await req.text()));
      const completion = {
        id: 'x', object: 'chat.completion', created: 0, model: 'gpt-4o-mini',
        choices: [{ index: 0, finish_reason: 'length', message: { role: 'assistant', content: '{"taskId":"image.log' } }],
        usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
      };
      return new Response(JSON.stringify(completion), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }) as typeof fetch;
    process.env.OPENAI_API_KEY = 'sk-test-kullanilmamali';
    try {
      const r = await classifyTask('tamamen belirsiz ve anlaşılmaz bir cümle yazıyorum burada', { allowLLM: true });
      assert.ok('clarify' in r, 'kesik yanıt görev gibi kullanılmamalı');
      if ('clarify' in r) assert.strictEqual(r.clarify.length, 3);
      assert.ok((bodies[0]?.max_tokens ?? 0) >= 100, `max_tokens: ${bodies[0]?.max_tokens}`);
    } finally {
      globalThis.fetch = originalFetch;
      delete process.env.OPENAI_API_KEY;
    }
  });
});
