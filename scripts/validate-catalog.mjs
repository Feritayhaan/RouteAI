// Katalog doğrulaması: şema + dosyalar arası referans bütünlüğü.
//
//   npm run validate:catalog
//
// HATA (çıkış kodu 1): şema ihlali, tekrar eden id, olmayan göreve/modele/
// brife/rehbere referans, bilinmeyen benchmark anahtarı, golden setin
// katalogla uyuşmaması.
// UYARI (çıkış kodu 0): aktif ürünü olmayan görev, görevi olmayan aktif ürün.

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  briefsFileSchema,
  modelsFileSchema,
  productsFileSchema,
  reviewsFileSchema,
  tasksFileSchema,
} from '../lib/catalog/schema.ts';
import { isKnownArena } from '../lib/catalog/benchmarkKeys.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => JSON.parse(readFileSync(path.join(ROOT, rel), 'utf8'));

const errors = [];
const warnings = [];

function check(file, schema) {
  const data = read(`data/${file}`);
  const result = schema.safeParse(data);
  if (!result.success) {
    for (const issue of result.error.issues) {
      const at = issue.path.length ? issue.path.join('.') : '(kök)';
      const id = typeof issue.path[0] === 'number' ? data[issue.path[0]]?.id : undefined;
      errors.push(`data/${file} ${at}${id ? ` (${id})` : ''}: ${issue.message}`);
    }
    return Array.isArray(data) ? data : [];
  }
  return result.data;
}

function uniqueIds(file, list, key = 'id') {
  const seen = new Set();
  for (const item of list) {
    if (seen.has(item[key])) errors.push(`data/${file}: tekrar eden ${key} "${item[key]}"`);
    seen.add(item[key]);
  }
}

const tasks = check('tasks.json', tasksFileSchema);
const products = check('products.json', productsFileSchema);
const models = check('models.json', modelsFileSchema);
const briefs = check('briefs.json', briefsFileSchema);
const reviews = check('reviews.json', reviewsFileSchema);

uniqueIds('tasks.json', tasks);
uniqueIds('products.json', products);
uniqueIds('models.json', models);
uniqueIds('briefs.json', briefs);

const taskIds = new Set(tasks.map((t) => t.id));
const modelIds = new Set(models.map((m) => m.id));
const productsById = new Map(products.map((p) => [p.id, p]));
const briefsById = new Map(briefs.map((b) => [b.id, b]));

// Görevler: benchmark anahtarları sabit listeden
for (const task of tasks) {
  for (const b of task.benchmark ?? []) {
    if (!isKnownArena(b.source, b.key)) {
      errors.push(`tasks.json ${task.id}: bilinmeyen benchmark ${b.source}:${b.key} (lib/catalog/benchmarkKeys.ts)`);
    }
  }
}

// Ürünler: görev, model, prompt rehberi
for (const p of products) {
  for (const t of p.tasks ?? []) {
    if (!taskIds.has(t)) errors.push(`products.json ${p.id}: olmayan görev "${t}"`);
  }
  for (const m of p.models ?? []) {
    if (!modelIds.has(m)) errors.push(`products.json ${p.id}: olmayan model "${m}"`);
  }
  if (p.promptGuide && !existsSync(path.join(ROOT, 'data/prompt-guides', `${p.promptGuide}.md`))) {
    errors.push(`products.json ${p.id}: prompt rehberi yok: data/prompt-guides/${p.promptGuide}.md`);
  }
  if (p.status === 'active' && (p.tasks ?? []).length === 0) {
    warnings.push(`aktif ürünün görevi yok (hiç önerilmez): ${p.name}`);
  }
}

// Brifler
for (const b of briefs) {
  if (!taskIds.has(b.taskId)) errors.push(`briefs.json ${b.id}: olmayan görev "${b.taskId}"`);
}

// Uzman değerlendirmeleri
reviews.forEach((r, i) => {
  const where = `reviews.json [${i}] ${r.productId}/${r.taskId}`;
  const product = productsById.get(r.productId);
  if (!product) errors.push(`${where}: olmayan ürün`);
  if (!taskIds.has(r.taskId)) errors.push(`${where}: olmayan görev`);
  const brief = briefsById.get(r.briefId);
  if (!brief) errors.push(`${where}: olmayan brif "${r.briefId}"`);
  else if (brief.taskId !== r.taskId) errors.push(`${where}: brif "${r.briefId}" başka görevin (${brief.taskId})`);
  if (product && !product.tasks.includes(r.taskId)) warnings.push(`${where}: ürünün görev listesinde bu görev yok`);
});

// Golden set: görevler ve kabul edilen araçlar katalogla uyumlu
const goldenPath = path.join(ROOT, 'evals/golden.jsonl');
if (existsSync(goldenPath)) {
  const activeNames = new Set(products.filter((p) => p.status === 'active').map((p) => p.name));
  readFileSync(goldenPath, 'utf8').split('\n').filter((l) => l.trim()).forEach((line) => {
    const row = JSON.parse(line);
    if (!taskIds.has(row.expectedTask)) errors.push(`golden ${row.id}: expectedTask "${row.expectedTask}" tasks.json'da yok`);
    for (const name of row.acceptableTools ?? []) {
      if (!activeNames.has(name)) errors.push(`golden ${row.id}: "${name}" aktif ürün değil`);
    }
  });
}

// Aktif ürünü olmayan görevler
const active = products.filter((p) => p.status === 'active');
const counts = tasks.map((t) => ({ id: t.id, n: active.filter((p) => p.tasks.includes(t.id)).length }));
for (const { id, n } of counts) {
  if (n === 0) warnings.push(`aktif ürünü olmayan görev: ${id}`);
}

console.log(`[validate:catalog] ${tasks.length} görev, ${products.length} ürün (${active.length} aktif), ${models.length} model, ${briefs.length} brif, ${reviews.length} değerlendirme`);
const thin = counts.filter((c) => c.n === 1).map((c) => c.id);
if (thin.length) console.log(`[validate:catalog] tek aktif ürünlü görevler (${thin.length}): ${thin.join(', ')}`);
for (const w of warnings) console.log(`UYARI: ${w}`);
for (const e of errors) console.log(`HATA: ${e}`);

if (errors.length > 0) {
  console.log(`[validate:catalog] ${errors.length} hata`);
  process.exit(1);
}
console.log(`[validate:catalog] temiz (${warnings.length} uyarı)`);
