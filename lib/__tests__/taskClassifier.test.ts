import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { classifyTask } from '../intent/taskClassifier';
import { getTaskCacheKey, normalizeTaskQuery } from '../intent/taskCache';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

describe('görev önbelleği: anahtar biçimi (task:v1:, 24 saat)', () => {
  it('önek task:v1: ve normalize edilmiş sorgu', () => {
    assert.strictEqual(getTaskCacheKey('Web Sitesi Yapmak İstiyorum'), `task:v1:${normalizeTaskQuery('Web Sitesi Yapmak İstiyorum')}`);
    assert.ok(getTaskCacheKey('logo').startsWith('task:v1:'));
  });
  it('normalize: büyük/küçük harf ve Türkçe karakter farkı anahtarı değiştirmez', () => {
    assert.strictEqual(getTaskCacheKey('Logo Tasarla'), getTaskCacheKey('logo tasarla'));
    assert.strictEqual(getTaskCacheKey('web sitesi'), getTaskCacheKey('WEB SİTESİ'));
  });
});

describe('classifyTask: kural katmanı (allowLLM:false, ağ çağrısı yok)', () => {
  it('açık eşleşmede kesin sonuç döner: taskId, confidence (0-1), source rules, alternatives dizisi', async () => {
    const r = await classifyTask('logo tasarlamak istiyorum', { allowLLM: false });
    assert.ok(!('clarify' in r));
    if ('clarify' in r) return;
    assert.strictEqual(r.taskId, 'image.logo');
    assert.strictEqual(r.source, 'rules');
    assert.ok(r.confidence > 0 && r.confidence <= 1);
    assert.ok(Array.isArray(r.alternatives));
  });

  it('hiç eşleşme yoksa ya da belirsizse: clarify tam 3 taskId', async () => {
    const r = await classifyTask('asdkfjaslkdfj qwerty 12345', { allowLLM: false });
    assert.ok('clarify' in r);
    if (!('clarify' in r)) return;
    assert.strictEqual(r.clarify.length, 3);
    for (const id of r.clarify) assert.match(id, /^[a-z0-9]+\.[a-z0-9-]+$/);
  });

  it('allowLLM:false iken LLM\'e hiç gidilmez: anahtarsız ortamda da hata fırlatmaz', async () => {
    const before = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    try {
      const r = await classifyTask('web sitesi yapmak istiyorum', { allowLLM: false });
      assert.ok(!('clarify' in r), 'web sitesi yapmak istiyorum kural katmanında kesin çözülmeli');
      if (!('clarify' in r)) assert.strictEqual(r.taskId, 'code.website-builder');
    } finally {
      if (before !== undefined) process.env.OPENAI_API_KEY = before;
    }
  });

  it('sorgudaki fiyat kısıtı constraints\'e yansır (extractConstraints ile aynı kural)', async () => {
    const r = await classifyTask('ücretsiz bir logo aracı istiyorum', { allowLLM: false });
    assert.ok(!('clarify' in r));
    if ('clarify' in r) return;
    assert.strictEqual(r.constraints.pricing, 'free');
  });

  it('KV yoksa (bu test ortamında olduğu gibi) sonuç yine döner, hata fırlatmaz', async () => {
    assert.ok(!process.env.KV_REST_API_URL, 'test ortamında KV tanımlı olmamalı');
    const r = await classifyTask('podcast kapağı istiyorum', { allowLLM: false });
    assert.ok(r); // çağrı patlamadı; getCachedTask/setCachedTask hatayı yuttu
  });
});

describe('classifyTask: golden set üzerinde kural katmanı (P11 kabul: kısa/net sorgularda taskMatch ≥ %80)', () => {
  it('kesin (clarify olmayan) her sonuç doğru görevi verir; kesin oran ≥ %60', async () => {
    const golden = readFileSync(path.join(ROOT, 'evals/golden.jsonl'), 'utf8')
      .split('\n')
      .filter((l) => l.trim())
      .map((l) => JSON.parse(l) as { id: string; query: string; expectedTask: string });

    let confident = 0;
    const wrong: string[] = [];
    for (const row of golden) {
      const r = await classifyTask(row.query, { allowLLM: false });
      if ('clarify' in r) continue;
      confident++;
      if (r.taskId !== row.expectedTask) wrong.push(`${row.id}: beklenen=${row.expectedTask} bulunan=${r.taskId} ("${row.query}")`);
    }

    // metrics.mjs'in taskMatch tanımı tam olarak bu: sadece kesin (task döndüren)
    // satırlar sayılır, clarify satırları paydaya girmez (evals/metrics.mjs).
    assert.deepStrictEqual(wrong, [], 'kural katmanı hiçbir zaman YANLIŞ bir görevde kesin karar vermemeli');
    assert.ok(confident / golden.length >= 0.6, `kesin oran çok düşük: ${confident}/${golden.length}`);
  });
});
