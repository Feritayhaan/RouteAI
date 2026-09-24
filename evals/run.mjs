// Altın değerlendirme seti koşucusu.
//
//   npm run eval                        # varsayılan: --recommender=v1
//   npm run eval -- --recommender=v2
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
import { evaluateRow, parseGolden, summarize } from './metrics.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RECOMMENDERS = ['v1', 'v2'];

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

// ------------------------------------------------------------------
// Ortam — lib modülleri yüklenmeden ÖNCE
// ------------------------------------------------------------------
try {
  process.loadEnvFile(path.join(ROOT, '.env.local'));
  console.log('[eval] .env.local yüklendi');
} catch (error) {
  if (error?.code === 'ENOENT') {
    console.log('[eval] .env.local yok; mevcut ortam değişkenleriyle devam');
  } else {
    console.log(`[eval] .env.local okunamadı (${error?.message ?? error}); mevcut ortam değişkenleriyle devam`);
  }
}

for (const key of Object.keys(process.env)) {
  if (/^(KV_|UPSTASH_)/.test(key) || key === 'REDIS_URL' || key === 'VECTOR_SEARCH_ENABLED') {
    delete process.env[key];
  }
}

const hasOpenAIKey = Boolean(process.env.OPENAI_API_KEY?.trim());
if (!hasOpenAIKey) {
  // Sahte anahtar sadece istemcinin kurulup isteği denemesi için: istek aşağıdaki
  // fetch sarmalayıcısında ağa çıkmadan reddedilir ve sayılır.
  process.env.OPENAI_API_KEY = 'sk-eval-no-key';
}

let openaiCalls = 0;
const realFetch = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  const url = input instanceof Request ? input.url : String(input);
  let host = '';
  try {
    host = new URL(url).hostname;
  } catch {
    // göreli URL: OpenAI değil
  }
  if (host === 'openai.com' || host.endsWith('.openai.com')) {
    openaiCalls++;
    if (!hasOpenAIKey) {
      return new Response(JSON.stringify({ error: { message: 'eval: OPENAI_API_KEY yok' } }), {
        status: 401,
        headers: { 'content-type': 'application/json' },
      });
    }
  }
  return realFetch(input, init);
};

// lib modülleri konsola bol log basıyor; tablo okunur kalsın diye adaptör
// çağrısı sırasında susturulur (--verbose ile açılır).
const out = console.log.bind(console);
const CONSOLE_METHODS = ['log', 'info', 'warn', 'error', 'debug'];
async function quietly(fn) {
  if (verbose) return fn();
  const saved = CONSOLE_METHODS.map((m) => console[m]);
  for (const m of CONSOLE_METHODS) console[m] = () => {};
  try {
    return await fn();
  } finally {
    CONSOLE_METHODS.forEach((m, i) => { console[m] = saved[i]; });
  }
}

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
  const callsBefore = openaiCalls;
  const started = performance.now();
  let output;
  try {
    output = await quietly(() => recommend(g.query));
  } catch (error) {
    output = { tools: [], detail: { kind: 'throw', message: String(error?.message ?? error) } };
  }
  const latencyMs = Math.round(performance.now() - started);
  const llmCalls = openaiCalls - callsBefore;

  if (!hasOpenAIKey && llmCalls > 0 && !output.skipped) {
    output = { ...output, skipped: 'needs OPENAI_API_KEY' };
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
