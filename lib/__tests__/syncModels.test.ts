import assert from 'node:assert';
import { describe, it } from 'node:test';
import {
  fetchArtificialAnalysis,
  fetchLmArena,
  mergeModels,
  newReport,
  normalizeModelKey,
  parseCi95,
  suggestModels,
} from '../../scripts/sync/core.mjs';

// Sahte yanıtlar. Alan adları gerçek API'den DOĞRULANMADI; burada test edilen
// şey birleştirme, dayanıklılık ve "alan yoksa değer yazma" mantığı.
const arenas = [
  { source: 'artificialanalysis', key: 'llm_intelligence', sourceField: '/data/llms/models#evaluations.artificial_analysis_intelligence_index' },
  { source: 'artificialanalysis', key: 'text-to-image', sourceField: '/data/media/text-to-image#elo' },
  { source: 'lmarena', key: 'text', sourceField: 'text' },
  { source: 'lmarena', key: 'text_to_image', sourceField: 'text_to_image' },
];

function fakeFetch(routes: Record<string, unknown>) {
  const calls: string[] = [];
  const fetchJson = async (url: string) => {
    calls.push(url);
    const hit = Object.entries(routes).find(([k]) => url.includes(k));
    if (!hit) throw new Error('HTTP 404');
    if (hit[1] instanceof Error) throw hit[1];
    return hit[1];
  };
  return { fetchJson, calls };
}

const aaRoutes = {
  '/data/llms/models': {
    data: [
      { slug: 'gpt-5', name: 'GPT-5', model_creator: { name: 'OpenAI' }, release_date: '2025-08-07', evaluations: { artificial_analysis_intelligence_index: 68.5 }, pricing: { price_1m_input_tokens: 1.25, price_1m_output_tokens: 10 } },
      { slug: 'no-eval', name: 'No Eval', model_creator: { name: 'X' }, evaluations: {} },
    ],
  },
  '/data/media/text-to-image': {
    data: [{ slug: 'image-model-a', name: 'Image Model A', model_creator: { name: 'Lab A' }, elo: 1100, rank: 1, ci95: '-5/+6', appearances: 1200 }],
  },
};

const hfRoutes = {
  '/splits': { splits: [{ config: 'text', split: 'latest' }, { config: 'text_to_image', split: 'latest' }] },
  'config=text&': {
    num_rows_total: 3,
    rows: [
      { row: { model_name: 'GPT 5', organization: 'OpenAI', rating: 1450.2, rating_q025: 1445, rating_q975: 1455, vote_count: 9000, rank: 1, category: 'overall' } },
      { row: { model_name: 'GPT 5', organization: 'OpenAI', rating: 1500, category: 'coding' } },
      { row: { model_name: 'other-llm', organization: 'Lab B', rating: 1300, vote_count: 500, rank: 7, category: 'overall' } },
    ],
  },
  'config=text_to_image&': {
    num_rows_total: 1,
    rows: [{ row: { model_name: 'image.model.a', organization: 'Lab A', rating: 1050, vote_count: 300, rank: 2 } }],
  },
};

const sleep = async () => {};
const today = '2026-09-24';

describe('model senkronu: yardımcılar', () => {
  it('ad normalizasyonu boşluk, nokta ve tireyi tekleştirir', () => {
    assert.strictEqual(normalizeModelKey('GPT-4.1 mini'), 'gpt-4-1-mini');
    assert.strictEqual(normalizeModelKey('gpt 4.1-mini'), 'gpt-4-1-mini');
    assert.strictEqual(normalizeModelKey('  Imagen_4 (Preview) '), 'imagen-4-preview');
  });

  it('ci95 sayı ya da "-a/+b" biçiminde; tanınmayan biçimde sınır yazılmaz', () => {
    assert.deepStrictEqual(parseCi95(5, 100), { ciLow: 95, ciHigh: 105 });
    assert.deepStrictEqual(parseCi95('-5/+6', 100), { ciLow: 95, ciHigh: 106 });
    assert.strictEqual(parseCi95('bilinmiyor', 100), null);
  });
});

describe('model senkronu: kaynaklar ve birleştirme', () => {
  it('iki kaynaktaki aynı model tek kayıtta iki skor satırı olur; genel kategori seçilir', async () => {
    const { fetchJson } = fakeFetch({ ...aaRoutes, ...hfRoutes });
    const report = newReport();
    const aa = await fetchArtificialAnalysis({ fetchJson, sleep, aaKey: 'k', arenas, today }, report);
    const lm = await fetchLmArena({ fetchJson, sleep, arenas, today }, report);
    assert.ok(aa && lm);
    const models = mergeModels({
      oldModels: [], fresh: [...aa, ...lm], succeededSources: new Set(['artificialanalysis', 'lmarena']),
      aliases: {}, linkedModelIds: new Set(), today,
    }, report);

    const gpt5 = models.find((m) => m.id === 'gpt-5');
    assert.ok(gpt5);
    assert.deepStrictEqual(gpt5.scores.map((s: { source: string; key: string; value: number }) => `${s.source}:${s.key}=${s.value}`), [
      'artificialanalysis:llm_intelligence=68.5',
      'lmarena:text=1450.2', // 'coding' kategorisi değil 'overall'
    ]);
    assert.deepStrictEqual(gpt5.pricing, { inputPerMTok: 1.25, outputPerMTok: 10, source: 'artificialanalysis', fetchedAt: today });
    assert.strictEqual(gpt5.releaseDate, '2025-08-07');

    const img = models.find((m) => m.id === 'image-model-a');
    assert.strictEqual(img?.scores.length, 2, 'image.model.a ve image-model-a aynı model');
    const aaImg = img?.scores.find((s: { source: string }) => s.source === 'artificialanalysis');
    assert.deepStrictEqual(aaImg, { source: 'artificialanalysis', key: 'text-to-image', value: 1100, fetchedAt: today, ciLow: 1095, ciHigh: 1106, votes: 1200, rank: 1 });

    // Değeri olmayan model hiç yazılmaz (uydurma yok)
    assert.ok(!models.some((m) => m.id === 'no-eval'));
  });

  it('alan yanıtta yoksa değer yazılmaz ve rapora hata düşer', async () => {
    const { fetchJson } = fakeFetch({
      '/data/llms/models': { data: [{ slug: 'x', name: 'X', evaluations: { other_index: 1 } }] },
      '/data/media/text-to-image': { data: [] },
    });
    const report = newReport();
    const rows = await fetchArtificialAnalysis({ fetchJson, sleep, aaKey: 'k', arenas, today }, report);
    assert.deepStrictEqual(rows, []);
    assert.ok(report.errors.some((e: string) => e.includes('artificial_analysis_intelligence_index') && e.includes('other_index')));
  });

  it('AA_API_KEY yoksa AA atlanır; başarısız kaynağın eski skorları korunur', async () => {
    const report = newReport();
    const { fetchJson, calls } = fakeFetch({ '/splits': new Error('HTTP 503') });
    assert.strictEqual(await fetchArtificialAnalysis({ fetchJson, sleep, aaKey: undefined, arenas, today }, report), null);
    assert.strictEqual(await fetchLmArena({ fetchJson, sleep, arenas, today }, report), null);
    assert.ok(!calls.some((u) => u.includes('artificialanalysis')), 'anahtarsız AA isteği atılmamalı');

    const old = [{ id: 'm', name: 'M', creator: 'L', aliases: [], modalities: ['text'], scores: [
      { source: 'lmarena', key: 'text', value: 1, fetchedAt: '2026-09-01' },
      { source: 'artificialanalysis', key: 'llm_intelligence', value: 2, fetchedAt: '2026-09-01' },
    ] }];
    const fresh = [{ source: 'artificialanalysis', key: 'llm_intelligence', rawName: 'm', displayName: 'M', creator: 'L', modality: 'text', releaseDate: null, pricing: null,
      score: { source: 'artificialanalysis', key: 'llm_intelligence', value: 3, fetchedAt: today } }];
    const models = mergeModels({ oldModels: old, fresh, succeededSources: new Set(['artificialanalysis']), aliases: {}, linkedModelIds: new Set(), today }, report);
    assert.deepStrictEqual(models[0].scores.map((s: { source: string; value: number }) => `${s.source}=${s.value}`), ['artificialanalysis=3', 'lmarena=1']);
  });

  it('değer değişmediyse ve tarih tazeyse fetchedAt korunur (gereksiz diff yok)', () => {
    const old = [{ id: 'm', name: 'M', creator: 'L', aliases: [], modalities: ['text'], scores: [{ source: 'lmarena', key: 'text', value: 5, fetchedAt: '2026-09-20' }] }];
    const row = (value: number) => ({ source: 'lmarena', key: 'text', rawName: 'm', displayName: 'M', creator: 'L', modality: 'text', releaseDate: null, pricing: null,
      score: { source: 'lmarena', key: 'text', value, fetchedAt: today } });
    const same = mergeModels({ oldModels: old, fresh: [row(5)], succeededSources: new Set(['lmarena']), aliases: {}, linkedModelIds: new Set(), today }, newReport());
    assert.strictEqual(same[0].scores[0].fetchedAt, '2026-09-20');
    const changed = mergeModels({ oldModels: old, fresh: [row(6)], succeededSources: new Set(['lmarena']), aliases: {}, linkedModelIds: new Set(), today }, newReport());
    assert.strictEqual(changed[0].scores[0].fetchedAt, today);
  });

  it('ürüne bağlı model skorsuz kalsa da silinmez; bağlı olmayan silinir', () => {
    const old = [
      { id: 'linked', name: 'L', creator: 'x', aliases: [], modalities: [], scores: [{ source: 'lmarena', key: 'text', value: 1, fetchedAt: today }] },
      { id: 'gone', name: 'G', creator: 'x', aliases: [], modalities: [], scores: [{ source: 'lmarena', key: 'text', value: 1, fetchedAt: today }] },
    ];
    const report = newReport();
    const models = mergeModels({ oldModels: old, fresh: [], succeededSources: new Set(['lmarena']), aliases: {}, linkedModelIds: new Set(['linked']), today }, report);
    assert.deepStrictEqual(models.map((m) => m.id), ['linked']);
    assert.deepStrictEqual(report.disappeared, ['gone']);
  });
});

describe('ürün -> model önerisi', () => {
  const models = [
    { id: 'veo-3', name: 'Veo 3', aliases: [], scores: [] },
    { id: 'gpt-5', name: 'GPT-5', aliases: [], scores: [] },
    { id: 'gpt-5-mini', name: 'GPT-5 mini', aliases: [], scores: [] },
    { id: 'pro', name: 'Pro', aliases: [], scores: [] },
  ];
  it('model adı ürün adında ardışık kelimelerse önerir, genel kelimeleri önermez', () => {
    assert.deepStrictEqual(suggestModels({ name: 'Google Veo 3' }, models).map((m: { id: string }) => m.id), ['veo-3']);
    assert.deepStrictEqual(suggestModels({ name: 'ChatGPT (GPT-5)' }, models).map((m: { id: string }) => m.id), ['gpt-5']);
    assert.deepStrictEqual(suggestModels({ name: 'Flux.1 Pro' }, models), []);
  });
});
