// lib/tools-database.json'u tek-model fiyat semasina tasir.
//
//   node scripts/migrate-pricing.mjs --dry   -> yazmadan rapor
//   node scripts/migrate-pricing.mjs         -> yedek al + yaz
//
// Bu dosya derleme hattinin disinda duz node ile calisiyor, bu yuzden
// lib/pricing.ts'i import edemiyor; kurallar burada elle tekrarlaniyor.
// Kanonik tanim lib/pricing.ts'tedir, sema kapisi (scripts/validate-db.mjs)
// ikisinin ayrismadigini garanti eder.

import { access, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DB_PATH = path.join(ROOT, 'lib', 'tools-database.json');
const BACKUP_PATH = path.join(ROOT, 'lib', 'tools-database.backup2.json');

const PRICE_STALE_AFTER_DAYS = 60;
const STALE_MS = PRICE_STALE_AFTER_DAYS * 24 * 60 * 60 * 1000;

const dry = process.argv.includes('--dry');

/** model yoksa eski bayraklardan turetilir; veri yoklugunda 'paid'e duser. */
function deriveModel(pricing) {
    if (pricing?.paidOnly) return 'paid';
    if (pricing?.freemium) return 'freemium';
    if (pricing?.free) return 'free';
    return 'paid';
}

function isStale(checkedAt, now) {
    if (!checkedAt) return true;
    const checked = Date.parse(checkedAt);
    if (Number.isNaN(checked)) return true;
    return now - checked > STALE_MS;
}

function migrateTool(tool, now) {
    const old = tool.pricing ?? {};
    const model = deriveModel(old);

    // 0 "ucretsiz" degil "veri girilmemis" demekti: sadece model 'free' iken
    // 0 gercek fiyattir, digerlerinde null'a cevrilir.
    const startingPrice =
        model === 'free' ? 0 : old.startingPrice === 0 || old.startingPrice == null ? null : old.startingPrice;

    const priceStatus =
        startingPrice === null ? 'unknown' : isStale(tool.lastUpdated, now) ? 'stale' : 'verified';

    // Kasim 2025 toplu ithalinin imzasi: strength 9.5 + fiyat girilmemis.
    // strength'i once degistirirsen bu kayitlar bir daha ayirt edilemez.
    //
    // Zaten damgalanmis kayitta imzaya BAKMIYORUZ: migrasyon startingPrice 0'i
    // null'a cevirdigi icin imza ikinci calistirmada kaybolur ve 64 kayit
    // sessizce 'reviewed'a doner. Mevcut damga her zaman kazanir (idempotans).
    const unreviewed = tool.reviewStatus
        ? tool.reviewStatus === 'unreviewed'
        : tool.strength === 9.5 && old.startingPrice === 0;

    return {
        ...tool,
        pricing: {
            model,
            free: model === 'free',
            freemium: model === 'freemium',
            paidOnly: model === 'paid',
            startingPrice,
            currency: 'USD',
            priceStatus,
            priceCheckedAt: priceStatus === 'unknown' ? null : tool.lastUpdated ?? null,
        },
        reviewStatus: unreviewed ? 'unreviewed' : 'reviewed',
    };
}

function tally(items, key) {
    const counts = new Map();
    for (const item of items) {
        const value = key(item);
        counts.set(value, (counts.get(value) ?? 0) + 1);
    }
    return counts;
}

function row(label, value, total) {
    const pct = total ? ((value / total) * 100).toFixed(0).padStart(3) : '  0';
    return `  ${label.padEnd(34)} ${String(value).padStart(3)}  (%${pct})`;
}

const now = Date.now();
const raw = await readFile(DB_PATH, 'utf8');
const tools = JSON.parse(raw);
const migrated = tools.map((tool) => migrateTool(tool, now));

const total = migrated.length;
const models = tally(migrated, (t) => t.pricing.model);
const statuses = tally(migrated, (t) => t.pricing.priceStatus);
const reviews = tally(migrated, (t) => t.reviewStatus);

const flagsChanged = migrated.filter((t, i) => {
    const old = tools[i].pricing ?? {};
    return (
        old.free !== t.pricing.free ||
        old.freemium !== t.pricing.freemium ||
        old.paidOnly !== t.pricing.paidOnly
    );
}).length;

const zeroToNull = migrated.filter(
    (t, i) => tools[i].pricing?.startingPrice === 0 && t.pricing.startingPrice === null
).length;

console.log(`\n${dry ? 'KURU CALISMA (yazma yok)' : 'MIGRASYON'} — ${total} arac\n`);

console.log('pricing.model dagilimi');
for (const model of ['free', 'freemium', 'paid']) {
    console.log(row(model, models.get(model) ?? 0, total));
}

console.log('\npriceStatus dagilimi');
for (const status of ['verified', 'stale', 'unknown']) {
    console.log(row(status, statuses.get(status) ?? 0, total));
}

console.log('\nreviewStatus dagilimi');
for (const status of ['reviewed', 'unreviewed']) {
    console.log(row(status, reviews.get(status) ?? 0, total));
}

console.log('\ndegisim');
console.log(row('bayragi model ile duzeltilen', flagsChanged, total));
console.log(row('startingPrice 0 -> null', zeroToNull, total));

const overlapBefore = tools.filter(
    (t) => [t.pricing?.free, t.pricing?.freemium, t.pricing?.paidOnly].filter(Boolean).length > 1
).length;
console.log(row('onceden birden fazla bayrakli', overlapBefore, total));

if (dry) {
    console.log('\n--dry: dosyaya dokunulmadi.\n');
} else {
    // Yedek varsa USTUNE YAZMIYORUZ: degerli olan migrasyon ONCESI anlik goruntu,
    // ikinci calistirmada onu migrasyon sonrasi haliyle ezmek yedegi yok eder.
    const backupExists = await access(BACKUP_PATH).then(
        () => true,
        () => false
    );

    if (backupExists) {
        console.log(`\nyedek : ${path.relative(ROOT, BACKUP_PATH)} zaten var, korundu`);
    } else {
        await writeFile(BACKUP_PATH, raw, 'utf8');
        console.log(`\nyedek : ${path.relative(ROOT, BACKUP_PATH)}`);
    }

    await writeFile(DB_PATH, `${JSON.stringify(migrated, null, 2)}\n`, 'utf8');
    console.log(`yazildi: ${path.relative(ROOT, DB_PATH)}\n`);
}
