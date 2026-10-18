// Katalog denetiminin çekirdeği — SALT OKUR, hiçbir veri dosyasına yazmaz, sıralamayı değiştirmez.
// CLI: scripts/audit-catalog.mjs (`npm run audit:catalog`).
//
// Sorular:
//  1) Her görevin sıralaması neye dayanıyor? (benchmark, uzman değerlendirmesi, kullanıcı sinyali)
//  2) Hangi görevler AYNI benchmark skorunu paylaşıyor? (özet ile çeviri aynı sıralanıyorsa ayırt edilemiyor)
//  3) Hangi ürünlerin benchmark'ı neden hesaplanamıyor? (model bağı yok mu, arenada mı yok)
//  4) LMArena alt kategorileri kullanılsaydı sıra nasıl değişirdi? (yalnızca "ne olurdu"; öneri eşlemeleriyle)
//
// Skor hesabı lib/catalog/score.ts'in AYNISIDIR (yeniden uygulanmadı): "ne olurdu"
// hesabı, aynı scoreProduct'ı alt kategori skorlarıyla zenginleştirilmiş bir
// bağlamda çalıştırır. Hiçbir sayı uydurulmaz; kaynakta olmayan kategori "yok" yazılır.

import { MIN_ARENA_MODELS as MIN_MODELS, parentArenaKey } from '../../lib/catalog/benchmarkKeys.ts';
import { ageDays, scoreProduct } from '../../lib/catalog/score.ts';
import { FRESH_DAYS } from '../../lib/catalog/weights.ts';

/** Bir arenada karşılaştırma için en az bu kadar model gerekir (score.ts ile AYNI sabit: benchmarkKeys.ts). */
export const MIN_ARENA_MODELS = MIN_MODELS;

const round = (x, d = 3) => Math.round(x * 10 ** d) / 10 ** d;

export function benchmarkSignature(task) {
  return task.benchmark.map((b) => `${b.source}:${b.key}`).sort().join(' + ');
}

const activeFor = (ctx, task) =>
  ctx.products.filter((p) => p.status === 'active' && p.tasks.includes(task.id)).sort((a, b) => a.name.localeCompare(b.name));

/** Bir arenada skoru olan model sayısı. */
export function arenaModelCount(ctx, source, key) {
  return ctx.models.filter((m) => m.scores.some((s) => s.source === source && s.key === key)).length;
}

/**
 * Arenada (alt kategori ise genel arenası dahil: score.ts alt kategoride veri yoksa genel arenaya düşer)
 * karşılaştırmaya yetecek veri var mı?
 */
export function arenaUsable(ctx, source, key) {
  if (arenaModelCount(ctx, source, key) >= MIN_ARENA_MODELS) return true;
  const parent = parentArenaKey(key);
  return parent !== null && arenaModelCount(ctx, source, parent) >= MIN_ARENA_MODELS;
}

/**
 * Benchmark hesaplanamayan ürünün nedeni (insan okuyacak). Önce kaynak sorunu (arenada hiç veri yok:
 * senkron hatası ya da eksik anahtar), sonra bağ sorunu (ürüne model bağlı değil), en son "bağlı model arenada yok".
 */
export function missingReason(product, task, ctx) {
  if (task.benchmark.length === 0) return 'görevin benchmark eşlemesi yok';
  if (ctx && task.benchmark.every((b) => !arenaUsable(ctx, b.source, b.key))) return 'arenada veri yok';
  if ((product.models?.length ?? 0) === 0 && !product.modelRule) return 'ürüne model bağlı değil';
  return 'bağlı model bu arenalarda yok';
}

// ------------------------------------------------------------------
// 1–3: kanıt kapsamı
// ------------------------------------------------------------------

/**
 * @param {import('../../lib/catalog/search.ts').SearchContext} ctx
 * @param {{ editorPicks?: { taskId: string, productId: string }[] }} [options]
 */
export function auditCoverage(ctx, { editorPicks = [] } = {}) {
  const tasks = [];
  let pairs = 0, pairsWithB = 0, pairsWithE = 0, pairsWithOwn = 0, stalePairs = 0;
  let oldestFetch = null;

  for (const task of [...ctx.tasksById.values()].sort((a, b) => a.id.localeCompare(b.id))) {
    const rows = activeFor(ctx, task).map((product) => {
      const s = scoreProduct(product, task, ctx);
      const hasB = s.components.B !== undefined;
      const stale = s.components.benchmarks.some((b) => ageDays(b.fetchedAt, ctx.now) > FRESH_DAYS);
      for (const b of s.components.benchmarks) {
        if (oldestFetch === null || b.fetchedAt < oldestFetch) oldestFetch = b.fetchedAt;
      }
      pairs++;
      if (hasB) pairsWithB++;
      if (s.components.E !== undefined) pairsWithE++;
      if (s.ownN > 0) pairsWithOwn++;
      if (hasB && stale) stalePairs++;
      return { id: product.id, name: product.name, hasB, q: hasB ? s.components.B : null, stale: hasB && stale, reason: hasB ? null : missingReason(product, task, ctx) };
    });
    const pick = editorPicks.find((p) => p.taskId === task.id);
    tasks.push({
      id: task.id,
      label: task.label?.tr ?? task.id,
      signature: benchmarkSignature(task),
      products: rows,
      withB: rows.filter((r) => r.hasB).length,
      editorPick: pick ? (ctx.products.find((p) => p.id === pick.productId)?.name ?? pick.productId) : null,
    });
  }

  const groups = new Map();
  for (const t of tasks) {
    if (!t.signature) continue;
    groups.set(t.signature, [...(groups.get(t.signature) ?? []), t.id]);
  }

  const arenaMap = new Map();
  for (const task of ctx.tasksById.values()) {
    for (const b of task.benchmark) {
      const k = `${b.source}:${b.key}`;
      const entry = arenaMap.get(k) ?? { source: b.source, key: b.key, tasks: [], models: arenaModelCount(ctx, b.source, b.key) };
      entry.tasks.push(task.id);
      arenaMap.set(k, entry);
    }
  }

  return {
    arenas: [...arenaMap.values()].map((a) => ({ ...a, tasks: a.tasks.sort() })).sort((x, y) => x.source.localeCompare(y.source) || x.key.localeCompare(y.key)),
    totals: {
      tasks: tasks.length,
      pairs,
      pairsWithB,
      pairsWithE,
      pairsWithOwn,
      stalePairs,
      oldestFetch,
      tasksWithAnyB: tasks.filter((t) => t.withB >= 1).length,
      tasksComparable: tasks.filter((t) => t.withB >= 2).length,
      tasksNoMapping: tasks.filter((t) => !t.signature).map((t) => t.id),
      tasksMappedNoB: tasks.filter((t) => t.signature && t.withB === 0).map((t) => t.id),
    },
    tasks,
    sharedGroups: [...groups.entries()].filter(([, ids]) => ids.length >= 2).map(([signature, ids]) => ({ signature, tasks: ids })).sort((a, b) => b.tasks.length - a.tasks.length),
  };
}

// ------------------------------------------------------------------
// 4: alt kategori "ne olurdu"
// ------------------------------------------------------------------

/**
 * Alt kategori skorlarını (anahtar `config/kategori`) modellere ekler; yeni bir bağlam döner, girdiyi değiştirmez.
 * Modelin models.json'da zaten aynı anahtarlı skoru varsa (tasks.json'daki kategoriler gece senkronuyla oraya yazılır)
 * dosyadakini EKLEMEZ: aynı skor iki kez sayılmaz.
 */
export function augmentContext(ctx, categoryFile) {
  const extra = new Map();
  const has = new Map(ctx.models.map((m) => [m.id, new Set(m.scores.map((s) => `${s.source}:${s.key}`))]));
  for (const [config, categories] of Object.entries(categoryFile?.configs ?? {})) {
    for (const [category, byModel] of Object.entries(categories)) {
      for (const [modelId, s] of Object.entries(byModel)) {
        if (typeof s?.value !== 'number') continue;
        if (has.get(modelId)?.has(`lmarena:${config}/${category}`)) continue;
        const score = { source: 'lmarena', key: `${config}/${category}`, value: s.value, fetchedAt: categoryFile.fetchedAt };
        if (typeof s.votes === 'number') score.votes = s.votes;
        extra.set(modelId, [...(extra.get(modelId) ?? []), score]);
      }
    }
  }
  return { ...ctx, models: ctx.models.map((m) => (extra.has(m.id) ? { ...m, scores: [...m.scores, ...extra.get(m.id)] } : m)) };
}

/** Eşit değerlere ortalama sıra verir (1 = en büyük). */
function averageRanksDescending(values) {
  const order = values.map((v, i) => ({ v, i })).sort((a, b) => b.v - a.v);
  const ranks = new Array(values.length);
  for (let start = 0; start < order.length; ) {
    let end = start;
    while (end + 1 < order.length && order[end + 1].v === order[start].v) end++;
    const avg = (start + end) / 2 + 1;
    for (let k = start; k <= end; k++) ranks[order[k].i] = avg;
    start = end + 1;
  }
  return ranks;
}

/** Spearman sıra korelasyonu (eşitlikte ortalama sıra). Tanımsızsa (n<2 ya da bir taraf hep eşit) null. */
export function spearman(a, b) {
  if (a.length !== b.length || a.length < 2) return null;
  const ra = averageRanksDescending(a);
  const rb = averageRanksDescending(b);
  const mean = (x) => x.reduce((s, v) => s + v, 0) / x.length;
  const ma = mean(ra), mb = mean(rb);
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < ra.length; i++) {
    num += (ra[i] - ma) * (rb[i] - mb);
    da += (ra[i] - ma) ** 2;
    db += (rb[i] - mb) ** 2;
  }
  if (da === 0 || db === 0) return null;
  return round(num / Math.sqrt(da * db), 3);
}

/**
 * Bir ürünün benchmark bileşenlerini okunur hale getirir: hangi model temsil etti, ham puanı,
 * (varsa) güven aralığı, arenadaki sırası ve yüzdeliği. Neden böyle sıralandığını göstermek için.
 */
function describeBenchmarks(components, models) {
  return components.benchmarks.map((b) => {
    const s = models.find((m) => m.id === b.modelId)?.scores.find((x) => x.source === b.source && x.key === b.arena);
    return {
      arena: b.arena,
      model: b.modelName,
      value: typeof s?.value === 'number' ? round(s.value, 1) : null,
      ciLow: typeof s?.ciLow === 'number' ? round(s.ciLow, 1) : null,
      ciHigh: typeof s?.ciHigh === 'number' ? round(s.ciHigh, 1) : null,
      rank: b.rank,
      total: b.total,
      percentile: round(b.percentile, 3),
    };
  });
}

/** Yarışma sırası (1224): kendinden kesin büyük değer sayısı + 1. */
function competitionRank(qs) {
  return qs.map((q) => 1 + qs.filter((o) => round(o, 4) > round(q, 4)).length);
}

/**
 * @param {{ ctx: object, categoryFile: object | null, proposals: object[] }} input
 * @returns {{ available: boolean, fetchedAt?: string, ageDays?: number, rows: object[] }}
 */
export function categoryWhatIf({ ctx, categoryFile, proposals }) {
  if (!categoryFile || !categoryFile.configs || Object.keys(categoryFile.configs).length === 0) {
    return { available: false, rows: [] };
  }
  const ctx2 = augmentContext(ctx, categoryFile);
  const arenaSize = (key) => ctx2.models.filter((m) => m.scores.some((s) => s.source === 'lmarena' && s.key === key)).length;
  const rows = [];

  for (const proposal of proposals) {
    const base = { taskId: proposal.taskId, why: proposal.why, replace: proposal.replace, use: proposal.use };
    const task = ctx.tasksById.get(proposal.taskId);
    if (!task) { rows.push({ ...base, status: 'görev katalogda yok' }); continue; }
    base.label = task.label?.tr ?? task.id;
    if (!task.benchmark.some((b) => b.source === 'lmarena' && b.key === proposal.replace)) {
      rows.push({ ...base, status: `görevde değiştirilecek '${proposal.replace}' benchmark girdisi yok` });
      continue;
    }
    const missing = proposal.use.filter((u) => arenaSize(`${u.config}/${u.category}`) < MIN_ARENA_MODELS);
    if (missing.length > 0) {
      rows.push({ ...base, status: `kategori yok ya da çok az modelli: ${missing.map((u) => `${u.config}/${u.category}`).join(', ')}` });
      continue;
    }

    const task2 = {
      ...task,
      benchmark: [
        ...task.benchmark.filter((b) => !(b.source === 'lmarena' && b.key === proposal.replace)),
        ...proposal.use.map((u) => ({ source: 'lmarena', key: `${u.config}/${u.category}` })),
      ],
    };
    const products = activeFor(ctx, task);
    const before = products.map((p) => ({ p, s: scoreProduct(p, task, ctx) }));
    // "Sonra" hesabında genel arenaya düşme KAPALI: alt kategoride verisi olmayan ürün burada B'siz kalmalı
    // ve "kaybetti" olarak görünmeli (canlı sitede yedek devreye girer, burada ölçmek istediğimiz kategorinin kendisi).
    const ctxAfter = { ...ctx2, categoryFallback: false };
    const after = products.map((p) => ({ p, s: scoreProduct(p, task2, ctxAfter) }));
    const comparable = products.filter((_, i) => before[i].s.components.B !== undefined && after[i].s.components.B !== undefined);
    const idx = (p) => products.indexOf(p);
    const qb = comparable.map((p) => before[idx(p)].s.components.B);
    const qa = comparable.map((p) => after[idx(p)].s.components.B);
    const rb = competitionRank(qb);
    const ra = competitionRank(qa);
    const moved = comparable
      .map((p, i) => ({ id: p.id, name: p.name, from: rb[i], to: ra[i], qBefore: round(qb[i], 3), qAfter: round(qa[i], 3) }))
      .filter((m) => m.from !== m.to)
      .sort((x, y) => Math.abs(y.to - y.from) - Math.abs(x.to - x.from) || x.name.localeCompare(y.name));
    const topBefore = comparable.filter((_, i) => rb[i] === 1).map((p) => p.name);
    const topAfter = comparable.filter((_, i) => ra[i] === 1).map((p) => p.name);

    // Temsil modeli değişti mi? Ürünü her arenada o arenadaki EN İYİ bağlı modeli temsil eder;
    // yeni model alt kategoride yoksa ürün eski bir modelle yarışır. Bu fark kategoriden değil model değişiminden gelir.
    const modelNames = (components) => [...new Set(components.benchmarks.map((b) => b.modelName))].sort();
    const modelChanges = comparable
      .map((p) => ({ name: p.name, from: modelNames(before[idx(p)].s.components), to: modelNames(after[idx(p)].s.components) }))
      .filter((c) => c.from.join('|') !== c.to.join('|'));

    // "Model sabit": ürünün ÖNCE temsil ettiği model(ler) alt kategoride nasıl sıralanıyor?
    // Kategoride skoru olmayan model B'siz kalır ve listelenir (uydurma yok).
    const fixedProducts = products.map((p, i) => ({
      ...p,
      models: [...new Set(before[i].s.components.benchmarks.map((b) => b.modelId))],
      modelRule: undefined,
    }));
    const afterFixed = fixedProducts.map((p) => scoreProduct(p, task2, ctxAfter));
    const sameIdx = products.map((_, i) => i).filter((i) => before[i].s.components.B !== undefined && afterFixed[i].components.B !== undefined);
    const sameModel = {
      comparable: sameIdx.length,
      rho: spearman(sameIdx.map((i) => before[i].s.components.B), sameIdx.map((i) => afterFixed[i].components.B)),
      lost: products
        .map((p, i) => ({ name: p.name, models: modelNames(before[i].s.components), had: before[i].s.components.B !== undefined, has: afterFixed[i].components.B !== undefined }))
        .filter((x) => x.had && !x.has)
        .map(({ name, models }) => ({ name, models })),
    };

    rows.push({
      ...base,
      status: 'ok',
      comparable: comparable.length,
      rho: spearman(qb, qa),
      moved,
      topBefore,
      topAfter,
      top1Changed: topBefore.join('|') !== topAfter.join('|'),
      modelChanges,
      sameModel,
      detail: comparable
        .map((p, i) => ({
          name: p.name,
          from: rb[i],
          to: ra[i],
          before: describeBenchmarks(before[idx(p)].s.components, ctx.models),
          after: describeBenchmarks(after[idx(p)].s.components, ctx2.models),
        }))
        .sort((x, y) => x.to - y.to || x.name.localeCompare(y.name)),
      gainedBenchmark: products.filter((_, i) => before[i].s.components.B === undefined && after[i].s.components.B !== undefined).map((p) => p.name),
      lostBenchmark: products.filter((_, i) => before[i].s.components.B !== undefined && after[i].s.components.B === undefined).map((p) => p.name),
    });
  }

  return { available: true, fetchedAt: categoryFile.fetchedAt, ageDays: ageDays(categoryFile.fetchedAt, ctx.now), rows };
}

// ------------------------------------------------------------------
// Rapor
// ------------------------------------------------------------------

const pct = (n, d) => (d === 0 ? '—' : `%${Math.round((100 * n) / d)}`);
const list = (xs) => (xs.length > 0 ? xs.join(', ') : '—');

export function formatAuditReport({ coverage, whatIf, today, labelOf = (id) => id }) {
  const t = coverage.totals;
  const lines = ['# Katalog denetim raporu', '', `Üretim tarihi: ${today}. Salt okunur: sıralamayı ve veri dosyalarını değiştirmez.`, ''];

  lines.push('## 1. Özet', '');
  lines.push(`- Aktif ürün-görev çifti: ${t.pairs}. Benchmark'ı olan: ${t.pairsWithB} (${pct(t.pairsWithB, t.pairs)}). Uzman değerlendirmesi olan: ${t.pairsWithE}. Kullanıcı sinyali olan: ${t.pairsWithOwn}.`);
  lines.push(`- Görev: ${t.tasks}. En az bir ürünü benchmark'lı: ${t.tasksWithAnyB}. Karşılaştırılabilir (en az 2 benchmark'lı ürün): ${t.tasksComparable}.`);
  lines.push(`- Benchmark eşlemesi olmayan görev: ${t.tasksNoMapping.length}. Eşlemesi var ama hiçbir ürünün benchmark'ı hesaplanamayan: ${t.tasksMappedNoB.length}.`);
  lines.push(`- Bayat benchmark (${FRESH_DAYS} günden eski) olan çift: ${t.stalePairs}${t.oldestFetch ? `; en eski veri: ${t.oldestFetch}` : ''}.`);
  lines.push('- Şu an sıralamayı belirleyen tek kanıt benchmark\'tır (uzman değerlendirmesi ve kullanıcı sinyali yoksa); benchmark\'ı olmayan çiftler "doğrulanmadı" kalır.');

  lines.push('', '### Arenalar ve veri durumu', '');
  lines.push('| Kaynak | Arena | Veri olan model | Kullanan görev |', '| --- | --- | ---: | ---: |');
  for (const a of coverage.arenas) {
    lines.push(`| ${a.source} | ${a.key} | ${a.models < MIN_ARENA_MODELS ? `${a.models} — VERİ YOK${parentArenaKey(a.key) !== null ? ' (genel arenaya düşüyor)' : ''}` : a.models} | ${a.tasks.length} |`);
  }
  if (t.tasksMappedNoB.length > 0) lines.push('', `Eşlemesi var ama hiçbir ürünün benchmark'ı hesaplanamayan görevler: ${t.tasksMappedNoB.map(labelOf).join(', ')}.`);

  lines.push('', '## 2. Aynı benchmark\'ı paylaşan görevler', '');
  if (coverage.sharedGroups.length === 0) {
    lines.push('- Yok.');
  } else {
    lines.push('Bu görevler aynı skorla sıralanır; benchmark bu işleri birbirinden AYIRT EDEMEZ.', '');
    for (const g of coverage.sharedGroups) lines.push(`- ${g.tasks.length} görev (${g.signature}): ${g.tasks.map(labelOf).join(', ')}`);
  }

  lines.push('', '## 3. Benchmark eşlemesi olmayan görevler', '');
  if (t.tasksNoMapping.length === 0) {
    lines.push('- Yok.');
  } else {
    lines.push('| Görev | Aktif ürün | Editör seçimi |', '| --- | ---: | --- |');
    for (const id of t.tasksNoMapping) {
      const task = coverage.tasks.find((x) => x.id === id);
      lines.push(`| ${labelOf(id)} | ${task.products.length} | ${task.editorPick ?? 'yok'} |`);
    }
  }

  lines.push('', '## 4. Görev görev kanıt durumu', '');
  lines.push('| Görev | Aktif ürün | Benchmark\'lı | Benchmark\'ı olmayanlar (neden) |', '| --- | ---: | ---: | --- |');
  for (const task of coverage.tasks) {
    const without = task.products.filter((p) => !p.hasB);
    const reasons = without.length === 0 ? '—' : without.map((p) => `${p.name} (${p.reason})`).join('; ');
    lines.push(`| ${labelOf(task.id)} | ${task.products.length} | ${task.withB} | ${reasons} |`);
  }

  lines.push('', '## 5. LMArena alt kategorileriyle sıra nasıl değişirdi? (yalnızca hesap; uygulanmadı)', '');
  if (!whatIf.available) {
    lines.push('Alt kategori verisi yok (data/lmarena-categories.json). Üretmek için gerçek ağ erişimi olan bir makinede:', '', '    npm run sync:models -- --categories', '');
  } else {
    lines.push(`Veri tarihi: ${whatIf.fetchedAt} (${whatIf.ageDays} gün önce). Eşlemeler scripts/audit/proposals.mjs'teki ÖNERİLERDİR; tasks.json'a girmez.`, '');
    lines.push('| Görev | Eşleme | Karşılaştırılabilir ürün | Sıra korelasyonu | 1. sıra | Yerini değiştirenler |', '| --- | --- | ---: | ---: | --- | --- |');
    for (const r of whatIf.rows) {
      const use = r.use.map((u) => `${u.config}/${u.category}`).join(' + ');
      if (r.status !== 'ok') {
        lines.push(`| ${r.label ?? labelOf(r.taskId)} | ${use} | — | — | — | ${r.status} |`);
        continue;
      }
      const top = r.top1Changed ? `${list(r.topBefore)} → ${list(r.topAfter)}` : `değişmedi (${list(r.topAfter)})`;
      const moved = r.moved.length === 0 ? 'yok' : r.moved.map((m) => `${m.name} ${m.from}→${m.to}`).join('; ');
      lines.push(`| ${r.label} | ${use} | ${r.comparable} | ${r.rho ?? '—'}${r.modelChanges.length > 0 ? ' *' : ''} | ${top} | ${moved} |`);
    }
    lines.push('', 'Sıra korelasyonu: 1 = sıra aynı, 0 = ilişkisiz, −1 = ters. Yalnızca iki durumda da benchmark\'ı olan ürünler karşılaştırılır.');
    if (whatIf.rows.some((r) => r.status === 'ok' && r.modelChanges.length > 0)) {
      lines.push('* Bu görevde en az bir ürünün temsil modeli değişti (yeni model alt kategoride yoksa ürün eski bir modelle yarışır); fark kategoriden değil model değişiminden gelebilir. 5b\'ye bak.');
    }
    const notes = whatIf.rows.filter((r) => r.status === 'ok' && (r.gainedBenchmark.length > 0 || r.lostBenchmark.length > 0));
    for (const r of notes) {
      if (r.gainedBenchmark.length > 0) lines.push(`- ${r.label}: alt kategoriyle benchmark'ı yeni hesaplanabilen: ${r.gainedBenchmark.join(', ')}`);
      if (r.lostBenchmark.length > 0) lines.push(`- ${r.label}: alt kategoride verisi olmadığı için benchmark'ı kaybolan: ${r.lostBenchmark.join(', ')}`);
    }

    // 5b: sırası değişen ya da korelasyonu 1'den düşük görevlerde "neden" ayrıntısı.
    const differing = whatIf.rows.filter((r) => r.status === 'ok' && r.comparable >= 2 && (r.top1Changed || r.rho === null || r.rho < 1));
    const noOp = whatIf.rows.filter((r) => r.status === 'ok' && r.comparable < 2);
    const modelOnly = whatIf.rows.filter((r) => r.status === 'ok' && r.comparable >= 2 && !differing.includes(r) && r.modelChanges.length > 0);
    if (differing.length > 0 || noOp.length > 0 || modelOnly.length > 0) {
      lines.push('', '### 5b. Ayrıntı: sırası değişen görevler ve etkisiz kalan eşlemeler', '');
    }
    const changesText = (cs) => cs.map((c) => `${c.name} (${c.from.join(', ')} → ${c.to.join(', ')})`).join('; ');
    // "Model sabit" sonucu normal sonuçla aynıysa fark model değişiminden değil arenaların kendisinden gelir.
    const confirmed = (r) => r.sameModel.lost.length === 0 && r.sameModel.comparable === r.comparable && r.sameModel.rho === r.rho;
    const sameModelText = (r) => {
      const sm = r.sameModel;
      const base = `Aynı modellerle (temsil modeli sabit): karşılaştırılabilir ${sm.comparable}, sıra korelasyonu ${sm.rho ?? '—'}${sm.lost.length > 0 ? `; alt kategoride skoru olmayan model: ${sm.lost.map((x) => `${x.name} (${x.models.join(', ')})`).join('; ')}` : ''}.`;
      return confirmed(r) ? `${base} Aynı sonuç: sıra farkı model değişiminden değil, iki arenanın kendisinden geliyor.` : base;
    };
    const fmt = (ds) => (ds.length === 0 ? '—' : ds.map((d) => {
      const ci = d.ciLow !== null && d.ciHigh !== null ? ` [${d.ciLow}–${d.ciHigh}]` : '';
      return `${d.arena}: ${d.model}, puan ${d.value ?? '—'}${ci}, sıra ${d.rank}/${d.total}, yüzdelik ${d.percentile}`;
    }).join('; '));
    for (const r of differing) {
      lines.push(`**${r.label}** (${r.use.map((u) => `${u.config}/${u.category}`).join(' + ')}): önce → sonra`, '');
      lines.push('| Ürün | Sıra | Önce | Sonra |', '| --- | --- | --- | --- |');
      for (const d of r.detail) lines.push(`| ${d.name} | ${d.from} → ${d.to} | ${fmt(d.before)} | ${fmt(d.after)} |`);
      lines.push('');
      if (r.modelChanges.length > 0) lines.push(`Temsil modeli değişen ürünler: ${changesText(r.modelChanges)}.${confirmed(r) ? '' : ' Bu ürünlerde fark kategoriden değil, farklı modelin karşılaştırılmasından gelebilir.'}`, '');
      lines.push(sameModelText(r), '');
    }
    for (const r of modelOnly) {
      lines.push(`- ${r.label}: sıra aynı kaldı ama temsil modeli değişen ürün var: ${changesText(r.modelChanges)}.`);
    }
    if (differing.length > 0) {
      lines.push('Not: yüzdelik üst sıralarda sıkışır. Puan farkı güven aralığının içindeyse sıra değişimi gürültü olabilir; ham puanlara ve aralıklara bak.');
    }
    for (const r of noOp) {
      lines.push(`- ${r.label}: etkisiz — karşılaştırılabilir ürün ${r.comparable}; bu eşleme sıralamayı değiştiremez (ürünlerin çoğunun bu arenada bağlı modeli yok).`);
    }
  }

  lines.push('', '## 6. Sınırlar', '');
  lines.push('- LMArena genel insan tercihidir; belirli bir iş için "en iyi"yi kanıtlamaz. Alt kategoriler daha yakın bir vekildir, ama yine vekildir.');
  lines.push('- Kategori eşlemeleri bir yargıdır. tasks.json\'a girmiş alt kategoriler sıralamayı etkiler (kategoride veri yoksa genel arenaya düşer); bu raporun "ne olurdu" önerileri ise henüz girmemiştir ve sıralamayı değiştirmez. Türkçe için LMArena\'da ayrı kategori görülmedi; Türkçe başarımı hakkında iddia kurulamaz.');
  lines.push('- Bu rapor yalnızca eldeki veriyi sayar; yeni skor ya da sıralama üretmez.');
  lines.push('', 'Kaynak ve lisans: benchmark verisi LMArena (lmarena.ai) ve Artificial Analysis (artificialanalysis.ai) kaynaklıdır; gösterilirken kaynak adı görünür olmalı.');
  return `${lines.join('\n')}\n`;
}
