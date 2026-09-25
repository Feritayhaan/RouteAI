// Haftalık aday keşfi: Show HN (son 7 gün) + Product Hunt (PRODUCT_HUNT_TOKEN
// varsa) -> data/candidates.json (status 'candidate') + data/discovery-report.md
//
//   npm run discover:tools
//
// Adaylar searchCatalog'da ASLA görünmez (ayrı dosya); Ferit products.json'a
// status 'active' ile taşıyınca girer. OPENAI_API_KEY yoksa sınıflandırma
// yapılmaz (görevler boş). Bir kaynak hata verirse diğeriyle devam edilir.

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { classify, dedupe, fetchHackerNews, fetchProductHunt, toCandidate } from './discovery/core.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => JSON.parse(readFileSync(path.join(ROOT, rel), 'utf8'));

async function fetchJson(url, init = {}) {
  const res = await fetch(url, { ...init, signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

const now = Date.now();
const today = new Date(now).toISOString().slice(0, 10);
const since = now - 7 * 24 * 60 * 60 * 1000;
const errors = [];
const found = [];

try {
  found.push(...(await fetchHackerNews({ fetchJson, sinceSec: Math.floor(since / 1000) })));
} catch (error) {
  errors.push(`Hacker News: ${error.message}`);
}
const ph = process.env.PRODUCT_HUNT_TOKEN?.trim();
try {
  const items = await fetchProductHunt({ fetchJson, token: ph, sinceIso: new Date(since).toISOString() });
  if (items) found.push(...items);
} catch (error) {
  errors.push(`Product Hunt: ${error.message}`);
}

const products = read('data/products.json');
const existing = read('data/candidates.json');
const fresh = dedupe(found, { products, candidates: existing });
const taskIds = read('data/tasks.json').map((t) => t.id);
let llm = null;
if (process.env.OPENAI_API_KEY?.trim()) {
  const { openAIJsonLLM } = await import('../lib/promptBuilder/llm.ts');
  llm = openAIJsonLLM();
}

const usedIds = new Set([...products.map((p) => p.id), ...existing.map((c) => c.id)]);
const added = [];
for (const item of fresh) {
  let cls;
  try {
    cls = await classify(item, { llm, taskIds });
  } catch (error) {
    errors.push(`sınıflandırma (${item.name}): ${error.message}`);
    cls = await classify(item, { llm: null, taskIds });
  }
  added.push(toCandidate(item, cls, today, usedIds));
}

if (added.length > 0) {
  writeFileSync(path.join(ROOT, 'data/candidates.json'), `${JSON.stringify([...existing, ...added], null, 2)}\n`);
}
const lines = [
  '# Keşif raporu', '', `Koşu: ${today}. Kaynaklar: Show HN (son 7 gün)${ph ? ', Product Hunt' : ' (Product Hunt: PRODUCT_HUNT_TOKEN yok, atlandı)'}. Sınıflandırma: ${llm ? 'OpenAI' : 'yok (OPENAI_API_KEY yok)'}.`, '',
  `Bulunan ${found.length}, katalog/adaylarla çakışan ${found.length - fresh.length}, yeni aday ${added.length}.`, '',
  '## Yeni adaylar', '', ...(added.length ? added.map((c) => `- [${c.name}](${c.url}) — ${c.description.en} · görevler: ${c.tasks.join(', ') || '—'} · [kaynak](${c.sourceUrl})`) : ['- yok']), '',
  '## Hatalar', '', ...(errors.length ? errors.map((e) => `- ${e}`) : ['- yok']), '',
  'Adaylar önerilmez. Katalog için: fiyat ve görevleri doğrula, products.json\'a status "active" ile ekle, candidates.json\'dan çıkar.',
];
writeFileSync(path.join(ROOT, 'data/discovery-report.md'), `${lines.join('\n')}\n`);
console.log(`[discover-tools] ${added.length} yeni aday (${found.length} bulundu); ${errors.length} hata. Rapor: data/discovery-report.md`);
