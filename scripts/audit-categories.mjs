/**
 * Kategori denetim scripti — SADECE RAPOR ÜRETİR, VERİ DEĞİŞTİRMEZ.
 *
 * lib/tools-database.json'daki her aracı name + category + bestFor.en olarak listeler
 * ve bestFor içeriğiyle category'si uyumsuz GÖRÜNEN adayları işaretler.
 *
 * Sinyaller İngilizce: migration sonrası bestFor.en dolu, bestFor.tr boş.
 *
 * İşaretleme bir ÖNERİ'dir, karar değil. Taşıma kararını insan verir.
 *
 * Kullanım: node scripts/audit-categories.mjs
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = resolve(__dirname, '..', 'lib', 'tools-database.json');

const tools = JSON.parse(readFileSync(DB_PATH, 'utf-8'));

// ============================================================
// Kategori sinyalleri (bestFor.en içinde aranan alt dizeler)
// ============================================================

const CATEGORY_SIGNALS = {
    gorsel: [
        'image', 'photo', 'logo', 'illustration', 'poster', 'art', 'design',
        'visual', 'picture', 'graphic', 'icon', 'avatar', 'thumbnail', 'render',
    ],
    metin: [
        'writing', 'copywriting', 'blog', 'article', 'content', 'text', 'essay',
        'summary', 'summarize', 'translation', 'email', 'script writing', 'seo',
        // Sunum araclari metin kategorisinde (keywords.ts ile ayni karar).
        // bestFor.en karisik dilli oldugu icin Turkce etiketler de listede.
        'presentation', 'slide', 'deck', 'document', 'proposal', 'one-pager',
        'sunum', 'slayt', 'döküman',
    ],
    ses: [
        'audio', 'voice', 'music', 'sound', 'podcast', 'speech', 'song',
        'narration', 'dubbing', 'transcription',
    ],
    arastirma: [
        'research', 'academic', 'paper', 'literature', 'citation', 'scientific',
        'thesis', 'study', 'source',
    ],
    video: [
        'video', 'film', 'animation', 'clip', 'movie', 'reel', 'shorts',
        'motion', 'editing', 'footage', 'cinematic',
    ],
    veri: [
        'data', 'analysis', 'analytics', 'chart', 'spreadsheet', 'statistics',
        'dashboard', 'excel', 'sql', 'database', 'visualization', 'report',
    ],
    kod: [
        'code', 'coding', 'programming', 'software', 'development', 'debug',
        'api', 'function', 'test cases', 'refactor', 'app', 'website',
    ],
};

// Kategori enum'una girmeyen kavram grupları ve bunların "yuva" kategorisi.
// Bunlar YENİ KATEGORİ DEĞİL — enum'a dokunulmuyor; kavram, mevcut en yakın
// kategoriye yuvalanıyor (keywords.ts'teki eşleme ile aynı karar).
// Bir araç yuva kategorisini kapsıyorsa (category veya secondaryCategories)
// kavram çözülmüş sayılır; kapsamıyorsa işaretlenir.
const CONCEPT_GROUPS = {
    presentation: {
        signals: ['presentation', 'slide', 'deck', 'pitch', 'keynote', 'powerpoint', 'sunum', 'slayt'],
        home: 'metin',
    },
};

// ============================================================
// Yardımcılar
// ============================================================

/** bestFor'u locale map veya legacy düz dizi olarak oku (en öncelikli). */
function readBestFor(tool) {
    const raw = tool.bestFor;
    if (Array.isArray(raw)) return raw;
    if (raw && typeof raw === 'object') {
        if (Array.isArray(raw.en) && raw.en.length > 0) return raw.en;
        if (Array.isArray(raw.tr) && raw.tr.length > 0) return raw.tr;
    }
    return [];
}

/** Bir sinyal listesinin bestFor içinde kaç kez eşleştiğini say. */
function countHits(bestFor, signals) {
    const text = bestFor.join(' | ').toLowerCase();
    return signals.filter((s) => text.includes(s)).length;
}

function scoreAllCategories(bestFor) {
    const scores = {};
    for (const [category, signals] of Object.entries(CATEGORY_SIGNALS)) {
        scores[category] = countHits(bestFor, signals);
    }
    return scores;
}

// ============================================================
// STEP 1: Tam liste
// ============================================================

console.log('='.repeat(78));
console.log(`  TÜM ARAÇLAR (${tools.length})`);
console.log('='.repeat(78));

const byCategory = {};
for (const tool of tools) {
    (byCategory[tool.category] ||= []).push(tool);
}

for (const category of Object.keys(CATEGORY_SIGNALS)) {
    const group = byCategory[category] || [];
    if (group.length === 0) continue;
    console.log(`\n### ${category} (${group.length})`);
    for (const tool of group) {
        const bestFor = readBestFor(tool);
        const secondary = tool.secondaryCategories?.length
            ? ` [2°: ${tool.secondaryCategories.join(', ')}]`
            : '';
        console.log(`  - ${tool.name}${secondary}`);
        console.log(`      bestFor.en: ${bestFor.join(', ') || '(bos)'}`);
    }
}

// ============================================================
// STEP 2: Uyumsuz adayları işaretle
// ============================================================

const flagged = [];

for (const tool of tools) {
    const bestFor = readBestFor(tool);
    const scores = scoreAllCategories(bestFor);
    const ownScore = scores[tool.category] ?? 0;

    const covered = new Set([tool.category, ...(tool.secondaryCategories || [])]);
    const reasons = [];

    // (a) Kavram grubu sinyali var ama araç kavramın yuva kategorisini kapsamıyor.
    for (const [concept, { signals, home }] of Object.entries(CONCEPT_GROUPS)) {
        const hits = countHits(bestFor, signals);
        if (hits > 0 && !covered.has(home)) {
            reasons.push(
                `"${concept}" sinyali (${hits} eslesme) ama arac "${home}" kategorisini kapsamiyor`
            );
        }
    }

    // (b) Başka bir kategori kendi kategorisinden daha güçlü sinyal veriyor.
    const rivals = Object.entries(scores)
        .filter(([category, score]) => !covered.has(category) && score > ownScore)
        .sort((a, b) => b[1] - a[1]);

    if (rivals.length > 0) {
        const list = rivals.map(([c, s]) => `${c}(${s})`).join(', ');
        reasons.push(`kendi kategorisi ${tool.category}(${ownScore}) zayif; daha guclu: ${list}`);
    }

    // (c) Kendi kategorisi için hiç sinyal yok.
    if (ownScore === 0 && rivals.length === 0) {
        reasons.push(`${tool.category} icin bestFor'da hic sinyal yok (dogrulanamadi)`);
    }

    if (reasons.length > 0) {
        flagged.push({ tool, bestFor, reasons });
    }
}

console.log('\n\n' + '='.repeat(78));
console.log(`  ISARETLI ADAYLAR (${flagged.length} / ${tools.length})`);
console.log('='.repeat(78));
console.log('  NOT: Bunlar oneri; tasima karari insana aittir. Script veri degistirmez.\n');

for (const { tool, bestFor, reasons } of flagged) {
    const secondary = tool.secondaryCategories?.length
        ? ` [2°: ${tool.secondaryCategories.join(', ')}]`
        : '';
    console.log(`⚑ ${tool.name}  —  category: ${tool.category}${secondary}`);
    console.log(`    bestFor.en: ${bestFor.join(', ') || '(bos)'}`);
    for (const reason of reasons) {
        console.log(`    → ${reason}`);
    }
    console.log();
}

console.log('='.repeat(78));
console.log(`  OZET: ${flagged.length} isaretli aday / ${tools.length} arac`);
console.log('='.repeat(78));
