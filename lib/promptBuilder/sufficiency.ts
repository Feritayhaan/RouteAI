// Hedef AI yeterlilik kontrolleri (AI Sufficiency Rubric). Deterministik, LLM yok.
//
// Hedef araç (ChatGPT, Midjourney, Cursor...) RouteAI'daki konuşmayı görmez;
// prompt tek başına yeterli olmalı. Dört kriter:
//  - selfContainment: amaçtaki kritik varlıklar (tırnaklı metin, sayılar, özel
//    adlar) promptta var; "yukarıda konuştuğumuz" gibi konuşmaya atıf yok.
//  - toolReadiness: görsel/videoda sohbet dolgusu yok ("Please create an image
//    of..."), asistan meta metni yok, şablon yer tutucusu boş kalmamış; araca
//    özel işaretler rehberin validator'larından gelir (criterion alanı).
//  - actionability: muğlak ifade yok ("etc.", "bir şeyler"), çok kısa değil.
//  - consistency: negativePrompt ve settings promptla ve araçla çelişmiyor.
// Hata mesajları İngilizce: validateWithRepair onarım turunda LLM'e gider.

import type { Guide, GuideValidator } from './guideSchema';
import type { Variant } from './types';

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
}

type CheckedVariant = Pick<Variant, 'prompt' | 'negativePrompt' | 'settings'>;

/** Rehberde negatif prompt alanı olmayan modaliteler. */
const NO_NEGATIVE_FIELD = new Set(['text', 'code', 'slides', 'audio', 'music']);
/** Doğrudan sahne tarifi bekleyen modaliteler (sohbet dolgusu yasak). */
const VISUAL = new Set(['image', 'video']);
/** Uygulanabilir bir prompt için en az kelime (modaliteye göre RouteAI eşiği). */
const MIN_WORDS: Record<string, number> = { image: 6, video: 8, music: 4, audio: 6, slides: 12, text: 12, code: 15 };

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
export function goalEntities(goal: string, productName = ''): GoalEntities {
  const text = goal.split(/\n\s*\n/)[0] ?? '';
  const quoted = [...text.matchAll(/"([^"\n]{1,120})"|“([^”\n]{1,120})”|«([^»\n]{1,120})»/g)]
    .map((m) => (m[1] ?? m[2] ?? m[3]).trim())
    .filter(Boolean);
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

/** Amaçtaki varlıklardan promptta (negatif prompt ve ayarlar dahil) olmayanlar. */
export function missingEntities(goal: string, variant: CheckedVariant, productName = ''): string[] {
  const e = goalEntities(goal, productName);
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
    const missing = missingEntities(ctx.goal, variant, ctx.productName);
    if (missing.length > 0) {
      add('selfContainment', `The target tool never sees the conversation: keep these details from the user's goal verbatim (unless a rule above forbids it): ${missing.join(', ')}.`);
    }
  }
  if (CONVERSATION_REF.test(prompt)) add('selfContainment', 'Do not refer to the conversation ("as discussed", "above"); state every detail inside the prompt.');

  // 2. Araç sentaks uyumu
  if (META_START.test(prompt)) add('toolReadiness', 'Return only the prompt text: no assistant preamble such as "Sure" or "Here is".');
  if (VISUAL.has(guide.modality)) {
    if (FILLER_START.test(prompt) || FILLER_ANYWHERE.test(prompt)) {
      add('toolReadiness', `Do not address the tool conversationally ("Please create an image of..."); start directly with the ${guide.modality === 'video' ? 'shot, subject and action' : 'subject'} and describe it.`);
    }
  }
  const leftover = templatePlaceholders(guide).filter((p) => prompt.includes(p));
  if (leftover.length > 0) add('toolReadiness', `Fill in the template placeholders instead of copying them: ${leftover.join(', ')}.`);

  // 3. Somutluk
  if (VAGUE.test(prompt)) add('actionability', 'Replace vague phrases ("etc.", "something nice") with concrete instructions the tool can follow.');
  const min = MIN_WORDS[guide.modality] ?? 8;
  if (wordCount(prompt) < min) add('actionability', `Too short to act on: describe the request concretely in at least ${min} words.`);

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

/** Rehber validator'ları + rubrik: kriter başına sorunlar. Validator'ın kriteri yoksa toolReadiness. */
export function allIssues(variant: CheckedVariant, ctx: SufficiencyContext): SufficiencyIssue[] {
  const fromGuide = ctx.guide.validators
    .filter((v) => validatorFails(variant.prompt, v))
    .map((v) => ({ criterion: v.criterion ?? ('toolReadiness' as const), message: v.message }));
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
