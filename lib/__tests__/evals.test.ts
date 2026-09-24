import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { evaluateRow, parseGolden, summarize } from '../../evals/metrics.mjs';
import toolsDatabase from '../tools-database.json';
import tasksJson from '../../data/tasks.json';

const golden = parseGolden(readFileSync(new URL('../../evals/golden.jsonl', import.meta.url), 'utf8'));

describe('altın set (evals/golden.jsonl)', () => {
  it('40 satır: 20 Türkçe + 20 İngilizce, en az 8 netleştirme gerektiren', () => {
    assert.strictEqual(golden.length, 40);
    assert.strictEqual(golden.filter((r) => r.lang === 'tr').length, 20);
    assert.strictEqual(golden.filter((r) => r.lang === 'en').length, 20);
    assert.ok(golden.filter((r) => r.needsClarification).length >= 8);
  });

  it("v1'de yanlış sonuç veren 7 sorguyu içerir", () => {
    const queries = new Set(golden.map((r) => r.query));
    for (const q of [
      'sunum hazırla',
      'startup için pitch deck',
      'Instagram için reels videosu',
      'youtube videosu için altyazı',
      'python kodumda hata var',
      'ürün fotoğrafı arka plan kaldır',
      'freelancer olarak fatura şablonu',
    ]) {
      assert.ok(queries.has(q), `eksik sorgu: ${q}`);
    }
  });

  it('acceptableTools katalogdaki deprecated olmayan araç adlarıyla birebir aynı', () => {
    const active = new Set(
      (toolsDatabase as { name: string; deprecated?: boolean }[]).filter((t) => !t.deprecated).map((t) => t.name)
    );
    const unknown = golden.flatMap((r) => r.acceptableTools.filter((name) => !active.has(name)).map((name) => `${r.id}: ${name}`));
    assert.deepStrictEqual(unknown, []);
  });

  it('boş acceptableTools sadece "katalog boşluğu" notuyla', () => {
    const bad = golden.filter((r) => r.acceptableTools.length === 0 && !String(r.notes ?? '').includes('katalog boşluğu'));
    assert.deepStrictEqual(bad.map((r) => r.id), []);
  });

  it("her expectedTask data/tasks.json'da tanımlı", () => {
    const defined = new Set((tasksJson as { id: string }[]).map((t) => t.id));
    const missing = golden.filter((r) => !defined.has(r.expectedTask)).map((r) => `${r.id}: ${r.expectedTask}`);
    assert.deepStrictEqual(missing, []);
  });

  it('tekrar eden id reddedilir', () => {
    const line = JSON.stringify(golden[0]);
    assert.throws(() => parseGolden(`${line}\n${line}\n`), /tekrar eden id/);
  });
});

describe('eval metrikleri', () => {
  const row = (id: string, acceptableTools: string[], needsClarification = false) => ({
    id,
    query: id,
    lang: 'tr' as const,
    expectedTask: 'slides.create',
    acceptableTools,
    needsClarification,
  });

  it('top1 ve top3 kabul listesine göre hesaplanır', () => {
    const r = evaluateRow(row('a', ['Gamma AI']), { tools: ['Tome', 'Beautiful.ai', 'Gamma AI', 'Canva'] });
    assert.strictEqual(r.top1Hit, false);
    assert.strictEqual(r.top3Hit, true);
    const miss = evaluateRow(row('b', ['Gamma AI']), { tools: ['Tome', 'Beautiful.ai', 'Canva', 'Gamma AI'] });
    assert.strictEqual(miss.top3Hit, false);
  });

  it('skipped satır ve boş kabul listesi paydaya girmez; araç döndürmeyen netleştirme ıskadır', () => {
    const rows = [
      evaluateRow(row('hit', ['Gamma AI']), { tools: ['Gamma AI'] }, 10),
      evaluateRow(row('skip', ['Gamma AI']), { tools: ['Gamma AI'], skipped: 'needs OPENAI_API_KEY' }, 999),
      evaluateRow(row('gap', []), { tools: ['Tome'] }, 20),
      evaluateRow(row('clarify', ['Gamma AI'], true), { tools: [], clarification: true }, 30),
    ];
    assert.deepStrictEqual(rows[1].tools, []);
    const s = summarize(rows);
    assert.strictEqual(s.total, 4);
    assert.strictEqual(s.evaluated, 3);
    assert.strictEqual(s.skipped, 1);
    assert.deepStrictEqual(s.top1Hit, { hits: 1, n: 2, rate: 0.5 });
    assert.deepStrictEqual(s.top3Hit, { hits: 1, n: 2, rate: 0.5 });
    assert.deepStrictEqual(s.clarifyRate, { hits: 1, n: 3, rate: 0.333 });
    assert.deepStrictEqual(s.clarifyOnNeeded, { hits: 1, n: 1, rate: 1 });
    assert.deepStrictEqual(s.clarifyOnClear, { hits: 0, n: 2, rate: 0 });
    assert.strictEqual(s.avgLatencyMs, 20);
  });

  it('taskMatch sadece görev döndüren adaptörde sayılır', () => {
    const withoutTask = summarize([evaluateRow(row('a', ['Gamma AI']), { tools: ['Gamma AI'] })]);
    assert.strictEqual(withoutTask.taskMatch.n, 0);
    const withTask = summarize([
      evaluateRow(row('a', ['Gamma AI']), { task: 'slides.create', tools: ['Gamma AI'] }),
      evaluateRow(row('b', ['Gamma AI']), { task: 'docs.create', tools: ['Gamma AI'] }),
    ]);
    assert.deepStrictEqual(withTask.taskMatch, { hits: 1, n: 2, rate: 0.5 });
  });
});
