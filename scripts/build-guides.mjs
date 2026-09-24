// data/prompt-guides/*.md -> data/prompt-guides.json (edge'de fs yok).
//
//   npm run build:guides        (prebuild ve validate:catalog da çağırır)
//
// Her rehber: frontmatter (YAML alt kümesi, lib/promptBuilder/yaml.ts) +
// gövde bölümleri (## Sözdizimi, ## Şablon, ## Yap / Yapma, ## Örnekler).
// Doğrulama: Zod şeması + kurallar (en az 2 'high' slot, refinement slotId'leri,
// regex'ler derleniyor mu) + ürün tutarlılığı (appliesTo ürünleri var mı,
// product.promptGuide doğru rehbere mi işaret ediyor). Hata varsa çıkış 1.

import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseYamlSubset, splitFrontmatter, splitSections } from '../lib/promptBuilder/yaml.ts';
import { GUIDE_SECTIONS, guideRuleErrors, guideSchema } from '../lib/promptBuilder/guideSchema.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = path.join(ROOT, 'data/prompt-guides');
const errors = [];
const warnings = [];

const guides = [];
for (const file of readdirSync(DIR).filter((f) => f.endsWith('.md')).sort()) {
  const where = `data/prompt-guides/${file}`;
  let raw;
  try {
    const { frontmatter, body } = splitFrontmatter(readFileSync(path.join(DIR, file), 'utf8'));
    const sections = splitSections(body);
    raw = {
      ...parseYamlSubset(frontmatter),
      body: Object.fromEntries(Object.entries(GUIDE_SECTIONS).map(([key, title]) => [key, sections[title] ?? ''])),
    };
    for (const title of Object.values(GUIDE_SECTIONS)) {
      if (!(title in sections)) errors.push(`${where}: "## ${title}" bölümü yok`);
    }
  } catch (error) {
    errors.push(`${where}: ${error.message}`);
    continue;
  }
  const parsed = guideSchema.safeParse(raw);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) errors.push(`${where} ${issue.path.join('.')}: ${issue.message}`);
    continue;
  }
  const guide = parsed.data;
  if (`${guide.id}.md` !== file) errors.push(`${where}: id "${guide.id}" dosya adıyla aynı olmalı`);
  for (const e of guideRuleErrors(guide)) errors.push(`${where}: ${e}`);
  if (!guide.reviewedBy) warnings.push(`${guide.id}: taslak (reviewedBy boş)`);
  if (guide.sources.length === 0) warnings.push(`${guide.id}: kaynak yok (KAYNAK GEREKLİ)`);
  guides.push(guide);
}

// Ürün tutarlılığı
const products = JSON.parse(readFileSync(path.join(ROOT, 'data/products.json'), 'utf8'));
const byId = new Map(products.map((p) => [p.id, p]));
const guideIds = new Set(guides.map((g) => g.id));
for (const g of guides) {
  for (const productId of g.appliesTo) {
    const p = byId.get(productId);
    if (!p) errors.push(`${g.id}: appliesTo'da olmayan ürün "${productId}"`);
    else if (p.promptGuide !== g.id) errors.push(`${g.id}: ${productId}.promptGuide "${p.promptGuide ?? '(boş)'}" — "${g.id}" olmalı`);
    else if (p.status !== 'active') warnings.push(`${g.id}: ${productId} aktif değil (${p.status})`);
  }
}
for (const p of products) {
  if (!p.promptGuide) continue;
  if (!guideIds.has(p.promptGuide)) errors.push(`products.json ${p.id}: rehber "${p.promptGuide}" yok`);
  else if (!guides.find((g) => g.id === p.promptGuide).appliesTo.includes(p.id)) {
    errors.push(`products.json ${p.id}: "${p.promptGuide}" rehberinin appliesTo listesinde yok`);
  }
}

for (const w of warnings) console.log(`UYARI: ${w}`);
for (const e of errors) console.log(`HATA: ${e}`);
if (errors.length > 0) {
  console.log(`[build-guides] ${errors.length} hata; data/prompt-guides.json yazılmadı`);
  process.exit(1);
}
writeFileSync(path.join(ROOT, 'data/prompt-guides.json'), `${JSON.stringify(guides, null, 2)}\n`);
console.log(`[build-guides] ${guides.length} rehber -> data/prompt-guides.json (${guides.filter((g) => !g.reviewedBy).length} taslak)`);
