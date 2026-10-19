import assert from 'node:assert';
import { describe, it } from 'node:test';

// Ayrı dosya: OpenAI istemcisi ilk kurulduğu andaki fetch'i saklıyor; başka testlerin sahte fetch'i buraya sızmasın
// diye bu test kendi sürecinde koşar (bkz. taskClassifierLlmSuccess.test.ts'teki aynı not: dosyada TEK ağ-mocklu test).
for (const key of Object.keys(process.env)) {
  if (/^(KV_|UPSTASH_|OPENAI_)/.test(key) || key === 'VECTOR_SEARCH_ENABLED') delete process.env[key];
}

const { classifyTask } = await import('../intent/taskClassifier');

describe('classifyTask: tek yan kelimeli doğal cümle LLM\'e gider ve LLM\'in cevabı geçerli olur', () => {
  it('"hikayemizi" kuralla Uzun metin yazımı seçtirmez: bütün cümle LLM\'e gönderilir, müzik dönüşü kabul edilir', async () => {
    const originalFetch = globalThis.fetch;
    const requests: { messages: { role: string; content: string }[] }[] = [];
    globalThis.fetch = (async (_url: unknown, init?: { body?: string }) => {
      requests.push(JSON.parse(String(init?.body)));
      const completion = {
        id: 'x', object: 'chat.completion', created: 0, model: 'gpt-4o-mini',
        choices: [{ index: 0, finish_reason: 'stop', message: { role: 'assistant', content: JSON.stringify({
          taskId: 'music.generate', confidence: 0.9, pricing: 'unspecified', language: 'tr', needsClarification: false, candidates: [], fit: 'exact',
        }) } }],
        usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
      };
      return new Response(JSON.stringify(completion), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }) as typeof fetch;
    process.env.OPENAI_API_KEY = 'sk-test-kullanilmamali';
    const query = 'arkadaşımın düğününde çalacak, sözleri bizim hikayemizi anlatan bir parça yaptırmak istiyorum';
    try {
      const r = await classifyTask(query, { allowLLM: true, useCache: false });
      assert.strictEqual(requests.length, 1, 'LLM\'e gidilmedi: kural katmanı yan kelimeyle karar vermiş');
      // Kullanıcının cümlesi bütün olarak gitti (anahtar kelimeye indirgenmedi) ve istem "bütün mesajı oku" diyor.
      assert.strictEqual(requests[0].messages.find((m) => m.role === 'user')?.content, query);
      assert.match(requests[0].messages.find((m) => m.role === 'system')?.content ?? '', /Read the WHOLE message/);
      assert.ok(!('clarify' in r));
      if ('clarify' in r) return;
      assert.strictEqual(r.taskId, 'music.generate');
      assert.strictEqual(r.source, 'llm');
      // Kuralın yan kelime tahmini alternatif olarak kalır, karar vermez.
      assert.ok(r.alternatives.includes('text.write-longform'));
    } finally {
      globalThis.fetch = originalFetch;
      delete process.env.OPENAI_API_KEY;
    }
  });
});
