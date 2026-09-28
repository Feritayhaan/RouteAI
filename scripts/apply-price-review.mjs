// Doldurulmuş fiyat kontrol listesini products.json'a uygular (P14).
//
//   npm run price:apply                      # data/price-review.md
//   npm run price:apply -- dosya.md
//
// Sadece `model` ve `checkedAt` dolu olan ürün bölümleri uygulanır; boş bölüm
// "kontrol edilmedi" demektir, hata değildir. Fiyat makePricing ile kurulur
// (bayraklar modelden türer), Zod (toolPricingSchema) ile doğrulanır.
// priceCheckedAt = Ferit'in yazdığı tarih. Hatalı bölüm atlanır ve raporlanır.

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { toolPricingSchema } from '../lib/catalog/schema.ts';
import { makePricing, PRICING_MODELS } from '../lib/pricing.ts';
import { parsePriceReview } from './price-review-parse.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const file = path.resolve(process.argv[2] ?? path.join(ROOT, 'data/price-review.md'));
if (!existsSync(file)) {
  console.log(`[price-apply] ${path.relative(ROOT, file)} yok. Önce: npm run price:review`);
  process.exit(0);
}

const productsPath = path.join(ROOT, 'data/products.json');
const products = JSON.parse(readFileSync(productsPath, 'utf8'));
const byId = new Map(products.map((p) => [p.id, p]));

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const urlSchema = z.string().url();
let applied = 0;
let skipped = 0;
const errors = [];

for (const { productId, fields } of parsePriceReview(readFileSync(file, 'utf8'))) {
  if (!fields.model && !fields.checkedAt) {
    skipped++;
    continue;
  }
  const where = productId;
  const product = byId.get(productId);
  if (!product) { errors.push(`${where}: products.json'da yok`); continue; }
  if (!PRICING_MODELS.includes(fields.model)) { errors.push(`${where}: model "${fields.model ?? ''}" (free/freemium/paid olmalı)`); continue; }
  if (!DATE.test(fields.checkedAt ?? '')) { errors.push(`${where}: checkedAt YYYY-MM-DD olmalı`); continue; }
  if (Date.parse(fields.checkedAt) > Date.now() + 86400000) { errors.push(`${where}: checkedAt gelecekte`); continue; }

  let price = null;
  if (fields.model !== 'free' && fields.startingPrice) {
    const n = Number(fields.startingPrice.replace(',', '.').replace(/[$\s]/g, ''));
    if (!Number.isFinite(n) || n <= 0) { errors.push(`${where}: startingPrice sayı olmalı ("${fields.startingPrice}")`); continue; }
    price = n;
  }

  const pricing = makePricing(fields.model, price, fields.checkedAt);
  // Tutar girilmediyse (ücretli modelde) makePricing tarihi siler; kontrol tarihi yine de kayda geçsin.
  if (pricing.priceCheckedAt === null) pricing.priceCheckedAt = fields.checkedAt;
  const result = toolPricingSchema.safeParse(pricing);
  if (!result.success) { errors.push(`${where}: ${result.error.issues.map((i) => i.message).join('; ')}`); continue; }

  if (fields.pricingUrl) {
    if (!urlSchema.safeParse(fields.pricingUrl).success) { errors.push(`${where}: pricingUrl geçerli bir URL değil`); continue; }
    product.pricingUrl = fields.pricingUrl;
  }
  product.pricing = result.data;
  applied++;
}

if (applied > 0) writeFileSync(productsPath, `${JSON.stringify(products, null, 2)}\n`);
console.log(`[price-apply] ${applied} ürün güncellendi, ${skipped} boş (atlandı).`);
if (errors.length > 0) {
  console.log(`[price-apply] ${errors.length} sorun (atlandı, düzeltip tekrar çalıştır):`);
  for (const e of errors) console.log(`  - ${e}`);
  process.exitCode = 1;
}
if (applied > 0) console.log('[price-apply] sonra: npm run validate:catalog');
