/**
 * seed-vectors.mjs
 *
 * tools-database.json içindeki her aracın embedding'ini OpenAI text-embedding-3-small
 * ile üretip Upstash Vector'a yükler.
 *
 * Kullanım:
 *   node scripts/seed-vectors.mjs              # tüm araçları yükle
 *   node scripts/seed-vectors.mjs --dry-run    # sadece sayıları göster, yükleme
 *   node scripts/seed-vectors.mjs --force      # zaten var olanları da yeniden yükle
 *
 * Önkoşul: .env.local içinde şu değişkenler tanımlı olmalı:
 *   OPENAI_API_KEY
 *   UPSTASH_VECTOR_REST_URL
 *   UPSTASH_VECTOR_REST_TOKEN
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// ================================================================
// .env.local yükle (dotenv olmadan manuel parse)
// ================================================================
function loadEnv() {
  const envPath = resolve(ROOT, '.env.local');
  if (!existsSync(envPath)) {
    console.warn('⚠️  .env.local bulunamadı — ortam değişkenleri sistem env\'den okunacak');
    return;
  }
  const lines = readFileSync(envPath, 'utf-8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
    if (key && !process.env[key]) {
      process.env[key] = val;
    }
  }
  console.log('✅ .env.local yüklendi');
}

loadEnv();

// ================================================================
// Ortam değişkeni doğrulama
// ================================================================
const REQUIRED_VARS = ['OPENAI_API_KEY', 'UPSTASH_VECTOR_REST_URL', 'UPSTASH_VECTOR_REST_TOKEN'];
const missing = REQUIRED_VARS.filter(v => !process.env[v]);
if (missing.length > 0) {
  console.error('❌ Eksik ortam değişkenleri:', missing.join(', '));
  console.error('   .env.local dosyasına ekleyin ve tekrar çalıştırın.');
  process.exit(1);
}

// ================================================================
// Argüman parse
// ================================================================
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const FORCE = args.includes('--force');

if (DRY_RUN) console.log('🔍 DRY RUN modu — Upstash\'e hiçbir şey yazılmayacak\n');
if (FORCE) console.log('⚡ FORCE modu — mevcut vektörler de yeniden üretilecek\n');

// ================================================================
// Dinamik import (node_modules gerekli)
// ================================================================
let Index, OpenAI;
try {
  ({ Index } = await import('@upstash/vector'));
  ({ default: OpenAI } = await import('openai'));
} catch (err) {
  console.error('❌ Paketler yüklenemedi. Önce: npm install');
  console.error('   Hata:', err.message);
  process.exit(1);
}

const index = new Index({
  url: process.env.UPSTASH_VECTOR_REST_URL,
  token: process.env.UPSTASH_VECTOR_REST_TOKEN,
});

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ================================================================
// Araçları yükle
// ================================================================
const DB_PATH = resolve(ROOT, 'lib', 'tools-database.json');
const tools = JSON.parse(readFileSync(DB_PATH, 'utf-8'));

console.log(`📦 ${tools.length} araç bulundu\n`);

if (DRY_RUN) {
  console.log('Örnek embedding metni (ilk araç):');
  console.log(' ', buildEmbeddingText(tools[0]));
  console.log('\nDry run tamamlandı.');
  process.exit(0);
}

// ================================================================
// Embedding metni oluşturucu
// Semantik aramada en iyi sonucu vermek için name + description +
// bestFor + category birleştirilir.
// ================================================================
function buildEmbeddingText(tool) {
  const parts = [
    tool.name,
    tool.description,
    tool.bestFor?.length ? `Best for: ${tool.bestFor.join(', ')}` : '',
    `Category: ${tool.category}`,
    tool.features?.length ? `Features: ${tool.features.slice(0, 5).join(', ')}` : '',
  ];
  return parts.filter(Boolean).join('. ');
}

// ================================================================
// Pricing özeti — metadata için
// ================================================================
function pricingSummary(pricing) {
  if (pricing.free) return 'free';
  if (pricing.freemium) return 'freemium';
  return 'paid';
}

// ================================================================
// Mevcut vektörleri kontrol et (FORCE değilse atlama için)
// ================================================================
async function fetchExistingIds() {
  if (FORCE) return new Set();
  try {
    // Upstash Vector'da "list" endpoint'i yoktur; ilk 100 araçtan fetch deneriz
    // Eğer araç zaten varsa fetch null döndürmez
    console.log('🔎 Mevcut vektörler kontrol ediliyor...');
    const ids = tools.map(t => t.id);
    const fetched = await index.fetch(ids, { includeMetadata: false });
    const existing = new Set(
      fetched
        .map((r, i) => (r ? ids[i] : null))
        .filter(Boolean)
    );
    console.log(`   ${existing.size} araç zaten Upstash'te mevcut`);
    return existing;
  } catch (err) {
    console.warn('⚠️  Mevcut vektör kontrolü başarısız, tümü yüklenecek:', err.message);
    return new Set();
  }
}

// ================================================================
// Batch embedding üretimi
// OpenAI text-embedding-3-small tek çağrıda max ~100 metin alır.
// 20'lik batch'ler güvenli ve token limitini aşmaz.
// ================================================================
const EMBED_BATCH = 20;
const UPSERT_BATCH = 20;

async function generateEmbeddings(texts) {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: texts,
    encoding_format: 'float',
  });
  return response.data.map(d => d.embedding);
}

// ================================================================
// Ana akış
// ================================================================
async function main() {
  const existingIds = await fetchExistingIds();

  const toProcess = tools.filter(t => !existingIds.has(t.id));
  console.log(`\n🚀 ${toProcess.length} araç işlenecek (${existingIds.size} atlandı)\n`);

  if (toProcess.length === 0) {
    console.log('✅ Tüm araçlar zaten Upstash Vector\'da. --force ile yeniden yükleyin.');
    return;
  }

  let successCount = 0;
  let errorCount = 0;

  // Embedding batch'leri
  for (let i = 0; i < toProcess.length; i += EMBED_BATCH) {
    const batch = toProcess.slice(i, i + EMBED_BATCH);
    const texts = batch.map(buildEmbeddingText);

    process.stdout.write(
      `  [${i + 1}-${Math.min(i + EMBED_BATCH, toProcess.length)}/${toProcess.length}] Embedding üretiliyor...`
    );

    let embeddings;
    try {
      embeddings = await generateEmbeddings(texts);
    } catch (err) {
      console.error(` ❌ Embedding hatası: ${err.message}`);
      errorCount += batch.length;
      continue;
    }

    // Upstash upsert vektörleri hazırla
    const vectors = batch.map((tool, idx) => ({
      id: tool.id,
      vector: embeddings[idx],
      metadata: {
        name: tool.name,
        category: tool.category,
        description: tool.description,
        url: tool.url,
        pricing: pricingSummary(tool.pricing),
        strength: tool.strength ?? 8,
      },
    }));

    // Upstash upsert (batch)
    for (let j = 0; j < vectors.length; j += UPSERT_BATCH) {
      const upsertBatch = vectors.slice(j, j + UPSERT_BATCH);
      try {
        await index.upsert(upsertBatch);
        successCount += upsertBatch.length;
      } catch (err) {
        console.error(`\n   ❌ Upsert hatası (${upsertBatch.map(v => v.id).join(', ')}): ${err.message}`);
        errorCount += upsertBatch.length;
      }
    }

    console.log(` ✅ ${batch.length} araç yüklendi`);

    // Rate limit koruması: batch'ler arası kısa bekleme
    if (i + EMBED_BATCH < toProcess.length) {
      await new Promise(r => setTimeout(r, 200));
    }
  }

  // ================================================================
  // Özet
  // ================================================================
  console.log('\n' + '='.repeat(50));
  console.log(`✅ Başarılı: ${successCount} araç`);
  if (errorCount > 0) {
    console.log(`❌ Hatalı:   ${errorCount} araç`);
  }
  console.log(`📊 Toplam:   ${toProcess.length} araç işlendi`);
  console.log('='.repeat(50));

  if (successCount > 0) {
    console.log('\n🎉 Upstash Vector güncellendi!');
    console.log('   searchTools() artık semantik arama yapabilir.');
  }
}

main().catch(err => {
  console.error('\n💥 Beklenmeyen hata:', err);
  process.exit(1);
});
