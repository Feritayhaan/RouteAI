// Fiyat kontrolü: aktif ürünlerin pricingUrl sayfası -> OpenAI ile
// { model, startingPrice, currency } çıkarımı -> kanıt sayfada gerçekten var mı
// diye doğrulanır -> fark varsa products.json'da öneri + data/price-report.md.
// Workflow (check-prices.yml) haftalık koşar ve PR açar; priceCheckedAt sadece
// PR merge edilince güncellenmiş sayılır.
//
//   npm run check:prices                       # doğrulaması 21 günden eski/tarihsiz ürünler
//   npm run check:prices -- --all              # hepsi
//   npm run check:prices -- --only=cursor,jasper-ai
//   npm run check:prices -- --accept=cursor    # 'İnceleme gerekli' önerisini onayla (yazılır)
//   npm run check:prices -- --max-age-days=30
//   npm run check:prices -- --dry-run          # dosya yazmaz, raporu ekrana basar
//   npm run check:prices -- --verbose          # her ürün için OpenAI'nin bulduğu fiyatı ve alıntıları da yazar ("neden emin değil?" için)
//
// Bot engeli (HTTP 403) ya da JS ile çizilen sayfa: sayfayı tarayıcında açıp kopyala,
//   npm run price:snap -- <ürün-id>
// ile kaydet; bu betik o ürün için internete gitmeden kaydedilen metni kullanır (7 günden eskiyse kullanmaz).
// Aday fiyat adresini denemek için: npm run check:url -- <adres>
//
// OPENAI_API_KEY gerekir (ortam değişkeni ya da .env.local); yoksa çıkış kodu 1 (sessiz başarısızlık olmasın).
// Çıkış kodu 1: anahtar yok ya da kontrol edilenlerin yarıdan fazlası hata/emin değil.

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_MAX_AGE_DAYS, checkProducts, fetchPageText, freshnessSummary, priceExitDecision, renderPriceReport } from './prices/core.mjs';
import { findSnapshot } from './prices/snapshots.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const productsPath = path.join(ROOT, 'data/products.json');
const products = JSON.parse(readFileSync(productsPath, 'utf8'));
const today = new Date().toISOString().slice(0, 10);

const args = Object.fromEntries(
  process.argv.slice(2).filter((a) => a.startsWith('--')).map((a) => {
    const [k, ...v] = a.slice(2).split('=');
    return [k, v.length ? v.join('=') : true];
  })
);
const ids = (v) => (typeof v === 'string' && v.trim() ? new Set(v.split(',').map((s) => s.trim()).filter(Boolean)) : null);
const accept = ids(args.accept);
const only = ids(args.only) ?? accept;
const maxAgeDays = args.all ? 0 : args['max-age-days'] !== undefined ? Number(args['max-age-days']) : DEFAULT_MAX_AGE_DAYS;
if (!Number.isFinite(maxAgeDays) || maxAgeDays < 0) {
  console.error('[check-prices] --max-age-days sıfır ya da pozitif bir sayı olmalı');
  process.exit(2);
}
for (const id of only ?? []) {
  if (!products.some((p) => p.id === id && p.status === 'active')) {
    console.error(`[check-prices] aktif ürün yok: ${id}`);
    process.exit(2);
  }
}

// Yerelde çalıştırırken anahtar .env.local'dan okunur (GitHub Actions'ta secret zaten ortam değişkeni).
// Node 20.12+ gerekir; eski sürümde sessizce atlanır, o zaman anahtarı ortam değişkeni olarak ver.
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

// Bot engeli (403) ya da JS ile çizilen sayfalar için elle alınan sayfa metni (scripts/prices/snapshots.mjs).
// Aynı fiyat sayfasını paylaşan ürünler (ChatGPT x2, Grok x2) tek anlık görüntüyü paylaşır.
const idsByUrl = new Map();
for (const p of products) {
  if (p.status === 'active' && p.pricingUrl) idsByUrl.set(p.pricingUrl, [...(idsByUrl.get(p.pricingUrl) ?? []), p.id]);
}
const snapshotDates = new Map(); // ürün id -> anlık görüntünün tarihi
const fetchText = async (url) => {
  const ids = idsByUrl.get(url) ?? [];
  const snap = findSnapshot({ root: ROOT, ids, today });
  if (snap && !snap.stale) {
    for (const id of ids) snapshotDates.set(id, snap.date);
    console.log(`[check-prices] ${ids[0]}: elle alınan sayfa kullanılıyor (${snap.date})`);
    return snap.text;
  }
  try {
    return await fetchPageText(url);
  } catch (error) {
    const stale = snap?.stale ? ` Elle alınan sayfa ${Number.isFinite(snap.ageDays) ? `${snap.ageDays} günlük, eski` : 'tarihsiz'}: yenisini al.` : '';
    const blocked = /HTTP (?:401|403|429)/.test(error.message) ? ` Çözüm: npm run price:snap -- ${ids[0]}` : '';
    throw new Error(`${error.message}.${stale}${blocked}`.replace(/\.\./g, '.'));
  }
};

const LABEL = { no_url: 'pricingUrl yok', error: 'HATA', unknown: 'emin değil', same: 'teyit', changed: 'DEĞİŞTİ', review: 'İNCELEME' };
console.log('[check-prices] başladı: ürünler sırayla kontrol ediliyor (her ürün birkaç saniye, toplam birkaç dakika sürebilir)...');
let done = 0;
const onRow = (r) => {
  if (r.status === 'fresh') return;
  console.log(`[check-prices] ${++done}. ${r.p.name}: ${LABEL[r.status] ?? r.status}${r.note ? ` (${r.note})` : ''}`);
  if (args.verbose && r.extracted) {
    const x = r.extracted;
    console.log(`    OpenAI'nin bulduğu: model=${x.model} fiyat=${x.startingPrice} para=${x.currency} fatura=${x.billing}`);
    console.log(`    kanıt: ${JSON.stringify(x.evidence)}`);
    console.log(`    ücretsiz plan kanıtı: ${JSON.stringify(x.freeTierEvidence)}`);
  }
};
const rows = await checkProducts({ products, fetchText, llm, today, maxAgeDays, only, accept, onRow });

// Fiyat, elle alınan sayfadan doğrulandıysa doğrulama tarihi sayfanın alındığı gündür (bugün değil).
for (const r of rows) {
  const date = snapshotDates.get(r.p.id);
  if (r.update && date && r.update.priceCheckedAt) r.update = { ...r.update, priceCheckedAt: date };
}

const updates = new Map(rows.filter((r) => r.update).map((r) => [r.p.id, r.update]));
const summary = freshnessSummary(products, rows, today);
const decision = priceExitDecision({ rows, hasLlm: !!llm });
const report = renderPriceReport({ rows, today, summary, decision });

if (args['dry-run']) {
  console.log(report);
} else {
  if (updates.size > 0) {
    for (const p of products) if (updates.has(p.id)) p.pricing = updates.get(p.id);
    writeFileSync(productsPath, `${JSON.stringify(products, null, 2)}\n`);
  }
  writeFileSync(path.join(ROOT, 'data/price-report.md'), report);
}

const count = (s) => rows.filter((r) => r.status === s).length;
console.log(
  `[check-prices] değişti ${count('changed')}, teyit ${count('same')}, inceleme ${count('review')}, emin değil ${count('unknown')}, hata ${count('error')}, pricingUrl yok ${count('no_url')}, atlandı (taze) ${count('fresh')}. Doğrulanmış: ${summary.verified}/${summary.active}`
);
for (const reason of decision.reasons) console.log(`[check-prices] ${reason}`);
process.exitCode = decision.code;
