// Deterministik (LLM yok): hangi slotlar sorulacak, hangileri nasıl dolacak.
//
// Navigasyon eşiği (forceAutoGenerate, varsayılan): kullanıcı ayrıntılı yazdıysa
// soru yok, doğrudan üretim; çok genel bir hedef yazdıysa önce soru kartı.
// Doğrudan üretim için şunlardan biri gerekir (ve hedef geniş olmamalı):
//  - kullanıcının açıkça söylediği (source 'user', güven >= USER_DETAIL_CONFIDENCE)
//    en az MIN_USER_DETAILS anlamlı ayrıntı, ya da
//  - tüm 'high' slotların yüksek güvenle (>= HIGH_SLOTS_KNOWN_CONFIDENCE) çıkarılmış olması.
// Kart çıkarsa aday: impact 'high' ve değeri yok ya da güveni < MIN_CONFIDENCE;
// rehber sırasıyla en fazla 3 tanesi TEK kartta. Oturum başına en fazla 1 soru kartı.
//
// LLM'in ürettiği değer statik default ile ezilmez. Güveni düşük değerler
// (akıllı varsayım) source 'default' olur: PromptCard'da "Varsayımlar" altında
// girişe göre üretilmiş seçenekleriyle listelenir.

import type { Guide, GuideSlot } from './guideSchema';
import type { ExtractedSlot } from './extract';
import type { DynamicQuestion, SlotState } from './types';

export const MAX_QUESTIONS_PER_CARD = 3;
export const MIN_CONFIDENCE = 0.65;
/** Doğrudan üretim için kullanıcının açıkça söylediği en az ayrıntı sayısı ve güveni. */
export const MIN_USER_DETAILS = 2;
export const USER_DETAIL_CONFIDENCE = 0.75;
/** Tüm 'high' slotlar bu güvenle çıkarıldıysa da soru kartı atlanır. */
export const HIGH_SLOTS_KNOWN_CONFIDENCE = 0.7;
/** Serbest cevap ve varsayım değişikliği üst sınırı (lib/validations/prompt.ts ile aynı). */
export const SLOT_VALUE_MAX = 300;

/** Slotun varsayılan değeri: seçenek id'siyse o seçeneğin değeri, 'infer' ise null (üretici seçer). */
export function defaultValue(slot: GuideSlot): string | null {
  if (slot.default === 'infer') return null;
  return slot.options.find((o) => o.id === slot.default)?.value ?? null;
}

export interface Plan {
  slots: Record<string, SlotState>;
  /** Boşsa soru kartı yok, doğrudan üretim. */
  questions: GuideSlot[];
}

/** Soru kartını atlayıp doğrudan üretmeye yetecek kadar ayrıntı var mı? */
export function hasEnoughDetail(guide: Guide, extracted: Record<string, ExtractedSlot>, isBroadGoal = false): boolean {
  if (isBroadGoal) return false;
  const userDetails = Object.values(extracted).filter(
    (e) => e.value !== null && e.source === 'user' && e.confidence >= USER_DETAIL_CONFIDENCE
  ).length;
  const allHighKnown = guide.slots
    .filter((s) => s.impact === 'high')
    .every((s) => {
      const e = extracted[s.id];
      return !!e && e.value !== null && e.confidence >= HIGH_SLOTS_KNOWN_CONFIDENCE;
    });
  return userDetails >= MIN_USER_DETAILS || allHighKnown;
}

export function planSlots(
  guide: Guide,
  extracted: Record<string, ExtractedSlot>,
  { questionAsked, forceAutoGenerate = true, isBroadGoal = false }: { questionAsked: boolean; forceAutoGenerate?: boolean; isBroadGoal?: boolean }
): Plan {
  const skipQuestions = questionAsked || (forceAutoGenerate && hasEnoughDetail(guide, extracted, isBroadGoal));
  const candidates = skipQuestions
    ? []
    : guide.slots
        .filter((s) => s.impact === 'high')
        .filter((s) => {
          const e = extracted[s.id];
          return !e || e.value === null || e.confidence < MIN_CONFIDENCE;
        })
        .slice(0, MAX_QUESTIONS_PER_CARD);

  const slots: Record<string, SlotState> = {};
  for (const s of guide.slots) {
    const e = extracted[s.id];
    if (e && e.value !== null) {
      // Sorulan slotta da LLM'in değeri kalır; kullanıcı "Sen seç" derse o kullanılır.
      slots[s.id] = { value: e.value, source: e.confidence < MIN_CONFIDENCE ? 'default' : e.source, ...(e.label ? { label: e.label } : {}) };
    } else {
      slots[s.id] = { value: defaultValue(s), source: 'default' };
    }
  }
  return { slots, questions: candidates };
}

/**
 * Soru kartı cevapları: seçenek id'si -> seçeneğin değeri (user),
 * 'auto' ya da boş -> mevcut (akıllı) varsayım, yoksa rehber varsayılanı (default), başka metin -> serbest cevap (user).
 * Slot için girişe göre üretilmiş soru varsa önce onun seçeneklerine bakılır.
 */
export function applyAnswers(
  guide: Guide,
  slots: Record<string, SlotState>,
  answers: Record<string, string>,
  asked: string[],
  overrides: Record<string, DynamicQuestion> = {},
  locale: 'en' | 'tr' = 'tr'
): Record<string, SlotState> {
  const next = { ...slots };
  for (const slotId of asked) {
    const slot = guide.slots.find((s) => s.id === slotId);
    if (!slot) continue;
    const answer = answers[slotId]?.trim();
    if (!answer || answer === 'auto') {
      const kept = slots[slotId]?.value ?? null;
      next[slotId] = { value: kept ?? defaultValue(slot), source: 'default', ...(kept && slots[slotId]?.label ? { label: slots[slotId].label } : {}) };
      continue;
    }
    const dynamic = overrides[slotId]?.options.find((o) => o.id === answer);
    const option = slot.options.find((o) => o.id === answer);
    if (dynamic) next[slotId] = { value: dynamic.value, source: 'user', label: dynamic.label };
    else if (option) next[slotId] = { value: option.value, source: 'user', label: option.label[locale] };
    else next[slotId] = { value: answer.slice(0, SLOT_VALUE_MAX), source: 'user' };
  }
  return next;
}

/**
 * Slot değerinin kullanıcı dilindeki gösterimi: kayıtlı etiket, girişe göre
 * üretilmiş seçeneğin etiketi, rehber seçeneğinin etiketi; hiçbiri yoksa değer.
 * Türkçe ekranda "a beginner" gibi ham İngilizce seçenek değerleri görünmez.
 */
export function displayValue(
  slot: GuideSlot | undefined,
  value: string,
  locale: 'en' | 'tr',
  { label, dynamic }: { label?: string; dynamic?: DynamicQuestion } = {}
): string {
  if (label) return label;
  const key = value.trim().toLowerCase();
  const fromDynamic = dynamic?.options.find((o) => o.value.trim().toLowerCase() === key);
  if (fromDynamic) return fromDynamic.label;
  const fromGuide = slot?.options.find((o) => o.value.trim().toLowerCase() === key);
  return fromGuide ? fromGuide.label[locale] : value;
}

export function filledBy(slots: Record<string, SlotState>) {
  const counts = { user: 0, inferred: 0, default: 0 };
  for (const s of Object.values(slots)) counts[s.source]++;
  return counts;
}
