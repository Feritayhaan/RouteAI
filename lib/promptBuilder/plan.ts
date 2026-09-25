// Deterministik (LLM yok): hangi slotlar sorulacak, hangileri varsayılanla dolacak.
//
// Soru adayı: impact 'high' ve değeri yok ya da güveni < 0.6. Rehberdeki
// sırayla en fazla 3 tanesi TEK kartta sorulur. Oturum başına en fazla 1 soru
// kartı; bütçe bittiyse ya da aday yoksa kalan boşluklar default ile dolar.

import type { Guide, GuideSlot } from './guideSchema';
import type { ExtractedSlot } from './extract';
import type { SlotState } from './types';

export const MAX_QUESTIONS_PER_CARD = 3;
export const MIN_CONFIDENCE = 0.6;

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

export function planSlots(guide: Guide, extracted: Record<string, ExtractedSlot>, { questionAsked }: { questionAsked: boolean }): Plan {
  const candidates = questionAsked
    ? []
    : guide.slots
        .filter((s) => s.impact === 'high')
        .filter((s) => {
          const e = extracted[s.id];
          return !e || e.value === null || e.confidence < MIN_CONFIDENCE;
        })
        .slice(0, MAX_QUESTIONS_PER_CARD);
  const asked = new Set(candidates.map((s) => s.id));

  const slots: Record<string, SlotState> = {};
  for (const s of guide.slots) {
    const e = extracted[s.id];
    if (asked.has(s.id)) {
      // Cevap gelene kadar varsayılan; kullanıcı "Sen seç" derse bu kalır.
      slots[s.id] = { value: defaultValue(s), source: 'default' };
    } else if (e && e.value !== null) {
      slots[s.id] = { value: e.value, source: e.source };
    } else {
      slots[s.id] = { value: defaultValue(s), source: 'default' };
    }
  }
  return { slots, questions: candidates };
}

/**
 * Soru kartı cevapları: seçenek id'si -> seçeneğin değeri (user),
 * 'auto' -> varsayılan (default), başka metin -> serbest cevap (user).
 */
export function applyAnswers(
  guide: Guide,
  slots: Record<string, SlotState>,
  answers: Record<string, string>,
  asked: string[]
): Record<string, SlotState> {
  const next = { ...slots };
  for (const slotId of asked) {
    const slot = guide.slots.find((s) => s.id === slotId);
    if (!slot) continue;
    const answer = answers[slotId]?.trim();
    if (!answer || answer === 'auto') {
      next[slotId] = { value: defaultValue(slot), source: 'default' };
      continue;
    }
    const option = slot.options.find((o) => o.id === answer);
    next[slotId] = { value: option ? option.value : answer.slice(0, 200), source: 'user' };
  }
  return next;
}

export function filledBy(slots: Record<string, SlotState>) {
  const counts = { user: 0, inferred: 0, default: 0 };
  for (const s of Object.values(slots)) counts[s.source]++;
  return counts;
}
