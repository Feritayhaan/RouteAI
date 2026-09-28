import assert from 'node:assert';
import { describe, it } from 'node:test';

// Ayrı dosya: OpenAI istemcisi ilk kurulduğu andaki fetch'i saklıyor; başka
// testlerin sahte fetch'i buraya sızmasın diye bu test kendi sürecinde koşar
// (bkz. lib/__tests__/intentParser.test.ts'teki aynı not — aynı sebeple bu
// dosyada TEK bir ağ-mocklu test var, birden fazla değil).
for (const key of Object.keys(process.env)) {
  if (/^(KV_|UPSTASH_|OPENAI_)/.test(key) || key === 'VECTOR_SEARCH_ENABLED') delete process.env[key];
}

const { classifyTask } = await import('../intent/taskClassifier');

describe('classifyTask: LLM başarılı yanıt', () => {
  it('source llm, geçerli taskId, LLM\'in kendi fiyat/dil cevabı constraints\'e yansır', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () => {
      const completion = {
        id: 'x', object: 'chat.completion', created: 0, model: 'gpt-4o-mini',
        choices: [{ index: 0, finish_reason: 'stop', message: { role: 'assistant', content: JSON.stringify({ taskId: 'image.logo', confidence: 0.8, pricing: 'free', language: 'tr' }) } }],
        usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
      };
      return new Response(JSON.stringify(completion), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }) as typeof fetch;
    process.env.OPENAI_API_KEY = 'sk-test-kullanilmamali';
    try {
      // Kural katmanının HİÇBİR göreve bağlayamadığı, fiyat kelimesi içermeyen
      // bir sorgu: LLM'e gerçekten gidildiğini ve pricing'in extractConstraints'ten
      // değil LLM'in kendi cevabından geldiğini garanti eder.
      const r = await classifyTask('tamamen belirsiz ve anlaşılmaz bir cümle yazıyorum burada', { allowLLM: true });
      assert.ok(!('clarify' in r));
      if ('clarify' in r) return;
      assert.strictEqual(r.taskId, 'image.logo');
      assert.strictEqual(r.source, 'llm');
      assert.ok(r.confidence >= 0 && r.confidence <= 1);
      assert.ok(Array.isArray(r.alternatives));
      assert.deepStrictEqual(r.constraints, { pricing: 'free', language: 'tr' });
    } finally {
      globalThis.fetch = originalFetch;
      delete process.env.OPENAI_API_KEY;
    }
  });
});
