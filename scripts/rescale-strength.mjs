/**
 * strength alanını data/kazananlar-matrisi.md'den türetilen 100'lük skoruna çevirir.
 *
 * Matris TEK doğruluk kaynağıdır. Matriste olmayan araç taban skoru alır —
 * scriptin araçlar hakkında kendi "bilgisi" yoktur ve olmamalıdır.
 *
 * Kullanım:
 *   node scripts/rescale-strength.mjs                  # DRY-RUN (varsayılan), veri yazmaz
 *   node scripts/rescale-strength.mjs --apply          # JSON'a yazar
 *   node scripts/rescale-strength.mjs --matrix <yol>   # baska bir matris dosyasi (test icin)
 *
 * Formül tek bir CONFIG objesinden okunur; model tabanlı araçlar için ileride
 * Arena/LLM-Stats verisi gelince kural seti buradan değiştirilebilir.
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = resolve(__dirname, '..', 'lib', 'tools-database.json');
const DEFAULT_MATRIX_PATH = resolve(__dirname, '..', 'data', 'kazananlar-matrisi.md');

/** --matrix <yol> ile alternatif matris (test icin). Varsayilan: data/kazananlar-matrisi.md */
function matrixPathFromArgv(argv) {
    const i = argv.indexOf('--matrix');
    if (i === -1) return DEFAULT_MATRIX_PATH;
    const value = argv[i + 1];
    if (!value) {
        console.error('❌ --matrix bir dosya yolu bekliyor.');
        process.exit(1);
    }
    return resolve(process.cwd(), value);
}

const MATRIX_PATH = matrixPathFromArgv(process.argv);

// ============================================================
// CONFIG — kural seti. Formülü değiştirmek için SADECE burayı düzenleyin.
// ============================================================

const CONFIG = {
    /** Matriste bir iş türünde ilgili sırada geçen aracın taban skoru. */
    rankScores: { 1: 88, 2: 80, 3: 74 },
    /** İlk geçişten sonraki her ek geçiş için eklenen puan. */
    extraAppearanceBonus: 2,
    /** Ek geçiş bonusuyla ulaşılabilecek tavan. */
    maxScore: 94,
    /** Matriste hiç geçmeyen araçlar ("iyi ama kazanan değil"). */
    unlistedScore: 60,
    /** deprecated: true olan araçlar. Diğer tüm kuralları ezer. */
    deprecatedScore: 40,
    /** Geçerli sıra değerleri. */
    validRanks: [1, 2, 3],
    /** Bu ibare matriste durduğu sürece script çalışmayı reddeder. */
    exampleMarker: 'ÖRNEK - SİLİNECEK',
};

// ============================================================
// Matris parser
// ============================================================

/** Bir markdown tablo satırını hücrelere böler. */
function parseRow(line) {
    return line
        .trim()
        .replace(/^\|/, '')
        .replace(/\|$/, '')
        .split('|')
        .map((cell) => cell.trim());
}

function isSeparatorRow(cells) {
    return cells.every((cell) => /^:?-{2,}:?$/.test(cell));
}

/**
 * data/kazananlar-matrisi.md'yi parse eder.
 * Tablo dışındaki tüm satırlar (başlık, açıklama, HTML yorumu) yok sayılır.
 */
function parseMatrix(raw) {
    const rows = [];
    const errors = [];
    const lines = raw.split(/\r?\n/);

    let seenHeader = false;

    lines.forEach((line, index) => {
        const lineNo = index + 1;
        if (!line.trim().startsWith('|')) return;

        const cells = parseRow(line);
        if (isSeparatorRow(cells)) return;

        // İlk tablo satırı başlıktır.
        if (!seenHeader) {
            seenHeader = true;
            return;
        }

        if (cells.length < 5) {
            errors.push(`satir ${lineNo}: 5 sutun bekleniyor, ${cells.length} bulundu`);
            return;
        }

        const [jobType, rankRaw, toolName, reason, pricing] = cells;

        // "Nasıl doldurulur" bolumundeki aciklama tablosunu atla:
        // orada Sira sutunu sayi degil, serbest metindir.
        const rank = Number(rankRaw);
        if (!Number.isInteger(rank)) return;

        if (!CONFIG.validRanks.includes(rank)) {
            errors.push(
                `satir ${lineNo}: gecersiz sira "${rankRaw}" (sadece ${CONFIG.validRanks.join('/')})`
            );
            return;
        }
        if (!jobType || !toolName) {
            errors.push(`satir ${lineNo}: is turu ve arac bos olamaz`);
            return;
        }

        rows.push({ lineNo, jobType, rank, toolName, reason, pricing });
    });

    return { rows, errors };
}

// ============================================================
// Skorlama
// ============================================================

/**
 * Bir araç için skoru hesaplar.
 * @param tool       tools-database.json kaydı
 * @param appearances bu araca ait matris satırları
 */
function computeStrength(tool, appearances) {
    if (tool.deprecated === true) {
        return { score: CONFIG.deprecatedScore, basis: 'deprecated' };
    }

    if (appearances.length === 0) {
        return { score: CONFIG.unlistedScore, basis: 'matriste yok' };
    }

    const bestRank = Math.min(...appearances.map((a) => a.rank));
    const base = CONFIG.rankScores[bestRank];
    const extras = appearances.length - 1;
    const bonus = extras * CONFIG.extraAppearanceBonus;
    const raw = base + bonus;
    const score = Math.min(raw, CONFIG.maxScore);

    const capped = raw > CONFIG.maxScore;
    const basis =
        `en iyi sira ${bestRank} → ${base}` +
        (extras > 0 ? ` + ${extras} ek gecis × ${CONFIG.extraAppearanceBonus} = ${raw}` : '') +
        (capped ? ` → tavan ${CONFIG.maxScore}` : '');

    return { score, basis };
}

// ============================================================
// Ana akış
// ============================================================

const apply = process.argv.includes('--apply');

// --- Matrisi oku ---
let matrixRaw;
try {
    matrixRaw = readFileSync(MATRIX_PATH, 'utf-8');
} catch {
    console.error(`❌ Matris bulunamadı: ${MATRIX_PATH}`);
    console.error(`   Skorun tek kaynağı bu dosya. Onsuz çalışamam.`);
    process.exit(1);
}

// --- İskelet kapısı: örnek satırlar silinmeden çalışma ---
if (matrixRaw.includes(CONFIG.exampleMarker)) {
    console.error(`❌ Matris hâlâ iskelet halinde.`);
    console.error(`   data/kazananlar-matrisi.md içinde "${CONFIG.exampleMarker}" ibaresi duruyor.`);
    console.error(`   Örnek satırları kendi verinizle değiştirip ibareyi silin, sonra tekrar çalıştırın.`);
    console.error(`   (Örnek satırlarla skor üretmek uydurma bir sıralama üretirdi.)`);
    process.exit(1);
}

const { rows, errors: parseErrors } = parseMatrix(matrixRaw);

if (parseErrors.length > 0) {
    console.error(`❌ Matris parse hataları:`);
    for (const e of parseErrors) console.error(`   - ${e}`);
    process.exit(1);
}

if (rows.length === 0) {
    console.error(`❌ Matriste hiç geçerli satır yok. Tablo boş mu?`);
    process.exit(1);
}

// --- Veritabanını oku ---
const tools = JSON.parse(readFileSync(DB_PATH, 'utf-8'));

// --- Araç isimlerini eşle ---
const byName = new Map(tools.map((t) => [t.name.toLowerCase(), t]));
const byId = new Map(tools.filter((t) => t.id).map((t) => [t.id.toLowerCase(), t]));

const unknown = [];
const appearancesByTool = new Map(); // tool.name -> rows[]

for (const row of rows) {
    const key = row.toolName.toLowerCase();
    const tool = byName.get(key) || byId.get(key);
    if (!tool) {
        unknown.push(row);
        continue;
    }
    if (!appearancesByTool.has(tool.name)) appearancesByTool.set(tool.name, []);
    appearancesByTool.get(tool.name).push(row);
}

if (unknown.length > 0) {
    console.error(`❌ Matriste tanınmayan araç ismi var (JSON'daki "name" ile birebir eşleşmeli):`);
    for (const row of unknown) {
        console.error(`   - satir ${row.lineNo}: "${row.toolName}"`);
    }
    console.error(`\n   Yazım hatası olabilir. Eşleşmeyen ismi sessizce atlamak, o aracı`);
    console.error(`   sessizce 60'a düşürürdü — bu yüzden durduruyorum.`);
    process.exit(1);
}

// --- Aynı iş türü + aynı sıra tekrarı ---
const dupes = [];
const seen = new Map();
for (const row of rows) {
    const key = `${row.jobType.toLowerCase()}#${row.rank}`;
    if (seen.has(key)) {
        dupes.push(`"${row.jobType}" sira ${row.rank}: satir ${seen.get(key)} ve ${row.lineNo}`);
    } else {
        seen.set(key, row.lineNo);
    }
}
if (dupes.length > 0) {
    console.error(`❌ Aynı iş türünde aynı sıra birden çok kez yazılmış:`);
    for (const d of dupes) console.error(`   - ${d}`);
    process.exit(1);
}

// --- Skorları hesapla ---
const changes = [];
for (const tool of tools) {
    const appearances = appearancesByTool.get(tool.name) || [];
    const { score, basis } = computeStrength(tool, appearances);
    changes.push({
        tool,
        old: tool.strength,
        next: score,
        basis,
        appearances,
    });
}

// --- Ücret sütunu tutarlılık uyarısı (skoru etkilemez) ---
const pricingWarnings = [];
for (const row of rows) {
    const tool = byName.get(row.toolName.toLowerCase()) || byId.get(row.toolName.toLowerCase());
    const declared = (row.pricing || '').toLowerCase();
    if (!declared) continue;
    const isFreeInDb = tool.pricing?.free || tool.pricing?.freemium;
    if (declared.startsWith('ücretsiz') && !isFreeInDb) {
        pricingWarnings.push(`${tool.name}: matris "ücretsiz" diyor, JSON'da paidOnly`);
    } else if (declared.startsWith('ücretli') && tool.pricing?.free && !tool.pricing?.paidOnly) {
        pricingWarnings.push(`${tool.name}: matris "ücretli" diyor, JSON'da free`);
    }
}

// ============================================================
// Rapor
// ============================================================

console.log(`# strength yeniden ölçekleme — ${apply ? 'APPLY' : 'DRY-RUN'}\n`);
console.log(`Matris: ${rows.length} satır, ${appearancesByTool.size} farklı araç`);
console.log(`Veritabanı: ${tools.length} araç\n`);

console.log(`## Değişiklik tablosu\n`);
console.log(`| Araç | Eski | Yeni | Gerekçe | Matris satırları |`);
console.log(`|---|---:|---:|---|---|`);

const sorted = [...changes].sort((a, b) => b.next - a.next || a.tool.name.localeCompare(b.tool.name));
for (const c of sorted) {
    const rowsText =
        c.appearances.length > 0
            ? c.appearances.map((a) => `${a.jobType} (${a.rank}.)`).join('<br>')
            : '—';
    console.log(`| ${c.tool.name} | ${c.old} | ${c.next} | ${c.basis} | ${rowsText} |`);
}

// --- Dağılım özeti ---
console.log(`\n## Dağılım\n`);
const dist = new Map();
for (const c of changes) dist.set(c.next, (dist.get(c.next) || 0) + 1);

const bands = [...dist.entries()].sort((a, b) => b[0] - a[0]);
console.log(`| Skor | Araç sayısı | Pay |`);
console.log(`|---:|---:|---|`);
for (const [score, count] of bands) {
    const pct = ((count / tools.length) * 100).toFixed(1);
    console.log(`| ${score} | ${count} | %${pct} |`);
}

const [topScore, topCount] = bands.reduce((a, b) => (b[1] > a[1] ? b : a));
const topPct = ((topCount / tools.length) * 100).toFixed(1);
console.log(`\nEn kalabalık bant: **${topScore}** → ${topCount} araç (%${topPct})`);
console.log(`Farklı skor sayısı: ${dist.size}`);

// Onceki durum karsilastirmasi
const oldDist = new Map();
for (const c of changes) oldDist.set(c.old, (oldDist.get(c.old) || 0) + 1);
const [oldTopScore, oldTopCount] = [...oldDist.entries()].reduce((a, b) => (b[1] > a[1] ? b : a));
console.log(
    `Önce: en kalabalık bant ${oldTopScore} → ${oldTopCount} araç (%${((oldTopCount / tools.length) * 100).toFixed(1)}), ${oldDist.size} farklı skor`
);

if (pricingWarnings.length > 0) {
    console.log(`\n## Ücret tutarsızlıkları (skoru etkilemez)\n`);
    for (const w of pricingWarnings) console.log(`- ⚠️ ${w}`);
}

// ============================================================
// Yazma
// ============================================================

if (!apply) {
    console.log(`\n---\n`);
    console.log(`DRY-RUN: hiçbir veri değişmedi. Uygulamak için: node scripts/rescale-strength.mjs --apply`);
    process.exit(0);
}

const updated = tools.map((tool) => {
    const change = changes.find((c) => c.tool === tool);
    return { ...tool, strength: change.next };
});

writeFileSync(DB_PATH, JSON.stringify(updated, null, 2) + '\n', 'utf-8');
console.log(`\n✅ APPLY: lib/tools-database.json güncellendi (${updated.length} araç).`);
