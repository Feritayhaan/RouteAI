/**
 * Script to migrate tools-database.json to the locale-aware schema:
 *   description: string   -> { tr: <mevcut>, en: "" }
 *   bestFor:     string[] -> { en: <mevcut>, tr: [] }
 *
 * Mevcut description degerleri Turkce prose oldugu icin tr'ye, bestFor degerleri
 * Ingilizce etiket oldugu icin en'e tasinir. Karsi locale BOS birakilir --
 * ceviri icerigi ayri, kontrollu bir adimda doldurulacak.
 *
 * Idempotent: zaten locale map olan alanlara dokunmaz, sadece eksik locale
 * anahtarlarini bos degerle tamamlar. Yazmadan once yedek alir.
 */

import { existsSync, readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = resolve(__dirname, '..', 'lib', 'tools-database.json');
const BACKUP_PATH = resolve(__dirname, '..', 'lib', 'tools-database.backup.json');

// lib/toolsService.ts'teki SUPPORTED_LOCALES ile ayni olmali.
const SUPPORTED_LOCALES = ['tr', 'en'];

const tools = JSON.parse(readFileSync(DB_PATH, 'utf-8'));

console.log(`📊 Başlangıç: ${tools.length} araç`);

// ============================================================
// STEP 1: Yedek al (migration'dan önce)
// ============================================================
// Yedek varsa dokunma: ikinci koşuda migration ÖNCESI orijinali
// migrate edilmiş veriyle ezmek yedeği anlamsız kılardı.

if (existsSync(BACKUP_PATH)) {
    console.log(`💾 Yedek zaten var, korunuyor: lib/tools-database.backup.json`);
} else {
    writeFileSync(BACKUP_PATH, JSON.stringify(tools, null, 2) + '\n', 'utf-8');
    console.log(`💾 Yedek alındı: lib/tools-database.backup.json`);
}

// ============================================================
// STEP 2: Locale map'e dönüştür
// ============================================================

/**
 * Bir alanı locale map'e çevirir.
 * @param value  mevcut değer (legacy düz değer, locale map, veya undefined)
 * @param locale legacy değerin ait olduğu locale
 * @param empty  bu alan için boş değer üreten fonksiyon
 */
function toLocaleMap(value, locale, empty) {
    const map = {};

    // Legacy düz değer -> kendi locale'ine yerleştir.
    // Zaten locale map ise mevcut anahtarları koru.
    const existing =
        value && typeof value === 'object' && !Array.isArray(value) ? value : { [locale]: value };

    let migrated = false;
    for (const key of SUPPORTED_LOCALES) {
        const current = existing[key];
        if (current === undefined || current === null) {
            map[key] = empty();
            migrated = true;
        } else {
            map[key] = current;
        }
    }
    return { map, migrated };
}

let migratedCount = 0;
let alreadyMigratedCount = 0;

const result = tools.map((tool) => {
    const description = toLocaleMap(tool.description, 'tr', () => '');
    const bestFor = toLocaleMap(tool.bestFor, 'en', () => []);

    if (description.migrated || bestFor.migrated) {
        migratedCount++;
    } else {
        alreadyMigratedCount++;
    }

    // Spread ile aynı pozisyonda değiştir -> anahtar sırası korunur, diff okunabilir kalır.
    return {
        ...tool,
        description: description.map,
        bestFor: bestFor.map,
    };
});

// ============================================================
// STEP 3: Yaz + rapor
// ============================================================

writeFileSync(DB_PATH, JSON.stringify(result, null, 2) + '\n', 'utf-8');

console.log(`\n✅ Migration tamamlandı`);
console.log(`   Dönüştürülen: ${migratedCount} araç`);
console.log(`   Zaten yeni şemada: ${alreadyMigratedCount} araç`);
console.log(`   Toplam: ${result.length} araç`);
console.log(`\n📝 Not: description.en ve bestFor.tr bilinçli olarak boş bırakıldı.`);
