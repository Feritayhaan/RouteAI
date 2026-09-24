// 10 sabit sorguyu app/api/recommend/route.ts ile AYNI mantiktan gecirir.
//
//   npm run bench
//
// Ciplak `node scripts/run-queries.mjs` CALISMAZ: bu dosya .ts modulleri
// import ediyor ve lib icindeki uzantisiz importlari ('./parser' gibi) Node'un
// ESM cozumleyicisi bulamiyor. npm script'i hem ts-loader'i hem .env.local'i
// yukluyor — ikisi de zorunlu.
//
// Neden HTTP'ye vurmuyoruz: checkRateLimit KV'ye ulasamayinca fail-closed
// davranip 429 donuyor (kasitli bir guvenlik karari, dokunmuyoruz). Bu yuzden
// rate limit SONRASI akis burada tekrarlaniyor. Aday secimi/filtre/siralama
// route ile ORTAK (lib/recommendV1.ts); burada kalan tek kopya niyet + arama +
// workflow orkestrasyonu. Route'taki orkestrasyon degisirse bu dosya da degismeli.

import { analyzeIntent } from '../lib/intent/index.ts';
import { searchTools } from '../lib/vectorService.ts';
import { generateWorkflow, formatWorkflowForApi } from '../lib/workflow/index.ts';
import { getTools, generateExplanation, getLocalized, resolveLocale } from '../lib/toolsService.ts';
import { priceLabelOrUnknown } from '../lib/pricing.ts';
import { selectV1Tools } from '../lib/recommendV1.ts';

const QUERIES = [
    'web sitesi',
    'düğün davetiyesi',
    'YouTube altyazı çevirme',
    'ücretsiz logo',
    'akademik makale özeti',
    'Instagram reels',
    'Excel veri analizi',
    'ses klonlama podcast',
    'çizgi roman',
    'poster',
];

async function runQuery(prompt, pricingFilter) {
    const [intentResult, searchResults] = await Promise.all([
        analyzeIntent(prompt),
        searchTools(prompt, 8),
    ]);

    if ('code' in intentResult) {
        return { kind: 'error', code: intentResult.code, message: intentResult.message };
    }
    const intent = intentResult;

    if (intent.complexity === 'multi-step') {
        const workflow = await generateWorkflow(intent, prompt);
        if (workflow) {
            return {
                kind: 'workflow',
                intent,
                data: formatWorkflowForApi(workflow, resolveLocale(intent.constraints?.language)),
            };
        }
    }

    const allTools = await getTools();
    const selection = selectV1Tools({ intent, searchResults, allTools, pricingFilter });
    if (!selection) return { kind: 'empty', intent };

    const { main, alternatives, relaxedConstraint, usedFallback } = selection;
    const locale = resolveLocale(intent.constraints?.language);

    return {
        kind: 'simple',
        intent,
        usedFallback,
        relaxedConstraint,
        main: {
            name: main.name,
            category: main.category,
            price: priceLabelOrUnknown(main.pricing),
            strength: main.strength,
            reviewStatus: main.reviewStatus,
            why: generateExplanation(intent, main),
            description: getLocalized(main, 'description', locale),
        },
        alternatives: alternatives.map((t) => ({
            name: t.name,
            category: t.category,
            price: priceLabelOrUnknown(t.pricing),
            strength: t.strength,
            reviewStatus: t.reviewStatus,
        })),
    };
}

// Katalog ozeti. getTools() TUM katalogu doner (deprecated dahil) — eleme
// tuketici tarafinda yapilir, route.ts de boyle. Bu satir "kac arac var" ile
// "kac arac onerilebilir" sorularini ayirt edilebilir kilar.
const katalog = await getTools();
const deprecatedSayi = katalog.filter((t) => t.deprecated).length;
console.log(
    `[bench] katalog ${katalog.length} arac | onerilebilir ${katalog.length - deprecatedSayi} | deprecated ${deprecatedSayi}`
);

const results = [];
for (const q of QUERIES) {
    process.stderr.write(`\n>>> ${q}\n`);
    try {
        results.push({ query: q, ...(await runQuery(q, 'all')) });
    } catch (error) {
        results.push({ query: q, kind: 'throw', message: String(error?.message ?? error) });
    }
}

const flag = (t) => (t.reviewStatus === 'unreviewed' ? ' [DENETLENMEMIS]' : '');

console.log('\n\n================ 10 SORGU SONUCU ================\n');
for (const r of results) {
    console.log(`SORGU: ${r.query}`);
    if (r.kind === 'simple') {
        console.log(`  sorgu kategorisi : ${r.intent.primaryCategory} (guven ${r.intent.confidence}, fiyat kisiti=${r.intent.constraints.pricing})${r.usedFallback ? '  [KATEGORI FALLBACK]' : ''}${r.relaxedConstraint ? `  [KISIT GEVSETILDI: ${r.relaxedConstraint}]` : ''}`);
        console.log(`  ANA ONERI        : ${r.main.name}${flag(r.main)}`);
        console.log(`                     kategori=${r.main.category} | ${r.main.price} | strength=${r.main.strength}`);
        console.log(`                     "${r.main.description}"`);
        console.log(`                     ${r.main.why}`);
        if (r.alternatives.length === 0) console.log('  ALTERNATIFLER    : (yok)');
        r.alternatives.forEach((a, i) =>
            console.log(`  ALTERNATIF ${i + 1}     : ${a.name}${flag(a)} — kategori=${a.category} | ${a.price} | strength=${a.strength}`)
        );
    } else if (r.kind === 'workflow') {
        console.log(`  sorgu kategorisi : ${r.intent.primaryCategory} (guven ${r.intent.confidence})`);
        console.log(`  WORKFLOW         : ${r.data.name} (${r.data.totalSteps} adim)`);
        for (const s of r.data.steps) {
            console.log(`    ${s.order}. ${s.name}: ${s.primary.toolName} (alt: ${s.alternative.toolName})`);
        }
    } else {
        console.log(`  ${r.kind.toUpperCase()}: ${r.message ?? r.code ?? ''}`);
    }
    console.log('');
}

const simple = results.filter((r) => r.kind === 'simple');
const unreviewedMain = simple.filter((r) => r.main.reviewStatus === 'unreviewed');
const catMismatch = simple.filter((r) => r.main.category !== r.intent.primaryCategory);
const unknownPrice = simple.filter((r) => r.main.price === 'Fiyat bilinmiyor');

console.log('================ OZET ================');
console.log(`  simple cevap                       : ${simple.length}/${results.length}`);
console.log(`  workflow cevap                     : ${results.filter((r) => r.kind === 'workflow').length}/${results.length}`);
console.log(`  hata/bos                           : ${results.filter((r) => r.kind === 'throw' || r.kind === 'error' || r.kind === 'empty').length}/${results.length}`);
console.log(`  ana onerisi DENETLENMEMIS olan     : ${unreviewedMain.length}/${simple.length}  ${unreviewedMain.map((r) => r.query).join(', ')}`);
console.log(`  arac kategorisi != sorgu kategorisi: ${catMismatch.length}/${simple.length}  ${catMismatch.map((r) => `${r.query}(${r.main.category}!=${r.intent.primaryCategory})`).join(', ')}`);
console.log(`  ana onerinin fiyati bilinmiyor     : ${unknownPrice.length}/${simple.length}`);

// Kabul kriteri 4b: hicbir alternatif listesinde kategori disi arac olmayacak.
const offCategory = [];
for (const r of simple) {
    const allowed = new Set([r.main.category, r.intent.primaryCategory, ...(r.intent.secondaryCategories ?? [])]);
    for (const a of r.alternatives) {
        if (!allowed.has(a.category)) offCategory.push(`${r.query} -> ${a.name}(${a.category})`);
    }
}
console.log(`  KATEGORI DISI ALTERNATIF           : ${offCategory.length}  ${offCategory.join(', ')}`);
