// Yetenek denetimi (E): kataloğun "bu ürün bu işi yapar" iddiasını ürünün KENDİ sayfasına karşı sınar.
//
// Ne yapar:
//  - Her aktif ürün için url ve pricingUrl sayfalarını çeker (fetch dışarıdan verilir, testte sahtesi).
//  - Ürünün katalogdaki görevleri için LLM'e sorar: "bu sayfa metni ürünün bu işi yaptığını söylüyor mu?"
//    LLM yalnızca sayfa metninden cevap verir ve bir ALINTI döndürür.
//  - Kod alıntının sayfada GERÇEKTEN geçtiğini doğrular (scripts/prices/core.mjs → evidenceInText).
//    Geçmiyorsa cevap atılır ("alıntı doğrulanamadı"); uydurma kanıt kabul edilmez.
//  - Aynı çağrıda ürünün kapandığına / yeniden adlandırıldığına dair bir işaret var mı diye bakar
//    (bu da alıntıyla doğrulanır).
//
// Ne YAPMAZ:
//  - data/products.json'a ya da başka bir veri dosyasına YAZMAZ. Yalnızca rapor üretir; karar insanındır.
//  - "Bulunamadı"yı "yapamaz" saymaz: sayfada geçmemesi ürünün yapamadığı anlamına gelmez.
//  - Ürünün ilgili iş için "en iyi" olduğunu söylemez; yalnızca "iddia sayfada geçiyor mu"yu sınar.
//
// Pair durumları (ürün-görev başına):
//  'stated'     : sayfa açıkça söylüyor ve alıntı doğrulandı
//  'implied'    : sayfa ima ediyor / alıntı görev sözcükleriyle örtüşmüyor (insan okumalı)
//  'not_found'  : bu sayfa metninde geçmiyor (yapamaz demek DEĞİL)
//  'unverified' : LLM kanıt gösterdi ama alıntı sayfada yok / çok kısa (atıldı)
//  'unreadable' : ürünün sayfası okunamadı (bot engeli, JS kabuğu)
//  'error'      : LLM ya da beklenmeyen hata

import { LLM_TIMEOUT_MS, MIN_PAGE_CHARS, SYSTEMIC_FAILURE_RATIO, evidenceInText, htmlToText } from '../prices/core.mjs';

/** Sayfa başına gövde metni sınırı (karakter) ve toplam üst sınır. */
export const MAX_PAGE_CHARS = 9000;
export const MAX_TOTAL_CHARS = 18000;
/** Alıntı en az bu kadar sözcük içermeli; "AI for everyone" gibi kısa ifadeler kanıt değil. */
export const MIN_EVIDENCE_WORDS = 3;
/**
 * Bir ürün için okunan toplam metin bunun altındaysa sayfa "ince" sayılır (çoğunlukla JS ile çizilen
 * sayfa: yalnızca başlık ve meta açıklaması gelir). Bu bir sezgiseldir, ölçülmüş bir değer değil;
 * yalnızca raporda "bulunamadı"ya ne kadar güvenileceğini göstermek için kullanılır.
 */
export const THIN_TEXT_CHARS = 1500;

/** Satırın okunan sayfalarının toplam karakter sayısı. @param {{ pages: { chars: number }[] }} row */
export const textChars = (row) => row.pages.reduce((n, p) => n + p.chars, 0);

const STOP = new Set([
  'with', 'from', 'that', 'this', 'your', 'into', 'more', 'than', 'other', 'such', 'their', 'have', 'will', 'also', 'make', 'made', 'using', 'used',
  'tasks', 'work', 'content', 'based', 'text', 'tools', 'tool', 'help', 'create', 'creating', 'generate', 'generating', 'write',
]);

// --- Sayfa -> metin ---------------------------------------------------------

const attr = (tag, name) => {
  const m = new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)')`, 'i').exec(tag);
  return m ? (m[2] ?? m[3] ?? '') : null;
};

/**
 * <title> ve açıklama etiketleri. JS ile çizilen sayfaların gövdesi boş olsa da bunlar sunucu HTML'indedir.
 * @returns {string[]}
 */
export function metaTexts(html) {
  const out = [];
  const title = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(String(html ?? ''));
  if (title) out.push(htmlToText(title[1], 300));
  for (const tag of String(html ?? '').match(/<meta\b[^>]*>/gi) ?? []) {
    const key = (attr(tag, 'name') ?? attr(tag, 'property') ?? '').toLowerCase();
    if (!['description', 'og:description', 'twitter:description', 'og:title', 'twitter:title'].includes(key)) continue;
    const content = attr(tag, 'content');
    if (content) out.push(htmlToText(content, 500));
  }
  return [...new Set(out.filter(Boolean))];
}

/** Bir sayfanın HTML'inden denetim metni: meta açıklamaları + gövde metni. */
export function pageToText(html) {
  const meta = metaTexts(html).join(' ');
  const body = htmlToText(html, MAX_PAGE_CHARS);
  return `${meta} ${body}`.replace(/\s+/g, ' ').trim();
}

/**
 * Ürünün sayfalarını çeker (url, pricingUrl; aynı adres bir kez).
 * @returns {Promise<{ pages: { source: string, url: string, text: string }[], problems: { source: string, url: string, reason: string }[] }>}
 */
export async function gatherPages({ product, fetchHtml }) {
  const sources = [['url', product.url], ['pricingUrl', product.pricingUrl]].filter(([, u]) => typeof u === 'string' && u);
  const seen = new Set();
  const pages = [];
  const problems = [];
  let total = 0;
  for (const [source, url] of sources) {
    if (seen.has(url)) continue;
    seen.add(url);
    try {
      const text = pageToText(await fetchHtml(url));
      if (text.length < MIN_PAGE_CHARS) {
        problems.push({ source, url, reason: `sayfa metni çok kısa (${text.length} karakter; JS ile çiziliyor olabilir)` });
        continue;
      }
      const room = Math.max(0, MAX_TOTAL_CHARS - total);
      if (room < MIN_PAGE_CHARS) break;
      const cut = text.slice(0, room);
      total += cut.length;
      pages.push({ source, url, text: cut });
    } catch (error) {
      problems.push({ source, url, reason: String(error?.message ?? error) });
    }
  }
  return { pages, problems };
}

// --- LLM ----------------------------------------------------------------------

export const VERDICTS = ['stated', 'implied', 'not_found'];
export const LIVENESS = ['active', 'discontinued', 'renamed', 'unclear'];

export async function askProduct({ productName, tasks, pages, llm }) {
  if (typeof llm !== 'function') throw new Error('LLM yok (OPENAI_API_KEY tanımlı değil)');
  const { data, tokens } = await llm({
    name: 'capability_check',
    system: [
      'You audit a product catalog. Use ONLY the supplied page texts; never use prior knowledge about the product.',
      'For EACH listed task decide whether the page text says the product can do that kind of work.',
      'verdict: "stated" = the text explicitly says the product does this (the quote must name the capability, e.g. "generate images from text"); "implied" = the text hints at it but does not say it explicitly; "not_found" = the text does not mention it.',
      'evidence: ONE exact contiguous quote of at least 3 words copied character-for-character from the text that supports the verdict, or null when verdict is not_found. Do not paraphrase, translate or add words. Generic marketing ("AI for everyone") is not evidence.',
      'liveness: "active" if the text shows no sign of closure or renaming; "discontinued" if the text says the product is shutting down, was shut down or is no longer available; "renamed" if the text says the product is now called something else or was merged into another product; "unclear" if the text is too short or cut off to tell.',
      'livenessEvidence: for "discontinued" and "renamed" ONE exact quote copied from the text; otherwise null.',
      'Answer every listed taskId exactly once. If unsure, prefer "not_found" and "unclear".',
    ].join(' '),
    user: JSON.stringify({
      productName,
      tasks: tasks.map((t) => ({ taskId: t.id, name: t.label.en, description: t.description.en })),
      pages: pages.map((p) => ({ source: p.source, text: p.text })),
    }),
    maxTokens: 1500,
    temperature: 0,
    signal: AbortSignal.timeout(LLM_TIMEOUT_MS),
    schema: {
      type: 'object',
      properties: {
        liveness: { type: 'string', enum: LIVENESS },
        livenessEvidence: { type: ['string', 'null'] },
        tasks: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              taskId: { type: 'string' },
              verdict: { type: 'string', enum: VERDICTS },
              evidence: { type: ['string', 'null'] },
            },
            required: ['taskId', 'verdict', 'evidence'],
            additionalProperties: false,
          },
        },
      },
      required: ['liveness', 'livenessEvidence', 'tasks'],
      additionalProperties: false,
    },
  });
  return { ...data, tokens };
}

// --- Doğrulama ------------------------------------------------------------------

const wordCount = (s) => String(s ?? '').trim().split(/\s+/).filter(Boolean).length;
const words = (s) => String(s ?? '').toLowerCase().match(/[a-z0-9]{4,}/g) ?? [];

/** Görevin ayırt edici sözcükleri (etiket, açıklama, İngilizce anahtar ifadeler). */
export function taskWords(task) {
  const raw = [task.label?.en, task.description?.en, ...(task.keywords?.en ?? [])].flatMap(words);
  return new Set(raw.filter((w) => !STOP.has(w)));
}

/** Alıntı, görevin sözcüklerinden en az birini içeriyor mu? (LLM'in aşırı cömert "stated"ine karşı) */
export function overlapsTask(quote, task) {
  const tw = taskWords(task);
  // Kök eşleşmesi (4 harf): "write" ~ "writing", "edit" ~ "editing". Amaç yalnızca bariz uyumsuzluğu yakalamak.
  return words(quote).some((w) => tw.has(w) || [...tw].some((t) => t.length >= 5 && (w.startsWith(t.slice(0, 4)) || t.startsWith(w.slice(0, 4)))));
}

/**
 * LLM cevabını sayfa metnine karşı doğrular.
 * @returns {{ liveness: { status: string, evidence: string | null, note?: string }, pairs: { taskId: string, status: string, evidence: string | null, note?: string }[] }}
 */
export function verifyProduct({ asked, tasks, text }) {
  const byId = new Map();
  for (const item of Array.isArray(asked?.tasks) ? asked.tasks : []) {
    if (item && typeof item.taskId === 'string' && !byId.has(item.taskId)) byId.set(item.taskId, item);
  }

  const pairs = tasks.map((task) => {
    const item = byId.get(task.id);
    if (!item) return { taskId: task.id, status: 'not_found', evidence: null, note: 'model bu görevi yanıtlamadı' };
    if (item.verdict === 'not_found' || !VERDICTS.includes(item.verdict)) return { taskId: task.id, status: 'not_found', evidence: null };
    const quote = typeof item.evidence === 'string' ? item.evidence.trim() : '';
    if (wordCount(quote) < MIN_EVIDENCE_WORDS) {
      return { taskId: task.id, status: 'unverified', evidence: quote || null, note: `alıntı yok ya da ${MIN_EVIDENCE_WORDS} sözcükten kısa` };
    }
    if (!evidenceInText(quote, text)) {
      return { taskId: task.id, status: 'unverified', evidence: quote, note: 'alıntı sayfada bulunamadı' };
    }
    if (item.verdict === 'stated' && !overlapsTask(quote, task)) {
      return { taskId: task.id, status: 'implied', evidence: quote, note: 'alıntı görevin sözcükleriyle örtüşmüyor' };
    }
    return { taskId: task.id, status: item.verdict, evidence: quote };
  });

  let liveness = { status: 'unclear', evidence: null, note: 'model liveness vermedi' };
  if (asked && LIVENESS.includes(asked.liveness)) {
    if (asked.liveness === 'discontinued' || asked.liveness === 'renamed') {
      const quote = typeof asked.livenessEvidence === 'string' ? asked.livenessEvidence.trim() : '';
      liveness = wordCount(quote) >= MIN_EVIDENCE_WORDS && evidenceInText(quote, text)
        ? { status: asked.liveness, evidence: quote }
        : { status: 'unclear', evidence: quote || null, note: `${asked.liveness} dendi ama alıntı doğrulanamadı` };
    } else {
      liveness = { status: asked.liveness, evidence: null };
    }
  }
  return { liveness, pairs };
}

// --- Akış -------------------------------------------------------------------------

/**
 * @typedef {{ taskId: string, status: string, evidence: string | null, note?: string }} PairResult
 * @typedef {{
 *   p: any, tasks: any[],
 *   pages: { source: string, url: string, chars: number }[],
 *   problems: { source: string, url: string, reason: string }[],
 *   liveness: { status: string, evidence: string | null, note?: string } | null,
 *   pairs: PairResult[], tokens: number, status: string, note?: string,
 * }} CapabilityRow
 */

/**
 * @param {{ products: any[], tasksById: Map<string, any>, fetchHtml: (url: string) => Promise<string>, llm: Function | null,
 *           only?: Set<string> | null, onRow?: ((row: CapabilityRow) => void) | null }} input
 * @returns {Promise<CapabilityRow[]>}
 */
export async function checkProducts({ products, tasksById, fetchHtml, llm, only = null, onRow = null }) {
  const rows = [];
  for (const product of products) {
    if (product.status !== 'active') continue;
    if (only && !only.has(product.id)) continue;
    const tasks = product.tasks.map((id) => tasksById.get(id)).filter(Boolean);
    /** @type {CapabilityRow} */
    const base = { p: product, tasks, pages: [], problems: [], liveness: null, pairs: [], tokens: 0, status: 'ok' };
    /** @type {CapabilityRow} */
    let row;
    try {
      const { pages, problems } = await gatherPages({ product, fetchHtml });
      base.pages = pages.map(({ source, url, text }) => ({ source, url, chars: text.length }));
      base.problems = problems;
      if (pages.length === 0) {
        row = { ...base, status: 'unreadable', note: [...new Set(problems.map((x) => x.reason))].join('; ') || 'sayfa adresi yok' };
      } else if (tasks.length === 0) {
        row = { ...base, status: 'ok', pairs: [], liveness: { status: 'unclear', evidence: null, note: 'ürünün görevi yok' } };
      } else {
        const text = pages.map((x) => x.text).join('\n');
        const asked = await askProduct({ productName: product.name, tasks, pages, llm });
        const verified = verifyProduct({ asked, tasks, text });
        row = { ...base, status: 'ok', ...verified, tokens: asked.tokens ?? 0 };
      }
    } catch (error) {
      row = { ...base, status: 'error', note: String(error?.message ?? error) };
    }
    rows.push(row);
    onRow?.(row);
  }
  return rows;
}

/**
 * İş kırmızı biter: LLM anahtarı yok, ya da kontrol edilenlerin yarısından fazlası okunamadı/hata.
 * @param {{ rows: { status: string }[], hasLlm: boolean }} input
 * @returns {{ code: number, reasons: string[] }}
 */
export function capabilityExitDecision({ rows, hasLlm }) {
  /** @type {string[]} */
  const reasons = [];
  let code = 0;
  if (!hasLlm) {
    code = 1;
    reasons.push('OPENAI_API_KEY yok: hiçbir ürün denetlenemedi.');
  }
  const bad = rows.filter((r) => r.status === 'error' || r.status === 'unreadable').length;
  if (rows.length > 0 && bad / rows.length > SYSTEMIC_FAILURE_RATIO) {
    code = 1;
    reasons.push(`Ürünlerin ${bad}/${rows.length}'i okunamadı ya da hata verdi (yarıdan fazla): sistemik sorun olabilir.`);
  }
  return { code, reasons };
}

// --- Rapor ------------------------------------------------------------------------

const STATUS_LABEL = {
  stated: 'kanıtlı',
  implied: 'dolaylı',
  not_found: 'bulunamadı',
  unverified: 'alıntı doğrulanamadı',
  unreadable: 'sayfa okunamadı',
  error: 'hata',
};
const LIVENESS_LABEL = { discontinued: 'KAPANIYOR / KAPANDI', renamed: 'YENİDEN ADLANDIRILDI' };

const cell = (s) => String(s ?? '').replace(/\|/g, '¦').replace(/\s+/g, ' ').trim();
const short = (s, n = 160) => {
  const t = cell(s);
  return t.length > n ? `${t.slice(0, n - 1)}…` : t;
};
const pct = (n, d) => (d === 0 ? '—' : `%${Math.round((100 * n) / d)}`);

/** @param {any[]} rows */
export function summarize(rows) {
  const checked = rows.length;
  const ok = rows.filter((r) => r.status === 'ok');
  const counts = { stated: 0, implied: 0, not_found: 0, unverified: 0 };
  for (const r of ok) for (const x of r.pairs) counts[x.status] += 1;
  const pairs = Object.values(counts).reduce((a, b) => a + b, 0);
  const tokens = rows.reduce((a, r) => a + (r.tokens ?? 0), 0);
  return {
    checked,
    read: ok.length,
    unreadable: rows.filter((r) => r.status === 'unreadable').length,
    errors: rows.filter((r) => r.status === 'error').length,
    pairs,
    counts,
    tokens,
  };
}

/**
 * @param {{ rows: any[], today: string, decision?: { code: number, reasons: string[] } | null,
 *           labelOf?: (id: string) => string, editorPicks?: { taskId: string, productId: string }[] }} input
 */
export function renderCapabilityReport({ rows, today, decision = null, labelOf = (id) => id, editorPicks = [] }) {
  const s = summarize(rows);
  const lines = ['# Yetenek denetimi raporu', '', `Üretim tarihi: ${today}. Salt rapor: data/products.json ve diğer veri dosyaları DEĞİŞMEDİ. Karar insanındır.`, ''];
  if (decision && decision.code !== 0) {
    lines.push('## Karar: BAŞARISIZ (iş kırmızı biter)', '', ...decision.reasons.map((r) => `- ${r}`), '');
  }

  lines.push('## 1. Özet', '');
  lines.push(`- Denetlenen aktif ürün: ${s.checked}. Sayfası okunan: ${s.read}. Okunamayan: ${s.unreadable}. Hata: ${s.errors}.`);
  lines.push(`- Okunan ürünlerdeki ürün-görev çifti: ${s.pairs}. Sayfada açıkça yazan ("kanıtlı"): ${s.counts.stated} (${pct(s.counts.stated, s.pairs)}). Dolaylı: ${s.counts.implied}. Bulunamadı: ${s.counts.not_found}. Alıntı doğrulanamadı: ${s.counts.unverified}.`);
  lines.push('- **"Bulunamadı", ürünün o işi yapamadığı anlamına GELMEZ**; yalnızca denetlenen sayfa metninde geçmiyor (pazarlama sayfaları her özelliği saymaz, bazı sayfalar JS ile çiziliyor).');
  lines.push('- "Kanıtlı" bile ürünün o iş için EN İYİ olduğunu göstermez; yalnızca iddianın ürünün kendi sayfasında geçtiğini gösterir.');
  if (s.tokens > 0) lines.push(`- OpenAI token kullanımı (toplam): ${s.tokens}.`);

  const flagged = rows.filter((r) => r.status === 'ok' && (r.liveness?.status === 'discontinued' || r.liveness?.status === 'renamed'));
  lines.push('', '## 2. Kapanma / yeniden adlandırma işaretleri (öncelikli)', '');
  if (flagged.length === 0) {
    lines.push('- Doğrulanmış işaret yok. (Bu, ürünlerin açık olduğunu kanıtlamaz; yalnızca sayfada böyle bir ifade doğrulanmadı.)');
  } else {
    lines.push('Alıntı sayfada doğrulandı. Ürünün durumuna ve adına ürün sahibi karar verir; `status: retired` yapmadan önce sayfayı kendin aç.', '');
    lines.push('| Ürün | İşaret | Alıntı | Sayfa |', '| --- | --- | --- | --- |');
    for (const r of flagged) {
      lines.push(`| ${cell(r.p.name)} | ${LIVENESS_LABEL[r.liveness.status]} | ${short(r.liveness.evidence, 220)} | ${cell(r.pages[0]?.url ?? r.p.url)} |`);
    }
  }
  const doubtful = rows.filter((r) => r.status === 'ok' && r.liveness?.note && r.liveness.status === 'unclear' && /dendi ama/.test(r.liveness.note));
  for (const r of doubtful) lines.push(`- ${cell(r.p.name)}: ${cell(r.liveness.note)} (atıldı).`);

  const pickIds = new Map(editorPicks.map((e) => [e.taskId, e.productId]));
  const pickRows = [];
  for (const r of rows) {
    if (r.status !== 'ok') continue;
    for (const x of r.pairs) if (pickIds.get(x.taskId) === r.p.id && x.status !== 'stated') pickRows.push({ r, x });
  }
  const unreadablePicks = rows.filter((r) => r.status !== 'ok' && [...pickIds.values()].includes(r.p.id));
  lines.push('', '## 3. Editör seçimi olup sayfada açık kanıtı olmayanlar', '');
  if (pickRows.length === 0 && unreadablePicks.length === 0) {
    lines.push('- Yok: denetlenen editör seçimlerinin hepsi sayfada açıkça geçiyor.');
  } else {
    lines.push('| Görev | Editör seçimi | Durum | Alıntı / not |', '| --- | --- | --- | --- |');
    for (const { r, x } of pickRows) lines.push(`| ${labelOf(x.taskId)} | ${cell(r.p.name)} | ${STATUS_LABEL[x.status]} | ${short(x.evidence ?? x.note ?? '—')} |`);
    for (const r of unreadablePicks) lines.push(`| ${[...pickIds].filter(([, pid]) => pid === r.p.id).map(([tid]) => labelOf(tid)).join(', ')} | ${cell(r.p.name)} | ${STATUS_LABEL[r.status]} | ${short(r.note)} |`);
  }

  lines.push('', '## 4. Görev görev sonuç', '');
  lines.push('| Görev | Ürün | Durum | Alıntı / not |', '| --- | --- | --- | --- |');
  const flat = [];
  for (const r of rows) {
    if (r.status === 'ok') for (const x of r.pairs) flat.push({ taskId: x.taskId, name: r.p.name, status: x.status, text: x.evidence ?? x.note ?? '—' });
    else for (const t of r.tasks) flat.push({ taskId: t.id, name: r.p.name, status: r.status, text: r.note ?? '—' });
  }
  flat.sort((a, b) => labelOf(a.taskId).localeCompare(labelOf(b.taskId), 'tr') || a.name.localeCompare(b.name, 'tr'));
  for (const f of flat) lines.push(`| ${labelOf(f.taskId)} | ${cell(f.name)} | ${STATUS_LABEL[f.status]} | ${short(f.text)} |`);

  const bad = rows.filter((r) => r.status !== 'ok');
  lines.push('', '## 5. Okunamayan ya da hata veren ürünler', '');
  if (bad.length === 0) {
    lines.push('- Yok.');
  } else {
    lines.push('| Ürün | Durum | Neden |', '| --- | --- | --- |');
    for (const r of bad) lines.push(`| ${cell(r.p.name)} | ${STATUS_LABEL[r.status]} | ${short(r.note, 240)} |`);
  }
  const partial = rows.filter((r) => r.status === 'ok' && r.problems.length > 0);
  for (const r of partial) lines.push(`- ${cell(r.p.name)}: ${r.problems.map((x) => `${x.source} okunamadı (${short(x.reason, 100)})`).join('; ')}`);

  const readRows = rows.filter((r) => r.status === 'ok' && r.pages.length > 0);
  const thinCount = readRows.filter((r) => textChars(r) < THIN_TEXT_CHARS).length;
  lines.push('', '### 5b. Okunan metin miktarı', '');
  lines.push(`Okunan metin ${THIN_TEXT_CHARS} karakterin altındaysa sayfa "ince" sayılır (sezgisel eşik): sayfa büyük olasılıkla JS ile çiziliyor, model yalnızca başlık ve kısa açıklamayı görmüştür. İnce sayfada "bulunamadı"ya güvenilmez. İnce ürün: ${thinCount}/${readRows.length}.`, '');
  if (readRows.length > 0) {
    lines.push('| Ürün | Okunan sayfa (karakter) | Toplam | Not |', '| --- | --- | --- | --- |');
    for (const r of readRows) {
      const total = textChars(r);
      lines.push(`| ${cell(r.p.name)} | ${r.pages.map((x) => `${x.source}: ${x.chars}`).join(', ')} | ${total} | ${total < THIN_TEXT_CHARS ? 'İNCE: "bulunamadı" güvenilmez' : '—'} |`);
    }
  }

  lines.push('', '## 6. Sınırlar', '');
  lines.push('- Yalnızca ürünün kendi sayfası okunur (url ve pricingUrl); yardım merkezi, belgeler ve sürüm notları okunmaz. Bu yüzden "bulunamadı" çoktur.');
  lines.push('- "Kanıtlı" ve "dolaylı" ayrımını model yapar; alıntı doğrulaması kodla yapılır, ama alıntının görevi gerçekten kanıtlayıp kanıtlamadığını insan okumalıdır.');
  lines.push('- Bu rapor ürünleri birbirine göre sıralamaz; sıralamaya, puana ve katalogdaki görev listelerine dokunmaz.');
  return `${lines.join('\n')}\n`;
}
