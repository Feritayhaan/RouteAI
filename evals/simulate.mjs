// RouteAI Skoru simülasyonu: kendi gözlemler biriktikçe sıralama nasıl değişir?
//
//   npm run eval:simulate
//
// TAMAMEN SENTETİK veri (testlerdeki senaryolar): iki hayali ürün, hayali
// benchmark ve hayali iş sonuçları. Gerçek katalog verisi DEĞİL; data/'ya
// hiçbir şey yazmaz. Çıktı: evals/results/<tarih>-v2-oracle-simulation.md

import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makePricing } from '../lib/pricing.ts';
import { searchCatalog } from '../lib/catalog/search.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const now = Date.now();
const today = new Date(now).toISOString().slice(0, 10);

const task = {
  id: 'sim.task', label: { en: 'Sim', tr: 'Sim' }, description: { en: 'Sim', tr: 'Sim' }, modality: 'image',
  benchmark: [{ source: 'lmarena', key: 'text_to_image' }], slots: [], outputTypes: ['image'],
};
const models = [100, 200, 300].map((value, i) => ({
  id: `m${i}`, name: `M${i}`, creator: 'sim', aliases: [], modalities: ['image'],
  scores: [{ source: 'lmarena', key: 'text_to_image', value, fetchedAt: today }],
}));
const product = (id, name, model) => ({
  id, name, url: `https://example.com/${id}`, description: { en: name, tr: name }, tasks: ['sim.task'], models: [model],
  pricing: makePricing('freemium', 10, today), access: [], status: 'active', reviewStatus: 'reviewed', addedAt: today,
});
const A = product('a', 'A (benchmark yüksek, iş sonucu %20)', 'm2');
const B = product('b', 'B (benchmark orta, iş sonucu %80)', 'm1');

const signal = (productId, n, successRate) => {
  const yes = Math.round(n * successRate);
  return { productId, taskId: 'sim.task', outcomes: { yes, partial: 0, no: n - yes }, comparisons: { wins: 0, losses: 0 }, votes: { up: 0, down: 0 }, lastAt: today };
};

const lines = [
  '# RouteAI Skoru simülasyonu (SENTETİK VERİ)',
  '',
  `Üretim: ${today}, \`npm run eval:simulate\`. Bu tablo gerçek ürün ya da gerçek kullanıcı verisi değildir; lib/catalog/score.ts'in davranışını göstermek için hayali iki ürünle kuruldu.`,
  '',
  '- A: arenadaki en iyi modeli kullanıyor (B = 1.0), kullanıcıların %20\'si "işimi gördü" diyor.',
  '- B: arenada ortada (B = 0.5), kullanıcıların %80\'i "işimi gördü" diyor.',
  '- Her iki ürüne de aynı sayıda iş sonucu geliyor (n). Uzman değerlendirmesi yok.',
  '',
  '| n (ürün başına iş sonucu) | q(A) | q(B) | benchmark payı | güven (A/B) | 1. sıra |',
  '| --- | --- | --- | --- | --- | --- |',
];
for (const n of [0, 3, 5, 10, 20, 30, 90, 91]) {
  const signals = n > 0 ? [signal('a', n, 0.2), signal('b', n, 0.8)] : [];
  const ctx = { tasksById: new Map([[task.id, task]]), products: [A, B], models, reviews: [], signals, now };
  const r = searchCatalog({ taskId: task.id }, ctx);
  const get = (id) => r.items.find((i) => i.product.id === id).score;
  const a = get('a');
  const b = get('b');
  lines.push(`| ${n} | ${a.q.toFixed(3)} | ${b.q.toFixed(3)} | %${(a.benchmarkShare * 100).toFixed(1)} | ${a.confidence} / ${b.confidence} | ${r.items[0].product.id.toUpperCase()} |`);
}
lines.push(
  '',
  'Okuma: gözlem yokken sıra benchmark\'a göre (A önde). Ürün başına 10 iş sonucunda kendi kanıt baskın gelir ve B öne geçer; 90 iş sonucunda benchmark\'ın payı tam %10, 91\'de %10\'un altı.',
  '',
  'Not: ROADMAP "90 iş sonucundan sonra benchmark\'ın payı %10\'un altına düşer" diyor; formülde 90\'da pay tam 10/100 = %10, altına 91\'de iniyor. Ağırlıklar değiştirilmedi; ifade düzeltilebilir.',
);

const file = path.join(ROOT, 'evals/results', `${today}-v2-oracle-simulation.md`);
writeFileSync(file, `${lines.join('\n')}\n`);
console.log(lines.join('\n'));
console.log(`\n[simulate] yazıldı: ${path.relative(ROOT, file)}`);
