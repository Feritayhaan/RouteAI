// Aylık fiyat kontrolü: aktif ürünlerin pricingUrl sayfası -> OpenAI ile
// { model, startingPrice, currency } -> fark varsa products.json'da öneri +
// data/price-report.md. Workflow (check-prices.yml) PR açar; priceCheckedAt
// sadece PR merge edilince güncellenmiş sayılır.
//
//   npm run check:prices          (OPENAI_API_KEY gerekir; yoksa sadece rapor)

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makePricing } from '../lib/pricing.ts';
import { comparePrice, extractPrice, htmlToText } from './prices/core.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const productsPath = path.join(ROOT, 'data/products.json');
const products = JSON.parse(readFileSync(productsPath, 'utf8'));
const today = new Date().toISOString().slice(0, 10);

let llm = null;
if (process.env.OPENAI_API_KEY?.trim()) {
  const { openAIJsonLLM } = await import('../lib/promptBuilder/llm.ts');
  llm = openAIJsonLLM();
}

const rows = [];
let changedFile = false;
for (const p of products.filter((x) => x.status === 'active')) {
  if (!p.pricingUrl) {
    rows.push({ p, status: 'no_url' });
    continue;
  }
  if (!llm) {
    rows.push({ p, status: 'error', note: 'OPENAI_API_KEY yok' });
    continue;
  }
  try {
    const res = await fetch(p.pricingUrl, { signal: AbortSignal.timeout(20_000), headers: { 'User-Agent': 'RouteAI-price-check' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const extracted = await extractPrice({ text: htmlToText(await res.text()), productName: p.name, llm });
    const cmp = comparePrice(p, extracted);
    rows.push({ p, ...cmp, evidence: extracted.evidence });
    if (cmp.status === 'changed' || cmp.status === 'same') {
      p.pricing = makePricing(cmp.model, cmp.startingPrice, today);
      changedFile = true;
    }
  } catch (error) {
    rows.push({ p, status: 'error', note: error.message });
  }
}

if (changedFile) writeFileSync(productsPath, `${JSON.stringify(products, null, 2)}\n`);
const section = (title, list, fmt) => ['', `## ${title} (${list.length})`, '', ...(list.length ? list.map(fmt) : ['- yok'])];
const by = (s) => rows.filter((r) => r.status === s);
const lines = [
  '# Fiyat raporu', '', `Koşu: ${today}. Değişen ve teyit edilen fiyatlar products.json'a önerildi; PR merge edilince geçerli.`,
  ...section('Değişti', by('changed'), (r) => `- ${r.p.name}: ${r.p.pricing.model} ${r.startingPrice ?? '—'} USD (${r.p.pricingUrl}) — kanıt: "${r.evidence}"`),
  ...section('Teyit edildi', by('same'), (r) => `- ${r.p.name} — kanıt: "${r.evidence}"`),
  ...section('Emin olunamadı', by('unknown'), (r) => `- ${r.p.name}${r.note ? ` (${r.note})` : ''}`),
  ...section('Hata', by('error'), (r) => `- ${r.p.name}: ${r.note}`),
  ...section('pricingUrl yok', by('no_url'), (r) => `- ${r.p.name} (\`${r.p.id}\`)`),
];
writeFileSync(path.join(ROOT, 'data/price-report.md'), `${lines.join('\n')}\n`);
console.log(`[check-prices] değişti ${by('changed').length}, teyit ${by('same').length}, emin değil ${by('unknown').length}, hata ${by('error').length}, pricingUrl yok ${by('no_url').length}`);
