// Fiyat kontrolü — mantık (sayfa çekme ve LLM dışarıdan verilir, testte sahtesi).
// Kaynak: ürünün pricingUrl sayfası. LLM sadece sayfadaki metinden çıkarır ve
// kanıt cümlesini döndürür; kod bu kanıtın sayfada GERÇEKTEN geçtiğini ve
// tutarın kanıtta yazdığını doğrular. Doğrulanamayan sonuç 'unknown' olur ve
// hiçbir şeye dokunmaz. İnsan PR'da onaylar.
//
// Durumlar (satır başına):
//  - 'fresh'   : priceCheckedAt yeterince yeni, bu koşuda bakılmadı
//  - 'no_url'  : pricingUrl yok
//  - 'error'   : sayfa ya da çıkarım hatası
//  - 'unknown' : sayfadan emin olunamadı (tutar yok, kanıt doğrulanamadı, USD değil)
//  - 'same'    : değişmedi -> priceCheckedAt tazelenir (PR merge edilince geçerli)
//  - 'changed' : fark var -> yeni fiyat önerilir (products.json'a yazılır, PR'da görünür)
//  - 'review'  : büyük değişiklik (model değişti, tutar >%50 oynadı, yalnızca yıllık
//                fiyat) -> products.json'a YAZILMAZ; raporda önerilir, insan
//                `--accept=<id>` ile ya da price:review akışıyla onaylar

import { PRICE_STALE_AFTER_DAYS, makePricing } from '../../lib/pricing.ts';

/** Bu kadar günden yeni doğrulanmış ürüne bu koşuda bakılmaz (haftalık koşuda ~aylık tazeleme). */
export const DEFAULT_MAX_AGE_DAYS = 21;
/** Tutar bu orandan fazla oynarsa otomatik yazılmaz, 'review' olur. */
export const LARGE_CHANGE_RATIO = 0.5;
/** Doğrulaması bu kadar gün içinde sona erecek ürünler raporda uyarı olarak çıkar. */
export const EXPIRY_WARNING_DAYS = 14;
/** Bundan kısa sayfa metni gerçek bir fiyat sayfası değil, boş bir JS kabuğudur. */
export const MIN_PAGE_CHARS = 200;
/** Tek bir OpenAI çağrısı bu süreyi aşarsa o ürün 'hata' olur, koşu takılıp kalmaz. */
export const LLM_TIMEOUT_MS = 60_000;
/** Kontrol edilenlerin bu orandan fazlası hata/emin değil ise iş kırmızı biter (sistemik sorun). */
export const SYSTEMIC_FAILURE_RATIO = 0.5;

const DAY_MS = 24 * 60 * 60 * 1000;
export const USER_AGENT = 'Mozilla/5.0 (compatible; RouteAI-price-check/1.1; +https://www.routeai.chat)';

// --- Sayfa -> metin ---------------------------------------------------------

// Tutar işareti: "$20", "US$20", "20 USD", "€9", JSON'da "price":"20".
const AMOUNT_SOURCE = '(?:US\\$|[$€£¥]|USD|EUR|GBP)\\s?\\d|\\d\\s?(?:USD|EUR|GBP|US\\$)|"price"\\s*:\\s*"?\\d';

export function hasAmountSignal(text) {
  return new RegExp(AMOUNT_SOURCE, 'i').test(String(text ?? ''));
}

function decodeEntities(s) {
  return s
    .replace(/&nbsp;|&#160;|&#xa0;/gi, ' ')
    .replace(/&dollar;|&#36;|&#x24;/gi, '$')
    .replace(/&euro;|&#8364;|&#x20ac;/gi, '€')
    .replace(/&pound;|&#163;|&#xa3;/gi, '£')
    .replace(/&mdash;|&#8212;/gi, '—')
    .replace(/&ndash;|&#8211;/gi, '–')
    .replace(/&quot;|&#34;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&amp;/gi, '&');
}

/** HTML -> düz metin. `limit` sonsuz verilirse kesilmez. */
export function htmlToText(html, limit = 12000) {
  const text = decodeEntities(
    String(html ?? '')
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
  )
    .replace(/\s+/g, ' ')
    .trim();
  return Number.isFinite(limit) ? text.slice(0, limit) : text;
}

/**
 * JS ile çizilen sayfalar fiyatı çoğu zaman gömülü JSON'da (JSON-LD,
 * __NEXT_DATA__) taşır; htmlToText script'leri sildiği için o veri kaybolur.
 * Sadece tutar içeren yerlerin çevresi alınır.
 */
export function embeddedPriceSnippets(html, maxChars = 4000) {
  const snippets = [];
  const re = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(String(html ?? '')))) {
    if (!/type\s*=\s*["']?application\/(?:ld\+)?json|id\s*=\s*["']?__NEXT_DATA__/i.test(m[1] ?? '')) continue;
    const raw = m[2].replace(/\\u0024/gi, '$').replace(/\\u20ac/gi, '€').replace(/\\u00a3/gi, '£').replace(/\\"/g, '"');
    const amount = new RegExp(AMOUNT_SOURCE, 'gi');
    let a;
    while ((a = amount.exec(raw))) {
      snippets.push(raw.slice(Math.max(0, a.index - 80), a.index + 120).replace(/\s+/g, ' '));
      amount.lastIndex = a.index + 120;
      if (snippets.join(' | ').length > maxChars) return snippets.join(' | ').slice(0, maxChars);
    }
  }
  return snippets.join(' | ');
}

/** Uzun metinde başlıktan sonra gelen fiyat bölümü kaybolmasın diye tutar çevresindeki pencereler seçilir. */
function selectPriceWindows(text, limit) {
  if (text.length <= limit) return text;
  const headLen = Math.min(1200, Math.floor(limit / 8));
  const spans = [];
  const re = new RegExp(AMOUNT_SOURCE, 'gi');
  let m;
  while ((m = re.exec(text))) {
    spans.push([Math.max(headLen, m.index - 250), Math.min(text.length, m.index + 350)]);
    re.lastIndex = m.index + 1;
  }
  if (spans.length === 0) return text.slice(0, limit);
  const merged = [];
  for (const [a, b] of spans) {
    const last = merged[merged.length - 1];
    if (last && a <= last[1]) last[1] = Math.max(last[1], b);
    else merged.push([a, b]);
  }
  let out = text.slice(0, headLen);
  for (const [a, b] of merged) {
    const piece = text.slice(a, b);
    if (out.length + piece.length + 3 > limit) break;
    out += ` … ${piece}`;
  }
  return out;
}

/** Fiyat çıkarımına verilecek metin: gövde metni + gömülü JSON parçaları, sınırlı. */
export function pricingText(html, limit = 12000) {
  const body = htmlToText(html, Infinity);
  const embedded = embeddedPriceSnippets(html);
  const text = embedded ? `${selectPriceWindows(body, Math.max(1000, limit - 4200))} … ${embedded}` : selectPriceWindows(body, limit);
  return { text: text.slice(0, limit), hasAmount: hasAmountSignal(text) };
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Sayfayı çeker; ağ hatası ve 5xx/429'da bir kez daha dener, diğer 4xx'te vazgeçer. */
export async function fetchPageText(url, { fetchImpl = fetch, retries = 1, timeoutMs = 20_000, retryDelayMs = 1500 } = {}) {
  let lastError = new Error('bilinmeyen hata');
  for (let attempt = 0; attempt <= retries; attempt++) {
    let retryable = true;
    try {
      const res = await fetchImpl(url, {
        signal: AbortSignal.timeout(timeoutMs),
        redirect: 'follow',
        headers: { 'User-Agent': USER_AGENT, Accept: 'text/html,application/xhtml+xml', 'Accept-Language': 'en-US,en;q=0.9' },
      });
      if (res.ok) return await res.text();
      const blocked = [401, 403, 429].includes(res.status) ? ' (bot engeli ya da giriş isteniyor olabilir)' : '';
      lastError = new Error(`HTTP ${res.status}${blocked}`);
      retryable = res.status >= 500 || res.status === 429;
    } catch (error) {
      lastError = error;
    }
    if (!retryable || attempt === retries) break;
    await sleep(retryDelayMs * (attempt + 1));
  }
  throw lastError;
}

// --- Çıkarım ----------------------------------------------------------------

export async function extractPrice({ text, productName, llm }) {
  const { data, tokens } = await llm({
    name: 'price_extraction',
    system: [
      'Extract the pricing of the named product from its pricing page text. Use ONLY the given text; never use prior knowledge.',
      'model: "free" (no paid plan), "freemium" (a free plan AND paid plans), "paid" (no free plan) or "unknown".',
      'startingPrice: the cheapest PAID plan for an individual user, MONTH-TO-MONTH price per month, in the page currency (number) - not a Team/Enterprise/API-usage price, not a per-year total. If the amount is not written in the text, use null and model "unknown".',
      'If the page shows both a month-to-month price and a cheaper price that requires annual billing, use the month-to-month one and quote it.',
      'currency: the ISO 4217 code of the amounts, e.g. "USD" (never a symbol such as "$"). Use JSON null only if the currency cannot be told.',
      'billing: "monthly" if startingPrice is the month-to-month price; "annual_only" if the page only shows a per-month price that requires annual billing; "unknown" otherwise.',
      'evidence: ONE exact contiguous quote copied character-for-character from the text that contains the startingPrice amount (e.g. "Pro $20 per month"). Do not paraphrase or add words.',
      'freeTierEvidence: an exact quote from the text showing that a free plan exists (e.g. "Free $0"), or null if there is none.',
      'If unsure about anything, use model "unknown" and null.',
    ].join(' '),
    user: JSON.stringify({ productName, pageText: text }),
    maxTokens: 400,
    temperature: 0,
    signal: AbortSignal.timeout(LLM_TIMEOUT_MS),
    schema: {
      type: 'object',
      properties: {
        model: { type: 'string', enum: ['free', 'freemium', 'paid', 'unknown'] },
        startingPrice: { type: ['number', 'null'] },
        currency: { type: ['string', 'null'] },
        billing: { type: 'string', enum: ['monthly', 'annual_only', 'unknown'] },
        evidence: { type: 'string' },
        freeTierEvidence: { type: ['string', 'null'] },
      },
      required: ['model', 'startingPrice', 'currency', 'billing', 'evidence', 'freeTierEvidence'],
      additionalProperties: false,
    },
  });
  return { ...data, tokens };
}

// --- Doğrulama: LLM'in söylediği sayfada gerçekten var mı ---------------------

function normalizeForMatch(s) {
  return String(s ?? '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[‘’“”"'`]/g, '')
    .replace(/[–—]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Yalnızca harf ve rakamlar kalır: "Free $0 / month" ile "Free $0/month" aynı sayılır. */
function squash(s) {
  return normalizeForMatch(s).replace(/[^\p{L}\p{N}]+/gu, '');
}

const isDigit = (c) => c !== undefined && c >= '0' && c <= '9';

/**
 * needle, haystack içinde geçiyor mu? Rakamla başlayan/biten bir alıntı daha büyük bir
 * sayının parçası olamaz ("$20" alıntısı sayfadaki "$200" ya da "$20.50" ile eşleşmez).
 */
function includesAtBoundary(haystack, needle) {
  let from = 0;
  for (;;) {
    const i = haystack.indexOf(needle, from);
    if (i === -1) return false;
    const end = i + needle.length;
    const before = haystack[i - 1];
    const after = haystack[end];
    const startsInsideNumber = isDigit(needle[0]) && (isDigit(before) || ((before === '.' || before === ',') && isDigit(haystack[i - 2])));
    const endsInsideNumber = isDigit(needle[needle.length - 1]) && (isDigit(after) || ((after === '.' || after === ',') && isDigit(haystack[end + 1])));
    if (!startsInsideNumber && !endsInsideNumber) return true;
    from = i + 1;
  }
}

/**
 * Alıntı sayfa metninde geçiyor mu? "..." / "…" ile bölünmüş alıntıda her parça aranır.
 * Önce olduğu gibi aranır; bulunamazsa noktalama ve boşluklar yok sayılarak aranır
 * (sayfa metninde "$0 / month", LLM alıntısında "$0/month" gibi biçim farkları için).
 */
export function evidenceInText(evidence, text) {
  if (normalizeForMatch(evidence).length < 6) return false;
  const haystack = normalizeForMatch(text);
  const squashed = squash(text);
  const parts = String(evidence).split(/\.{3}|…/).map(normalizeForMatch).filter((p) => p.length >= 4);
  return (
    parts.length > 0 &&
    parts.every((p) => {
      if (includesAtBoundary(haystack, p)) return true;
      const s = squash(p);
      return s.length >= 6 && includesAtBoundary(squashed, s);
    })
  );
}

/** Tutar metinde ayrı bir sayı olarak geçiyor mu? ("20" için "$20" evet, "$200" ve "20.5" hayır.) */
export function amountInText(amount, text) {
  if (typeof amount !== 'number' || !Number.isFinite(amount)) return false;
  const variants = new Set([String(amount), amount.toFixed(2)]);
  const haystack = String(text ?? '');
  for (const v of variants) {
    const re = new RegExp(`(?<![\\d.,])${v.replace('.', '\\.')}(?!\\d)(?![.,]\\d)`);
    if (re.test(haystack)) return true;
  }
  return false;
}

/**
 * LLM çıktısını sayfa metnine karşı doğrular. Doğrulanamayan çıkarım
 * kullanılmaz (uydurma fiyat yazmama kuralı).
 */
export function verifyExtraction(extracted, text) {
  if (!extracted || extracted.model === 'unknown') return { ok: true };
  if (!evidenceInText(extracted.evidence, text)) return { ok: false, note: 'kanıt cümlesi sayfada bulunamadı' };
  if (extracted.model !== 'free') {
    if (typeof extracted.startingPrice !== 'number') return { ok: false, note: 'sayfada tutar bulunamadı' };
    if (!amountInText(extracted.startingPrice, extracted.evidence)) return { ok: false, note: `tutar (${extracted.startingPrice}) kanıt cümlesinde yok` };
  }
  if (extracted.model !== 'paid') {
    const freeQuote = extracted.freeTierEvidence || (extracted.model === 'free' ? extracted.evidence : null);
    if (!evidenceInText(freeQuote, text)) return { ok: false, note: 'ücretsiz plan kanıtı sayfada bulunamadı' };
  }
  return { ok: true };
}

// --- Karşılaştırma ------------------------------------------------------------

/** Büyük değişiklik nedeni (metin) ya da null. Otomatik yazılmaz, insan onaylar. */
export function largeChangeReason(pricing, model, price, billing) {
  const oldModel = pricing?.model;
  const oldPrice = pricing?.startingPrice ?? null;
  if (billing === 'annual_only') return 'sayfada yalnızca yıllık faturalamalı aylık fiyat var';
  if (oldModel && oldModel !== model) return `model değişti: ${oldModel} → ${model}`;
  if (oldPrice !== null && oldPrice > 0 && price !== null && Math.abs(price - oldPrice) / oldPrice > LARGE_CHANGE_RATIO) {
    return `tutar çok değişti: ${oldPrice} → ${price} USD`;
  }
  return null;
}

/** LLM çıktısının insan okuyabilir özeti (tokens hariç); --verbose ve hata ayıklama için. */
export function describeExtraction(extracted) {
  const { model = 'unknown', startingPrice = null, currency = null, billing = 'unknown', evidence = '', freeTierEvidence = null } = extracted ?? {};
  return { model, startingPrice, currency, billing, evidence, freeTierEvidence };
}

// --- Para birimi -----------------------------------------------------------------

const USD_WORDS = /^(USD|US\$|\$|USD\$|US DOLLARS?|DOLLARS?)$/;
const EMPTY_WORDS = /^(|NULL|NONE|N\/A|NA|UNKNOWN|UNDEFINED)$/;
// USD dışı bir para birimi işareti: sembol ya da kodla.
const FOREIGN_CURRENCY = /[€£¥₺₹]|(?<![A-Za-z])(?:EUR|GBP|TRY|TL|CAD|AUD|JPY|INR|CHF)(?![A-Za-z])|(?<![A-Za-z])(?!US\$)[A-Z]{1,2}\$/i;

/**
 * Çıkarımdaki para birimini 'USD' ya da başka bir kodla (ya da null) döndürür.
 * LLM bazen "USD" yerine "$" ya da "null" yazısı döndürür; kanıt cümlesindeki
 * işarete bakılır. "CA$20" gibi USD dışı işaret varsa USD sayılmaz.
 */
export function resolveCurrency(extracted) {
  const raw = String(extracted?.currency ?? '').trim().toUpperCase().replace(/\./g, '');
  const evidence = String(extracted?.evidence ?? '');
  const foreign = evidence.match(FOREIGN_CURRENCY)?.[0] ?? null;
  const usd = /(?<![A-Za-z])\$\s?\d|US\$|\bUSD\b/i.test(evidence);
  if (USD_WORDS.test(raw)) return foreign ? foreign.toUpperCase() : 'USD';
  if (EMPTY_WORDS.test(raw)) return foreign ? foreign.toUpperCase() : usd ? 'USD' : null;
  return raw;
}

// --- Faturalama: aylık mı, yıllık/promosyon mu? --------------------------------------

// Fiyat sayfaları çoğunlukla "yıllık" düğmesi seçili gelir; gösterilen tutar aylık-ay-ay fiyat değildir.
const ANNUAL_TEXT = /\b(?:billed|paid|charged|billing)\s+(?:as\s+\S+\s+)?(?:annually|yearly|every year|once a year)|\bper year\b|\/\s*(?:yr|year)\b|\bannual(?:ly)?\b|\byearly\b|\bsave\s+\d+\s?%/i;
const MONTHLY_EXPLICIT = /\b(?:billed|paid|charged)\s+monthly|month[- ]to[- ]month|\bmonthly billing\b|\bpay monthly\b|\bbilled every month\b/i;
const PROMO_TEXT = /\b(?:first|1st)\s+(?:month|year|\d+\s+months)\b|\bintro(?:ductory)?\b|\bpromo(?:tion(?:al)?)?\b|\blimited[- ]time\b|\b\d+\s?%\s*off\b|\bregular price\b|\bwas\s+[$€£]|\bcoupon\b|\bdiscount(?:ed)?\b/i;

/**
 * Bulunan tutarın "aylık, ay ay ödenen" fiyat olmadığına dair işaret varsa nedenini
 * (metin), yoksa null döndürür. Böyle fiyatlar otomatik yazılmaz, insan onaylar.
 *  - kanıtın kendisi yıllık faturalamayı ya da indirimi söylüyorsa
 *  - sayfada yıllık faturalama var ve kanıt aylık faturalamayı açıkça söylemiyorsa
 */
export function billingConcern(extracted, pageText = '') {
  if (!extracted || extracted.model === 'free') return null;
  const evidence = String(extracted.evidence ?? '');
  if (extracted.billing === 'annual_only') return 'sayfada yalnızca yıllık faturalamalı aylık fiyat var';
  if (ANNUAL_TEXT.test(evidence)) return 'kanıt yıllık faturalamayı gösteriyor';
  if (PROMO_TEXT.test(evidence)) return 'kanıtta indirim/promosyon ibaresi var';
  if (!MONTHLY_EXPLICIT.test(evidence) && ANNUAL_TEXT.test(String(pageText ?? ''))) {
    return 'sayfada yıllık faturalama da var, kanıt aylık fiyat olduğunu açıkça söylemiyor (aylık/yıllık düğmesi olabilir)';
  }
  return null;
}

/**
 * Bir ürünün kontrol sonucu (durumlar dosya başında).
 * pageText: çıkarımın yapıldığı sayfa metni (yıllık faturalama işareti aranır).
 */
export function comparePrice(product, extracted, pageText = '') {
  if (!extracted || extracted.model === 'unknown') return { status: 'unknown' };
  if (extracted.model !== 'free' && extracted.startingPrice !== null && extracted.startingPrice !== undefined) {
    const currency = resolveCurrency(extracted);
    if (currency !== 'USD') return { status: 'unknown', note: currency ? `para birimi ${currency}` : 'para birimi belirsiz' };
  }
  if (extracted.model !== 'free' && (extracted.startingPrice === null || extracted.startingPrice === undefined)) {
    // Tutar yoksa elimizde doğrulanacak bir şey yok; bilinen bir fiyatı null ile ezme.
    return { status: 'unknown', note: 'sayfada tutar yok' };
  }
  const price = extracted.model === 'free' ? 0 : extracted.startingPrice;
  const same = product.pricing.model === extracted.model && (product.pricing.startingPrice ?? null) === (price ?? null);
  if (same) return { status: 'same', model: extracted.model, startingPrice: price ?? null };
  const reason = largeChangeReason(product.pricing, extracted.model, price ?? null, extracted.billing) ?? billingConcern(extracted, pageText);
  if (reason) return { status: 'review', model: extracted.model, startingPrice: price ?? null, note: reason };
  return { status: 'changed', model: extracted.model, startingPrice: price ?? null };
}

// --- Toplu kontrol --------------------------------------------------------------

export function ageDays(checkedAt, todayMs) {
  const t = checkedAt ? Date.parse(checkedAt) : NaN;
  return Number.isNaN(t) ? Infinity : Math.floor((todayMs - t) / DAY_MS);
}

/**
 * Aktif ürünleri kontrol eder. products DEĞİŞTİRİLMEZ; 'same' ve 'changed'
 * satırlarında `update` (yeni fiyat nesnesi) döner, yazmak çağıranın işi.
 *
 *  - only: Set<id> verilirse sadece onlara bakılır (yaş sınırı yok sayılır)
 *  - accept: Set<id>, 'review' olan bu ürünlerin önerisi yine de 'changed' sayılır
 *  - maxAgeDays: bundan yeni doğrulanmış ürüne bakılmaz (0 = hepsine bak)
 *  - onRow: her ürün bitince çağrılır (ilerleme yazdırmak için)
 *
 * @typedef {{ p: any, status: string, note?: string, model?: string, startingPrice?: number | null, evidence?: string, billing?: string, extracted?: any, update?: any }} PriceRow
 * @param {{ products: any[], fetchText: (url: string) => Promise<string>, llm: any, today: string, maxAgeDays?: number, only?: Set<string> | null, accept?: Set<string> | null, onRow?: ((row: PriceRow) => void) | null }} args
 * @returns {Promise<PriceRow[]>}
 */
export async function checkProducts({ products, fetchText, llm, today, maxAgeDays = DEFAULT_MAX_AGE_DAYS, only = null, accept = null, onRow = null }) {
  const todayMs = Date.parse(today);
  const pages = new Map();
  /** @type {PriceRow[]} */
  const rows = [];
  const push = (row) => {
    rows.push(row);
    onRow?.(row);
  };

  for (const p of products.filter((x) => x.status === 'active')) {
    if (only && !only.has(p.id)) continue;
    if (!only && ageDays(p.pricing?.priceCheckedAt, todayMs) < maxAgeDays) {
      push({ p, status: 'fresh' });
      continue;
    }
    if (!p.pricingUrl) {
      push({ p, status: 'no_url' });
      continue;
    }
    if (!llm) {
      push({ p, status: 'error', note: 'OPENAI_API_KEY yok' });
      continue;
    }
    try {
      // Aynı fiyat sayfasını paylaşan ürünler (ör. ChatGPT x2, Grok x2) tek kez çekilir.
      if (!pages.has(p.pricingUrl)) pages.set(p.pricingUrl, fetchText(p.pricingUrl).then((html) => pricingText(html)));
      const { text, hasAmount } = await pages.get(p.pricingUrl);
      if (text.length < MIN_PAGE_CHARS || (!hasAmount && !/\bfree\b|ücretsiz/i.test(text))) {
        push({ p, status: 'unknown', note: 'sayfada tutar yok (JS ile çiziliyor ya da giriş istiyor olabilir)' });
        continue;
      }
      const extracted = await extractPrice({ text, productName: p.name, llm });
      const check = verifyExtraction(extracted, text);
      if (!check.ok) {
        push({ p, status: 'unknown', note: check.note, evidence: extracted.evidence, extracted: describeExtraction(extracted) });
        continue;
      }
      let cmp = comparePrice(p, extracted, text);
      if (cmp.status === 'review' && accept?.has(p.id)) cmp = { ...cmp, status: 'changed' };
      const row = { p, ...cmp, evidence: extracted.evidence, billing: extracted.billing, extracted: describeExtraction(extracted) };
      if (cmp.status === 'same' || cmp.status === 'changed') row.update = makePricing(cmp.model, cmp.startingPrice, today);
      push(row);
    } catch (error) {
      push({ p, status: 'error', note: error.message });
    }
  }
  return rows;
}

/** Güncellemeler uygulanınca 60 gün içinde doğrulanmış aktif ürün sayısı ve sona erecekler. */
export function freshnessSummary(products, rows, today) {
  const todayMs = Date.parse(today);
  const updates = new Map(rows.filter((r) => r.update).map((r) => [r.p.id, r.update]));
  const active = products.filter((p) => p.status === 'active');
  let verified = 0;
  const expiring = [];
  for (const p of active) {
    const pricing = updates.get(p.id) ?? p.pricing;
    const age = ageDays(pricing?.priceCheckedAt, todayMs);
    if (age > PRICE_STALE_AFTER_DAYS) continue;
    verified++;
    const daysLeft = PRICE_STALE_AFTER_DAYS - age;
    if (daysLeft <= EXPIRY_WARNING_DAYS) expiring.push({ p, daysLeft });
  }
  return { active: active.length, verified, expiring: expiring.sort((a, b) => a.daysLeft - b.daysLeft) };
}

/** İş kırmızı mı bitsin? Sessiz başarısızlığı önler (ilk koşuda 46/46 hata yeşil bitmişti). */
export function priceExitDecision({ rows, hasLlm }) {
  const reasons = [];
  const attempted = rows.filter((r) => ['error', 'unknown', 'same', 'changed', 'review'].includes(r.status));
  if (!hasLlm && attempted.length > 0) {
    return { code: 1, reasons: ['OPENAI_API_KEY tanımlı değil: hiçbir fiyat kontrol edilemedi.'] };
  }
  const failed = attempted.filter((r) => r.status === 'error' || r.status === 'unknown').length;
  if (attempted.length >= 5 && failed / attempted.length > SYSTEMIC_FAILURE_RATIO) {
    reasons.push(`Kontrol edilen ${attempted.length} üründen ${failed}'i hata/emin değil (sistemik sorun: engel, anahtar ya da sayfa yapısı).`);
    return { code: 1, reasons };
  }
  if (failed > 0) reasons.push(`${failed} ürün okunamadı; elle doğrulama gerekebilir (npm run price:review).`);
  return { code: 0, reasons };
}

// --- Rapor ----------------------------------------------------------------------

const money = (model, price) => `${model} ${price === null || price === undefined ? '—' : `${price} USD`}`;

/** Bot engeli ya da JS ile çizilen sayfa: tarayıcıdan elle alınan sayfa metniyle çözülebilir. */
const needsManualPage = (r) => (r.status === 'error' || r.status === 'unknown') && /HTTP (?:401|403|429)|sayfada tutar yok/.test(r.note ?? '');

export function renderPriceReport({ rows, today, summary, decision }) {
  const by = (s) => rows.filter((r) => r.status === s);
  const section = (title, list, fmt) => ['', `## ${title} (${list.length})`, '', ...(list.length ? list.map(fmt) : ['- yok'])];
  const checked = rows.filter((r) => r.status !== 'fresh' && r.status !== 'no_url').length;
  const quote = (r) => (r.evidence ? ` — kanıt: "${r.evidence}"` : '');
  const lines = [
    '# Fiyat raporu',
    '',
    `Koşu: ${today}. Değişen ve teyit edilen fiyatlar products.json'a önerildi; PR merge edilince geçerli.`,
    `Bu koşuda ${checked} ürüne bakıldı, ${by('fresh').length} ürün yeterince yeni olduğu için atlandı.`,
    `Güncellemeler sonrası doğrulanmış (son ${PRICE_STALE_AFTER_DAYS} gün) fiyat: **${summary.verified}/${summary.active}** aktif ürün.`,
  ];
  if (decision && decision.reasons.length > 0) lines.push('', `**Durum: ${decision.code === 0 ? 'tamam' : 'KIRMIZI'}.** ${decision.reasons.join(' ')}`);
  lines.push(
    ...section('Değişti', by('changed'), (r) => `- ${r.p.name}: ${money(r.p.pricing.model, r.p.pricing.startingPrice)} → ${money(r.model, r.startingPrice)} (${r.p.pricingUrl})${quote(r)}`),
    ...section('İnceleme gerekli (products.json\'a YAZILMADI)', by('review'), (r) => `- ${r.p.name} (\`${r.p.id}\`): ${r.note}. Önerilen: ${money(r.model, r.startingPrice)} (${r.p.pricingUrl})${quote(r)}. Onaylamak için: \`npm run check:prices -- --accept=${r.p.id}\`${/yıllık|düğmesi/.test(r.note ?? '') ? `. Aylık fiyatı görmek için sayfada Aylık'ı seçip \`npm run price:snap -- ${r.p.id}\`` : ''}`),
    ...section('Teyit edildi', by('same'), (r) => `- ${r.p.name}${quote(r)}`),
    ...section('Emin olunamadı', by('unknown'), (r) => `- ${r.p.name} (\`${r.p.id}\`)${r.note ? `: ${r.note}` : ''}`),
    ...section('Hata', by('error'), (r) => `- ${r.p.name}: ${r.note}`),
    ...section('Sayfası elle alınarak çözülebilecekler', rows.filter(needsManualPage), (r) => `- ${r.p.name}: sayfayı tarayıcıda aç, Ctrl+A, Ctrl+C, sonra \`npm run price:snap -- ${r.p.id}\``),
    ...section('pricingUrl yok', by('no_url'), (r) => `- ${r.p.name} (\`${r.p.id}\`)`),
    ...section(`Doğrulaması ${EXPIRY_WARNING_DAYS} gün içinde sona erecek`, summary.expiring, ({ p, daysLeft }) => `- ${p.name} (\`${p.id}\`): ${daysLeft} gün kaldı`)
  );
  return `${lines.join('\n')}\n`;
}
