// Ürün -> model bağlantısı önerisi.
//
//   node scripts/link-products.mjs          # data/link-review.md'yi (yeniden) üretir
//   node scripts/link-products.mjs --apply  # SADECE [x] işaretli satırları products.json'a yazar
//
// Öneri kuralı (temkinli): modelin kanonik adı ya da bir takma adı, ürün
// adının içinde ardışık kelimeler olarak geçiyorsa öner ("Google Veo 3" ->
// veo-3). Emin olunmayan eşleme ÖNERİLMEZ; eşleşme yoksa ürün "model
// bilinmiyor" listesine yazılır. Yeniden üretirken mevcut [x] işaretleri korunur.
// --apply sadece ekler; bağlı bir modeli kaldırmak için products.json elle düzenlenir.

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { suggestModels } from './sync/core.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REVIEW = path.join(ROOT, 'data/link-review.md');
const read = (rel) => JSON.parse(readFileSync(path.join(ROOT, rel), 'utf8'));

const LINE = /^- \[( |x)\] .*\(`([a-z0-9-]+)`\) → `([a-z0-9-]+)`/;

function readChecked() {
  const checked = new Set();
  if (!existsSync(REVIEW)) return checked;
  for (const line of readFileSync(REVIEW, 'utf8').split('\n')) {
    const m = line.match(LINE);
    if (m && m[1] === 'x') checked.add(`${m[2]}→${m[3]}`);
  }
  return checked;
}

const products = read('data/products.json');
const models = read('data/models.json');

if (process.argv.includes('--apply')) {
  const checked = readChecked();
  const byId = new Map(products.map((p) => [p.id, p]));
  const modelIds = new Set(models.map((m) => m.id));
  let added = 0;
  for (const pair of checked) {
    const [productId, modelId] = pair.split('→');
    const product = byId.get(productId);
    if (!product || !modelIds.has(modelId)) {
      console.log(`[link] atlandı (ürün ya da model yok): ${pair}`);
      continue;
    }
    if (!product.models.includes(modelId)) {
      product.models = [...product.models, modelId].sort();
      added++;
    }
  }
  writeFileSync(path.join(ROOT, 'data/products.json'), `${JSON.stringify(products, null, 2)}\n`);
  console.log(`[link] ${added} bağlantı eklendi (${checked.size} işaretli satır). Sonra: npm run validate:catalog`);
} else {
  const checked = readChecked();
  const lines = [
    '# Ürün → model bağlantı incelemesi',
    '',
    'Bu dosyayı `scripts/link-products.mjs` üretir. Doğru olan satırları `[x]` yap, sonra `node scripts/link-products.mjs --apply` çalıştır: sadece `[x]` satırlar `data/products.json`\'a yazılır. Yeniden üretirken `[x]` işaretleri korunur.',
    '',
    `Modeller: ${models.length} (data/models.json). ${models.length === 0 ? '**models.json boş: önce gece senkronu (npm run sync:models) çalışmalı.**' : ''}`,
    '',
    '## Öneriler',
    '',
  ];
  const unknown = [];
  let suggestions = 0;
  for (const p of products.filter((x) => x.status === 'active')) {
    const found = suggestModels(p, models);
    const linked = p.models.filter((id) => !found.some((m) => m.id === id));
    if (found.length === 0 && linked.length === 0) {
      unknown.push(p);
      continue;
    }
    for (const m of found) {
      const mark = p.models.includes(m.id) || checked.has(`${p.id}→${m.id}`) ? 'x' : ' ';
      const scores = m.scores.map((s) => `${s.source}:${s.key}`).join(', ');
      lines.push(`- [${mark}] ${p.name} (\`${p.id}\`) → \`${m.id}\` (${m.name}; ${scores || 'skor yok'})`);
      suggestions++;
    }
    for (const id of linked) lines.push(`- [x] ${p.name} (\`${p.id}\`) → \`${id}\` (zaten bağlı)`);
  }
  if (suggestions === 0) lines.push('- yok');
  lines.push('', `## Model bilinmiyor (${unknown.length} ürün)`, '', 'Ad eşleşmesiyle önerilecek model bulunamadı. Hangi modeli kullandığı biliniyorsa products.json\'a elle ekle.', '');
  for (const p of unknown) lines.push(`- ${p.name} (\`${p.id}\`)`);
  writeFileSync(REVIEW, `${lines.join('\n')}\n`);
  console.log(`[link] data/link-review.md yazıldı: ${suggestions} öneri, ${unknown.length} ürün için model bilinmiyor`);
}
