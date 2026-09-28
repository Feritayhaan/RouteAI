import assert from 'node:assert';
import { describe, it } from 'node:test';

// Ayrı dosya: OpenAI istemcisi ilk kurulduğu andaki fetch'i saklıyor; başka
// testlerin sahte fetch'i buraya sızmasın diye bu test kendi sürecinde koşar.
for (const key of Object.keys(process.env)) {
  if (/^(KV_|UPSTASH_|OPENAI_)/.test(key) || key === 'VECTOR_SEARCH_ENABLED') delete process.env[key];
}

const { parseUserIntent } = await import('../intent/parser');

describe('niyet analizi (LLM kademesi)', () => {
  it('niyet çağrısı JSON\'u kesmeyecek kadar token ister; kesik yanıt ayrıştırılmaz', async () => {
    const originalFetch = globalThis.fetch;
    const bodies: { max_tokens?: number }[] = [];
    globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
      const req = input instanceof Request ? input : new Request(String(input), init);
      bodies.push(JSON.parse(await req.text()));
      const completion = {
        id: 'x', object: 'chat.completion', created: 0, model: 'gpt-4o-mini',
        choices: [{ index: 0, finish_reason: 'length', message: { role: 'assistant', content: '{"primaryCategory":"ses","userGoal":"yarım' } }],
        usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
      };
      return new Response(JSON.stringify(completion), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }) as typeof fetch;
    process.env.OPENAI_API_KEY = 'sk-test-kullanilmamali';
    try {
      const result = await parseUserIntent('merhaba nasılsın bugün nasıl gidiyor');
      assert.ok((bodies[0]?.max_tokens ?? 0) >= 400, `max_tokens: ${bodies[0]?.max_tokens}`);
      assert.ok('code' in result, 'kesik yanıt niyet gibi kullanılmamalı');
    } finally {
      globalThis.fetch = originalFetch;
      delete process.env.OPENAI_API_KEY;
    }
  });
});
