// Cümle sınıflandırma değerlendirmesi: kullanıcı görevi tek kelimeyle değil, günlük bir CÜMLEYLE anlattığında
// doğru göreve gidiyor muyuz?
//
//   npm run eval:sentences                       # dev + heldout, iki aşama
//   npm run eval:sentences -- --split=heldout    # yalnızca bekletilen set
//   npm run eval:sentences -- --rows             # satır satır sonuç
//   npm run eval:sentences -- --verbose          # lib loglarını da göster
//
// Veri: evals/sentences.jsonl (126 cümle). Etiketleri (expectedTask / acceptableTasks / needsClarification) Claude
// yazdı, Ferit onaylayana kadar TASLAKTIR (evals/REVIEW.md ile aynı kural). İki bölüm var:
//   - dev: kapıyı (lib/intent/sentenceEvidence.ts) ayarlarken bakılan 65 cümle.
//   - heldout: ayar sırasında satır satır HİÇ incelenmeyen 61 cümle. Genelleme bununla ölçülür; ayar yaparken satırlarına
//     bakma, yalnızca özete bak (bakarsan artık "bekletilmiş" sayılmaz, yeni cümleler ekle).
//
// İki aşama:
//   1. KURAL KATMANI (LLM'siz): cevapladığı cümlelerin kaçı doğru, kaçı yanlış? "Özgüvenle yanlış" en tehlikelisi.
//   2. TAM SINIFLANDIRMA: OPENAI_API_KEY varsa (.env.local) belirsiz cümleler gerçek LLM'e gider; yoksa 1. aşamayla aynıdır
//      ve bu aşama ÖLÇÜLMEDİ diye yazılır. LLM'in cümleyi anlama kalitesi ancak anahtarla ölçülür.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
// env.mjs İLK import: ortamı lib modülleri yüklenmeden hazırlar (KV kapalı, anahtar yoksa OpenAI reddedilir).
import { hasOpenAIKey, openaiCallCount, openaiFailureCount, out, quietly, setVerbose } from './env.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const splitArg = args.find((a) => a.startsWith('--split='))?.split('=')[1] ?? 'all';
const showRows = args.includes('--rows');
setVerbose(args.includes('--verbose'));
if (!['all', 'dev', 'heldout'].includes(splitArg)) {
  console.error(`[sentences] bilinmeyen --split: "${splitArg}" (all | dev | heldout)`);
  process.exit(1);
}

const { classifyTask } = await quietly(() => import('../lib/intent/taskClassifier.ts'));
const rows = readFileSync(path.join(ROOT, 'evals/sentences.jsonl'), 'utf8')
  .split('\n')
  .filter((l) => l.trim())
  .map((l) => JSON.parse(l))
  .filter((r) => splitArg === 'all' || r.split === splitArg);

const isRight = (row, taskId) => row.expectedTask !== null && (taskId === row.expectedTask || row.acceptableTasks.includes(taskId));

/** Bir sınıflandırma sonucunu etiketle karşılaştırır. */
function judge(row, result) {
  if ('clarify' in result) {
    const hasExpected = row.expectedTask !== null && result.clarify.some((id) => isRight(row, id));
    return { kind: 'asked', hasExpected, task: null };
  }
  if (row.expectedTask === null) return { kind: 'wrong', task: result.taskId, why: 'belirsiz cümleye cevap verdi' };
  return { kind: isRight(row, result.taskId) ? 'right' : 'wrong', task: result.taskId, source: result.source };
}

async function run(allowLLM) {
  const results = [];
  for (const row of rows) {
    const calls = openaiCallCount();
    const failures = openaiFailureCount();
    let result;
    let error = null;
    try {
      result = await quietly(() => classifyTask(row.query, { allowLLM, useCache: false }));
    } catch (e) {
      error = String(e?.message ?? e);
    }
    const llmCalls = openaiCallCount() - calls;
    // Anahtar varken OpenAI hatası: o satır ölçüme girmez (yedek yoldan cevaplanmış olur).
    const skipped = error !== null || (allowLLM && openaiFailureCount() > failures);
    results.push({ row, llmCalls, skipped, error, ...(skipped ? {} : judge(row, result)) });
  }
  return results;
}

function summarize(results) {
  const used = results.filter((r) => !r.skipped);
  const net = used.filter((r) => r.row.expectedTask !== null);
  const vague = used.filter((r) => r.row.expectedTask === null);
  const count = (list, kind) => list.filter((r) => r.kind === kind).length;
  return {
    n: used.length,
    skipped: results.length - used.length,
    net: net.length,
    right: count(net, 'right'),
    wrong: count(net, 'wrong'),
    asked: count(net, 'asked'),
    askedWithExpected: net.filter((r) => r.kind === 'asked' && r.hasExpected).length,
    vague: vague.length,
    vagueAsked: count(vague, 'asked'),
    vagueAnswered: count(vague, 'wrong'),
    llmCalls: results.reduce((s, r) => s + r.llmCalls, 0),
  };
}

const pct = (a, b) => (b === 0 ? 'n/a' : `%${((100 * a) / b).toFixed(0)}`);
function report(title, results) {
  out(`\n── ${title}`);
  for (const split of splitArg === 'all' ? ['dev', 'heldout', 'hepsi'] : [splitArg]) {
    const s = summarize(split === 'hepsi' ? results : results.filter((r) => r.row.split === split));
    out(`  [${split}] ${s.n} cümle (${s.net} net, ${s.vague} belirsiz)${s.skipped ? `, ${s.skipped} atlandı` : ''}`);
    out(`      doğru cevap      : ${s.right}/${s.net} ${pct(s.right, s.net)}`);
    out(`      YANLIŞ cevap     : ${s.wrong}/${s.net} ${pct(s.wrong, s.net)}   ← özgüvenle yanlış göreve gitme`);
    out(`      soru sordu       : ${s.asked}/${s.net} ${pct(s.asked, s.net)}   (seçeneklerde beklenen görev: ${s.askedWithExpected}/${s.asked})`);
    out(`      belirsiz cümle   : ${s.vagueAsked}/${s.vague} soruldu, ${s.vagueAnswered} yanlışlıkla cevaplandı`);
    if (s.llmCalls > 0) out(`      OpenAI çağrısı   : ${s.llmCalls}`);
  }
}

out(`[sentences] ${rows.length} cümle | split=${splitArg} | OpenAI anahtarı: ${hasOpenAIKey ? 'VAR (LLM aşaması gerçek)' : 'YOK (LLM aşaması ölçülmedi)'}`);
const rules = await run(false);
report('1) KURAL KATMANI (LLM yok)', rules);

let full = null;
if (hasOpenAIKey) {
  full = await run(true);
  report('2) TAM SINIFLANDIRMA (kural + LLM)', full);
} else {
  out('\n── 2) TAM SINIFLANDIRMA: ÖLÇÜLMEDİ (OPENAI_API_KEY yok). Cümleyi anlayan LLM aşaması için .env.local ekleyip tekrar çalıştır.');
}

if (showRows) {
  out('');
  for (const [i, r] of rules.entries()) {
    const f = full?.[i];
    const fmt = (x) => (x.skipped ? 'atlandı' : x.kind === 'asked' ? `soru${x.hasExpected ? '(beklenen var)' : ''}` : `${x.kind === 'right' ? '✓' : '✗'} ${x.task}`);
    out(`${r.row.id.padEnd(5)} ${String(r.row.expectedTask).padEnd(28)} kural: ${fmt(r).padEnd(30)}${f ? ` tam: ${fmt(f)}` : ''}  «${r.row.query.slice(0, 56)}»`);
  }
}

const date = new Date().toISOString().slice(0, 10);
mkdirSync(path.join(ROOT, 'evals/results'), { recursive: true });
const file = path.join(ROOT, 'evals/results', `${date}-sentences${hasOpenAIKey ? '' : '-nokey'}.json`);
const pack = (results) => results.map((r) => ({ id: r.row.id, split: r.row.split, expected: r.row.expectedTask, kind: r.skipped ? 'skipped' : r.kind, task: r.task ?? null, llmCalls: r.llmCalls }));
writeFileSync(file, `${JSON.stringify({ date, split: splitArg, openaiKey: hasOpenAIKey, rules: pack(rules), full: full ? pack(full) : null }, null, 1)}\n`);
out(`\n[sentences] sonuç yazıldı: ${path.relative(ROOT, file)}`);
