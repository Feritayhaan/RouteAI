// 10 sabit sorguyu app/api/recommend/route.ts ile AYNI mantiktan gecirir.
//
//   node --env-file=.env.local --loader ./lib/__tests__/ts-loader.mjs scripts/run-queries.mjs
//
// Neden HTTP'ye vurmuyoruz: checkRateLimit KV'ye ulasamayinca fail-closed
// davranip 429 donuyor (kasitli bir guvenlik karari, dokunmuyoruz). Bu yuzden
// rate limit SONRASI akis burada birebir tekrarlaniyor. Route degisirse bu
// dosya da degismeli.

import { analyzeIntent } from '../lib/intent/index.ts';
import { searchTools } from '../lib/vectorService.ts';
import { generateWorkflow, formatWorkflowForApi } from '../lib/workflow/index.ts';
import { getTools, generateExplanation, getLocalized, resolveLocale } from '../lib/toolsService.ts';
import { matchesPricingFilter, priceLabelOrUnknown } from '../lib/pricing.ts';

// route.ts'ten birebir kopya
const categoryOutputMap = {
    video: ['video'],
    gorsel: ['image'],
    ses: ['audio'],
    kod: ['code', 'text'],
    metin: ['text'],
    arastirma: ['text'],
    veri: ['text', 'image'],
};

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
    let recommendedTools = [];
    for (const result of searchResults) {
        const tool = allTools.find((t) => t.name === result.metadata.name);
        if (tool) recommendedTools.push(tool);
    }

    if (pricingFilter && pricingFilter !== 'all') {
        recommendedTools = recommendedTools.filter((t) => matchesPricingFilter(t.pricing, pricingFilter));
    }

    const expectedOutputs = categoryOutputMap[intent.primaryCategory];
    if (expectedOutputs && recommendedTools.length > 0) {
        const filtered = recommendedTools.filter(
            (t) => !t.outputTypes || t.outputTypes.some((o) => expectedOutputs.includes(o))
        );
        if (filtered.length > 0) recommendedTools = filtered;
    }

    let usedFallback = false;
    if (recommendedTools.length === 0) {
        usedFallback = true;
        recommendedTools = allTools.filter((t) => {
            if (t.category !== intent.primaryCategory) return false;
            if (t.deprecated) return false;
            const expected = categoryOutputMap[intent.primaryCategory];
            if (!expected || !t.outputTypes) return true;
            return t.outputTypes.some((o) => expected.includes(o));
        });

        if (pricingFilter && pricingFilter !== 'all') {
            recommendedTools = recommendedTools.filter((t) => matchesPricingFilter(t.pricing, pricingFilter));
        }

        recommendedTools.sort((a, b) => (b.strength ?? 0) - (a.strength ?? 0));
    }

    if (recommendedTools.length === 0) return { kind: 'empty', intent };

    const [main, ...rest] = recommendedTools;
    const locale = resolveLocale(intent.constraints?.language);

    return {
        kind: 'simple',
        intent,
        usedFallback,
        main: {
            name: main.name,
            category: main.category,
            price: priceLabelOrUnknown(main.pricing),
            strength: main.strength,
            reviewStatus: main.reviewStatus,
            why: generateExplanation(intent, main),
            description: getLocalized(main, 'description', locale),
        },
        alternatives: rest.slice(0, 3).map((t) => ({
            name: t.name,
            category: t.category,
            price: priceLabelOrUnknown(t.pricing),
            strength: t.strength,
            reviewStatus: t.reviewStatus,
        })),
    };
}

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
        console.log(`  sorgu kategorisi : ${r.intent.primaryCategory} (guven ${r.intent.confidence})${r.usedFallback ? '  [KATEGORI FALLBACK]' : ''}`);
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
