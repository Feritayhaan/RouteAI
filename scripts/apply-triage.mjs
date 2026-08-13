// data/karantina-triyaj.md'deki kararlari lib/tools-database.json'a uygular.
//
//   node scripts/apply-triage.mjs --dry   -> yazmadan rapor
//   node scripts/apply-triage.mjs         -> yedek al + yaz
//
// SILME YOK: sadece deprecated:true isaretlenir, kayit yerinde kalir ve geri
// alinabilir. Kararlarin kaynagi triyaj dosyasinin kendisidir (elle liste
// tutmuyoruz); SUPHELI olanlar icin alttaki OVERRIDE tablosu gecerlidir.

import { access, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DB_PATH = path.join(ROOT, 'lib', 'tools-database.json');
const MD_PATH = path.join(ROOT, 'data', 'karantina-triyaj.md');
const BACKUP_PATH = path.join(ROOT, 'lib', 'tools-database.backup3.json');

const dry = process.argv.includes('--dry');

// SUPHELI 6 kaydin kararlari (triyaj dosyasinda karar birakilmisti).
const OVERRIDE = {
    'NotebookLM Deep Research': { tut: true, yeniAd: 'NotebookLM' },
    'Google Deep Research': { tut: false },
    'Gemini 3 Pro Image': { tut: true },
    'Mistral Large 2.1': { tut: true, yeniAd: 'Le Chat (Mistral)' },
    'Arc Browser AI (Arc Max)': { tut: false },
    'Attio (Sales AI CRM)': { tut: false },
};

// TUT onerilen kayitlarda yanlis kategoriler.
// outputTypes de birlikte duzeltilmeli: route.ts kategoriye gore beklenen cikti
// turunu filtreliyor (gorsel -> ['image']). Kategoriyi tasiyip outputTypes'i
// 'text' birakirsak arac o kategorideki her sorgudan ELENIR, yani "duzeltme"
// araci gorunmez yapar.
const KATEGORI_DUZELTME = {
    'OpenAI Atlas (AI Browser)': { kategori: 'arastirma' },
    'Adcreative.ai': { kategori: 'gorsel', outputTypes: ['image'] },
    'Fathom (Meeting Assistant)': { kategori: 'metin' },
    'Simplified (Content & Design)': { kategori: 'gorsel', outputTypes: ['image', 'text'] },
    'Teal (Resume Builder AI)': { kategori: 'metin' },
    'Microsoft Copilot Pro': { kategori: 'metin' },
    'ClickUp Brain (Project AI)': { kategori: 'metin' },
};

// --- 1) Triyaj dosyasindan kararlari oku ---------------------------------
const md = await readFile(MD_PATH, 'utf8');
const kararlar = new Map();
for (const line of md.split('\n')) {
    if (!/^\|\s*\d+\s*\|/.test(line)) continue;
    const cols = line.split('|').map((s) => s.trim());
    const ad = cols[2];
    const oneri = cols[6]?.replace(/\*/g, '');
    if (ad && oneri) kararlar.set(ad, oneri);
}

if (kararlar.size !== 64) {
    console.error(`HATA: triyaj dosyasindan ${kararlar.size} karar okundu, 64 bekleniyordu.`);
    process.exit(1);
}

// --- 2) Uygula ------------------------------------------------------------
const raw = await readFile(DB_PATH, 'utf8');
const db = JSON.parse(raw);

const rapor = { deprecated: [], adDegisti: [], kategoriDegisti: [], bulunamadi: [] };

for (const [ad, oneri] of kararlar) {
    const tool = db.find((t) => t.name === ad);
    if (!tool) { rapor.bulunamadi.push(ad); continue; }

    const ov = OVERRIDE[ad];
    // SUPHELI ise override belirler, degilse triyaj onerisi.
    const deprecate = ov ? !ov.tut : oneri === 'SİL';

    if (deprecate) {
        tool.deprecated = true;
        rapor.deprecated.push(ad);
    }
    if (ov?.yeniAd && ov.yeniAd !== tool.name) {
        rapor.adDegisti.push(`${tool.name} -> ${ov.yeniAd}`);
        tool.name = ov.yeniAd;
    }
}

for (const [ad, fix] of Object.entries(KATEGORI_DUZELTME)) {
    const tool = db.find((t) => t.name === ad);
    if (!tool) { rapor.bulunamadi.push(ad); continue; }
    const eski = tool.category;
    const eskiOut = JSON.stringify(tool.outputTypes ?? null);
    tool.category = fix.kategori;
    if (fix.outputTypes) tool.outputTypes = fix.outputTypes;
    rapor.kategoriDegisti.push(
        `${ad}: ${eski} -> ${fix.kategori}` +
        (fix.outputTypes ? `  (outputTypes ${eskiOut} -> ${JSON.stringify(fix.outputTypes)})` : '')
    );
}

// --- 3) Rapor -------------------------------------------------------------
const deprecatedSayi = db.filter((t) => t.deprecated).length;
const aktifSayi = db.length - deprecatedSayi;

console.log(`\n${dry ? 'KURU CALISMA (yazma yok)' : 'TRIYAJ UYGULANDI'} — ${db.length} kayit\n`);
console.log(`  deprecated isaretlenen : ${rapor.deprecated.length}`);
console.log(`  ad degisikligi         : ${rapor.adDegisti.length}`);
rapor.adDegisti.forEach((s) => console.log(`      ${s}`));
console.log(`  kategori duzeltmesi    : ${rapor.kategoriDegisti.length}`);
rapor.kategoriDegisti.forEach((s) => console.log(`      ${s}`));

console.log(`\n  TOPLAM deprecated      : ${deprecatedSayi}`);
console.log(`  TOPLAM aktif           : ${aktifSayi}`);

if (rapor.bulunamadi.length) {
    console.error(`\n  ISIMLE BULUNAMADI (${rapor.bulunamadi.length}): ${rapor.bulunamadi.join(', ')}`);
}

const BEKLENEN_DEPRECATED = 40;
const BEKLENEN_AKTIF = 56;
if (deprecatedSayi !== BEKLENEN_DEPRECATED || aktifSayi !== BEKLENEN_AKTIF) {
    console.error(`\nHATA: ${BEKLENEN_DEPRECATED} deprecated / ${BEKLENEN_AKTIF} aktif bekleniyordu.`);
    process.exit(1);
}
console.log(`  -> beklenen ${BEKLENEN_DEPRECATED}/${BEKLENEN_AKTIF} ile UYUSUYOR\n`);

// Aktif kayitlarin kategori dagilimi — bir kategori bosaldiysa gorelim.
const kat = {};
for (const t of db) {
    if (t.deprecated) continue;
    kat[t.category] = (kat[t.category] ?? 0) + 1;
}
console.log('  aktif kayitlarin kategori dagilimi');
for (const [k, v] of Object.entries(kat).sort((a, b) => b[1] - a[1])) {
    console.log(`      ${k.padEnd(11)} ${String(v).padStart(3)}`);
}

if (dry) {
    console.log('\n--dry: dosyaya dokunulmadi.\n');
} else {
    const yedekVar = await access(BACKUP_PATH).then(() => true, () => false);
    if (yedekVar) {
        console.log(`\nyedek : ${path.relative(ROOT, BACKUP_PATH)} zaten var, korundu`);
    } else {
        await writeFile(BACKUP_PATH, raw, 'utf8');
        console.log(`\nyedek : ${path.relative(ROOT, BACKUP_PATH)}`);
    }
    await writeFile(DB_PATH, `${JSON.stringify(db, null, 2)}\n`, 'utf8');
    console.log(`yazildi: ${path.relative(ROOT, DB_PATH)}\n`);
}
