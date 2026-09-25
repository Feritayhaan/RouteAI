// Altın değerlendirme seti koşucusu.
//
//   npm run eval                        # varsayılan: --recommender=v1
//   npm run eval -- --recommender=v2-oracle   # görevi bilen RouteAI Skoru sıralaması
//   npm run eval -- --recommender=v2          # sohbet ajanı (OPENAI_API_KEY gerekir, token harcar)
//   npm run eval -- --recommender=v1 --verbose   # lib loglarını da göster
//
// Ne yapar: evals/golden.jsonl'daki her sorguyu seçilen öneri sistemine verir,
// satır bazlı tablo + özet basar, sonucu evals/results/<YYYY-MM-DD>-<recommender>.json'a yazar.
//
// Ortam (bilinçli seçimler):
//  - .env.local varsa yüklenir (OPENAI_API_KEY için); yoksa çökmeden devam edilir.
//  - KV ve vektör değişkenleri bu süreçte SİLİNİR: katalog git'teki
//    lib/tools-database.json'dan okunur, niyet önbelleği kullanılmaz, canlı
//    KV'ye hiçbir şey yazılmaz. Böylece ölçüm tekrarlanabilir ve v2'nin git'teki
//    katalogla karşılaştırılabilir olur.
//  - OPENAI_API_KEY yoksa OpenAI'a giden her istek ağa çıkmadan yakalanır ve
//    reddedilir; o sorgu 'skipped' işaretlenir (LLM gerektiriyor). Anahtar varsa
//    istekler gerçekten gider ve sayılır.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
// env.mjs İLK import: ortamı lib modülleri yüklenmeden hazırlar (bkz. o dosya).
import { hasOpenAIKey, openaiCallCount, openaiFailureCount, out, quietly, setVerbose } from './env.mjs';
import { evaluateRow, parseGolden, summarize } from './metrics.mjs';
import { explainOracleMisses } from './oracleMisses.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RECOMMENDERS = ['v1', 'v2-oracle', 'v2'];

// ------------------------------------------------------------------
// Argümanlar
// ------------------------------------------------------------------
const args = process.argv.slice(2);
const recommenderArg = args.find((a) => a.startsWith('--recommender='));
const recommenderName = recommenderArg ? recommenderArg.split('=')[1] : 'v1';
const verbose = args.includes('--verbose');

if (!RECOMMENDERS.includes(recommenderName)) {
  console.error(`[eval] bilinmeyen recommender: "${recommenderName}". Seçenekler: ${RECOMMENDERS.join(', ')}`);
  process.exit(1);
}

setVerbose(verbose);

const { recommenders } = await quietly(() => import('./recommenders.mjs'));
const recommend = recommenders[recommenderName];

// ------------------------------------------------------------------
// Koşu
// ------------------------------------------------------------------
const golden = parseGolden(readFileSync(path.join(ROOT, 'evals/golden.jsonl'), 'utf8'));

out(`[eval] recommender=${recommenderName} | ${golden.length} sorgu | katalog: lib/tools-database.json (KV ve vektör araması kapalı)`);
out(`[eval] OpenAI anahtarı: ${hasOpenAIKey ? 'var (LLM çağrıları gerçek)' : 'YOK — LLM gerektiren sorgular skipped'}`);

const rows = [];
for (const g of golden) {
  const callsBefore = openaiCallCount();
  const failuresBefore = openaiFailureCount();
  const started = performance.now();
  let output;
  try {
    output = await quietly(() => recommend(g.query, g));
  } catch (error) {
    output = { tools: [], detail: { kind: 'throw', message: String(error?.message ?? error) } };
  }
  const latencyMs = Math.round(performance.now() - started);
  const llmCalls = openaiCallCount() - callsBefore;

  if (!hasOpenAIKey && llmCalls > 0 && !output.skipped) {
    output = { ...output, skipped: 'needs OPENAI_API_KEY' };
  } else if (hasOpenAIKey && openaiFailureCount() > failuresBefore && !output.skipped) {
    output = { ...output, skipped: 'openai_error' };
  }

  const row = evaluateRow(g, output, latencyMs);
  row.llmCalls = llmCalls;
  rows.push(row);
}

// ------------------------------------------------------------------
// Rapor
// ------------------------------------------------------------------
const mark = (v) => (v === null ? '–' : v ? '✓' : '✗');
const pct = ({ hits, n, rate }) => (n === 0 ? 'n/a' : `${hits}/${n} = %${(rate * 100).toFixed(1)}`);
const clip = (s, n) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

function describe(row) {
  if (row.skipped) return `skipped: ${row.skipped}`;
  const d = row.detail ?? {};
  const parts = [d.kind, d.category ?? d.code].filter(Boolean);
  if (d.usedFallback) parts.push('fallback');
  if (d.relaxedConstraint) parts.push(`gevşetildi:${d.relaxedConstraint}`);
  if (row.task) parts.push(`task=${row.task}`);
  return parts.join(' ');
}

out('');
out(`${'id'.padEnd(6)} ${'nc'.padEnd(2)} top1 top3 clr  ${'expectedTask'.padEnd(26)} ${'ilk 3 araç'.padEnd(64)} not`);
out('-'.repeat(130));
for (const r of rows) {
  const tools = r.tools.length > 0 ? r.tools.slice(0, 3).join(' > ') : '(yok)';
  out([
    r.id.padEnd(6),
    (r.needsClarification ? '?' : '·').padEnd(2),
    mark(r.top1Hit).padEnd(4),
    mark(r.top3Hit).padEnd(4),
    mark(r.clarification).padEnd(4),
    r.expectedTask.padEnd(26),
    clip(tools, 64).padEnd(64),
    describe(r),
  ].join(' '));
}

const summary = summarize(rows);
out('');
out(`================ ÖZET (${recommenderName}) ================`);
out(`  sorgu        : ${summary.total} | değerlendirilen ${summary.evaluated} | skipped ${summary.skipped}`);
out(`  top1Hit      : ${pct(summary.top1Hit)}   (acceptableTools boş ve skipped satırlar hariç)`);
out(`  top3Hit      : ${pct(summary.top3Hit)}`);
out(`  taskMatch    : ${summary.taskMatch.n === 0 ? 'n/a (adaptör görev döndürmüyor)' : pct(summary.taskMatch)}`);
out(`  clarifyRate  : ${pct(summary.clarifyRate)}   (gereken satırlarda ${pct(summary.clarifyOnNeeded)}; gerekmeyenlerde ${pct(summary.clarifyOnClear)})`);
out(`  ort. gecikme : ${summary.avgLatencyMs === null ? 'n/a' : `${summary.avgLatencyMs} ms`}`);
if (summary.avgTokens !== null) out(`  ort. token   : ${summary.avgTokens}`);
if (summary.confusedTasks.length > 0) {
  out(`  karışan görevler: ${summary.confusedTasks.slice(0, 8).map((c) => `${c.pair} (${c.count})`).join(', ')}`);
}

const date = new Date().toISOString().slice(0, 10);
const resultsDir = path.join(ROOT, 'evals/results');
const resultFile = path.join(resultsDir, `${date}-${recommenderName}.json`);
mkdirSync(resultsDir, { recursive: true });
writeFileSync(resultFile, `${JSON.stringify({
  recommender: recommenderName,
  date,
  generatedAt: new Date().toISOString(),
  env: {
    openaiKey: hasOpenAIKey,
    catalog: 'lib/tools-database.json',
    kv: 'disabled',
    vectorSearch: 'disabled',
  },
  summary,
  rows,
}, null, 2)}\n`);
out('');
out(`[eval] sonuç yazıldı: ${path.relative(ROOT, resultFile)}`);

// v2-oracle hedefin altındaysa kaçan her sorgunun nedeni yazılır (P4 KABUL).
if (recommenderName === 'v2-oracle') {
  const target = 0.85;
  const rate = summary.top3Hit.rate;
  if (rate === null || rate < target) {
    const { loadCatalog } = await import('../lib/catalog/index.ts');
    const missesFile = path.join(resultsDir, 'v2-oracle-misses.md');
    writeFileSync(missesFile, explainOracleMisses(rows, golden, loadCatalog(), { date, rate, target }));
    out(`[eval] top3Hit hedefin (%${target * 100}) altında; nedenler: ${path.relative(ROOT, missesFile)}`);
  }
}
