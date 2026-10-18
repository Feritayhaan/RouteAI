// Gece model senkronu: Artificial Analysis + LMArena -> data/models.json
//
//   npm run sync:models              # data/models.json + data/sync-report.md yazar
//   npm run sync:models -- --dry-run # dosya yazmaz, raporu ekrana basar
//   npm run sync:models -- --categories # ek olarak LMArena'nın TÜM alt kategori skorlarını data/lmarena-categories.json'a yazar
//                                       # (yalnızca `npm run audit:catalog` okur; sıralamaya girmez)
//
// tasks.json'da kullanılan alt kategoriler (lib/catalog/benchmarkKeys.ts, anahtar `config/kategori`)
// bayraksız da models.json'a yazılır: sıralama onlardan hesaplanır.
//
// Ortam: AA_API_KEY (yoksa Artificial Analysis atlanır, eski AA verisi korunur).
// Dayanıklılık: bir kaynak hata verirse o kaynağın eski verisi korunur;
// hiçbir kaynaktan veri gelmezse data/models.json'a dokunulmaz.
// Çıkış kodu (syncExitDecision): beklenen bir kaynaktan (LMArena; anahtar
// tanımlıysa AA) hiç veri gelmezse 1. Rapor ve veri yine yazılır; gece işi
// kırmızı kararı en sonda uygular.
// İstekler arasında 1 sn beklenir; 429/5xx'te retryDelayMs'e göre daha uzun
// beklenip tekrar denenir (bkz. scripts/sync/core.mjs). Mantık: scripts/sync/core.mjs.

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BENCHMARK_ARENAS } from '../lib/catalog/benchmarkKeys.ts';
import { resolveCurrentModel } from '../lib/catalog/currentModel.ts';
import {
  buildCategoryScores,
  fetchArtificialAnalysis,
  fetchLmArena,
  mergeModels,
  newReport,
  renderReport,
  isRetryableStatus,
  retryDelayMs,
  serializeCategoryScores,
  syncExitDecision,
} from './sync/core.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dryRun = process.argv.includes('--dry-run');
const withCategories = process.argv.includes('--categories');
const read = (rel) => JSON.parse(readFileSync(path.join(ROOT, rel), 'utf8'));

const MAX_ATTEMPTS = 5;

async function fetchJson(url, init = {}) {
  let lastError;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    let res;
    try {
      res = await fetch(url, { ...init, signal: AbortSignal.timeout(30_000) });
    } catch (error) {
      lastError = error;
      if (attempt < MAX_ATTEMPTS) await new Promise((r) => setTimeout(r, retryDelayMs({ status: 0, attempt })));
      continue;
    }
    if (res.ok) return await res.json();
    lastError = new Error(`HTTP ${res.status}`);
    if (!isRetryableStatus(res.status) || attempt >= MAX_ATTEMPTS) break;
    const retryAfterSeconds = Number(res.headers.get('retry-after'));
    await new Promise((r) => setTimeout(r, retryDelayMs({ status: res.status, attempt, retryAfterSeconds })));
  }
  throw lastError;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const today = new Date().toISOString().slice(0, 10);
const aaKey = process.env.AA_API_KEY?.trim() || undefined;
// Genel arenalar config başına bir kez çekilir; tasks.json'da kullanılan alt kategoriler (benchmarkKeys.ts)
// aynı sayfalardan ayıklanıp models.json'a `config/kategori` anahtarıyla yazılır (ekstra istek yok).
const arenas = BENCHMARK_ARENAS.filter((a) => !a.category).map((a) => ({ source: a.source, key: a.key, sourceField: a.sourceField }));
const categoryArenas = BENCHMARK_ARENAS.filter((a) => a.category).map((a) => ({ source: a.source, key: a.key, sourceField: a.sourceField, category: a.category }));
const report = newReport();
const categoryRows = withCategories ? [] : undefined;
const io = { fetchJson, sleep, aaKey, arenas, categoryArenas, today, ...(categoryRows ? { categoryRows } : {}) };

const aaRows = await fetchArtificialAnalysis(io, report);
report.fetchedAt['Artificial Analysis'] = aaRows ? today : null;
const lmRows = await fetchLmArena(io, report);
report.fetchedAt.LMArena = lmRows ? today : null;

const oldModels = read('data/models.json');
const succeeded = new Set([...(aaRows ? ['artificialanalysis'] : []), ...(lmRows ? ['lmarena'] : [])]);
let models = oldModels;
let wrote = false;

if (succeeded.size === 0) {
  report.errors.push('Hiçbir kaynaktan veri gelmedi; data/models.json değiştirilmedi.');
} else {
  const linked = new Set(read('data/products.json').flatMap((p) => p.models ?? []));
  models = mergeModels({
    oldModels,
    fresh: [...(aaRows ?? []), ...(lmRows ?? [])],
    succeededSources: succeeded,
    aliases: read('data/model-aliases.json').aliases ?? {},
    linkedModelIds: linked,
    today,
    keepArenas: new Set(report.failedArenas),
  }, report);
  if (!dryRun) {
    writeFileSync(path.join(ROOT, 'data/models.json'), `${JSON.stringify(models, null, 2)}\n`);
    wrote = true;
  }
}

// Alt kategori skorları (isteğe bağlı): sadece models.json'daki modeller için, ayrı dosyaya.
let categoriesNote = null;
if (withCategories) {
  if (!lmRows) {
    categoriesNote = 'LMArena verisi gelmediği için data/lmarena-categories.json yazılmadı (eski dosya korunur).';
  } else {
    const { configs, skippedUnknownModel } = buildCategoryScores({
      rows: categoryRows,
      aliases: read('data/model-aliases.json').aliases ?? {},
      modelIds: new Set(models.map((m) => m.id)),
    });
    const text = serializeCategoryScores({ fetchedAt: today, configs });
    const summary = Object.entries(configs).map(([c, cats]) => `${c}: ${Object.keys(cats).length} kategori`).join(', ') || 'alt kategori bulunamadı';
    if (dryRun) {
      categoriesNote = `[dry-run] data/lmarena-categories.json yazılmadı (${summary}; ${(text.length / 1024).toFixed(0)} KB olurdu; models.json'da olmayan ${skippedUnknownModel} satır atlandı).`;
    } else if (Object.keys(configs).length === 0) {
      categoriesNote = 'Alt kategori satırı bulunamadı; data/lmarena-categories.json yazılmadı.';
    } else {
      writeFileSync(path.join(ROOT, 'data/lmarena-categories.json'), text);
      categoriesNote = `data/lmarena-categories.json yazıldı (${summary}; ${(text.length / 1024).toFixed(0)} KB; models.json'da olmayan ${skippedUnknownModel} satır atlandı).`;
    }
  }
}

// Ürün -> güncel model (kurala göre otomatik; sitede gösterilen bu). İnceleme için rapora eklenir.
const productLines = ['', '## Ürün → güncel model (otomatik)', '', '| Ürün | Güncel model | Çıkış | Kaynak |', '| --- | --- | --- | --- |'];
for (const p of read('data/products.json').filter((x) => x.status === 'active' && (x.modelRule || x.models?.length))) {
  const cm = resolveCurrentModel(p, models);
  productLines.push(cm
    ? `| ${p.name} | ${cm.name} | ${cm.releaseDate ?? '—'} | ${cm.source}, ${cm.fetchedAt} |`
    : `| ${p.name} | (eşleşen model yok) | — | — |`);
}
const decision = syncExitDecision({
  sources: [
    { name: 'Artificial Analysis', needsKey: true, hasKey: Boolean(aaKey), gotData: Boolean(aaRows) },
    { name: 'LMArena', needsKey: false, gotData: Boolean(lmRows) },
  ],
  errors: report.errors,
  failedArenas: report.failedArenas,
});
const text = `${renderReport(report, { models, dryRun, wrote, decision }).trimEnd()}\n${productLines.join('\n')}\n`;
if (dryRun) {
  process.stdout.write(text);
} else {
  writeFileSync(path.join(ROOT, 'data/sync-report.md'), text);
  console.log(`[sync-models] ${wrote ? `data/models.json yazıldı (${models.length} model)` : 'data/models.json değişmedi'}; rapor: data/sync-report.md (${report.errors.length} hata)`);
  // Sadece sayı değil, hataların kendisi de logda görünsün.
  for (const e of report.errors) console.log(`[sync-models] hata: ${e}`);
}
if (categoriesNote) console.log(`[sync-models] ${categoriesNote}`);
for (const r of decision.reasons) console.log(`[sync-models] ${r}`);
console.log(`[sync-models] karar: ${decision.code === 0 ? 'başarılı' : 'BAŞARISIZ (çıkış kodu 1)'}`);
process.exitCode = decision.code;
