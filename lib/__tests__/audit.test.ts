// Katalog denetimi (scripts/audit) ve senkronun alt kategori yardımcıları.
// Veriler elle kurulmuş senaryolardır, gerçek skor değildir.
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import {
  MIN_ARENA_MODELS,
  arenaModelCount,
  auditCoverage,
  augmentContext,
  benchmarkSignature,
  categoryWhatIf,
  formatAuditReport,
  missingReason,
  spearman,
} from '../../scripts/audit/core.mjs';
import { CATEGORY_PROPOSALS } from '../../scripts/audit/proposals.mjs';
import {
  buildCategoryScores,
  collectCategoryRows,
  countCategories,
  fetchLmArena,
  newReport,
  renderReport,
  serializeCategoryScores,
} from '../../scripts/sync/core.mjs';
import { BENCHMARK_ARENAS } from '../catalog/benchmarkKeys';
import { loadCatalog } from '../catalog/index';
import { defaultSearchContext } from '../catalog/search';
import { arenaModels, ctx, product, task } from './catalogFixtures';

const read = (p: string) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');
type Bench = { arena: string; model: string; value: number | null; ciLow: number | null; ciHigh: number | null; rank: number; total: number; percentile: number };
type WhatIfRow = {
  status: string; comparable: number; rho: number | null; topBefore: string[]; topAfter: string[];
  top1Changed: boolean; moved: { name: string; from: number; to: number }[]; lostBenchmark: string[];
  detail: { name: string; from: number; to: number; before: Bench[]; after: Bench[] }[];
  modelChanges: { name: string; from: string[]; to: string[] }[];
  sameModel: { comparable: number; rho: number | null; lost: { name: string; models: string[] }[] };
};
const rowsOf = (r: { rows: unknown[] }) => r.rows as unknown as WhatIfRow[];
const TEXT = [{ source: 'lmarena' as const, key: 'text' }];

/** A'nın en iyi modeli (m0) alt kategoride yok; yalnızca ikinci modeli (m1) var. B=m2, C=m3. */
function swapFixture() {
  const t = task('text.marketing-copy', TEXT);
  return ctx({
    tasks: [t],
    products: [
      product('a', { models: ['m0', 'm1'], tasks: [t.id] }),
      product('b', { models: ['m2'], tasks: [t.id] }),
      product('c', { models: ['m3'], tasks: [t.id] }),
    ],
    models: arenaModels([1500, 1400, 1450, 1300], 'text'),
  });
}
const swapCategories = { source: 'test', fetchedAt: '2026-09-22', configs: { text: { creative_writing: { m1: { value: 1450 }, m2: { value: 1400 }, m3: { value: 1300 } } } } };

/** 3 ürün (A,B,C) -> modeller m0,m1,m2; genel sıra A>B>C. */
function textFixture() {
  const t = task('text.marketing-copy', TEXT);
  return ctx({
    tasks: [t],
    products: [
      product('a', { models: ['m0'], tasks: [t.id] }),
      product('b', { models: ['m1'], tasks: [t.id] }),
      product('c', { models: ['m2'], tasks: [t.id] }),
    ],
    models: arenaModels([1500, 1400, 1300], 'text'),
  });
}
const categoryFile = (creative: [number, number, number]) => ({
  source: 'test',
  fetchedAt: '2026-09-22',
  configs: {
    text: {
      creative_writing: { m0: { value: creative[0] }, m1: { value: creative[1] }, m2: { value: creative[2] } },
    },
  },
});
const PROPOSAL = [{ taskId: 'text.marketing-copy', replace: 'text', use: [{ config: 'text', category: 'creative_writing' }], why: 'test' }];

describe('denetim: kanıt kapsamı', () => {
  it('imza sıradan bağımsızdır; eşlemesi olmayan görev boş imza alır', () => {
    assert.strictEqual(benchmarkSignature(task('x.y', [{ source: 'lmarena', key: 'text' }, { source: 'artificialanalysis', key: 'llm_intelligence' }])), benchmarkSignature(task('x.y', [{ source: 'artificialanalysis', key: 'llm_intelligence' }, { source: 'lmarena', key: 'text' }])));
    assert.strictEqual(benchmarkSignature(task('x.y', [])), '');
  });

  it('çift sayıları, ortak benchmark grubu ve arena veri durumu', () => {
    const t1 = task('text.email', TEXT);
    const t2 = task('text.summarize', TEXT);
    const t3 = task('slides.create', []);
    const t4 = task('audio.tts', [{ source: 'artificialanalysis', key: 'text-to-speech' }]);
    const c = ctx({
      tasks: [t1, t2, t3, t4],
      products: [
        product('a', { models: ['m0'], tasks: ['text.email', 'text.summarize'] }),
        product('b', { models: ['m1'], tasks: ['text.email'] }),
        product('c', { tasks: ['text.email', 'slides.create'] }), // model bağı yok
        product('d', { tasks: ['audio.tts'] }),
      ],
      models: arenaModels([1500, 1400, 1300], 'text'),
    });
    const cov = auditCoverage(c, { editorPicks: [{ taskId: 'slides.create', productId: 'c' }] });
    assert.strictEqual(cov.totals.pairs, 6);
    assert.strictEqual(cov.totals.pairsWithB, 3, 'a(email), a(summarize), b(email)');
    assert.strictEqual(cov.totals.pairsWithE, 0);
    assert.strictEqual(cov.totals.pairsWithOwn, 0);
    assert.strictEqual(cov.totals.tasksWithAnyB, 2);
    assert.strictEqual(cov.totals.tasksComparable, 1, 'yalnızca e-posta görevinde 2 benchmark\'lı ürün var');
    assert.deepStrictEqual(cov.totals.tasksNoMapping, ['slides.create']);
    assert.deepStrictEqual(cov.totals.tasksMappedNoB, ['audio.tts']);
    assert.deepStrictEqual(cov.sharedGroups, [{ signature: 'lmarena:text', tasks: ['text.email', 'text.summarize'] }]);
    const tts = cov.arenas.find((a: { key: string }) => a.key === 'text-to-speech');
    assert.strictEqual(tts.models, 0);
    assert.strictEqual(cov.tasks.find((t: { id: string }) => t.id === 'slides.create')?.editorPick, 'C');
  });

  it('eksik benchmark nedeni: eşleme yok / arenada veri yok / model bağı yok / bağlı model arenada yok', () => {
    const c = ctx({ tasks: [task('t.a', TEXT)], products: [product('x', { tasks: ['t.a'] }), product('y', { models: ['zz'], tasks: ['t.a'] })], models: arenaModels([1, 2], 'text') });
    assert.strictEqual(missingReason(c.products[0], task('t.b', []), c), 'görevin benchmark eşlemesi yok');
    assert.strictEqual(missingReason(c.products[0], c.tasksById.get('t.a'), c), 'ürüne model bağlı değil');
    assert.strictEqual(missingReason(c.products[1], c.tasksById.get('t.a'), c), 'bağlı model bu arenalarda yok');
    const empty = ctx({ tasks: [task('t.a', TEXT)], products: [product('x', { tasks: ['t.a'] })], models: [] });
    assert.strictEqual(missingReason(empty.products[0], empty.tasksById.get('t.a'), empty), 'arenada veri yok');
    assert.strictEqual(arenaModelCount(c, 'lmarena', 'text'), 2);
    assert.ok(MIN_ARENA_MODELS >= 2);
  });

  it('bayat benchmark sayılır (30 günden eski)', () => {
    const t = task('text.email', TEXT);
    const c = ctx({ tasks: [t], products: [product('a', { models: ['m0'], tasks: [t.id] })], models: arenaModels([1500, 1400], 'text', '2026-06-01') });
    const cov = auditCoverage(c);
    assert.strictEqual(cov.totals.stalePairs, 1);
    assert.strictEqual(cov.totals.oldestFetch, '2026-06-01');
  });
});

describe('denetim: sıra korelasyonu', () => {
  it('aynı sıra 1, ters sıra -1, eşitlikte ortalama sıra, tanımsızda null', () => {
    assert.strictEqual(spearman([3, 2, 1], [30, 20, 10]), 1);
    assert.strictEqual(spearman([3, 2, 1], [10, 20, 30]), -1);
    assert.strictEqual(spearman([1, 2, 3], [3, 1, 2]), -0.5);
    assert.strictEqual(spearman([1], [1]), null);
    assert.strictEqual(spearman([5, 5, 5], [1, 2, 3]), null, 'bir tarafta hepsi eşit: tanımsız');
    const tied = spearman([3, 3, 1], [3, 2, 1]);
    assert.ok(tied !== null && tied > 0.8 && tied < 1);
  });
});

describe('denetim: alt kategoriyle "ne olurdu"', () => {
  it('bağlama alt kategori skorlarını ekler, girdiyi değiştirmez', () => {
    const c = textFixture();
    const before = JSON.stringify(c.models);
    const c2 = augmentContext(c, categoryFile([1300, 1500, 1400]));
    assert.strictEqual(JSON.stringify(c.models), before, 'özgün bağlam değişmedi');
    assert.ok(c2.models[0].scores.some((s: { key: string; value: number; source: string }) => s.source === 'lmarena' && s.key === 'text/creative_writing' && s.value === 1300));
    assert.strictEqual(c2.models[0].scores.length, 2);
  });

  it('sıra değişir: korelasyon, yerini değiştirenler, 1. sıra', () => {
    const r = categoryWhatIf({ ctx: textFixture(), categoryFile: categoryFile([1300, 1500, 1400]), proposals: PROPOSAL });
    assert.strictEqual(r.available, true);
    assert.strictEqual(r.ageDays, 2);
    const row = rowsOf(r)[0];
    assert.strictEqual(row.status, 'ok');
    assert.strictEqual(row.comparable, 3);
    assert.strictEqual(row.rho, -0.5);
    assert.deepStrictEqual(row.topBefore, ['A']);
    assert.deepStrictEqual(row.topAfter, ['B']);
    assert.strictEqual(row.top1Changed, true);
    assert.deepStrictEqual(row.moved.map((m: { name: string; from: number; to: number }) => `${m.name}:${m.from}->${m.to}`).sort(), ['A:1->3', 'B:2->1', 'C:3->2']);
    // Ayrıntı: neden böyle sıralandı (temsil modeli, ham puan, sıra/toplam, yüzdelik)
    assert.deepStrictEqual(row.detail.map((d) => `${d.name}:${d.from}->${d.to}`), ['B:2->1', 'C:3->2', 'A:1->3'], 'yeni sıraya göre');
    const a = row.detail.find((d) => d.name === 'A');
    assert.deepStrictEqual(a?.before, [{ arena: 'text', model: 'M0', value: 1500, ciLow: null, ciHigh: null, rank: 1, total: 3, percentile: 1 }]);
    assert.deepStrictEqual(a?.after, [{ arena: 'text/creative_writing', model: 'M0', value: 1300, ciLow: null, ciHigh: null, rank: 3, total: 3, percentile: 0 }]);
  });

  it('temsil modeli aynıysa modelChanges boş; model sabit korelasyonu normal korelasyonla aynı', () => {
    const row = rowsOf(categoryWhatIf({ ctx: textFixture(), categoryFile: categoryFile([1300, 1500, 1400]), proposals: PROPOSAL }))[0];
    assert.deepStrictEqual(row.modelChanges, []);
    assert.deepStrictEqual(row.sameModel, { comparable: 3, rho: -0.5, lost: [] });
  });

  it('en iyi model alt kategoride yoksa ürün başka bir modelle yarışır: modelChanges ve "model sabit" bunu ayırır', () => {
    const row = rowsOf(categoryWhatIf({ ctx: swapFixture(), categoryFile: swapCategories, proposals: PROPOSAL }))[0];
    assert.strictEqual(row.status, 'ok');
    assert.strictEqual(row.comparable, 3);
    assert.strictEqual(row.rho, 1);
    assert.deepStrictEqual(row.modelChanges, [{ name: 'A', from: ['M0'], to: ['M1'] }]);
    // Aynı model (m0) kategoride olmadığı için A "model sabit" karşılaştırmadan düşer; kalanlar B ve C
    assert.deepStrictEqual(row.sameModel, { comparable: 2, rho: 1, lost: [{ name: 'A', models: ['M0'] }] });
  });

  it('ayrıntıda güven aralığı varsa gösterilir (yalnızca genel arenada; alt kategori skorunda aralık yok)', () => {
    const c = textFixture();
    c.models = c.models.map((m) => ({ ...m, scores: m.scores.map((x) => ({ ...x, ciLow: x.value - 5, ciHigh: x.value + 6 })) }));
    const row = rowsOf(categoryWhatIf({ ctx: c, categoryFile: categoryFile([1300, 1500, 1400]), proposals: PROPOSAL }))[0];
    assert.strictEqual(row.detail.find((d) => d.name === 'A')?.before[0].ciLow, 1495);
    assert.strictEqual(row.detail.find((d) => d.name === 'A')?.before[0].ciHigh, 1506);
    assert.strictEqual(row.detail.find((d) => d.name === 'A')?.after[0].ciLow, null);
  });

  it('sıra aynı kalırsa korelasyon 1 ve yer değiştiren yok', () => {
    const row = rowsOf(categoryWhatIf({ ctx: textFixture(), categoryFile: categoryFile([1450, 1400, 1350]), proposals: PROPOSAL }))[0];
    assert.strictEqual(row.rho, 1);
    assert.strictEqual(row.moved.length, 0);
    assert.strictEqual(row.top1Changed, false);
  });

  it('veri yok / kategori yok / görev yok / değiştirilecek girdi yok: uydurma sonuç üretilmez', () => {
    const c = textFixture();
    assert.deepStrictEqual(categoryWhatIf({ ctx: c, categoryFile: null, proposals: PROPOSAL }), { available: false, rows: [] });
    assert.deepStrictEqual(categoryWhatIf({ ctx: c, categoryFile: { fetchedAt: '2026-09-22', configs: {} }, proposals: PROPOSAL }), { available: false, rows: [] });

    const rows = rowsOf(categoryWhatIf({
      ctx: c,
      categoryFile: categoryFile([1300, 1500, 1400]),
      proposals: [
        { taskId: 'text.marketing-copy', replace: 'text', use: [{ config: 'text', category: 'yok_boyle_kategori' }], why: 'x' },
        { taskId: 'olmayan.gorev', replace: 'text', use: [{ config: 'text', category: 'creative_writing' }], why: 'x' },
        { taskId: 'text.marketing-copy', replace: 'webdev', use: [{ config: 'text', category: 'creative_writing' }], why: 'x' },
      ],
    }));
    assert.match(rows[0].status, /kategori yok/);
    assert.strictEqual(rows[1].status, 'görev katalogda yok');
    assert.match(rows[2].status, /değiştirilecek 'webdev' benchmark girdisi yok/);
  });

  it('alt kategoride verisi olmayan ürünün benchmark kaybı not edilir', () => {
    const file = { fetchedAt: '2026-09-22', configs: { text: { creative_writing: { m0: { value: 1300 }, m1: { value: 1500 } } } } }; // m2 yok
    const row = rowsOf(categoryWhatIf({ ctx: textFixture(), categoryFile: file, proposals: PROPOSAL }))[0];
    assert.strictEqual(row.status, 'ok');
    assert.deepStrictEqual(row.lostBenchmark, ['C']);
    assert.strictEqual(row.comparable, 2);
  });

  it('öneri eşlemeleri gerçek katalogla uyumlu: görev var, değiştirilen girdi görevde var, config bilinen bir LMArena arenası', () => {
    const c = loadCatalog();
    const known = new Set<string>(BENCHMARK_ARENAS.filter((a) => a.source === 'lmarena').map((a) => a.key));
    assert.ok(CATEGORY_PROPOSALS.length > 0);
    for (const p of CATEGORY_PROPOSALS) {
      const t = c.tasksById.get(p.taskId);
      assert.ok(t, `${p.taskId} katalogda yok`);
      assert.ok(t.benchmark.some((b) => b.source === 'lmarena' && b.key === p.replace), `${p.taskId}: '${p.replace}' girdisi yok`);
      for (const u of p.use) assert.ok(known.has(u.config), `${p.taskId}: bilinmeyen config ${u.config}`);
      assert.ok(p.why.length > 10);
    }
    assert.strictEqual(new Set(CATEGORY_PROPOSALS.map((p) => p.taskId)).size, CATEGORY_PROPOSALS.length, 'görev başına tek öneri');
  });

  it('öneri kategori adları gerçek veride görülenlerle eşleşir (2026-10-16); doğrulanmamış arena kalmadı', () => {
    // Kaynak: kullanıcının çalıştırdığı `sync:models` raporu, "LMArena kategorileri" bölümü (2026-10-16).
    const observed: Record<string, string[]> = {
      webdev: ['image_to_webdev', 'overall', 'webdev', 'webdev-html', 'webdev-react'],
      text_to_image: ['3d_modeling', 'art', 'cartoon', 'chinese', 'commercial_design', 'english', 'overall', 'photorealistic', 'portraits', 'russian', 'text_rendering'],
      image_edit: ['multi_image_edit', 'overall'],
      // `text`: kullanıcının 2026-10-16 denetim tablosunda bu kategorilerin hepsi veri üretti.
      text: ['creative_writing', 'longer_query', 'instruction_following', 'non_english', 'multi_turn', 'coding'],
    };
    const unverifiedConfigs = new Set<string>();
    for (const p of CATEGORY_PROPOSALS) {
      for (const u of p.use) {
        const seen = observed[u.config];
        if (!seen) { unverifiedConfigs.add(u.config); continue; }
        assert.ok(seen.includes(u.category), `${p.taskId}: '${u.config}/${u.category}' gerçek raporda yok`);
        assert.notStrictEqual(u.category, 'overall', 'genel kategori zaten mevcut benchmark');
      }
    }
    assert.deepStrictEqual([...unverifiedConfigs], [], 'yeni bir arena eklenirse önce gerçek raporda görülmeli');
  });
});

describe('denetim: alt kategori arenaları artık tasks.json\'da (genel arenaya düşme)', () => {
  const CAT_TASK = [{ source: 'lmarena' as const, key: 'text/creative_writing' }, { source: 'lmarena' as const, key: 'text' }];

  it('augmentContext: models.json\'da zaten aynı anahtarlı skor varsa dosyadakini EKLEMEZ (çift sayım yok)', () => {
    const c = textFixture();
    c.models = c.models.map((m, i) => (i === 0 ? { ...m, scores: [...m.scores, { source: 'lmarena' as const, key: 'text/creative_writing', value: 1111, fetchedAt: '2026-10-17' }] } : m));
    const c2 = augmentContext(c, categoryFile([1300, 1500, 1400]));
    const m0 = c2.models[0].scores.filter((x: { key: string }) => x.key === 'text/creative_writing');
    assert.deepStrictEqual(m0.map((x: { value: number }) => x.value), [1111], 'senkronla gelen skor kalır, dosyadaki eklenmez');
    assert.strictEqual(c2.models[1].scores.filter((x: { key: string }) => x.key === 'text/creative_writing').length, 1, 'dosyada olup models.json\'da olmayan eklenir');
  });

  it('missingReason: kategori boşsa ama genel arena doluysa "arenada veri yok" DENMEZ (skor hesabı genel arenaya düşer)', () => {
    const t = task('t.cat', CAT_TASK.slice(0, 1));
    const withParent = ctx({ tasks: [t], products: [product('x', { tasks: ['t.cat'] })], models: arenaModels([1, 2, 3], 'text') });
    assert.strictEqual(missingReason(withParent.products[0], t, withParent), 'ürüne model bağlı değil');
    const none = ctx({ tasks: [t], products: [product('x', { tasks: ['t.cat'] })], models: [] });
    assert.strictEqual(missingReason(none.products[0], t, none), 'arenada veri yok');
  });

  it('kapsam: alt kategorili görevde ürünün benchmark\'ı, kategori verisi yokken genel arenadan hesaplanır', () => {
    const t = task('t.cat', CAT_TASK);
    const c = ctx({ tasks: [t], products: [product('a', { models: ['m0'], tasks: ['t.cat'] })], models: arenaModels([1500, 1400, 1300], 'text') });
    const cov = auditCoverage(c);
    assert.strictEqual(cov.totals.pairsWithB, 1);
    assert.strictEqual(cov.totals.tasksMappedNoB.length, 0);
  });

  it('rapor: verisiz alt kategori "VERİ YOK (genel arenaya düşüyor)", verisiz genel arena yalnızca "VERİ YOK"', () => {
    const t1 = task('t.cat', CAT_TASK);
    const t2 = task('t.web', [{ source: 'lmarena', key: 'webdev' }]);
    const c = ctx({ tasks: [t1, t2], products: [product('a', { models: ['m0'], tasks: ['t.cat', 't.web'] })], models: arenaModels([1500, 1400, 1300], 'text') });
    const text = formatAuditReport({ coverage: auditCoverage(c), whatIf: { available: false, rows: [] }, today: '2026-10-18' });
    assert.match(text, /\| lmarena \| text\/creative_writing \| 0 — VERİ YOK \(genel arenaya düşüyor\) \| 1 \|/);
    assert.match(text, /\| lmarena \| webdev \| 0 — VERİ YOK \| 1 \|/);
    assert.ok(!/webdev \| 0 — VERİ YOK \(genel/.test(text), 'genel arenanın düşeceği yer yok');
  });

  it('rapor "Sınırlar": alt kategorilerin sıralamaya girdiğini söyler, eski "onay olmadan girmez" cümlesi yok', () => {
    const text = formatAuditReport({ coverage: auditCoverage(textFixture()), whatIf: { available: false, rows: [] }, today: '2026-10-18' });
    assert.ok(text.includes("tasks.json'a girmiş alt kategoriler sıralamayı etkiler"));
    assert.ok(!text.includes('Ferit onayı olmadan'));
  });

  it('proposals.mjs yalnızca açık kalanları içerir: code.debug + etkisiz iki webdev önerisi; uygulananlar tasks.json\'da', () => {
    assert.deepStrictEqual(CATEGORY_PROPOSALS.map((p: { taskId: string }) => p.taskId).sort(), ['code.app-builder', 'code.debug', 'code.website-builder']);
    const tasks = loadCatalog().tasksById;
    for (const id of ['text.marketing-copy', 'text.translate', 'chat.general-assistant', 'image.logo', 'design.social-graphic']) {
      assert.ok(tasks.get(id)?.benchmark.some((b) => b.key.includes('/')), `${id}: alt kategori eşlemesi uygulanmış olmalı`);
    }
    assert.ok(tasks.get('code.debug')?.benchmark.every((b) => !b.key.includes('/')), 'code.debug karar bekliyor: dokunulmadı');
  });
});

describe('denetim: gerçek katalogda çalışır ve rapor tutarlı', () => {
  const real = defaultSearchContext(Date.parse('2026-10-16'));
  const labels = new Map(loadCatalog().tasks.map((t) => [t.id, t.label.tr]));

  it('çift sayısı aktif ürün-görev çiftleriyle birebir aynı; rapor NaN/undefined içermez', () => {
    const cov = auditCoverage(real, { editorPicks: loadCatalog().editorPicks });
    const expected = real.products.filter((p) => p.status === 'active').reduce((n, p) => n + p.tasks.length, 0);
    assert.strictEqual(cov.totals.pairs, expected);
    assert.ok(cov.totals.pairsWithB <= cov.totals.pairs);
    const text = formatAuditReport({ coverage: cov, whatIf: { available: false, rows: [] }, today: '2026-10-16', labelOf: (id: string) => labels.get(id) ?? id });
    assert.ok(!/NaN|undefined|\[object/.test(text), 'rapor temiz');
    assert.ok(text.includes('## 5.') && text.includes('npm run sync:models -- --categories'));
    assert.ok(text.includes('Artificial Analysis'), 'kaynak adı görünür');
  });

  it('alt kategori verisi varken rapor tabloyu ve veri tarihini yazar', () => {
    const cov = auditCoverage(textFixture());
    const whatIf = categoryWhatIf({ ctx: textFixture(), categoryFile: categoryFile([1300, 1500, 1400]), proposals: PROPOSAL });
    const text = formatAuditReport({ coverage: cov, whatIf, today: '2026-09-24' });
    assert.match(text, /Veri tarihi: 2026-09-22 \(2 gün önce\)/);
    assert.match(text, /\| text\.marketing-copy \| text\/creative_writing \| 3 \| -0\.5 \| A → B \|/);
    assert.match(text, /### 5b\. Ayrıntı/);
    assert.match(text, /\| A \| 1 → 3 \| text: M0, puan 1500, sıra 1\/3, yüzdelik 1 \| text\/creative_writing: M0, puan 1300, sıra 3\/3, yüzdelik 0 \|/);
    assert.match(text, /gürültü olabilir/);
  });

  it('rapor: temsil modeli değişince ana tabloda * işareti, açıklama ve 5b notu çıkar; model sabit satırı yazılır', () => {
    const cov = auditCoverage(swapFixture());
    const text = formatAuditReport({ coverage: cov, whatIf: categoryWhatIf({ ctx: swapFixture(), categoryFile: swapCategories, proposals: PROPOSAL }), today: '2026-09-24' });
    assert.match(text, /\| text\.marketing-copy \| text\/creative_writing \| 3 \| 1 \* \| değişmedi \(A\) \| yok \|/);
    assert.match(text, /\* Bu görevde en az bir ürünün temsil modeli değişti/);
    assert.match(text, /### 5b\./);
    assert.match(text, /- text\.marketing-copy: sıra aynı kaldı ama temsil modeli değişen ürün var: A \(M0 → M1\)\./);

    // Sırası değişen görevde hem uyarı hem model sabit satırı
    const flipped = formatAuditReport({ coverage: cov, whatIf: categoryWhatIf({ ctx: swapFixture(), categoryFile: { ...swapCategories, configs: { text: { creative_writing: { m1: { value: 1300 }, m2: { value: 1400 }, m3: { value: 1500 } } } } }, proposals: PROPOSAL }), today: '2026-09-24' });
    assert.match(flipped, /Temsil modeli değişen ürünler: A \(M0 → M1\)\. Bu ürünlerde fark kategoriden değil/);
    assert.match(flipped, /Aynı modellerle \(temsil modeli sabit\): karşılaştırılabilir 2, sıra korelasyonu -1; alt kategoride skoru olmayan model: A \(M0\)\./);
    assert.ok(!/NaN|undefined|\[object/.test(flipped));
  });

  it('rapor: temsil modeli değişse de "model sabit" sonucu aynıysa fark arenalardan gelir (model değişimi suçlanmaz)', () => {
    // A'nın bağlı iki modelinden m0 genelde, m4 kategoride daha yüksek; ama m0 da kategoride tersine sıralanıyor.
    const t = task('text.marketing-copy', TEXT);
    const c = ctx({
      tasks: [t],
      products: [product('a', { models: ['m0', 'm4'], tasks: [t.id] }), product('b', { models: ['m2'], tasks: [t.id] }), product('c', { models: ['m3'], tasks: [t.id] })],
      models: arenaModels([1500, 1400, 1450, 1300, 1000], 'text'),
    });
    const file = { source: 'test', fetchedAt: '2026-09-22', configs: { text: { creative_writing: { m0: { value: 1300 }, m2: { value: 1400 }, m3: { value: 1500 }, m4: { value: 1350 } } } } };
    const wi = categoryWhatIf({ ctx: c, categoryFile: file, proposals: PROPOSAL });
    const row = rowsOf(wi)[0];
    assert.strictEqual(row.rho, -1);
    assert.deepStrictEqual(row.modelChanges, [{ name: 'A', from: ['M0'], to: ['M4'] }]);
    assert.deepStrictEqual(row.sameModel, { comparable: 3, rho: -1, lost: [] });
    const text = formatAuditReport({ coverage: auditCoverage(c), whatIf: wi, today: '2026-09-24' });
    assert.match(text, /Temsil modeli değişen ürünler: A \(M0 → M4\)\.\n/);
    assert.ok(!text.includes('farklı modelin karşılaştırılmasından gelebilir'), 'model sabit aynı sonucu verdi: model suçlanmaz');
    assert.match(text, /Aynı modellerle \(temsil modeli sabit\): karşılaştırılabilir 3, sıra korelasyonu -1\. Aynı sonuç: sıra farkı model değişiminden değil, iki arenanın kendisinden geliyor\./);

    // Model değişimi sonucu etkiliyorsa (A modeli kategoride yok) eski uyarı kalır ve "Aynı sonuç" yazılmaz
    const swapped = formatAuditReport({ coverage: auditCoverage(swapFixture()), whatIf: categoryWhatIf({ ctx: swapFixture(), categoryFile: { ...swapCategories, configs: { text: { creative_writing: { m1: { value: 1300 }, m2: { value: 1400 }, m3: { value: 1500 } } } } }, proposals: PROPOSAL }), today: '2026-09-24' });
    assert.ok(swapped.includes('farklı modelin karşılaştırılmasından gelebilir'));
    assert.ok(!swapped.includes('Aynı sonuç:'));
  });

  it('5b: sıra aynıysa ayrıntı bölümü yazılmaz; etkisiz eşleme (karşılaştırılabilir < 2) açıkça belirtilir', () => {
    const same = formatAuditReport({ coverage: auditCoverage(textFixture()), whatIf: categoryWhatIf({ ctx: textFixture(), categoryFile: categoryFile([1450, 1400, 1350]), proposals: PROPOSAL }), today: '2026-09-24' });
    assert.ok(!same.includes('### 5b.'), 'hepsi aynı sıradaysa bölüm yok');

    const t = task('text.marketing-copy', TEXT);
    const lone = ctx({ tasks: [t], products: [product('a', { models: ['m0'], tasks: [t.id] }), product('b', { tasks: [t.id] })], models: arenaModels([1500, 1400, 1300], 'text') });
    const text = formatAuditReport({ coverage: auditCoverage(lone), whatIf: categoryWhatIf({ ctx: lone, categoryFile: categoryFile([1300, 1500, 1400]), proposals: PROPOSAL }), today: '2026-09-24' });
    assert.match(text, /### 5b\./);
    assert.match(text, /text\.marketing-copy: etkisiz — karşılaştırılabilir ürün 1/);
    assert.ok(!/NaN|undefined|\[object/.test(text));
  });
});

describe('senkron: LMArena alt kategori yardımcıları', () => {
  const rows = [
    { model_name: 'GPT 5', rating: 1450, vote_count: 900, category: 'overall' },
    { model_name: 'GPT 5', rating: 1500, vote_count: 400, category: 'coding' },
    { model_name: 'gpt-5', rating: 1490, category: 'coding' }, // aynı model, aynı kategori, ikinci ad: yüksek olan kalır
    { model_name: 'bilinmeyen', rating: 1200, category: 'coding' },
    { model_name: 'GPT 5', rating: 'bozuk', category: 'math' }, // sayı değil: atlanır
    { model_name: 'GPT 5', rating: 1100, category: '' }, // boş kategori: atlanır
  ];
  const fields = { name: 'model_name', score: 'rating', votes: 'vote_count', category: 'category' };

  it('kategori sayımı ada göre sıralı; boş kategori "(boş)" yazılır', () => {
    assert.deepStrictEqual(countCategories(rows, 'category'), [
      { name: '(boş)', rows: 1 }, { name: 'coding', rows: 3 }, { name: 'math', rows: 1 }, { name: 'overall', rows: 1 },
    ]);
  });

  it('yalnızca genel olmayan ve sayısal skorlu satırlar toplanır', () => {
    const collected = collectCategoryRows(rows, { config: 'text', fields });
    assert.deepStrictEqual(collected.map((r: { category: string; rawName: string; value: number }) => `${r.category}:${r.rawName}=${r.value}`), ['coding:GPT 5=1500', 'coding:gpt-5=1490', 'coding:bilinmeyen=1200']);
    assert.strictEqual(collected[0].votes, 400);
    assert.deepStrictEqual(collectCategoryRows(rows, { config: 'text', fields: { name: 'model_name', score: 'rating', category: null } }), [], 'kategori sütunu yoksa boş');
  });

  it('model kimliğine çevirir (ad normalizasyonu + alias), models.json\'da olmayanı atlar, yükseği tutar, sıra kararlı', () => {
    const collected = collectCategoryRows(rows, { config: 'text', fields });
    const { configs, skippedUnknownModel } = buildCategoryScores({ rows: collected, aliases: {}, modelIds: new Set(['gpt-5']) });
    assert.deepStrictEqual(configs, { text: { coding: { 'gpt-5': { value: 1500, votes: 400 } } } });
    assert.strictEqual(skippedUnknownModel, 1);
    const viaAlias = buildCategoryScores({ rows: [{ config: 'text', category: 'coding', rawName: 'Eski Ad', value: 1 }], aliases: { 'eski-ad': 'yeni-model' }, modelIds: new Set(['yeni-model']) });
    assert.deepStrictEqual(Object.keys((viaAlias.configs as Record<string, Record<string, object>>).text.coding), ['yeni-model']);
  });

  it('dosya biçimi geçerli JSON, geri okunur, kategori başına tek satır, aynı girdi aynı çıktı', () => {
    const configs = { text: { coding: { a: { value: 1.5, votes: 2 }, b: { value: 2 } }, math: { a: { value: 3 } } }, webdev: { overall_like: { a: { value: 4 } } } };
    const text = serializeCategoryScores({ fetchedAt: '2026-10-16', configs });
    const parsed = JSON.parse(text);
    assert.deepStrictEqual(parsed.configs, configs);
    assert.strictEqual(parsed.fetchedAt, '2026-10-16');
    assert.ok(text.endsWith('}\n'));
    assert.strictEqual(text.split('\n').filter((l) => l.includes('"coding"')).length, 1);
    assert.strictEqual(serializeCategoryScores({ fetchedAt: '2026-10-16', configs }), text);
    assert.deepStrictEqual(JSON.parse(serializeCategoryScores({ fetchedAt: '2026-10-16', configs: {} })).configs, {});
  });

  const hf = {
    '/splits': { splits: [{ config: 'text', split: 'latest' }, { config: 'text_to_image', split: 'latest' }] },
    'config=text&': { num_rows_total: 4, rows: [
      { row: { model_name: 'm-a', rating: 1500, category: 'overall' } },
      { row: { model_name: 'm-a', rating: 1400, category: 'coding' } },
      { row: { model_name: 'm-b', rating: 1300, category: 'overall' } },
      { row: { model_name: 'm-b', rating: 1350, category: 'coding' } },
    ] },
    'config=text_to_image&': { num_rows_total: 1, rows: [{ row: { model_name: 'img', rating: 1100 } }] },
  };
  const fetchJson = async (url: string) => {
    const hit = Object.entries(hf).find(([k]) => url.includes(k));
    if (!hit) throw new Error('HTTP 404');
    return hit[1];
  };
  const arenas = [{ source: 'lmarena', key: 'text', sourceField: 'text' }, { source: 'lmarena', key: 'text_to_image', sourceField: 'text_to_image' }];

  it('fetchLmArena: kategori listesi her zaman rapora yazılır; alt kategori satırları yalnızca istenirse toplanır; models.json verisi (genel) değişmez', async () => {
    const plainReport = newReport();
    const plain = await fetchLmArena({ fetchJson, sleep: async () => {}, arenas, today: '2026-10-16' }, plainReport);
    const cats = plainReport.categories as Record<string, unknown>;
    assert.deepStrictEqual(cats.text, [{ name: 'coding', rows: 2 }, { name: 'overall', rows: 2 }]);
    assert.deepStrictEqual(cats.text_to_image, [], 'kategori sütunu yok');

    const categoryRows: object[] = [];
    const report = newReport();
    const withCats = await fetchLmArena({ fetchJson, sleep: async () => {}, arenas, today: '2026-10-16', categoryRows }, report);
    assert.deepStrictEqual(categoryRows, [
      { config: 'text', category: 'coding', rawName: 'm-a', value: 1400 },
      { config: 'text', category: 'coding', rawName: 'm-b', value: 1350 },
    ]);
    assert.deepStrictEqual(withCats, plain, 'sıralamaya giren (genel) satırlar istekten bağımsız aynı');
    assert.ok(plain && plain.every((r: { score: { key: string; value: number } }) => r.score.key !== 'text/coding'));
  });

  it('sync raporu kategorileri listeler (kategori yoksa bölüm hiç yazılmaz)', async () => {
    const report = newReport();
    await fetchLmArena({ fetchJson, sleep: async () => {}, arenas, today: '2026-10-16' }, report);
    const text = renderReport(report, { models: [], dryRun: true, wrote: false, decision: { code: 0, reasons: [] } });
    assert.match(text, /## LMArena kategorileri/);
    assert.match(text, /- text: 2 kategori — coding \(2\), overall \(2\)/);
    assert.match(text, /- text_to_image: kategori sütunu yok/);
    assert.ok(!renderReport(newReport(), { models: [], dryRun: true, wrote: false, decision: { code: 0, reasons: [] } }).includes('LMArena kategorileri'));
  });
});

describe('kaynak yapısı (denetim ve alt kategori güvenlik kuralları)', () => {
  it('sync-models: alt kategori dosyası yalnızca --categories ile ve dry-run dışında yazılır; models.json mantığı değişmedi', () => {
    const src = read('scripts/sync-models.mjs');
    assert.ok(src.includes("process.argv.includes('--categories')"));
    const writes = [...src.matchAll(/writeFileSync\(path\.join\(ROOT, '([^']+)'\)/g)].map((m) => m[1]);
    assert.deepStrictEqual(writes.sort(), ['data/lmarena-categories.json', 'data/models.json', 'data/sync-report.md']);
    const catWrite = src.indexOf("writeFileSync(path.join(ROOT, 'data/lmarena-categories.json')");
    const guard = src.indexOf('if (withCategories) {');
    const dry = src.indexOf('if (dryRun) {', guard);
    assert.ok(guard > 0 && dry > guard && catWrite > dry, 'yazma, withCategories ve dry-run dallarından sonra');
  });

  it('audit-catalog: sıralamaya ve models.json\'a yazmaz; tek yazma --write ile data/audit-report.md', () => {
    const src = read('scripts/audit-catalog.mjs');
    const writes = [...src.matchAll(/writeFileSync\(path\.join\(ROOT, '([^']+)'\)/g)].map((m) => m[1]);
    assert.deepStrictEqual(writes, ['data/audit-report.md']);
    assert.strictEqual([...src.matchAll(/writeFileSync\(/g)].length, 1, 'başka yazma çağrısı yok');
    assert.ok(src.indexOf('if (write) {') < src.indexOf('writeFileSync('));
    assert.ok(!/models\.json|tasks\.json|products\.json/.test(src.replace(/\/\/.*$/gm, '')), 'katalog dosyalarına dokunmaz');
    const core = read('scripts/audit/core.mjs');
    assert.ok(!/writeFileSync|fs\.write|unlink|rmSync/.test(core), 'çekirdek dosya yazmaz');
  });
});
