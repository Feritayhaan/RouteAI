// Gece model senkronu: Artificial Analysis + LMArena -> data/models.json
//
//   npm run sync:models              # data/models.json + data/sync-report.md yazar
//   npm run sync:models -- --dry-run # dosya yazmaz, raporu ekrana basar
//
// Ortam: AA_API_KEY (yoksa Artificial Analysis atlanır, eski AA verisi korunur).
// Dayanıklılık: bir kaynak hata verirse o kaynağın eski verisi korunur;
// hiçbir kaynaktan veri gelmezse data/models.json'a dokunulmaz.
// İstekler arasında 1 sn beklenir. Mantık: scripts/sync/core.mjs.

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BENCHMARK_ARENAS } from '../lib/catalog/benchmarkKeys.ts';
import { resolveCurrentModel } from '../lib/catalog/currentModel.ts';
import {
  fetchArtificialAnalysis,
  fetchLmArena,
  mergeModels,
  newReport,
  renderReport,
} from './sync/core.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dryRun = process.argv.includes('--dry-run');
const read = (rel) => JSON.parse(readFileSync(path.join(ROOT, rel), 'utf8'));

async function fetchJson(url, init = {}) {
  let lastError;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const res = await fetch(url, { ...init, signal: AbortSignal.timeout(30_000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (error) {
      lastError = error;
      if (attempt < 2) await new Promise((r) => setTimeout(r, 2000));
    }
  }
  throw lastError;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const today = new Date().toISOString().slice(0, 10);
const aaKey = process.env.AA_API_KEY?.trim() || undefined;
const arenas = BENCHMARK_ARENAS.map((a) => ({ source: a.source, key: a.key, sourceField: a.sourceField }));
const report = newReport();
const io = { fetchJson, sleep, aaKey, arenas, today };

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
  }, report);
  if (!dryRun) {
    writeFileSync(path.join(ROOT, 'data/models.json'), `${JSON.stringify(models, null, 2)}\n`);
    wrote = true;
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
const text = `${renderReport(report, { models, dryRun, wrote }).trimEnd()}\n${productLines.join('\n')}\n`;
if (dryRun) {
  process.stdout.write(text);
} else {
  writeFileSync(path.join(ROOT, 'data/sync-report.md'), text);
  console.log(`[sync-models] ${wrote ? `data/models.json yazıldı (${models.length} model)` : 'data/models.json değişmedi'}; rapor: data/sync-report.md (${report.errors.length} hata)`);
}
