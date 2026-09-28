// Uzman değerlendirmesi taslağı üretir (P12, Ferit için).
//
//   node scripts/review-template.mjs <taskId>
//   npm run review:template -- image.logo
//
// data/review-drafts/<taskId>.md yazar: görevin brif(ler)i, görevin aktif
// ürünleri ve her biri için BOŞ bir rubrik (quality/ease/value/speed 1-5,
// not, kanıt linki, reviewer, date). Doldurup scripts/import-reviews.mjs
// çalıştır. Boş bırakılan alan/ürün = değerlendirme yok; hiçbir puan
// tahmin edilmez (CLAUDE.md: "kaynağı olmayan sayı = hata").
//
// Yeniden çalıştırmak dosyanın üzerine yazar (elle girilmiş değerler
// SİLİNİR) — önce data/reviews.json'a import edilmemiş taslak varsa kaybolur.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => JSON.parse(readFileSync(path.join(ROOT, rel), 'utf8'));

const taskId = process.argv[2];
if (!taskId) {
  console.error('Kullanım: node scripts/review-template.mjs <taskId>');
  process.exit(1);
}

const tasks = read('data/tasks.json');
const task = tasks.find((t) => t.id === taskId);
if (!task) {
  console.error(`[review-template] bilinmeyen görev: "${taskId}" (data/tasks.json'da yok, 40 görev var).`);
  process.exit(1);
}

const briefs = read('data/briefs.json').filter((b) => b.taskId === taskId);
const products = read('data/products.json')
  .filter((p) => p.status === 'active' && p.tasks.includes(taskId))
  .sort((a, b) => a.name.localeCompare(b.name));

const lines = [
  `# Uzman değerlendirmesi — ${task.label.tr} (\`${taskId}\`)`,
  '',
  `Bu dosyayı \`node scripts/review-template.mjs ${taskId}\` üretir. Alanları doldur, sonra \`node scripts/import-reviews.mjs\` çalıştır: SADECE dört rubrik puanının (quality/ease/value/speed) tamamı dolu olan ürün bölümleri \`data/reviews.json\`'a eklenir/güncellenir. Boş bırakılan ürün = değerlendirme yok — hiçbir puan tahmin edilmez.`,
  '',
  '## Brif(ler)',
  '',
];

if (briefs.length === 0) {
  lines.push("_Bu görev için data/briefs.json'da brif yok. Değerlendirmeden önce en az bir brif eklenmeli._");
} else {
  for (const b of briefs) {
    lines.push(`### \`${b.id}\``, '', `**TR:** ${b.text.tr}`, '', `**EN:** ${b.text.en}`, '');
  }
}

lines.push('## Ürünler', '');

if (products.length === 0) {
  lines.push('_Bu görevde aktif ürün yok._');
} else {
  lines.push(
    `${products.length} aktif ürün. Her biri için: briefId (birden fazla brif varsa hangisine göre değerlendirildiği), quality/ease/value/speed (1-5 tam sayı), not (opsiyonel), kanıt linki (opsiyonel), reviewer ve date (rubrik doluysa ZORUNLU, YYYY-MM-DD). Boş satır = değerlendirme yok.`,
    ''
  );
  const defaultBriefId = briefs.length === 1 ? briefs[0].id : '';
  for (const p of products) {
    lines.push(
      `### ${p.name} (\`${p.id}\`)`,
      '',
      `- briefId: ${defaultBriefId}`,
      '- quality (1-5):',
      '- ease (1-5):',
      '- value (1-5):',
      '- speed (1-5):',
      '- note (tr):',
      '- note (en):',
      '- evidenceUrl:',
      '- reviewer:',
      '- date (YYYY-MM-DD):',
      ''
    );
  }
}

mkdirSync(path.join(ROOT, 'data/review-drafts'), { recursive: true });
const outFile = path.join(ROOT, `data/review-drafts/${taskId}.md`);
writeFileSync(outFile, `${lines.join('\n')}\n`);
console.log(`[review-template] yazıldı: data/review-drafts/${taskId}.md (${briefs.length} brif, ${products.length} aktif ürün)`);
