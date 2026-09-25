// Gece model senkronunun çekirdeği — ağ ve dosya erişimi DIŞARIDAN verilir
// (fetchJson, sleep), böylece testte sahte yanıtlarla çalıştırılabilir.
// CLI: scripts/sync-models.mjs.
//
// İlke: değer SADECE kaynağın yanıtındaki bir alandan gelir. Alan yoksa değer
// yazılmaz ve rapora "alan bulunamadı" hatası düşer. Hangi aday alanın
// kullanıldığı rapora yazılır; ilk gerçek koşuda oradan doğrulanır.

export const AA_BASE = 'https://artificialanalysis.ai/api/v2';
export const HF_BASE = 'https://datasets-server.huggingface.co';
export const LMARENA_DATASET = 'lmarena-ai/leaderboard-dataset';
export const LMARENA_SPLIT = 'latest';

/**
 * @typedef {{ source: string, key: string, value: number, ciLow?: number, ciHigh?: number,
 *   votes?: number, rank?: number, fetchedAt: string }} SyncedScore
 * @typedef {{ id: string, name: string, creator: string, aliases: string[], modalities: string[],
 *   releaseDate?: string, scores: SyncedScore[],
 *   pricing?: { inputPerMTok?: number, outputPerMTok?: number, source: string, fetchedAt: string } }} SyncedModel
 */

/** fetchedAt bu günden eskiyse, değer değişmese de tazelenir. */
export const REFRESH_UNCHANGED_AFTER_DAYS = 7;

// LMArena satırlarında aranacak alan adları (ilk bulunan kullanılır, rapora yazılır).
export const LMARENA_FIELDS = {
  name: ['model_name', 'model', 'name', 'model_id'],
  organization: ['organization', 'org', 'model_organization', 'provider'],
  score: ['rating', 'score', 'arena_score', 'elo'],
  ciLow: ['rating_q025', 'rating_lower', 'ci_lower', 'lower'],
  ciHigh: ['rating_q975', 'rating_upper', 'ci_upper', 'upper'],
  votes: ['vote_count', 'votes', 'num_votes', 'num_battles'],
  rank: ['rank', 'ranking', 'rank_ub'],
  releaseDate: ['release_date', 'released', 'model_release_date'],
  category: ['category', 'subset'],
};
/** Kategori sütunu varsa sıralamanın "genel" satırı bu değerlerden ilki. */
export const LMARENA_OVERALL = ['overall', 'full', 'default', 'text'];

const LMARENA_MODALITY = {
  text: 'text', webdev: 'code', search: 'research', document: 'text',
  text_to_image: 'image', image_edit: 'image', text_to_video: 'video', image_to_video: 'video', video_edit: 'video',
};
const AA_MODALITY = {
  '/data/llms/models': 'text',
  '/data/media/text-to-image': 'image',
  '/data/media/image-editing': 'image',
  '/data/media/text-to-video': 'video',
  '/data/media/image-to-video': 'video',
  '/data/media/text-to-speech': 'audio',
};

// ------------------------------------------------------------------
// Saf yardımcılar
// ------------------------------------------------------------------

/** Küçük harf; boşluk, nokta, tire ve diğer ayırıcılar tek '-'. */
export function normalizeModelKey(s) {
  return String(s ?? '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function getPath(obj, dotted) {
  return dotted.split('.').reduce((o, k) => (o && typeof o === 'object' ? o[k] : undefined), obj);
}

export function toNumber(v) {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))) return Number(v);
  return null;
}

function toPositiveInt(v) {
  const n = toNumber(v);
  return n !== null && Number.isInteger(n) && n > 0 ? n : null;
}

function toNonNegInt(v) {
  const n = toNumber(v);
  return n !== null && Number.isInteger(n) && n >= 0 ? n : null;
}

/** YYYY-MM-DD'ye indirger; tanınmayan biçimde null. */
export function toDate(v) {
  if (typeof v !== 'string') return null;
  const m = v.match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : null;
}

/**
 * AA ci95: sayı (simetrik) ya da "-5/+6" biçiminde metin olabilir.
 * Tanınmayan biçimde null (sınır yazılmaz).
 */
export function parseCi95(ci, center) {
  if (center === null) return null;
  const n = toNumber(ci);
  if (n !== null) return { ciLow: center - Math.abs(n), ciHigh: center + Math.abs(n) };
  if (typeof ci === 'string') {
    const m = ci.match(/^\s*([-+]?\d+(?:\.\d+)?)\s*\/\s*\+?(\d+(?:\.\d+)?)\s*$/);
    if (m) return { ciLow: center - Math.abs(Number(m[1])), ciHigh: center + Math.abs(Number(m[2])) };
  }
  return null;
}

/** Satırda ilk bulunan aday alanın adı; hiçbiri yoksa null. */
export function resolveField(rows, candidates) {
  for (const name of candidates) {
    if (rows.some((r) => r && r[name] !== undefined && r[name] !== null)) return name;
  }
  return null;
}

function daysBetween(a, b) {
  return Math.abs(Date.parse(b) - Date.parse(a)) / 86400000;
}

// ------------------------------------------------------------------
// Kaynaklardan ham skor satırları: { source, key, rawName, creator, modality, score{...}, releaseDate, pricing? }
// ------------------------------------------------------------------

/**
 * @param {{ fetchJson: (url: string, init?: object) => Promise<any>, sleep: (ms: number) => Promise<void>,
 *   aaKey?: string, arenas: {source: string, key: string, sourceField: string}[], today: string }} io
 */
export async function fetchArtificialAnalysis({ fetchJson, sleep, aaKey, arenas, today }, report) {
  const out = [];
  if (!aaKey) {
    report.skipped.push('Artificial Analysis: AA_API_KEY yok, atlandı (eski veri korunur)');
    return null;
  }
  const byEndpoint = new Map();
  for (const a of arenas.filter((x) => x.source === 'artificialanalysis')) {
    const [endpoint, field] = a.sourceField.split('#');
    if (!byEndpoint.has(endpoint)) byEndpoint.set(endpoint, []);
    byEndpoint.get(endpoint).push({ key: a.key, field });
  }

  let anyOk = false;
  for (const [endpoint, fields] of byEndpoint) {
    await sleep(1000);
    let body;
    try {
      body = await fetchJson(`${AA_BASE}${endpoint}`, { headers: { 'x-api-key': aaKey } });
    } catch (error) {
      report.errors.push(`AA ${endpoint}: ${error?.message ?? error}`);
      continue;
    }
    const rows = Array.isArray(body?.data) ? body.data : Array.isArray(body) ? body : null;
    if (!rows) {
      report.errors.push(`AA ${endpoint}: yanıtta 'data' dizisi yok (üst düzey alanlar: ${Object.keys(body ?? {}).join(', ')})`);
      continue;
    }
    report.sample[`AA ${endpoint}`] = Object.keys(rows[0] ?? {});
    anyOk = true;

    for (const { key, field } of fields) {
      let found = 0;
      for (const row of rows) {
        const value = toNumber(getPath(row, field));
        const rawName = row?.slug ?? row?.name;
        if (value === null || !rawName) continue;
        found++;
        const ci = field.endsWith('elo') ? parseCi95(row?.ci95, value) : null;
        const score = { source: 'artificialanalysis', key, value, fetchedAt: today };
        if (ci) Object.assign(score, ci);
        const votes = toNonNegInt(row?.appearances);
        if (votes !== null && field.endsWith('elo')) score.votes = votes;
        const rank = toPositiveInt(row?.rank);
        if (rank !== null && field.endsWith('elo')) score.rank = rank;
        out.push({
          source: 'artificialanalysis',
          key,
          rawName: String(rawName),
          displayName: String(row?.name ?? rawName),
          creator: row?.model_creator?.name ?? null,
          modality: AA_MODALITY[endpoint],
          releaseDate: toDate(row?.release_date),
          pricing: endpoint === '/data/llms/models' ? aaPricing(row?.pricing, today) : null,
          score,
        });
      }
      report.fieldUse.push(`AA ${key}: ${endpoint} → ${field} (${found}/${rows.length} satırda sayı)`);
      if (found === 0) {
        const available = Object.keys(getPath(rows[0] ?? {}, field.split('.').slice(0, -1).join('.')) ?? rows[0] ?? {});
        report.errors.push(`AA ${key}: '${field}' alanı hiçbir satırda yok; mevcut alanlar: ${available.join(', ')}`);
      }
    }
  }
  return anyOk ? out : null;
}

function aaPricing(p, today) {
  if (!p || typeof p !== 'object') return null;
  const input = toNumber(p.price_1m_input_tokens);
  const output = toNumber(p.price_1m_output_tokens);
  if (input === null && output === null) return null;
  const pricing = { source: 'artificialanalysis', fetchedAt: today };
  if (input !== null && input >= 0) pricing.inputPerMTok = input;
  if (output !== null && output >= 0) pricing.outputPerMTok = output;
  return pricing;
}

/** LMArena (Hugging Face datasets-server). Başarılı config'ler için satırlar; hiçbiri yoksa null. */
export async function fetchLmArena({ fetchJson, sleep, arenas, today }, report) {
  const out = [];
  let splits;
  try {
    splits = await fetchJson(`${HF_BASE}/splits?dataset=${encodeURIComponent(LMARENA_DATASET)}`);
  } catch (error) {
    report.errors.push(`LMArena /splits: ${error?.message ?? error}`);
    return null;
  }
  const available = new Set((splits?.splits ?? []).map((s) => `${s.config}/${s.split}`));
  report.sample['LMArena configs'] = [...new Set((splits?.splits ?? []).map((s) => `${s.config}/${s.split}`))];

  let anyOk = false;
  for (const arena of arenas.filter((a) => a.source === 'lmarena')) {
    const config = arena.sourceField;
    if (!available.has(`${config}/${LMARENA_SPLIT}`)) {
      report.errors.push(`LMArena ${config}: '${LMARENA_SPLIT}' split'i yok`);
      continue;
    }
    const rows = [];
    let total = Infinity;
    let failed = false;
    for (let offset = 0; offset < total; offset += 100) {
      await sleep(1000);
      let page;
      try {
        page = await fetchJson(`${HF_BASE}/rows?dataset=${encodeURIComponent(LMARENA_DATASET)}&config=${encodeURIComponent(config)}&split=${LMARENA_SPLIT}&offset=${offset}&length=100`);
      } catch (error) {
        report.errors.push(`LMArena ${config} offset=${offset}: ${error?.message ?? error}`);
        failed = true;
        break;
      }
      total = Number.isFinite(page?.num_rows_total) ? page.num_rows_total : 0;
      for (const r of page?.rows ?? []) rows.push(r.row ?? r);
      if ((page?.rows ?? []).length === 0) break;
    }
    if (failed || rows.length === 0) {
      if (!failed) report.errors.push(`LMArena ${config}: satır yok`);
      continue;
    }

    const f = Object.fromEntries(Object.entries(LMARENA_FIELDS).map(([k, c]) => [k, resolveField(rows, c)]));
    report.sample[`LMArena ${config}`] = Object.keys(rows[0] ?? {});
    report.fieldUse.push(`LMArena ${config}: ${Object.entries(f).map(([k, v]) => `${k}=${v ?? '—'}`).join(', ')}`);
    if (!f.name || !f.score) {
      report.errors.push(`LMArena ${config}: model adı ya da skor alanı bulunamadı; mevcut alanlar: ${Object.keys(rows[0] ?? {}).join(', ')}`);
      continue;
    }

    let selected = rows;
    if (f.category) {
      const categories = new Set(rows.map((r) => r[f.category]));
      const overall = LMARENA_OVERALL.find((c) => categories.has(c));
      if (!overall) {
        report.errors.push(`LMArena ${config}: genel kategori bulunamadı; kategoriler: ${[...categories].slice(0, 20).join(', ')}`);
        continue;
      }
      selected = rows.filter((r) => r[f.category] === overall);
      report.fieldUse.push(`LMArena ${config}: kategori '${overall}' (${selected.length}/${rows.length} satır)`);
    }

    anyOk = true;
    for (const row of selected) {
      const value = toNumber(row[f.score]);
      const rawName = row[f.name];
      if (value === null || !rawName) continue;
      const score = { source: 'lmarena', key: arena.key, value, fetchedAt: today };
      const lo = f.ciLow ? toNumber(row[f.ciLow]) : null;
      const hi = f.ciHigh ? toNumber(row[f.ciHigh]) : null;
      if (lo !== null && hi !== null) Object.assign(score, { ciLow: lo, ciHigh: hi });
      const votes = f.votes ? toNonNegInt(row[f.votes]) : null;
      if (votes !== null) score.votes = votes;
      const rank = f.rank ? toPositiveInt(row[f.rank]) : null;
      if (rank !== null) score.rank = rank;
      out.push({
        source: 'lmarena',
        key: arena.key,
        rawName: String(rawName),
        displayName: String(rawName),
        creator: f.organization ? row[f.organization] ?? null : null,
        modality: LMARENA_MODALITY[config],
        releaseDate: f.releaseDate ? toDate(row[f.releaseDate]) : null,
        pricing: null,
        score,
      });
    }
  }
  return anyOk ? out : null;
}

// ------------------------------------------------------------------
// Birleştirme
// ------------------------------------------------------------------

/**
 * Eski modeller + başarılı kaynaklardan gelen taze satırlar -> yeni models dizisi.
 * Başarısız kaynağın eski skorları KORUNUR. Ürünlere bağlı model skoru
 * kalmasa bile silinmez (rapora yazılır).
 */
/** @returns {SyncedModel[]} */
export function mergeModels({ oldModels, fresh, succeededSources, aliases, linkedModelIds, today }, report) {
  const canonical = (raw) => {
    const k = normalizeModelKey(raw);
    return aliases[k] ?? k;
  };
  const oldById = new Map(oldModels.map((m) => [m.id, m]));
  const byId = new Map();

  // 1) Eski modeller: başarılı kaynakların skorları çıkarılır (yenisi gelecek).
  for (const m of oldModels) {
    byId.set(m.id, {
      ...m,
      aliases: [...m.aliases],
      modalities: [...m.modalities],
      scores: m.scores.filter((s) => !succeededSources.has(s.source)),
      pricing: succeededSources.has('artificialanalysis') ? undefined : m.pricing,
    });
  }

  // 2) Taze satırlar
  for (const row of fresh) {
    const id = canonical(row.rawName);
    if (!id) continue;
    let model = byId.get(id);
    if (!model) {
      model = { id, name: row.displayName, creator: row.creator ?? 'unknown', aliases: [], modalities: [], scores: [] };
      byId.set(id, model);
    }
    if (row.displayName !== model.name && !model.aliases.includes(row.displayName)) model.aliases.push(row.displayName);
    if (row.rawName !== model.name && row.rawName !== row.displayName && !model.aliases.includes(row.rawName)) model.aliases.push(row.rawName);
    if (model.creator === 'unknown' && row.creator) model.creator = String(row.creator);
    if (row.modality && !model.modalities.includes(row.modality)) model.modalities.push(row.modality);
    if (row.releaseDate && !model.releaseDate) model.releaseDate = row.releaseDate;
    if (row.pricing) model.pricing = row.pricing;

    // Aynı (source, key) iki kez geldiyse (iki ad aynı kanonik id'ye düştü) yüksek olan kalır, rapora yazılır.
    const dup = model.scores.find((s) => s.source === row.score.source && s.key === row.score.key);
    if (dup) {
      report.warnings.push(`${id}: ${row.score.source}:${row.score.key} iki kez geldi (${dup.value} / ${row.score.value}); yüksek olan tutuldu`);
      if (row.score.value > dup.value) Object.assign(dup, row.score);
      continue;
    }

    // Değer değişmediyse ve fetchedAt taze ise eski tarihi koru (gereksiz diff yok).
    const prev = oldById.get(id)?.scores.find((s) => s.source === row.score.source && s.key === row.score.key);
    const score = { ...row.score };
    if (prev && sameScore(prev, score) && daysBetween(prev.fetchedAt, today) < REFRESH_UNCHANGED_AFTER_DAYS) {
      score.fetchedAt = prev.fetchedAt;
    }
    model.scores.push(score);
  }

  // 3) Skoru kalmayan modeller
  const result = [];
  for (const m of byId.values()) {
    if (m.pricing === undefined) delete m.pricing;
    if (m.scores.length === 0) {
      if (linkedModelIds.has(m.id)) {
        report.warnings.push(`${m.id}: hiçbir kaynakta skoru kalmadı ama bir ürüne bağlı; silinmedi`);
      } else {
        if (oldById.has(m.id)) report.disappeared.push(m.id);
        continue;
      }
    }
    if (!oldById.has(m.id)) report.added.push(m.id);
    result.push(stable(m));
  }
  return result.sort((a, b) => a.id.localeCompare(b.id));
}

function sameScore(a, b) {
  return ['value', 'ciLow', 'ciHigh', 'votes', 'rank'].every((k) => a[k] === b[k]);
}

/**
 * Kararlı alan sırası ve sıralı alt diziler: sadece değişen alanlar diff üretsin.
 * @returns {SyncedModel}
 */
function stable(m) {
  /** @type {SyncedModel} */
  const out = {
    id: m.id,
    name: m.name,
    creator: m.creator,
    aliases: [...new Set(m.aliases)].sort(),
    modalities: [...new Set(m.modalities)].sort(),
    scores: [],
  };
  if (m.releaseDate) out.releaseDate = m.releaseDate;
  out.scores = [...m.scores]
    .sort((a, b) => a.source.localeCompare(b.source) || a.key.localeCompare(b.key))
    .map((s) => {
      const o = { source: s.source, key: s.key, value: s.value };
      for (const k of ['ciLow', 'ciHigh', 'votes', 'rank']) if (s[k] !== undefined) o[k] = s[k];
      o.fetchedAt = s.fetchedAt;
      return o;
    });
  if (m.pricing) {
    const p = {};
    if (m.pricing.inputPerMTok !== undefined) p.inputPerMTok = m.pricing.inputPerMTok;
    if (m.pricing.outputPerMTok !== undefined) p.outputPerMTok = m.pricing.outputPerMTok;
    p.source = m.pricing.source;
    p.fetchedAt = m.pricing.fetchedAt;
    out.pricing = p;
  }
  return out;
}

/** Tek kaynaktan gelen ve adı diğer kaynaktaki bir modelin önekiyle eşleşen modeller (alias adayı). */
export function aliasCandidates(models) {
  const only = (src) => models.filter((m) => m.scores.length > 0 && m.scores.every((s) => s.source === src));
  const aa = only('artificialanalysis');
  const lm = only('lmarena');
  const pairs = [];
  for (const a of aa) {
    for (const l of lm) {
      if (l.id.startsWith(`${a.id}-`) || a.id.startsWith(`${l.id}-`)) pairs.push(`${l.id} ↔ ${a.id}`);
    }
  }
  return pairs.sort();
}

// ------------------------------------------------------------------
// Ürün -> model önerisi (scripts/link-products.mjs)
// ------------------------------------------------------------------

// Tek başına anlamsız kelimeler: bunlardan oluşan model adı ürün adına eşlenmez.
const GENERIC = new Set(['ai', 'pro', 'image', 'video', 'chat', 'studio', 'app', 'agent', 'model', 'lite', 'mini', 'plus']);

const modelTokens = (s) => normalizeModelKey(s).split('-').filter(Boolean);

function containsSequence(haystack, needle) {
  if (needle.length === 0 || needle.length > haystack.length) return false;
  for (let i = 0; i + needle.length <= haystack.length; i++) {
    if (needle.every((t, j) => haystack[i + j] === t)) return true;
  }
  return false;
}

function isSpecific(needle) {
  if (needle.every((t) => GENERIC.has(t))) return false;
  return needle.length >= 2 || needle[0].length >= 4;
}

export function suggestModels(product, models) {
  const nameTokens = modelTokens(product.name);
  return models.filter((m) =>
    [m.id, m.name, ...m.aliases].some((n) => {
      const t = modelTokens(n);
      return isSpecific(t) && containsSequence(nameTokens, t);
    })
  );
}

export function newReport() {
  return { errors: [], warnings: [], skipped: [], fieldUse: [], sample: {}, added: [], disappeared: [], fetchedAt: {} };
}

export function renderReport(report, { models, dryRun, wrote }) {
  const lines = ['# Model senkron raporu', ''];
  lines.push(`Durum: ${dryRun ? 'DRY RUN (dosya yazılmadı)' : wrote ? 'data/models.json güncellendi' : 'data/models.json DEĞİŞTİRİLMEDİ'}`);
  lines.push('', '## Kaynaklar', '');
  for (const [src, at] of Object.entries(report.fetchedAt)) lines.push(`- ${src}: ${at ?? 'başarısız / atlandı — eski veri korundu'}`);
  for (const s of report.skipped) lines.push(`- ${s}`);
  const bySource = (src) => models.filter((m) => m.scores.some((s) => s.source === src)).length;
  lines.push('', `Toplam model: ${models.length} (Artificial Analysis: ${bySource('artificialanalysis')}, LMArena: ${bySource('lmarena')}, iki kaynakta: ${models.filter((m) => new Set(m.scores.map((s) => s.source)).size === 2).length})`);
  lines.push('', '## Hatalar', '');
  lines.push(...(report.errors.length ? report.errors.map((e) => `- ${e}`) : ['- yok']));
  lines.push('', '## Yeni modeller', '');
  lines.push(...(report.added.length ? [`${report.added.length}: ${report.added.slice(0, 80).join(', ')}${report.added.length > 80 ? ', …' : ''}`] : ['- yok']));
  lines.push('', '## Kaybolan modeller', '');
  lines.push(...(report.disappeared.length ? [report.disappeared.join(', ')] : ['- yok']));
  const candidates = aliasCandidates(models);
  lines.push('', '## Olası eşleşmeler (alias adayı — data/model-aliases.json\'a sadece eminsen ekle)', '');
  lines.push(...(candidates.length ? candidates.slice(0, 100).map((c) => `- ${c}`) : ['- yok']));
  lines.push('', '## Uyarılar', '');
  lines.push(...(report.warnings.length ? report.warnings.slice(0, 100).map((w) => `- ${w}`) : ['- yok']));
  lines.push('', '## Alan eşlemesi (doğrula)', '');
  lines.push(...(report.fieldUse.length ? report.fieldUse.map((f) => `- ${f}`) : ['- yok']));
  lines.push('', '## Yanıtlarda görülen alanlar', '');
  for (const [k, v] of Object.entries(report.sample)) lines.push(`- ${k}: ${v.join(', ')}`);
  lines.push('', 'Kaynak ve lisans: skorlar Artificial Analysis (artificialanalysis.ai) ve LMArena (lmarena.ai) verisidir; gösterilirken kaynak adı görünür olmalı.');
  return `${lines.join('\n')}\n`;
}
