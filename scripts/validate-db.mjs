// lib/tools-database.json icin sema kapisi + veri borcu raporu.
//
//   npm run validate:db
//
// Sema hatasi varsa exit 1. Gecerse hangi alanlarin hala eksik oldugunu
// (veri borcu) sayilarla basar — "yesil" olmasi verinin tam oldugu anlamina
// gelmez, sadece tutarsiz olmadigi anlamina gelir.

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { toolsDatabaseSchema } from '../lib/validations/tool.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DB_PATH = path.join(ROOT, 'lib', 'tools-database.json');

const tools = JSON.parse(await readFile(DB_PATH, 'utf8'));
const result = toolsDatabaseSchema.safeParse(tools);

if (!result.success) {
    const issues = result.error.issues;
    console.error(`\nSEMA HATASI — ${issues.length} sorun\n`);

    for (const issue of issues.slice(0, 40)) {
        const [index, ...rest] = issue.path;
        const name = tools[index]?.name ?? `#${index}`;
        console.error(`  ${name} :: ${rest.join('.') || '(kok)'} — ${issue.message}`);
    }
    if (issues.length > 40) console.error(`  ... ve ${issues.length - 40} sorun daha`);

    console.error('');
    process.exit(1);
}

const db = result.data;
const total = db.length;

const isBlank = (value) => !value || (Array.isArray(value) ? value.length === 0 : !String(value).trim());

const debt = [
    ['bestFor.tr bos', db.filter((t) => isBlank(t.bestFor?.tr)).length],
    ['description.en bos', db.filter((t) => isBlank(t.description?.en)).length],
    ['fiyat bilinmiyor (unknown)', db.filter((t) => t.pricing.priceStatus === 'unknown').length],
    ['fiyat bayat (stale)', db.filter((t) => t.pricing.priceStatus === 'stale').length],
    ['denetlenmemis (unreviewed)', db.filter((t) => t.reviewStatus === 'unreviewed').length],
    ['strength 9.5 kumelenmesi', db.filter((t) => t.strength === 9.5).length],
];

console.log(`\nSEMA OK — ${total} arac\n`);
console.log('VERI BORCU');
console.log(`  ${'-'.repeat(46)}`);
for (const [label, count] of debt) {
    const pct = ((count / total) * 100).toFixed(0).padStart(3);
    console.log(`  ${label.padEnd(30)} ${String(count).padStart(3)}/${total}  (%${pct})`);
}
console.log(`  ${'-'.repeat(46)}\n`);
