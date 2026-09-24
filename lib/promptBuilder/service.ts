// Prompt oturumu akışı:
//   başlat: oturum -> extract -> plan -> (soru kartı) ya da (generate -> validate -> PromptCard)
//   cevap:  soru kartı cevapları -> generate -> validate -> PromptCard
//   iyileştir: hazır buton | varsayım değişikliği | serbest talimat -> yeni versiyon
// Her sonuç oturuma yeni versiyon olarak eklenir. Oturum başına en fazla 10
// iyileştirme ve 1 soru kartı.

import type { Product } from '../catalog/schema';
import type { PromptCard, PromptQuestionCard } from '../agent/cards';
import type { Guide } from './guideSchema';
import type { JsonLLM } from './llm';
import type { PromptSessionStore } from './store';
import { extractSlots } from './extract';
import { applyAnswers, filledBy, planSlots } from './plan';
import { generatePrompt } from './generate';
import { validateWithRepair } from './validate';
import { MAX_REFINEMENTS, type PromptSession, type PromptVersion, type SlotState } from './types';

export interface PromptDeps {
  llm: JsonLLM;
  store: PromptSessionStore;
  guides: Guide[];
  products: Product[];
  now: () => number;
  newId: () => string;
  signal?: AbortSignal;
}

export type PromptError = 'unknown_product' | 'no_guide' | 'expired' | 'refine_limit' | 'unknown_refinement' | 'invalid' | 'no_pending_question';
export type PromptResult =
  | { card: PromptCard | PromptQuestionCard; tokens: number; session: PromptSession }
  | { error: PromptError; tokens: number };

function context(deps: PromptDeps, productId: string) {
  const product = deps.products.find((p) => p.id === productId && p.status === 'active');
  if (!product) return { error: 'unknown_product' as const };
  const guide = product.promptGuide ? deps.guides.find((g) => g.id === product.promptGuide) : undefined;
  if (!guide) return { error: 'no_guide' as const };
  return { product, guide };
}

export function toPromptCard(session: PromptSession, guide: Guide, product: Product): PromptCard {
  const version = session.versions.at(-1)!;
  const locale = session.locale;
  const guideRefinements = guide.refinements.map((r) => {
    const [slotId, value] = Object.entries(r.patch ?? {})[0] ?? [null, null];
    return { id: r.id, label: r.label[locale], kind: 'guide' as const, slotId, value, instruction: r.instruction ?? null };
  });
  const suggested = version.suggestedRefinements.map((r, i) => ({
    id: `suggested-${i + 1}`,
    label: r.label,
    kind: 'suggested' as const,
    slotId: r.slotId,
    value: r.value,
    instruction: r.instruction,
  }));
  return {
    type: 'prompt',
    promptSessionId: session.id,
    productId: product.id,
    productName: product.name,
    productUrl: product.url,
    guideId: guide.id,
    guideVersion: guide.version,
    draft: !guide.reviewedBy,
    versionN: version.n,
    variants: version.variants,
    assumptions: version.assumptions.map((a) => {
      const slot = guide.slots.find((s) => s.id === a.slotId)!;
      return {
        ...a,
        question: slot.question[locale],
        options: slot.options.map((o) => ({ id: o.id, label: o.label[locale], value: o.value })),
      };
    }),
    refinements: [...guideRefinements, ...suggested],
    howToUse: version.howToUse,
    filledBy: filledBy(session.slots),
    refinementsLeft: Math.max(0, MAX_REFINEMENTS - session.refinementCount),
  };
}

function toQuestionCard(session: PromptSession, guide: Guide, product: Product): PromptQuestionCard {
  return {
    type: 'prompt_question',
    promptSessionId: session.id,
    guideId: guide.id,
    productName: product.name,
    questions: session.pendingQuestions.map((slotId) => {
      const slot = guide.slots.find((s) => s.id === slotId)!;
      return {
        slotId,
        question: slot.question[session.locale],
        options: slot.options.map((o) => ({ id: o.id, label: o.label[session.locale] })),
        allowFreeText: true,
      };
    }),
  };
}

/** generate -> validate (+1 onarım) -> yeni versiyon. */
async function produceVersion(
  session: PromptSession,
  guide: Guide,
  product: Product,
  deps: PromptDeps,
  meta: { refinementIds: string[]; instruction?: string }
): Promise<{ version: PromptVersion; tokens: number }> {
  const previous = session.versions.at(-1);
  const input = {
    session,
    guide,
    productName: product.name,
    llm: deps.llm,
    signal: deps.signal,
    ...(previous && (meta.instruction || meta.refinementIds.length) ? { previous } : {}),
    ...(meta.instruction ? { instruction: meta.instruction } : {}),
  };
  const gen = await generatePrompt(input);
  const checked = await validateWithRepair(gen.output, input);
  return {
    tokens: gen.tokens + checked.tokens,
    version: {
      n: session.versions.length + 1,
      variants: checked.variants,
      assumptions: checked.output.assumptions,
      suggestedRefinements: checked.output.suggestedRefinements,
      howToUse: checked.output.howToUse,
      refinementIds: meta.refinementIds,
      ...(meta.instruction ? { instruction: meta.instruction } : {}),
      createdAt: new Date(deps.now()).toISOString(),
    },
  };
}

export async function startPromptSession(
  input: {
    productId: string;
    goal: string;
    slots?: Record<string, string>;
    conversation: { role: 'user' | 'assistant'; content: string }[];
    locale: 'en' | 'tr';
  },
  deps: PromptDeps
): Promise<PromptResult> {
  const ctx = context(deps, input.productId);
  if ('error' in ctx) return { error: ctx.error!, tokens: 0 };
  const { product, guide } = ctx;

  const extraction = await extractSlots({ conversation: input.conversation, goal: input.goal, guide, locale: input.locale, llm: deps.llm, signal: deps.signal });
  // Ajanın zaten bildiği slotlar (build_prompt argümanı) kullanıcı bilgisi sayılır.
  for (const [id, value] of Object.entries(input.slots ?? {})) {
    if (guide.slots.some((s) => s.id === id) && value.trim()) extraction.slots[id] = { value: value.trim().slice(0, 200), source: 'user', confidence: 1 };
  }
  const plan = planSlots(guide, extraction.slots, { questionAsked: false });

  const session: PromptSession = {
    id: deps.newId(),
    productId: product.id,
    guideId: guide.id,
    guideVersion: guide.version,
    goal: input.goal.slice(0, 1000),
    locale: input.locale,
    slots: plan.slots,
    questionAsked: plan.questions.length > 0,
    pendingQuestions: plan.questions.map((q) => q.id),
    versions: [],
    refinementCount: 0,
  };

  if (plan.questions.length > 0) {
    await deps.store.set(session);
    return { card: toQuestionCard(session, guide, product), tokens: extraction.tokens, session };
  }

  const { version, tokens } = await produceVersion(session, guide, product, deps, { refinementIds: [] });
  session.versions.push(version);
  await deps.store.set(session);
  return { card: toPromptCard(session, guide, product), tokens: extraction.tokens + tokens, session };
}

export async function answerPromptQuestions(
  input: { promptSessionId: string; answers: Record<string, string> },
  deps: PromptDeps
): Promise<PromptResult> {
  const session = await deps.store.get(input.promptSessionId);
  if (!session) return { error: 'expired', tokens: 0 };
  if (session.pendingQuestions.length === 0) return { error: 'no_pending_question', tokens: 0 };
  const ctx = context(deps, session.productId);
  if ('error' in ctx) return { error: ctx.error!, tokens: 0 };
  const { product, guide } = ctx;

  session.slots = applyAnswers(guide, session.slots, input.answers, session.pendingQuestions);
  session.pendingQuestions = [];
  const { version, tokens } = await produceVersion(session, guide, product, deps, { refinementIds: [] });
  session.versions.push(version);
  await deps.store.set(session);
  return { card: toPromptCard(session, guide, product), tokens, session };
}

export type RefineAction =
  | { refinementId: string }
  | { slotId: string; value: string }
  | { instruction: string };

export async function refinePromptSession(
  input: { promptSessionId: string } & RefineAction,
  deps: PromptDeps
): Promise<PromptResult> {
  const session = await deps.store.get(input.promptSessionId);
  if (!session) return { error: 'expired', tokens: 0 };
  if (session.versions.length === 0) return { error: 'invalid', tokens: 0 };
  if (session.refinementCount >= MAX_REFINEMENTS) return { error: 'refine_limit', tokens: 0 };
  const ctx = context(deps, session.productId);
  if ('error' in ctx) return { error: ctx.error!, tokens: 0 };
  const { product, guide } = ctx;

  let meta: { refinementIds: string[]; instruction?: string };
  const setSlot = (slotId: string, value: string): SlotState | null => {
    if (!guide.slots.some((s) => s.id === slotId)) return null;
    return { value: value.trim().slice(0, 200), source: 'user' };
  };

  if ('refinementId' in input) {
    // Hazır buton: rehberdeki ya da son versiyonun önerdiği
    const guideRef = guide.refinements.find((r) => r.id === input.refinementId);
    const suggestedIdx = /^suggested-(\d)$/.exec(input.refinementId)?.[1];
    const suggested = suggestedIdx ? session.versions.at(-1)!.suggestedRefinements[Number(suggestedIdx) - 1] : undefined;
    if (guideRef) {
      for (const [slotId, value] of Object.entries(guideRef.patch ?? {})) {
        const state = setSlot(slotId, value);
        if (state) session.slots[slotId] = state;
      }
      meta = { refinementIds: [guideRef.id], ...(guideRef.instruction ? { instruction: guideRef.instruction } : {}) };
    } else if (suggested) {
      if (suggested.slotId && suggested.value) {
        const state = setSlot(suggested.slotId, suggested.value);
        if (state) session.slots[suggested.slotId] = state;
      }
      meta = { refinementIds: [input.refinementId], ...(suggested.instruction ? { instruction: suggested.instruction } : {}) };
    } else {
      return { error: 'unknown_refinement', tokens: 0 };
    }
  } else if ('slotId' in input) {
    // Varsayım değişikliği: slot güncellenir (source: user), yeniden üretilir
    const state = setSlot(input.slotId, input.value);
    if (!state || !state.value) return { error: 'invalid', tokens: 0 };
    session.slots[input.slotId] = state;
    meta = { refinementIds: ['assumption'] };
  } else {
    // Serbest talimat: önceki versiyon + talimat
    const instruction = input.instruction.trim().slice(0, 500);
    if (!instruction) return { error: 'invalid', tokens: 0 };
    meta = { refinementIds: ['free_text'], instruction };
  }

  const { version, tokens } = await produceVersion(session, guide, product, deps, meta);
  session.versions.push(version);
  session.refinementCount++;
  await deps.store.set(session);
  return { card: toPromptCard(session, guide, product), tokens, session };
}
