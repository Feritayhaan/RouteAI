import assert from 'node:assert';
import { describe, it } from 'node:test';
import {
  fetchArtificialAnalysis,
  fetchLmArena,
  isRetryableStatus,
  mergeModels,
  newReport,
  normalizeModelKey,
  parseCi95,
  renderReport,
  retryDelayMs,
  suggestModels,
  syncExitDecision,
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

describe('gece işi çıkış kararı (syncExitDecision)', () => {
  const aa = (hasKey: boolean, gotData: boolean) => ({ name: 'Artificial Analysis', needsKey: true, hasKey, gotData });
  const lm = (gotData: boolean) => ({ name: 'LMArena', needsKey: false, gotData });

  it('kaynak yok: hiçbir kaynaktan veri gelmezse kırmızı', () => {
    const d = syncExitDecision({ sources: [aa(true, false), lm(false)], errors: ['AA /data/llms/models: HTTP 503', "LMArena text: 'latest' split'i yok"] });
    assert.strictEqual(d.code, 1);
    assert.ok(d.reasons.includes('Artificial Analysis: veri gelmedi.'));
    assert.ok(d.reasons.includes('LMArena: veri gelmedi.'));
    assert.ok(d.reasons.some((r: string) => r.startsWith('2 hata')));
    assert.deepStrictEqual(syncExitDecision({ sources: [], errors: [] }), { code: 1, reasons: ['Tanımlı veri kaynağı yok.'] });
  });

  it('anahtar yok: kaynak "atlandı" olur, hata sayılmaz', () => {
    const ok = syncExitDecision({ sources: [aa(false, false), lm(true)], errors: [] });
    assert.deepStrictEqual(ok, { code: 0, reasons: ['Artificial Analysis: anahtar tanımlı değil, atlandı (hata sayılmadı).'] });
    // Anahtarsız KV (aggregate-signals): tek kaynak atlandı -> yine yeşil
    assert.strictEqual(syncExitDecision({ sources: [{ name: 'KV sinyalleri', needsKey: true, hasKey: false, gotData: false }], errors: [] }).code, 0);
    // Anahtar yokken anahtarsız kaynak da düşerse kırmızı; atlanan kaynak gerekçe olmaz
    const bad = syncExitDecision({ sources: [aa(false, false), lm(false)], errors: [] });
    assert.strictEqual(bad.code, 1);
    assert.ok(!bad.reasons.includes('Artificial Analysis: veri gelmedi.'));
    assert.ok(bad.reasons.includes('LMArena: veri gelmedi.'));
  });

  it('veri geldi: beklenen kaynakların hepsinden veri, hata yok -> yeşil, gerekçe yok', () => {
    assert.deepStrictEqual(syncExitDecision({ sources: [aa(true, true), lm(true)], errors: [] }), { code: 0, reasons: [] });
    assert.deepStrictEqual(syncExitDecision({ sources: [{ name: 'KV sinyalleri', needsKey: true, hasKey: true, gotData: true }], errors: [] }), { code: 0, reasons: [] });
  });

  it('kısmi hata: veri gelen kaynaktaki tekil hata yeşil kalır ama görünür; anahtarlı kaynak tümden düşerse kırmızı', () => {
    const partial = syncExitDecision({ sources: [aa(true, true), lm(true)], errors: ["LMArena webdev: 'latest' split'i yok"] });
    assert.strictEqual(partial.code, 0);
    assert.deepStrictEqual(partial.reasons, ['Kısmi hata: 1 hata; beklenen kaynakların hepsinden veri geldi.']);

    const oneDown = syncExitDecision({ sources: [aa(true, false), lm(true)], errors: ['AA /data/llms/models: HTTP 401'] });
    assert.strictEqual(oneDown.code, 1);
    assert.deepStrictEqual(oneDown.reasons, ['Artificial Analysis: veri gelmedi.', '1 hata.']);

    const kvDown = syncExitDecision({ sources: [{ name: 'KV sinyalleri', needsKey: true, hasKey: true, gotData: false }], errors: ['KV okuma: fetch failed'] });
    assert.strictEqual(kvDown.code, 1);
  });

  it('karar raporun başında görünür', () => {
    const report = newReport();
    const decision = syncExitDecision({ sources: [aa(false, false), lm(false)], errors: [] });
    const text = renderReport(report, { models: [], dryRun: false, wrote: false, decision });
    assert.match(text, /## Karar: BAŞARISIZ \(iş kırmızı biter\)\n\n- Artificial Analysis: anahtar tanımlı değil, atlandı \(hata sayılmadı\)\.\n- LMArena: veri gelmedi\./);
  });
});

describe('model senkronu: gerçek LMArena satırıyla doğrulama (P10, 2026-09-28)', () => {
  // HF datasets-server'dan (https://datasets-server.huggingface.co) doğrudan
  // okunan gerçek satırlar. Config listesi (text, text_to_image dahil 9'u),
  // 'latest' split'i ve buradaki alan adları (model_name, rating,
  // rating_lower/upper, vote_count, rank, category) DOĞRULANDI — data/README
  // ve LMARENA_FIELDS'teki adaylarla birebir eşleşiyor, kod değişmedi.
  // Gerçek veride release_date alanı YOK; releaseDate uydurulmaz, null kalır.
  const realHfRoutes = {
    '/splits': {
      splits: [
        { config: 'text', split: 'latest' },
        { config: 'text_to_image', split: 'latest' },
      ],
    },
    'config=text&': {
      num_rows_total: 2,
      rows: [
        { row: { model_name: 'claude-opus-5.5-high', organization: 'anthropic', license: 'Proprietary', rating: 1517.7921223112396, rating_lower: 1505.6151276832159, rating_upper: 1529.9691169392634, variance: 38.599710446493205, vote_count: 2307.0, rank: 1.0, category: 'overall', leaderboard_publish_date: '2026-09-25' } },
        { row: { model_name: 'claude-fable-5.1-max', organization: 'anthropic', license: 'Proprietary', rating: 1510.8335549676824, rating_lower: 1504.0754342033576, rating_upper: 1517.5916757320074, variance: 11.889284357067776, vote_count: 9942.0, rank: 2.0, category: 'overall', leaderboard_publish_date: '2026-09-25' } },
      ],
    },
    'config=text_to_image&': {
      num_rows_total: 1,
      rows: [
        { row: { model_name: 'gpt-image-2.5-sunburst', organization: 'openai', license: 'Proprietary', rating: 1423.6048361955234, rating_lower: 1415.9321932783876, rating_upper: 1431.277479112659, variance: 15.324763867502837, vote_count: 10884, rank: 1, category: 'overall', leaderboard_publish_date: '2026-09-24' } },
      ],
    },
  };

  it('gerçek alan adları doğru okunur; olmayan alan (release_date) uydurulmaz', async () => {
    const { fetchJson } = fakeFetch(realHfRoutes);
    const report = newReport();
    const lm = await fetchLmArena({ fetchJson, sleep, arenas, today }, report);
    assert.ok(lm);
    assert.deepStrictEqual(report.errors, []);

    const claude = lm.find((r: { rawName: string }) => r.rawName === 'claude-opus-5.5-high');
    assert.ok(claude);
    assert.strictEqual(claude.creator, 'anthropic');
    assert.strictEqual(claude.releaseDate, null, 'gerçek veride release_date yok; tahmin edilmez');
    assert.deepStrictEqual(claude.score, { source: 'lmarena', key: 'text', value: 1517.7921223112396, fetchedAt: today, ciLow: 1505.6151276832159, ciHigh: 1529.9691169392634, votes: 2307, rank: 1 });

    const gptImage = lm.find((r: { rawName: string }) => r.rawName === 'gpt-image-2.5-sunburst');
    assert.ok(gptImage);
    assert.deepStrictEqual(gptImage.score, { source: 'lmarena', key: 'text_to_image', value: 1423.6048361955234, fetchedAt: today, ciLow: 1415.9321932783876, ciHigh: 1431.277479112659, votes: 10884, rank: 1 });

    const models = mergeModels({ oldModels: [], fresh: lm, succeededSources: new Set(['lmarena']), aliases: {}, linkedModelIds: new Set(), today }, report);
    assert.ok(models.find((m: { id: string }) => m.id === 'claude-opus-5-5-high'));
    assert.ok(models.find((m: { id: string }) => m.id === 'gpt-image-2-5-sunburst'));
  });

  // 2026-09-28 gece koşusu (run 36429402229): 8 modelde organization alanı
  // BOŞ STRING geldi ("", null/undefined değil); eski kod `?? 'unknown'` ile
  // bunu yakalamadığı için creator boş string kaldı ve modelSchema'nın
  // min(1) kuralını kırdı (validate:catalog 8 hatayla kırmızı bitti, PR hiç
  // açılmadı). Kaynak boş organization verirse creator 'unknown' olmalı.
  it('organization alanı boş string ise creator "unknown" olur, boş string kalmaz', async () => {
    const routes = {
      '/splits': { splits: [{ config: 'text', split: 'latest' }] },
      'config=text&': {
        num_rows_total: 1,
        rows: [{ row: { model_name: 'kat-coder-pro-v1', organization: '', rating: 1200, rank: 1, category: 'overall' } }],
      },
    };
    const { fetchJson } = fakeFetch(routes);
    const report = newReport();
    const lm = await fetchLmArena({ fetchJson, sleep, arenas: [{ source: 'lmarena', key: 'text', sourceField: 'text' }], today }, report);
    assert.ok(lm);
    assert.strictEqual(lm[0].creator, null, 'boş string ham satırda null\'a normalize edilir');

    const models = mergeModels({ oldModels: [], fresh: lm, succeededSources: new Set(['lmarena']), aliases: {}, linkedModelIds: new Set(), today }, report);
    const model = models.find((m: { id: string }) => m.id === 'kat-coder-pro-v1');
    assert.ok(model);
    assert.strictEqual(model.creator, 'unknown');
  });
});

describe('gece işi yeniden deneme (429/5xx) — retryDelayMs, isRetryableStatus', () => {
  it('429 ve 5xx tekrar denenir; başka 4xx (ör. 404) denenmez', () => {
    assert.strictEqual(isRetryableStatus(429), true);
    assert.strictEqual(isRetryableStatus(500), true);
    assert.strictEqual(isRetryableStatus(503), true);
    assert.strictEqual(isRetryableStatus(404), false);
    assert.strictEqual(isRetryableStatus(401), false);
  });

  it('Retry-After varsa ona uyulur', () => {
    assert.strictEqual(retryDelayMs({ status: 429, attempt: 1, retryAfterSeconds: 12 }), 12_000);
    assert.strictEqual(retryDelayMs({ status: 500, attempt: 1, retryAfterSeconds: 3 }), 3_000);
  });

  it('429: katlanarak artan, 30 sn\'de tavanlanan bekleme (2026-09-28 koşusunda tek seferlik 2 sn yetmedi)', () => {
    assert.strictEqual(retryDelayMs({ status: 429, attempt: 1 }), 5_000);
    assert.strictEqual(retryDelayMs({ status: 429, attempt: 2 }), 10_000);
    assert.strictEqual(retryDelayMs({ status: 429, attempt: 6 }), 30_000);
  });

  it('ağ hatası (status 0) ve 5xx: kısa, katlanarak artan bekleme', () => {
    assert.strictEqual(retryDelayMs({ status: 0, attempt: 1 }), 2_000);
    assert.strictEqual(retryDelayMs({ status: 502, attempt: 2 }), 4_000);
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

// 2026-10-16 gerçek koşusu: LMArena `text` yapılandırmasının bir sayfası 5 denemede de zaman
// aşımına uğradı (offset=9000). Senkron `text`'i atladı ama LMArena'nın TÜM eski skorlarını
// sildi: 621 modelden 294'ü kayboldu, `text` arenasında model kalmadı. Aşağıdaki testler
// "alınamayan arenanın eski skorları korunur" kuralını sabitler.
describe('model senkronu: alınamayan arenanın eski skorları korunur', () => {
  const timeout = new Error('The operation was aborted due to timeout');
  const oldScore = (key: string, value: number) => ({ source: 'lmarena', key, value, fetchedAt: '2026-10-01' });
  const oldModel = (id: string, scores: ReturnType<typeof oldScore>[]) => ({ id, name: id, creator: 'lab', aliases: [], modalities: ['text'], scores });
  const row = (key: string, rawName: string, value: number) => ({
    source: 'lmarena', key, rawName, displayName: rawName, creator: 'lab', modality: 'text', releaseDate: null, pricing: null,
    score: { source: 'lmarena', key, value, fetchedAt: today },
  });

  it('text sayfası zaman aşımına uğrarsa text atlanır, rapora yazılır; diğer arena tazelenir', async () => {
    const { fetchJson } = fakeFetch({ ...hfRoutes, 'config=text&': timeout });
    const report = newReport();
    const lm = await fetchLmArena({ fetchJson, sleep, arenas, today }, report);
    assert.ok(lm);
    assert.deepStrictEqual(report.failedArenas as string[], ['lmarena:text']);
    assert.ok(lm.every((r: { key: string }) => r.key === 'text_to_image'), 'yarım text satırı kullanılmaz');
    assert.ok(report.errors.some((e: string) => e.includes('LMArena text offset=0') && e.includes('timeout')));
  });

  it('birleştirme: keepArenas ile text modelleri ve skorları kalır; eski davranışta (bayrak yok) silinirdi', () => {
    const old = [
      oldModel('text-only', [oldScore('text', 1400)]),
      oldModel('both', [oldScore('text', 1300), oldScore('text_to_image', 1000)]),
      oldModel('image-only-gone', [oldScore('text_to_image', 900)]),
    ];
    const fresh = [row('text_to_image', 'both', 1111)]; // text_to_image başarıyla geldi; 'image-only-gone' sıralamadan düşmüş
    const base = { oldModels: old, fresh, succeededSources: new Set(['lmarena']), aliases: {}, linkedModelIds: new Set<string>(), today };

    const legacy = mergeModels(base, newReport());
    assert.deepStrictEqual(legacy.map((m: { id: string }) => m.id), ['both'], 'bayrak yoksa eski davranış: text-only kaybolur (düzeltilen hata)');

    const report = newReport();
    const kept = mergeModels({ ...base, keepArenas: new Set(['lmarena:text']) }, report);
    assert.deepStrictEqual(kept.map((m: { id: string }) => m.id), ['both', 'text-only'], 'sıra: id\'ye göre');
    assert.deepStrictEqual(report.disappeared, ['image-only-gone'], 'gerçekten sıralamadan düşen model yine silinir');
    const textOnly = kept.find((m: { id: string }) => m.id === 'text-only');
    assert.deepStrictEqual(textOnly?.scores, [{ source: 'lmarena', key: 'text', value: 1400, fetchedAt: '2026-10-01' }], 'eski tarih ve değer aynen kalır, tazeymiş gibi gösterilmez');
    const both = kept.find((m: { id: string }) => m.id === 'both');
    assert.deepStrictEqual(both?.scores.map((s: { key: string; value: number; fetchedAt: string }) => `${s.key}=${s.value}@${s.fetchedAt}`), [`text=1300@2026-10-01`, `text_to_image=1111@${today}`]);
  });

  it('başarılı arenanın eski skoru yine yenisiyle değişir (keepArenas yalnız alınamayanı korur)', () => {
    const old = [oldModel('m', [oldScore('text', 1000), oldScore('text_to_image', 1000)])];
    const out = mergeModels({ oldModels: old, fresh: [row('text', 'm', 1200)], succeededSources: new Set(['lmarena']), aliases: {}, linkedModelIds: new Set<string>(), today, keepArenas: new Set(['lmarena:text_to_image']) }, newReport());
    assert.deepStrictEqual(out[0].scores.map((s: { key: string; value: number }) => `${s.key}=${s.value}`), ['text=1200', 'text_to_image=1000']);
  });

  it('LMArena arenası başarısızlığı her yoldan işaretlenir: split yok, satır yok, alan yok, genel kategori yok', async () => {
    const onlyText = [{ source: 'lmarena', key: 'text', sourceField: 'text' }];
    const cases: Record<string, Record<string, unknown>> = {
      'split yok': { '/splits': { splits: [{ config: 'other', split: 'latest' }] } },
      'satır yok': { '/splits': { splits: [{ config: 'text', split: 'latest' }] }, 'config=text&': { num_rows_total: 0, rows: [] } },
      'alan yok': { '/splits': { splits: [{ config: 'text', split: 'latest' }] }, 'config=text&': { num_rows_total: 1, rows: [{ row: { x: 1 } }] } },
      'genel kategori yok': { '/splits': { splits: [{ config: 'text', split: 'latest' }] }, 'config=text&': { num_rows_total: 1, rows: [{ row: { model_name: 'a', rating: 1, category: 'coding' } }] } },
    };
    for (const [name, routes] of Object.entries(cases)) {
      const report = newReport();
      const out = await fetchLmArena({ fetchJson: fakeFetch(routes).fetchJson, sleep, arenas: onlyText, today }, report);
      assert.strictEqual(out, null, name);
      assert.deepStrictEqual(report.failedArenas as string[], ['lmarena:text'], name);
    }
    const ok = newReport();
    await fetchLmArena({ fetchJson: fakeFetch(hfRoutes).fetchJson, sleep, arenas, today }, ok);
    assert.deepStrictEqual(ok.failedArenas as string[], [], 'başarıda işaret yok');
  });

  it('Artificial Analysis: uç nokta düşerse o uç noktanın arenaları işaretlenir', async () => {
    const report = newReport();
    const { fetchJson } = fakeFetch({ ...aaRoutes, '/data/media/text-to-image': new Error('HTTP 503') });
    const rows = await fetchArtificialAnalysis({ fetchJson, sleep, aaKey: 'k', arenas, today }, report);
    assert.ok(rows && rows.length > 0);
    assert.deepStrictEqual(report.failedArenas as string[], ['artificialanalysis:text-to-image']);
  });

  it('markArenaFailed tekrar eklemez ve failedArenas alanı olmayan rapora da yazar', async () => {
    const { markArenaFailed } = await import('../../scripts/sync/core.mjs');
    const bare: { failedArenas?: string[] } = {};
    markArenaFailed(bare, 'lmarena', 'text');
    markArenaFailed(bare, 'lmarena', 'text');
    assert.deepStrictEqual(bare.failedArenas, ['lmarena:text']);
  });

  it('karar kodu değişmez ama gerekçe ve rapor tazelenemeyen arenayı gösterir', () => {
    const sources = [{ name: 'Artificial Analysis', needsKey: true, hasKey: false, gotData: false }, { name: 'LMArena', needsKey: false, gotData: true }];
    const without = syncExitDecision({ sources, errors: [] });
    const withFailed = syncExitDecision({ sources, errors: ['LMArena text offset=9000: timeout'], failedArenas: ['lmarena:text'] });
    assert.strictEqual(withFailed.code, 0, 'tek arena düşmesi işi kırmızı yapmaz');
    assert.ok(withFailed.reasons.some((r: string) => r.includes('Tazelenemeyen arena (1): lmarena:text') && r.includes('korundu')));
    assert.ok(!without.reasons.some((r: string) => r.includes('Tazelenemeyen')));

    const report = newReport();
    (report.failedArenas as string[]).push('lmarena:text');
    const text = renderReport(report, { models: [], dryRun: false, wrote: true, decision: withFailed });
    assert.match(text, /## Tazelenemeyen arenalar \(eski skorlar korundu\)\n\n- lmarena:text: bu koşuda alınamadı/);
    assert.ok(!renderReport(newReport(), { models: [], dryRun: false, wrote: true, decision: without }).includes('Tazelenemeyen arenalar'));
  });

  it('sync-models.mjs alınamayan arenaları birleştirmeye ve karara iletir', async () => {
    const { readFileSync } = await import('node:fs');
    const src = readFileSync(new URL('../../scripts/sync-models.mjs', import.meta.url), 'utf8');
    assert.ok(src.includes('keepArenas: new Set(report.failedArenas)'));
    assert.ok(src.includes('failedArenas: report.failedArenas'));
  });
});

describe('model senkronu: LMArena alt kategori arenaları (2026-10-18)', () => {
  const textOnly = [{ source: 'lmarena', key: 'text', sourceField: 'text' }];
  const catArenas = [
    { source: 'lmarena', key: 'text/creative_writing', sourceField: 'text', category: 'creative_writing' },
    { source: 'lmarena', key: 'text/non_english', sourceField: 'text', category: 'non_english' },
  ];
  const split = { '/splits': { splits: [{ config: 'text', split: 'latest' }] } };
  const pageOf = (rows: Record<string, unknown>[]) => ({ 'config=text&': { num_rows_total: rows.length, rows: rows.map((row) => ({ row })) } });
  const overallRows = [
    { model_name: 'gpt-5', organization: 'OpenAI', rating: 1450, rating_lower: 1445, rating_upper: 1455, vote_count: 9000, rank: 1, category: 'overall' },
    { model_name: 'other-llm', organization: 'Lab B', rating: 1300, vote_count: 500, rank: 7, category: 'overall' },
  ];
  const catRows = [
    { model_name: 'gpt-5', organization: 'OpenAI', rating: 1510, rating_lower: 1500, rating_upper: 1520, vote_count: 800, rank: 3, category: 'creative_writing' },
    { model_name: 'other-llm', organization: 'Lab B', rating: 1290, vote_count: 90, rank: 9, category: 'creative_writing' },
    { model_name: 'only-in-category', organization: 'Lab C', rating: 1400, category: 'creative_writing' },
    { model_name: 'gpt-5', organization: 'OpenAI', rating: 1480, category: 'non_english' },
  ];
  type Row = { key: string; rawName: string; creator: string | null; score: Record<string, unknown> };
  const byKey = (rows: Row[], key: string) => rows.filter((r) => r.key === key);

  it('kategori satırları kendi anahtarıyla, yalnızca değer olarak çıkar; genel arenada olmayan model atlanır; ekstra istek yok', async () => {
    const routes = { ...split, ...pageOf([...overallRows, ...catRows]) };
    const withCats = fakeFetch(routes);
    const report = newReport();
    const lm = (await fetchLmArena({ fetchJson: withCats.fetchJson, sleep, arenas: textOnly, categoryArenas: catArenas, today }, report)) as Row[];
    assert.ok(lm);
    assert.deepStrictEqual(report.errors, []);
    assert.deepStrictEqual(report.failedArenas as string[], []);

    assert.deepStrictEqual(byKey(lm, 'text').map((r) => r.rawName), ['gpt-5', 'other-llm'], 'genel arena aynen çıkar');
    assert.deepStrictEqual(byKey(lm, 'text')[0].score, { source: 'lmarena', key: 'text', value: 1450, fetchedAt: today, ciLow: 1445, ciHigh: 1455, votes: 9000, rank: 1 }, 'genel arena skoru değişmedi');

    const cw = byKey(lm, 'text/creative_writing');
    assert.deepStrictEqual(cw.map((r) => r.rawName), ['gpt-5', 'other-llm'], "'only-in-category' genel arenada yok: atlanır, yeni model doğmaz");
    assert.deepStrictEqual(cw[0].score, { source: 'lmarena', key: 'text/creative_writing', value: 1510, fetchedAt: today }, 'ci/votes/rank YOK: currentModel rank\'e bakar, dosya küçük kalır');
    assert.strictEqual(cw[0].creator, 'OpenAI');
    assert.deepStrictEqual(byKey(lm, 'text/non_english').map((r) => r.score.value), [1480]);
    assert.ok(report.fieldUse.some((l: string) => l.includes("LMArena text/creative_writing: kategori 'creative_writing' (2/3 satır; genel arenada olmayan 1 model atlandı)")));

    const plain = fakeFetch(routes);
    await fetchLmArena({ fetchJson: plain.fetchJson, sleep, arenas: textOnly, today }, newReport());
    assert.deepStrictEqual(withCats.calls, plain.calls, 'alt kategoriler aynı sayfalardan ayıklanır: ek HTTP isteği yok');
  });

  it('kategorisiz çağrı (categoryArenas yok) eskisi gibi çalışır: yalnızca genel arena satırları', async () => {
    const report = newReport();
    const lm = (await fetchLmArena({ fetchJson: fakeFetch({ ...split, ...pageOf([...overallRows, ...catRows]) }).fetchJson, sleep, arenas: textOnly, today }, report)) as Row[];
    assert.ok(lm.every((r) => r.key === 'text'));
    assert.deepStrictEqual(report.failedArenas as string[], []);
  });

  it('kategoride hiç satır yoksa yalnızca o kategori "alınamadı" olur; genel arena ve diğer kategori etkilenmez', async () => {
    const rows = [...overallRows, catRows[0], catRows[1]]; // non_english yok
    const report = newReport();
    const lm = (await fetchLmArena({ fetchJson: fakeFetch({ ...split, ...pageOf(rows) }).fetchJson, sleep, arenas: textOnly, categoryArenas: catArenas, today }, report)) as Row[];
    assert.ok(lm);
    assert.deepStrictEqual(report.failedArenas as string[], ['lmarena:text/non_english']);
    assert.ok(report.errors.some((e: string) => e.includes('text/non_english') && e.includes('kullanılabilir satır yok')));
    assert.strictEqual(byKey(lm, 'text').length, 2);
    assert.strictEqual(byKey(lm, 'text/creative_writing').length, 2);
    assert.strictEqual(byKey(lm, 'text/non_english').length, 0);
  });

  it('config alınamazsa (zaman aşımı) genel arena VE alt kategorileri birlikte "alınamadı" olur', async () => {
    const report = newReport();
    const out = await fetchLmArena({ fetchJson: fakeFetch({ ...split, 'config=text&': new Error('timeout') }).fetchJson, sleep, arenas: textOnly, categoryArenas: catArenas, today }, report);
    assert.strictEqual(out, null);
    assert.deepStrictEqual([...(report.failedArenas as string[])].sort(), ['lmarena:text', 'lmarena:text/creative_writing', 'lmarena:text/non_english']);
  });

  it('kategori sütunu hiç yoksa alt kategoriler alınamadı sayılır ve eski skorlar korunur; genel arena yine gelir', async () => {
    const rows = [{ model_name: 'gpt-5', rating: 1450 }, { model_name: 'other-llm', rating: 1300 }];
    const report = newReport();
    const lm = (await fetchLmArena({ fetchJson: fakeFetch({ ...split, ...pageOf(rows) }).fetchJson, sleep, arenas: textOnly, categoryArenas: catArenas, today }, report)) as Row[];
    assert.strictEqual(lm.length, 2);
    assert.ok(lm.every((r) => r.key === 'text'));
    assert.deepStrictEqual([...(report.failedArenas as string[])].sort(), ['lmarena:text/creative_writing', 'lmarena:text/non_english']);
    assert.ok(report.errors.some((e: string) => e.includes('kategori sütunu yok')));
  });

  it('Artificial Analysis kategorileri yok sayar: yalnızca source "lmarena" olanlar işlenir', async () => {
    const report = newReport();
    const lm = (await fetchLmArena({ fetchJson: fakeFetch({ ...split, ...pageOf([...overallRows, ...catRows]) }).fetchJson, sleep, arenas: textOnly, categoryArenas: [{ source: 'artificialanalysis', key: 'text/x', sourceField: 'text', category: 'creative_writing' }], today }, report)) as Row[];
    assert.ok(lm.every((r) => r.key === 'text'));
  });

  describe('birleştirme', () => {
    const old = (scores: { key: string; value: number }[]) => [{ id: 'm', name: 'm', creator: 'lab', aliases: [], modalities: ['text'], scores: scores.map((s) => ({ source: 'lmarena', ...s, fetchedAt: '2026-10-01' })) }];
    const fresh = (key: string, value: number) => ({
      source: 'lmarena', key, rawName: 'm', displayName: 'm', creator: 'lab', modality: 'text', releaseDate: null, pricing: null,
      score: { source: 'lmarena', key, value, fetchedAt: today },
    });
    const base = { aliases: {}, linkedModelIds: new Set<string>(), today, succeededSources: new Set(['lmarena']) };
    const show = (models: { scores: { key: string; value: number; fetchedAt: string }[] }[]) => models[0].scores.map((s) => `${s.key}=${s.value}@${s.fetchedAt}`);

    it('kategori skoru aynı modelin skorlarına anahtar sırasıyla eklenir; yeni değer eskisini değiştirir', () => {
      const out = mergeModels({ ...base, oldModels: old([{ key: 'text', value: 1000 }, { key: 'text/creative_writing', value: 1000 }]), fresh: [fresh('text/creative_writing', 1250), fresh('text', 1200)] }, newReport());
      assert.deepStrictEqual(show(out), [`text=1200@${today}`, `text/creative_writing=1250@${today}`]);
    });

    it('kategori alınamadıysa (keepArenas) eski kategori skoru eski tarihiyle kalır, genel skor tazelenir', () => {
      const report = newReport();
      const out = mergeModels({ ...base, oldModels: old([{ key: 'text', value: 1000 }, { key: 'text/creative_writing', value: 1000 }]), fresh: [fresh('text', 1200)], keepArenas: new Set(['lmarena:text/creative_writing']) }, report);
      assert.deepStrictEqual(show(out), [`text=1200@${today}`, 'text/creative_writing=1000@2026-10-01']);
    });

    it('kategori alınamadı diye işaretlenmezse sessizce silinirdi — bu yüzden fetchLmArena her başarısızlığı işaretler', () => {
      const out = mergeModels({ ...base, oldModels: old([{ key: 'text', value: 1000 }, { key: 'text/creative_writing', value: 1000 }]), fresh: [fresh('text', 1200)] }, newReport());
      assert.deepStrictEqual(show(out), [`text=1200@${today}`]);
    });
  });

  it('sync-models.mjs genel arenaları ve alt kategorileri ayrı geçirir', async () => {
    const { readFileSync } = await import('node:fs');
    const src = readFileSync(new URL('../../scripts/sync-models.mjs', import.meta.url), 'utf8');
    assert.ok(src.includes('BENCHMARK_ARENAS.filter((a) => !a.category)'), 'genel arenalar: kategori olmayanlar');
    assert.ok(src.includes('BENCHMARK_ARENAS.filter((a) => a.category)'), 'alt kategori arenaları');
    assert.ok(/const io = \{[^}]*categoryArenas/.test(src), 'io.categoryArenas geçirilir');
  });
});
