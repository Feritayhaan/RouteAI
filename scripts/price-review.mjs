// Fiyat kontrol listesi üretir (P14, Ferit için).
//
//   npm run price:review
//
// data/price-review.md: fiyatı doğrulanmamış (tarihsiz ya da 60 günden eski)
// her aktif ürün için ad, fiyat sayfası, mevcut kayıt ve BOŞ "doğrulanan"
// alanları. Linki aç, gördüğünü yaz, sonra `npm run price:apply`. Boş bırakılan
// ürün değişmez; hiçbir fiyat tahmin edilmez. Tarihsiz ürünler en üstte.
//
// Yeniden çalıştırmak dosyanın üzerine yazar (girilmiş ama uygulanmamış
// değerler kaybolur).

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { formatPrice, getPricingModel, isPriceVerified } from '../lib/pricing.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const products = JSON.parse(readFileSync(path.join(ROOT, 'data/products.json'), 'utf8'));

const todo = products
  .filter((p) => p.status === 'active' && !isPriceVerified(p.pricing))
  .sort((a, b) => (a.pricing.priceCheckedAt ?? '').localeCompare(b.pricing.priceCheckedAt ?? '') || a.name.localeCompare(b.name));

const lines = [
  '# Fiyat kontrol listesi',
  '',
  `Bu dosyayı \`npm run price:review\` üretir (${new Date().toISOString().slice(0, 10)}). ${todo.length} aktif ürünün fiyatı doğrulanmamış (tarihsiz ya da 60 günden eski); kartlarda bu ürünler için tutar yerine "Fiyat doğrulanmadı" görünüyor.`,
  '',
  'Her ürün için fiyat sayfasını aç ve alanları doldur:',
  '- **model**: `free` (tamamen ücretsiz), `freemium` (ücretsiz planı var) ya da `paid` (sadece ücretli).',
  '- **startingPrice**: en ucuz ücretli planın aylık USD fiyatı, sadece sayı (ör. `20`). `free` ise boş bırak.',
  '- **checkedAt**: sayfaya baktığın gün (YYYY-MM-DD).',
  '- **pricingUrl**: sadece kayıtta link yoksa ya da yanlışsa.',
  '',
  'Sonra `npm run price:apply`. Sadece `model` ve `checkedAt` dolu olan ürünler uygulanır; boş bırakılan ürün değişmez.',
  '',
];

for (const p of todo) {
  const current = [
    getPricingModel(p.pricing),
    formatPrice(p.pricing) ?? 'tutar yok',
    `kontrol: ${p.pricing.priceCheckedAt ?? 'hiç'}`,
  ].join(' · ');
  lines.push(
    `### ${p.name} (\`${p.id}\`)`,
    '',
    `Fiyat sayfası: ${p.pricingUrl ?? `(kayıtta yok — ${p.url})`}`,
    `Mevcut kayıt: ${current}`,
    '',
    '- model:',
    '- startingPrice:',
    '- checkedAt:',
    '- pricingUrl:',
    '',
  );
}

writeFileSync(path.join(ROOT, 'data/price-review.md'), `${lines.join('\n')}\n`);
console.log(`[price-review] data/price-review.md yazıldı: ${todo.length} ürün`);
