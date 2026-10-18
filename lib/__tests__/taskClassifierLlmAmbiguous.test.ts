import assert from 'node:assert';
import { describe, it } from 'node:test';

// Ayrı dosya: OpenAI istemcisi ilk kurulduğu andaki fetch'i saklıyor (bkz.
// taskClassifierLlmSuccess.test.ts'teki not) — bu dosyada TEK ağ-mocklu test var.
for (const key of Object.keys(process.env)) {
  if (/^(KV_|UPSTASH_|OPENAI_|AMBIGUITY_)/.test(key) || key === 'VECTOR_SEARCH_ENABLED') delete process.env[key];
}

const { classifyTask } = await import('../intent/taskClassifier');

describe('classifyTask: LLM "belirsiz" derse clarify (2-4 görev)', () => {
  it('needsClarification:true + adaylar -> { clarify: [...] }, önbelleğe yazılmaz, istek şemada yeni alanları ister', async () => {
    const originalFetch = globalThis.fetch;
    let sentSchema: { properties?: Record<string, unknown>; required?: string[] } | undefined;
    globalThis.fetch = (async (_url: unknown, init?: { body?: string }) => {
      sentSchema = JSON.parse(String(init?.body)).response_format?.json_schema?.schema;
      const completion = {
        id: 'x', object: 'chat.completion', created: 0, model: 'gpt-4o-mini',
        choices: [{ index: 0, finish_reason: 'stop', message: { role: 'assistant', content: JSON.stringify({
          taskId: 'chat.general-assistant', confidence: 0.3, pricing: 'unspecified', language: 'tr',
          needsClarification: true, candidates: ['text.write-longform', 'research.web', 'image.generate'],
        }) } }],
        usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
      };
      return new Response(JSON.stringify(completion), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }) as typeof fetch;
    process.env.OPENAI_API_KEY = 'sk-test-kullanilmamali';
    try {
      const r = await classifyTask('tamamen belirsiz ve anlaşılmaz bir cümle yazıyorum burada', { allowLLM: true });
      assert.ok('clarify' in r, 'LLM belirsiz dedi: tahmin değil soru');
      if (!('clarify' in r)) return;
      assert.deepStrictEqual(r.clarify, ['chat.general-assistant', 'text.write-longform', 'research.web', 'image.generate']);
      assert.ok(sentSchema?.properties && 'needsClarification' in sentSchema.properties && 'candidates' in sentSchema.properties);
      assert.ok(sentSchema?.required?.includes('needsClarification') && sentSchema.required.includes('candidates'), 'strict şemada tüm alanlar required');
    } finally {
      globalThis.fetch = originalFetch;
      delete process.env.OPENAI_API_KEY;
    }
  });
});
