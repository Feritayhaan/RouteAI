import assert from 'node:assert';
import { describe, it } from 'node:test';

// Ayrı dosya: OpenAI istemcisi ilk kurulduğu andaki fetch'i saklıyor (bkz.
// taskClassifierLlmSuccess.test.ts); bu dosyada TEK ağ-mocklu test var.
for (const key of Object.keys(process.env)) {
  if (/^(KV_|UPSTASH_|OPENAI_)/.test(key) || key === 'VECTOR_SEARCH_ENABLED') delete process.env[key];
}

const { recommendV3 } = await import('../recommendV3');

describe('recommendV3 + LLM açık: iş akışı şablonu LLM\'den önce', () => {
  it('proje isteği LLM\'e gitmeden workflow; şablonsuz belirsiz sorgu LLM\'e gider', async () => {
    const originalFetch = globalThis.fetch;
    let llmCalls = 0;
    globalThis.fetch = (async () => {
      llmCalls++;
      const completion = {
        id: 'x', object: 'chat.completion', created: 0, model: 'gpt-4o-mini',
        choices: [{ index: 0, finish_reason: 'stop', message: { role: 'assistant', content: JSON.stringify({ taskId: 'text.write-longform', confidence: 0.8, pricing: 'unspecified', language: 'tr' }) } }],
        usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
      };
      return new Response(JSON.stringify(completion), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }) as typeof fetch;
    process.env.OPENAI_API_KEY = 'sk-test-kullanilmamali';
    try {
      // Eskiden: kural belirsiz -> LLM tek görev seçer -> iş akışı hiç denenmezdi.
      const project = await recommendV3('podcast oluşturmak istiyorum', 'all', { allowLLM: true });
      assert.strictEqual(project.kind, 'workflow');
      if (project.kind === 'workflow') assert.strictEqual(project.templateId, 'podcast-creation');
      assert.strictEqual(llmCalls, 0, 'şablon bulunduysa LLM çağrılmamalı');

      const vague = await recommendV3('tamamen belirsiz ve anlaşılmaz bir cümle yazıyorum burada', 'all', { allowLLM: true });
      assert.strictEqual(llmCalls, 1, 'şablon yoksa belirsiz sorgu LLM\'e gitmeli');
      assert.ok(vague.kind === 'recommendation' || vague.kind === 'no_evidence');
      assert.strictEqual((vague as { taskId?: string }).taskId, 'text.write-longform');
      if (vague.kind === 'recommendation') assert.strictEqual(vague.taskSource, 'llm');
    } finally {
      globalThis.fetch = originalFetch;
      delete process.env.OPENAI_API_KEY;
    }
  });
});
