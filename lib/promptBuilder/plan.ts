// Deterministik (LLM yok): hangi slotlar sorulacak, hangileri nasıl dolacak.
//
// Soru kartı sadece giriş aşırı belirsizse çıkar: hiçbir slotta kullanıcı
// bilgisi ya da güveni >= MIN_CONFIDENCE olan çıkarım yoksa. Aksi halde
// (forceAutoGenerate, varsayılan) kart yok, doğrudan üretim. Kart çıkarsa aday:
// impact 'high' ve değeri yok ya da güveni < MIN_CONFIDENCE; rehber sırasıyla
// en fazla 3 tanesi TEK kartta. Oturum başına en fazla 1 soru kartı.
//
// LLM'in ürettiği değer statik default ile ezilmez. Güveni düşük değerler
// (akıllı varsayım) source 'default' olur: PromptCard'da "Varsayımlar" altında
// girişe göre üretilmiş seçenekleriyle listelenir.

import type { Guide, GuideSlot } from './guideSchema';
import type { ExtractedSlot } from './extract';
import type { DynamicQuestion, SlotState } from './types';

export const MAX_QUESTIONS_PER_CARD = 3;
export const MIN_CONFIDENCE = 0.65;
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

export function planSlots(
  guide: Guide,
  extracted: Record<string, ExtractedSlot>,
  { questionAsked, forceAutoGenerate = true }: { questionAsked: boolean; forceAutoGenerate?: boolean }
): Plan {
  const hasMeaningfulContext = Object.values(extracted).some(
    (e) => e.value !== null && (e.source === 'user' || e.confidence >= MIN_CONFIDENCE)
  );
  const candidates = questionAsked || (forceAutoGenerate && hasMeaningfulContext)
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
      slots[s.id] = { value: e.value, source: e.confidence < MIN_CONFIDENCE ? 'default' : e.source };
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
  overrides: Record<string, DynamicQuestion> = {}
): Record<string, SlotState> {
  const next = { ...slots };
  for (const slotId of asked) {
    const slot = guide.slots.find((s) => s.id === slotId);
    if (!slot) continue;
    const answer = answers[slotId]?.trim();
    if (!answer || answer === 'auto') {
      next[slotId] = { value: slots[slotId]?.value ?? defaultValue(slot), source: 'default' };
      continue;
    }
    const option = overrides[slotId]?.options.find((o) => o.id === answer) ?? slot.options.find((o) => o.id === answer);
    next[slotId] = { value: option ? option.value : answer.slice(0, SLOT_VALUE_MAX), source: 'user' };
  }
  return next;
}

export function filledBy(slots: Record<string, SlotState>) {
  const counts = { user: 0, inferred: 0, default: 0 };
  for (const s of Object.values(slots)) counts[s.source]++;
  return counts;
}
