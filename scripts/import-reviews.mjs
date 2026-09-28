// Doldurulmuş uzman değerlendirmesi taslaklarını data/reviews.json'a aktarır (P12).
//
//   node scripts/import-reviews.mjs                                    # data/review-drafts/*.md hepsi
//   node scripts/import-reviews.mjs data/review-drafts/image.logo.md   # tek dosya
//
// scripts/review-template.mjs'nin ürettiği "### Ad (`productId`)" bölümlerini
// okur. SADECE dört rubrik puanının (quality/ease/value/speed) TAMAMI dolu
// olan bölümler işlenir — boş bölüm/alan "değerlendirme yok" demektir, hata
// değildir, atlanır. reviewer ve date HER ZAMAN zorunlu (Zod: expertReviewSchema).
// Hiçbir puan tahmin edilmez; eksik/geçersiz alan o ürün için atlanır ve
// raporlanır, script başka ürünleri işlemeye devam eder.
//
// Aynı (productId, taskId) zaten data/reviews.json'daysa ÜZERİNE YAZILIR
// (yeniden çalıştırmak idempotent olsun diye) — kaybolmaz, güncellenir.
//
// Referans bütünlüğü (productId/taskId/briefId var mı) burada değil,
// `npm run validate:catalog`'da kontrol edilir: bu script sadece şekli
// (Zod) doğrular, import sonrası validate:catalog çalıştırılmalı.

import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expertReviewSchema } from '../lib/catalog/schema.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DRAFTS_DIR = path.join(ROOT, 'data/review-drafts');

const KEY_MAP = {
  briefid: 'briefId',
  'quality (1-5)': 'quality',
  'ease (1-5)': 'ease',
  'value (1-5)': 'value',
  'speed (1-5)': 'speed',
  'note (tr)': 'noteTr',
  'note (en)': 'noteEn',
  evidenceurl: 'evidenceUrl',
  reviewer: 'reviewer',
  'date (yyyy-mm-dd)': 'date',
};

function draftFiles() {
  const args = process.argv.slice(2);
  if (args.length > 0) return args.map((a) => path.resolve(a));
  if (!existsSync(DRAFTS_DIR)) return [];
  return readdirSync(DRAFTS_DIR)
    .filter((f) => f.endsWith('.md'))
    .map((f) => path.join(DRAFTS_DIR, f));
}

/** "### Ad (`productId`)" bölümlerine göre gruplar; her bölümdeki "- etiket: değer" satırlarını okur. */
function parseSections(markdown) {
  const sections = [];
  let current = null;
  for (const rawLine of markdown.split('\n')) {
    const heading = rawLine.match(/^###\s+.*\(`([a-z0-9-]+)`\)\s*$/);
    if (heading) {
      current = { productId: heading[1], fields: {} };
      sections.push(current);
      continue;
    }
    if (!current) continue;
    const field = rawLine.match(/^-\s*(.+?):\s*(.*)$/);
    if (!field) continue;
    const value = field[2].trim();
    if (!value) continue; // boş alan = doldurulmamış
    const key = KEY_MAP[field[1].trim().toLowerCase()];
    if (key) current.fields[key] = value;
  }
  return sections;
}

const taskIdFromFilename = (file) => path.basename(file, '.md');
const toInt = (s) => (/^[1-5]$/.test(s) ? Number(s) : NaN);

const files = draftFiles();
if (files.length === 0) {
  console.log("[import-reviews] data/review-drafts/ boş ve dosya verilmedi; yapılacak bir şey yok.");
  process.exit(0);
}

const reviewsPath = path.join(ROOT, 'data/reviews.json');
const reviews = JSON.parse(readFileSync(reviewsPath, 'utf8'));
const indexByKey = new Map(reviews.map((r, i) => [`${r.productId}→${r.taskId}`, i]));

let imported = 0;
let skippedEmpty = 0;
const errors = [];

for (const file of files) {
  if (!existsSync(file)) {
    errors.push(`${file}: dosya yok`);
    continue;
  }
  const taskId = taskIdFromFilename(file);
  const sections = parseSections(readFileSync(file, 'utf8'));

  for (const { productId, fields } of sections) {
    const rubricKeys = ['quality', 'ease', 'value', 'speed'];
    const filledRubric = rubricKeys.filter((k) => fields[k] !== undefined);
    if (filledRubric.length === 0) {
      skippedEmpty++;
      continue; // boş satır = değerlendirme yok, hata değil
    }
    if (filledRubric.length < 4) {
      errors.push(`${taskId}/${productId}: rubrik eksik (sadece ${filledRubric.join(', ')} dolu; quality/ease/value/speed'in DÖRDÜ de gerekli) — atlandı`);
      continue;
    }

    const candidate = {
      productId,
      taskId,
      briefId: fields.briefId ?? '',
      rubric: {
        quality: toInt(fields.quality),
        ease: toInt(fields.ease),
        value: toInt(fields.value),
        speed: toInt(fields.speed),
      },
      notes: {
        ...(fields.noteTr ? { tr: fields.noteTr } : {}),
        ...(fields.noteEn ? { en: fields.noteEn } : {}),
      },
      reviewer: fields.reviewer ?? '',
      date: fields.date ?? '',
      ...(fields.evidenceUrl ? { evidenceUrl: fields.evidenceUrl } : {}),
    };

    const result = expertReviewSchema.safeParse(candidate);
    if (!result.success) {
      const detail = result.error.issues.map((i) => `${i.path.join('.') || '(alan)'}: ${i.message}`).join('; ');
      errors.push(`${taskId}/${productId}: ${detail}`);
      continue;
    }

    const key = `${result.data.productId}→${result.data.taskId}`;
    if (indexByKey.has(key)) {
      reviews[indexByKey.get(key)] = result.data;
    } else {
      indexByKey.set(key, reviews.length);
      reviews.push(result.data);
    }
    imported++;
  }
}

if (imported > 0) {
  writeFileSync(reviewsPath, `${JSON.stringify(reviews, null, 2)}\n`);
}

console.log(`[import-reviews] ${imported} değerlendirme eklendi/güncellendi, ${skippedEmpty} boş (değerlendirme yok, atlandı).`);
if (errors.length > 0) {
  console.log(`[import-reviews] ${errors.length} sorun (atlandı, DÜZELTİP tekrar çalıştır):`);
  for (const e of errors) console.log(`  - ${e}`);
  process.exitCode = 1;
}
if (imported > 0) console.log('[import-reviews] sonra: npm run validate:catalog');
