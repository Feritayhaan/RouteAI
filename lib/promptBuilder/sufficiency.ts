// Hedef AI yeterlilik kontrolleri (AI Sufficiency Rubric). Deterministik, LLM yok.
//
// Hedef araç (ChatGPT, Midjourney, Cursor...) RouteAI'daki konuşmayı görmez;
// prompt tek başına yeterli olmalı. Dört kriter:
//  - selfContainment: amaçtaki kritik varlıklar (tırnaklı metin, sayılar, özel
//    adlar) promptta var; "yukarıda konuştuğumuz" gibi konuşmaya atıf yok.
//  - toolReadiness: görsel/videoda sohbet dolgusu yok ("Please create an image
//    of..."), asistan meta metni yok, şablon yer tutucusu boş kalmamış; metin/
//    kod/sunum araçlarında mekanik etiket zinciri yok ("Rol: X. Bağlam: Y.
//    Görev: Z. Format: W."); araca özel işaretler rehberin validator'larından
//    gelir (criterion alanı).
//  - actionability: muğlak ifade yok ("etc.", "bir şeyler"), çok kısa değil;
//    prompt hedef AI'a talimat veriyor (konuyu kendisi cevaplamıyor); üretim/
//    çözüm/analiz/dönüştürme isteği "kısa bilgi ver" ödevine küçültülmemiş.
//  - consistency: negativePrompt ve settings promptla ve araçla çelişmiyor.
// Kart düzeyi (varyant dışı) kontroller: howToUse bu promptun araçta nasıl
// kullanılacağını anlatıyor mu; varsayımlar kullanıcı dilinde mi (cardIssues).
// Hata mesajları İngilizce: validateWithRepair onarım turunda LLM'e gider.

import type { Guide, GuideValidator } from './guideSchema';
import { classifyIntent } from './intent';
import type { Assumption, Variant } from './types';

export const CRITERIA = ['selfContainment', 'toolReadiness', 'actionability', 'consistency'] as const;
export type Criterion = (typeof CRITERIA)[number];

export interface SufficiencyIssue {
  criterion: Criterion;
  message: string;
}

export interface SufficiencyContext {
  guide: Guide;
  /** Kullanıcının amacı (oturumdaki goal). */
  goal: string;
  /** Ürün adı: amaçta geçen araç adı prompta girmek zorunda değil. */
  productName?: string;
  /**
   * Amaçtaki varlıklar aranır mı? İlk üretimde evet; iyileştirmede (kullanıcı
   * talimatı ya da slot değişikliği bir varlığı bilerek değiştirebilir) hayır.
   */
  checkGoalEntities?: boolean;
  /** Arayüz dili: varsayımların dili denetlenir (cardIssues). */
  locale?: 'en' | 'tr';
  /** Kullanıcının kendi mesajları (session.userMessages): tırnaklı metinleri de promptta aranır. */
  userMessages?: string[];
}

type CheckedVariant = Pick<Variant, 'prompt' | 'negativePrompt' | 'settings'>;

/** Rehberde negatif prompt alanı olmayan modaliteler. */
const NO_NEGATIVE_FIELD = new Set(['text', 'code', 'slides', 'audio', 'music']);
/** Doğrudan sahne tarifi bekleyen modaliteler (sohbet dolgusu yasak). */
const VISUAL = new Set(['image', 'video']);
/** Uygulanabilir bir prompt için en az kelime (modaliteye göre RouteAI eşiği). */
/** Ses aracında prompt okunacak metnin kendisi; kısa olabilir (quotedScript ile aynı alt sınır). */
const MIN_WORDS: Record<string, number> = { image: 6, video: 8, music: 4, audio: 3, slides: 12, text: 12, code: 15 };

/** Karşılaştırma için: küçük harf (Türkçe I/İ dahil), aksan yok. */
export function fold(s: string): string {
  return s
    .replace(/I/g, 'i')
    .replace(/İ/g, 'i')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ı/g, 'i');
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const wordCount = (s: string) => (s.match(/[\p{L}\p{N}]+/gu) ?? []).length;

export interface GoalEntities {
  /** Tırnak içindeki metin: promptta aynen (büyük/küçük harf hariç) geçmeli. */
  quoted: string[];
  /** Sayılar ve oranlar (5, 30, 9:16, 1.500). */
  numbers: string[];
  /** Cümle ortasında büyük harfle başlayan özel adlar (Türkçe ekleri atılmış). */
  names: string[];
}

/**
 * Amaçtaki kritik varlıklar. Boş satırdan sonrası RouteAI'ın eklediği bağlamdır
 * (iş akışı adımı: "Bu adım: ..."), sadece ilk paragraf kullanıcının sözüdür.
 */
/**
 * Seslendirilecek metin: kullanıcının tırnak içinde verdiği en uzun metin (en az 3 kelime).
 * Tek tırnak da sayılır ('Bu derste…'), ama sadece boşluk, iki nokta ya da satır başından
 * sonra açılıp noktalama ya da satır sonuyla kapanırsa: Türkçe kesme işareti ("Lumina'yı") tırnak değildir.
 */
export function quotedScript(texts: string[]): string | null {
  const found: string[] = [];
  for (const t of texts) {
    found.push(...quotedTexts(t));
    for (const m of t.matchAll(/(?<=^|[\s:(])'([^'\n]{3,500})'(?=$|[\s.,;:!?)])/gu)) found.push(m[1].trim());
  }
  const scripts = found.filter((q) => wordCount(q) >= 3).sort((a, b) => b.length - a.length);
  return scripts[0] ?? null;
}

/** Tırnak içindeki metinler ("…", “…”, «…»). */
function quotedTexts(text: string): string[] {
  return [...text.matchAll(/"([^"\n]{1,120})"|“([^”\n]{1,120})”|«([^»\n]{1,120})»/g)]
    .map((m) => (m[1] ?? m[2] ?? m[3]).trim())
    .filter(Boolean);
}

export function goalEntities(goal: string, productName = ''): GoalEntities {
  const text = goal.split(/\n\s*\n/)[0] ?? '';
  const quoted = quotedTexts(text);
  const unquoted = text.replace(/"[^"\n]*"|“[^”\n]*”|«[^»\n]*»/g, ' ');
  const product = new Set((fold(productName).match(/[\p{L}\p{N}]+/gu) ?? []));

  const numbers = [...unquoted.matchAll(/(?<![\p{L}\p{N}])\d+(?:[.,:x×]\d+)*(?![\p{L}\p{N}])/gu)]
    .map((m) => m[0])
    .filter((n) => !product.has(n));

  const names: string[] = [];
  for (const m of unquoted.matchAll(/(?<![\p{L}\p{N}])\p{Lu}[\p{L}\p{N}&-]*(?:['’]\p{L}+)?/gu)) {
    const before = unquoted.slice(0, m.index).trimEnd();
    // Cümle başı (ya da başlık/madde başı) büyük harfi özel ad sayılmaz.
    if (before === '' || /[.!?:;\n(\[•\-–—]$/.test(before)) continue;
    const word = m[0].replace(/['’]\p{L}+$/u, '');
    if (word.length < 3 || product.has(fold(word))) continue;
    names.push(word);
  }
  return { quoted: [...new Set(quoted)], numbers: [...new Set(numbers)], names: [...new Set(names)] };
}

/**
 * Amaçtaki varlıklardan promptta (negatif prompt ve ayarlar dahil) olmayanlar.
 * Kullanıcı mesajlarından sadece tırnaklı metinler alınır: oradaki sayılar ve
 * adlar araç seçimiyle ilgili olabilir (bütçe, platform, başka araç adı).
 */
export function missingEntities(goal: string, variant: CheckedVariant, productName = '', userMessages: string[] = []): string[] {
  const e = goalEntities(goal, productName);
  const product = fold(productName);
  for (const q of userMessages.flatMap(quotedTexts)) {
    if (fold(q) !== product && !e.quoted.some((x) => fold(x) === fold(q))) e.quoted.push(q);
  }
  const haystack = [variant.prompt, variant.negativePrompt ?? '', ...variant.settings.map((s) => `${s.key} ${s.value}`)].join('\n');
  const lower = haystack.toLocaleLowerCase('tr');
  const folded = fold(haystack);
  const digits = haystack.replace(/(\d)[.,](?=\d{3}\b)/g, '$1');
  const missing: string[] = [];
  for (const q of e.quoted) if (!lower.includes(q.toLocaleLowerCase('tr'))) missing.push(`"${q}"`);
  for (const n of e.numbers) {
    const plain = n.replace(/(\d)[.,](?=\d{3}\b)/g, '$1');
    if (!new RegExp(`(?<![\\d])${escapeRe(plain)}(?![\\d])`).test(digits)) missing.push(n);
  }
  for (const name of e.names) if (!new RegExp(`(?<![\\p{L}\\p{N}])${escapeRe(fold(name))}`, 'u').test(folded)) missing.push(name);
  return missing;
}

/** Rehber validator'ı: regex (eşleşmeli), forbidRegex (eşleşmemeli), maxLength, mustInclude. */
export function validatorFails(prompt: string, v: GuideValidator): boolean {
  if (v.type === 'regex') return !new RegExp(String(v.value), v.flags ?? '').test(prompt);
  if (v.type === 'forbidRegex') return new RegExp(String(v.value), v.flags ?? '').test(prompt);
  if (v.type === 'maxLength') return prompt.length > Number(v.value);
  return !prompt.toLowerCase().includes(String(v.value).toLowerCase());
}

const FILLER_START = /^\W*(?:please\b|kindly\b|can you\b|could you\b|would you\b|i (?:want|need|would like)\b|i'd like\b|let'?s\b|(?:create|generate|make|draw|design|render|produce|paint|film|shoot|animate|give me|show me)\s+(?:me\s+)?(?:an?\s+|the\s+|some\s+)?(?:\w+\s+){0,3}?(?:image|picture|photo|photograph|illustration|logo|poster|drawing|artwork|render|video|clip|animation|scene|shot|footage)s?\b|lütfen\b|bana\b|benim için\b)/i;
const FILLER_ANYWHERE = /(?<![\p{L}])(?:please|lütfen)(?![\p{L}])/iu;
const META_START = /^\W*(?:sure\b|certainly\b|of course\b|here(?:'s| is| are)\b|below is\b|prompt\s*:|elbette\b|tabii\b|işte\b|aşağıda\b)/i;
const CONVERSATION_REF = /\b(?:as (?:we )?discussed|as (?:i )?mentioned (?:above|earlier|before)|see above|from (?:our|the) (?:conversation|chat))\b|yukarıda(?:ki)? (?:konuştuğumuz|belirttiğim|söylediğim)|daha önce (?:konuştuğumuz|belirttiğim|söylediğim)|önceki mesaj/i;
const VAGUE = /(?<![\/\p{L}])(?:etc\.(?=\s|$|\))|and so on|something (?:nice|cool|good|interesting)|whatever you (?:like|want|think)|bir şeyler|güzel bir şey(?:ler)?|falan(?: filan)?|vesaire|vb\.(?=\s|$|\)))/iu;
const RATIO = /(?<!\d)(\d{1,2}):(\d{1,2})(?!\d)/g;
/** Hedef araç RouteAI'ı tanımaz (2026-10-14 eval: Replit promptu "RouteAI, ..." diye başlamıştı). */
const ROUTEAI = /(?<![\p{L}])RouteAI(?![\p{L}])/iu;

/** Metin/kod/sunum araçları: talimat alan LLM'ler (meta-sınır ve etiket kontrolleri). */
const LLM_TOOLS = new Set(['text', 'code', 'slides']);
/** Ardışık "Etiket: değer" parçası bu sayıya ulaşınca mekanik etiket zinciri. */
export const MAX_LABEL_CHAIN = 3;

const segments = (prompt: string) => prompt.split(/(?<=[.!?;])\s+|\n+/).map((x) => x.trim()).filter(Boolean);

/**
 * En uzun ardışık "Etiket: kısa değer" zinciri ("Rol: X. Bağlam: Y. Görev: Z.").
 * Başlık satırı (iki noktadan sonra metin yok) ve "Bütçe: [bütçen]" gibi
 * kullanıcının dolduracağı yer tutucu satırları zincire sayılmaz.
 */
export function labelChainLength(prompt: string): number {
  let best = 0;
  let run = 0;
  for (const seg of segments(prompt)) {
    const m = /^(?:[-•*]|\d+[.)])?\s*\**(\p{Lu}[\p{L}\p{N} /&'-]{0,30}?)\**\s*:\s*(\S.*)$/u.exec(seg);
    const isLabel = !!m && m[1].trim().split(/\s+/).length <= 3 && !/^\[[^\]]+\][.;]?$/.test(m[2].trim());
    run = isLabel ? run + 1 : 0;
    best = Math.max(best, run);
  }
  return best;
}

const EN_IMPERATIVE = /^(?:[-•*]|\d+[.)])?\s*(?:\*\*)?(?:act|write|create|build|design|produce|generate|draft|analy[sz]e|compare|list|explain|return|output|provide|give|help|make|plan|develop|implement|fix|review|rewrite|translate|ask|include|use|start|begin|identify|propose|outline|prepare|define|describe|summari[sz]e|evaluate|recommend|structure|organi[sz]e|focus|keep|avoid|do not|don't|never|always|ensure|follow|check|test|run|add|remove|update|refactor|turn|convert|guide|lead|work|break|first|then|finally|deliver|cover|end|tailor|assume|treat|play|take|show|walk)\b/i;
const EN_ADDRESS = /\b(?:you|your|yourself)\b/i;
const TR_ADDRESS = /(?<![\p{L}])(?:sen|senden|sana|seni|görevin|rolün|amacın|hedefin|istiyorum|rica ediyorum|\p{L}+(?:malısın|melisin|malısınız|melisiniz))(?![\p{L}])/iu;
const TR_IMPERATIVE_END = /(?<![\p{L}])(?:yaz|oluştur|hazırla|tasarla|üret|geliştir|et|karşılaştır|listele|açıkla|ver|çıkar|planla|düzelt|incele|çevir|sor|kullan|başla|ekle|uygula|kur|belirle|öner|değerlendir|sırala|tanımla|özetle|göster|anlat|yap|tamamla|bitir|kaçın|koru|tut|odaklan|ilerle|davran|üstlen|al|getir|bul|seç|doğrula|çalıştır|yürüt|böl|ayır|bağla|yönet|yönlendir|eşlik et|rehberlik et|varsay)(?:ın|in|un|ün|ma|me)?[.!:;)]*$/iu;

/** Promptta hedef AI'a verilen en az bir talimat var mı (emir, "sen"/"you" hitabı, "istiyorum")? */
export function hasInstruction(prompt: string): boolean {
  return segments(prompt).some(
    (seg) => EN_IMPERATIVE.test(seg) || EN_ADDRESS.test(seg) || TR_ADDRESS.test(seg) || seg.split(/[,;]/).some((clause) => TR_IMPERATIVE_END.test(clause.trim()))
  );
}

/**
 * Değişikliklerin kısa özeti meşru bir teslimattır, isteği küçültmek değil
 * (2026-10-14 eval: Cursor promptundaki "a brief summary of the changes" yanlış alarm vermişti).
 */
const CHANGE_SUMMARY = /(?<![\p{L}])(?:a |one )?(?:short|brief) summary of (?:the |your |all |each )?(?:changes|edits|modifications|fix(?:es)?|commits?)(?![\p{L}])|(?<![\p{L}])(?:değişiklik|düzeltme)\p{L}* (?:kısa (?:bir )?)?özet\p{L}*/giu;

const DOWNGRADE = /(?<![\p{L}])(?:(?:a |one )?(?:short|brief|single) (?:paragraph|overview|summary|introduction)|general (?:information|overview)|basic overview|beginner[- ]level (?:introduction|overview|explanation)|kısa bir (?:paragraf|özet|bilgi|giriş)|genel (?:bir )?bilgi|hakkında (?:kısa )?bilgi ver\p{L}*|başlangıç seviyesinde (?:bir )?(?:giriş|bilgi|açıklama|özet))(?![\p{L}])/iu;

/** Rehber şablonundaki yer tutucular ("[konu]", "[stil/araç]"): promptta boş kalmamalı. */
function templatePlaceholders(guide: Guide): string[] {
  return [...new Set([...guide.body.template.matchAll(/\[[^\]\n]{2,40}\]/g)].map((m) => m[0]))];
}

/** Negatif terim promptta olumlu geçiyor mu ("no", "without"... ile değil)? */
function contradictedTerms(prompt: string, negativePrompt: string): string[] {
  const out: string[] = [];
  for (const raw of negativePrompt.split(/[,;\n]/)) {
    const term = raw.trim().replace(/^(?:no|without|avoid)\s+/i, '');
    if (term.length < 3 || term.split(/\s+/).length > 3) continue;
    const re = new RegExp(`(?<!(?:no|without|avoid|not|never|free of|zero)\\s+(?:\\p{L}+\\s+)?)(?<![\\p{L}\\p{N}])${escapeRe(term)}(?![\\p{L}\\p{N}])`, 'iu');
    if (re.test(prompt)) out.push(term);
  }
  return out;
}

/** Rubrik kontrolleri (rehber validator'ları hariç). */
export function sufficiencyIssues(variant: CheckedVariant, ctx: SufficiencyContext): SufficiencyIssue[] {
  const { guide } = ctx;
  const prompt = variant.prompt.trim();
  const issues: SufficiencyIssue[] = [];
  const add = (criterion: Criterion, message: string) => issues.push({ criterion, message });

  // 1. Bağlam tamlığı
  if (ctx.checkGoalEntities !== false) {
    const missing = missingEntities(ctx.goal, variant, ctx.productName, ctx.userMessages);
    if (missing.length > 0) {
      add('selfContainment', `The target tool never sees the conversation: keep these details from the user's goal and messages verbatim (unless a rule above forbids it): ${missing.join(', ')}.`);
    }
  }
  if (CONVERSATION_REF.test(prompt)) add('selfContainment', 'Do not refer to the conversation ("as discussed", "above"); state every detail inside the prompt.');
  if (ROUTEAI.test(prompt) && !ROUTEAI.test(ctx.productName ?? '')) {
    add('selfContainment', `Do not mention RouteAI: ${ctx.productName || 'the tool'} has never heard of it. Address ${ctx.productName || 'the tool'} (or no one) and state the task directly.`);
  }

  // 2. Araç sentaks uyumu
  if (META_START.test(prompt)) add('toolReadiness', 'Return only the prompt text: no assistant preamble such as "Sure" or "Here is".');
  if (VISUAL.has(guide.modality)) {
    if (FILLER_START.test(prompt) || FILLER_ANYWHERE.test(prompt)) {
      add('toolReadiness', `Do not address the tool conversationally ("Please create an image of..."); start directly with the ${guide.modality === 'video' ? 'shot, subject and action' : 'subject'} and describe it.`);
    }
  }
  const leftover = templatePlaceholders(guide).filter((p) => prompt.includes(p));
  if (leftover.length > 0) add('toolReadiness', `Fill in the template placeholders instead of copying them: ${leftover.join(', ')}.`);
  if (LLM_TOOLS.has(guide.modality) && labelChainLength(prompt) > MAX_LABEL_CHAIN) {
    add('toolReadiness', 'Do not write a chain of mechanical labels ("Role: X. Context: Y. Task: Z. Format: W."); write natural sections: the expert role and goal, the context and constraints, the expected output structure, and [placeholders] for what the user must fill in.');
  }

  // 3. Somutluk
  if (VAGUE.test(prompt)) add('actionability', 'Replace vague phrases ("etc.", "something nice") with concrete instructions the tool can follow.');
  const min = MIN_WORDS[guide.modality] ?? 8;
  if (wordCount(prompt) < min) add('actionability', `Too short to act on: describe the request concretely in at least ${min} words.`);
  if (LLM_TOOLS.has(guide.modality)) {
    if (segments(prompt).length >= 2 && !hasInstruction(prompt)) {
      add('actionability', `This reads like an answer about the topic, not a prompt: you are the prompt architect, not the executor. Write instructions that tell ${ctx.productName || 'the tool'} what to do and what to deliver.`);
    }
    const intent = classifyIntent(ctx.goal);
    if (intent && intent !== 'learn' && DOWNGRADE.test(prompt.replace(CHANGE_SUMMARY, ' ')) && !DOWNGRADE.test(ctx.goal)) {
      add('actionability', `The user wants to ${intent} something; do not shrink it to a short overview or general information. Ask for the concrete deliverable (a roadmap, a draft, a structured plan, a fix or a decision framework).`);
    }
  }

  // 4. Ayar ve negatif prompt tutarlılığı
  const negative = variant.negativePrompt?.trim();
  if (negative && NO_NEGATIVE_FIELD.has(guide.modality)) {
    add('consistency', 'This tool has no negative prompt field: move the exclusions into the prompt as constraints and set negativePrompt to null.');
  } else if (negative) {
    const contradicted = contradictedTerms(prompt, negative);
    if (contradicted.length > 0) add('consistency', `negativePrompt excludes what the prompt asks for: ${contradicted.join(', ')}. Remove the conflict.`);
  }
  const seen = new Map<string, string>();
  for (const s of variant.settings) {
    const key = s.key.trim().toLowerCase();
    if (!key || !s.value.trim()) {
      add('consistency', 'Every setting needs both a key and a value.');
      continue;
    }
    if (seen.has(key) && seen.get(key) !== s.value.trim()) add('consistency', `Setting "${s.key}" is given twice with different values.`);
    seen.set(key, s.value.trim());
  }
  const promptRatios = new Set([...prompt.matchAll(RATIO)].map((m) => `${m[1]}:${m[2]}`));
  for (const s of variant.settings) {
    if (!/aspect|ratio|format|oran|boyut/i.test(s.key)) continue;
    for (const m of s.value.matchAll(RATIO)) {
      const ratio = `${m[1]}:${m[2]}`;
      if (promptRatios.size > 0 && !promptRatios.has(ratio)) add('consistency', `Setting "${s.key}: ${s.value}" conflicts with the aspect ratio in the prompt (${[...promptRatios].join(', ')}).`);
    }
  }
  return issues;
}

/**
 * Yasaklı ifadenin promptta geçtiği yer (onarım mesajına eklenir). Genel mesaj
 * ("tarif yazma") onarımda yetmedi: 2026-10-14 kısmi eval'de model aynı cümleyi
 * tekrar yazdı, onarım turu sadece token harcadı. Hangi ifadenin sorun olduğunu
 * göstermek onarımı tutturur.
 */
function foundSnippet(prompt: string, v: GuideValidator): string {
  if (v.type !== 'forbidRegex') return '';
  const m = new RegExp(String(v.value), v.flags ?? '').exec(prompt);
  if (!m) return '';
  const start = Math.max(0, m.index - 40);
  const end = Math.min(prompt.length, m.index + m[0].length + 40);
  const text = `${start > 0 ? '…' : ''}${prompt.slice(start, end).replace(/\s+/g, ' ').trim()}${end < prompt.length ? '…' : ''}`;
  return ` Found: "${text}". Rewrite or remove that part.`;
}

/** Rehber validator'ları + rubrik: kriter başına sorunlar. Validator'ın kriteri yoksa toolReadiness. */
export function allIssues(variant: CheckedVariant, ctx: SufficiencyContext): SufficiencyIssue[] {
  const fromGuide = ctx.guide.validators
    .filter((v) => validatorFails(variant.prompt, v))
    .map((v) => ({ criterion: v.criterion ?? ('toolReadiness' as const), message: `${v.message}${foundSnippet(variant.prompt, v)}` }));
  return [...fromGuide, ...sufficiencyIssues(variant, ctx)];
}

export interface SufficiencyScore {
  /** 0-100: geçen kriter oranı. */
  score: number;
  criteria: Record<Criterion, boolean>;
  issues: SufficiencyIssue[];
}

/** Yeterlilik puanı: dört kriterin her biri eşit ağırlık (eval:prompts raporu). */
export function sufficiencyScore(variant: CheckedVariant, ctx: SufficiencyContext): SufficiencyScore {
  const issues = allIssues(variant, ctx);
  const criteria = Object.fromEntries(CRITERIA.map((c) => [c, !issues.some((i) => i.criterion === c)])) as Record<Criterion, boolean>;
  const passed = CRITERIA.filter((c) => criteria[c]).length;
  return { score: Math.round((passed / CRITERIA.length) * 100), criteria, issues };
}

// ------------------------------------------------------------------
// Kart düzeyi: howToUse ve varsayımlar (varyanttan bağımsız)
// ------------------------------------------------------------------

const USAGE = /prompt|yapıştır|kopyala|yer tutucu|köşeli|\[|ayar|çıktı|yanıt|cevab|sonuç|takip|komut|mesaj|iste|paste|copy|placeholder|setting|output|response|result|follow-up|follow up|reply|message|ask|regenerate|generate|üret/i;

/** howToUse: bu promptun araçta nasıl kullanılacağı (yapıştır + yer tutucu, ayar/ilk çıktı, takip komutu). */
export function howToUseIssues(howToUse: string[], productName = ''): string[] {
  const issues: string[] = [];
  const tool = fold(productName).split(/\s+/)[0] ?? '';
  const usage = howToUse.filter((step) => USAGE.test(step) || (tool.length > 2 && fold(step).includes(tool)));
  const mentionsPrompt = howToUse.some((step) => /prompt/i.test(step) || (tool.length > 2 && fold(step).includes(tool)));
  if (howToUse.length < 3 || usage.length < 2 || !mentionsPrompt) {
    issues.push(`howToUse must be 3 steps about using THIS prompt in ${productName || 'the tool'}, not general advice about the topic: (1) paste it and what to put in each [placeholder], (2) which setting or what in the first output to check, (3) a concrete follow-up message to improve the result.`);
  }
  return issues;
}

/** Türkçe arayüzde ham İngilizce seçenek değeri ya da İngilizce sabit gerekçe kalmış mı? */
export function assumptionLeaks(assumptions: Assumption[], guide: Guide, locale: 'en' | 'tr'): string[] {
  if (locale !== 'tr') return [];
  const leaks: string[] = [];
  for (const a of assumptions) {
    const slot = guide.slots.find((s) => s.id === a.slotId);
    const value = a.value.trim().toLowerCase();
    const raw = slot?.options.find((o) => o.value.trim().toLowerCase() === value && o.label.tr.trim().toLowerCase() !== value);
    if (raw) leaks.push(`${a.slotId}: "${a.value}" -> "${raw.label.tr}"`);
    if (/^(?:not specified|used the default|you didn't specify)/i.test(a.why.trim())) leaks.push(`${a.slotId}: why is in English`);
  }
  return leaks;
}

/** Kart düzeyi sorunlar: howToUse ve varsayım dili. */
export function cardIssues(output: { howToUse: string[]; assumptions: Assumption[] }, ctx: SufficiencyContext): string[] {
  const leaks = assumptionLeaks(output.assumptions, ctx.guide, ctx.locale ?? 'en');
  return [
    ...howToUseIssues(output.howToUse, ctx.productName),
    ...(leaks.length > 0 ? [`assumptions must be in the user's language, not raw option values: ${leaks.join('; ')}.`] : []),
  ];
}
