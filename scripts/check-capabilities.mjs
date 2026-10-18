// Yetenek denetimi (E): kataloğun "bu ürün bu işi yapar" iddiasını ürünün kendi sayfasına karşı sınar.
// SALT RAPOR: data/products.json'a ve başka bir veri dosyasına YAZMAZ; tek çıktı data/capability-report.md.
//
//   npm run check:capabilities                          # tüm aktif ürünler (birkaç ürün başına ~10 sn, toplam ~10-15 dk)
//   npm run check:capabilities -- --only=cursor,jasper-ai
//   npm run check:capabilities -- --dry-run             # dosya yazmaz, raporu ekrana basar
//
// OPENAI_API_KEY gerekir (ortam değişkeni ya da .env.local); yoksa çıkış kodu 1 (sessiz başarısızlık olmasın).
// Çıkış kodu 1: anahtar yok ya da ürünlerin yarısından fazlası okunamadı/hata verdi.
// Mantık ve açıklamalar: scripts/capabilities/core.mjs.

import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadCatalog } from '../lib/catalog/index.ts';
import { fetchPageText } from './prices/core.mjs';
import { THIN_TEXT_CHARS, capabilityExitDecision, checkProducts, renderCapabilityReport } from './capabilities/core.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const today = new Date().toISOString().slice(0, 10);
const args = Object.fromEntries(
  process.argv.slice(2).filter((a) => a.startsWith('--')).map((a) => {
    const [k, ...v] = a.slice(2).split('=');
    return [k, v.length ? v.join('=') : true];
  })
);

const catalog = loadCatalog();
const only = typeof args.only === 'string' && args.only.trim() ? new Set(args.only.split(',').map((s) => s.trim()).filter(Boolean)) : null;
for (const id of only ?? []) {
  if (!catalog.products.some((p) => p.id === id && p.status === 'active')) {
    console.error(`[check-capabilities] aktif ürün yok: ${id}`);
    process.exit(2);
  }
}

// Yerelde anahtar .env.local'dan okunur (Node 20.12+); yoksa ortam değişkeni olarak ver. Değer yazdırılmaz.
if (!process.env.OPENAI_API_KEY?.trim() && typeof process.loadEnvFile === 'function') {
  try {
    process.loadEnvFile(path.join(ROOT, '.env.local'));
  } catch {
    // .env.local yok: sorun değil, anahtar yoksa aşağıda net bir hata verilir.
  }
}

let llm = null;
if (process.env.OPENAI_API_KEY?.trim()) {
  const { openAIJsonLLM } = await import('../lib/promptBuilder/llm.ts');
  llm = openAIJsonLLM();
}
if (!llm) {
  console.error('[check-capabilities] OPENAI_API_KEY yok (ortam değişkeni ya da .env.local). Hiçbir ürün denetlenmedi.');
  process.exit(1);
}

const LABEL = { ok: 'tamam', unreadable: 'SAYFA OKUNAMADI', error: 'HATA' };
console.log('[check-capabilities] başladı: ürünler sırayla denetleniyor (toplam birkaç ila ~15 dakika sürebilir)...');
let n = 0;
const rows = await checkProducts({
  products: catalog.products,
  tasksById: catalog.tasksById,
  fetchHtml: (url) => fetchPageText(url),
  llm,
  only,
  onRow: (r) => {
    const stated = r.pairs.filter((x) => x.status === 'stated').length;
    const chars = r.pages.reduce((sum, x) => sum + x.chars, 0);
    const extra = r.status === 'ok' ? ` — kanıtlı ${stated}/${r.pairs.length} — okunan metin ${chars} karakter${chars < THIN_TEXT_CHARS ? ' (İNCE: "bulunamadı" güvenilmez)' : ''}${['discontinued', 'renamed'].includes(r.liveness?.status) ? ` — ${r.liveness.status.toUpperCase()}` : ''}` : r.note ? ` (${r.note.slice(0, 120)})` : '';
    console.log(`[check-capabilities] ${++n}. ${r.p.name}: ${LABEL[r.status]}${extra}`);
  },
});

const decision = capabilityExitDecision({ rows, hasLlm: true });
const labels = new Map(catalog.tasks.map((t) => [t.id, t.label.tr]));
const report = renderCapabilityReport({ rows, today, decision, labelOf: (id) => labels.get(id) ?? id, editorPicks: catalog.editorPicks });

if (args['dry-run']) {
  console.log(report);
} else {
  writeFileSync(path.join(ROOT, 'data/capability-report.md'), report);
  console.log('[check-capabilities] data/capability-report.md yazıldı.');
}
for (const reason of decision.reasons) console.log(`[check-capabilities] ${reason}`);
process.exitCode = decision.code;
