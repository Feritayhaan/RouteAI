// Prompt oturumu akışı:
//   başlat: oturum -> extract -> plan -> (soru kartı) ya da (generate -> validate -> PromptCard)
//   cevap:  soru kartı cevapları -> generate -> validate -> PromptCard
//   sohbet:  kullanıcının yazdığı mesaj -> düzenle (yeni versiyon) | eski sürüme dön | kısa cevap
//   iyileştir (eski, arayüzde artık yok): hazır buton | varsayım değişikliği | serbest talimat -> yeni versiyon
// Her düzenleme oturuma yeni versiyon olarak eklenir; versiyon hangi versiyondan
// türediğini (parent) bilir. Oturum başına en fazla MAX_REFINEMENTS (20)
// düzenleme, MAX_CHAT_TURNS (60) sohbet mesajı ve 1 soru kartı.

import type { Product, Task } from '../catalog/schema';
import type { PromptCard, PromptQuestionCard } from '../agent/cards';
import type { Guide } from './guideSchema';
import type { JsonLLM } from './llm';
import type { PromptSessionStore } from './store';
import { extractSlots } from './extract';
import { resolveGuideId } from './fallback';
import { applyAnswers, filledBy, planSlots, SLOT_VALUE_MAX } from './plan';
import { generatePrompt } from './generate';
import { validateWithRepair } from './validate';
import { chatText, classifyTurn, isRevertCommand, previousVersionOf, type TurnIntent } from './chat';
import { EDIT_HISTORY_MAX, EDIT_REQUEST_MAX, MAX_CHAT_TURNS, MAX_REFINEMENTS, MAX_VERSIONS, type PromptSession, type PromptVersion, type SlotState } from './types';

export interface PromptDeps {
  llm: JsonLLM;
  store: PromptSessionStore;
  guides: Guide[];
  products: Product[];
  /** Rehberi olmayan ürüne genel rehber seçmek için (lib/promptBuilder/fallback.ts). Yoksa sadece özel rehber. */
  tasksById?: Map<string, Task>;
  now: () => number;
  newId: () => string;
  signal?: AbortSignal;
}

export type PromptError = 'unknown_product' | 'no_guide' | 'expired' | 'refine_limit' | 'unknown_refinement' | 'invalid' | 'no_pending_question';
/** Sohbet mesajının sonucu: ne yapıldı ve kullanıcıya gösterilecek cevap. */
export interface ChatOutcome {
  action: 'edit' | 'revert' | 'reply';
  reply: string;
}
export type PromptResult =
  | { card: PromptCard | PromptQuestionCard; tokens: number; session: PromptSession; chat?: ChatOutcome }
  | { error: PromptError; tokens: number };

function context(deps: PromptDeps, productId: string, taskId?: string) {
  const product = deps.products.find((p) => p.id === productId && p.status === 'active');
  if (!product) return { error: 'unknown_product' as const };
  // Öncelik: araca özel rehber > kullanıcının işi için görev rehberi > ortak > tür (fallback.ts).
  const resolved = resolveGuideId(product, deps.tasksById, { guides: deps.guides, taskId });
  const guide = resolved ? deps.guides.find((g) => g.id === resolved.guideId) : undefined;
  if (!resolved || !guide) return { error: 'no_guide' as const };
  return { product, guide, generic: resolved.generic };
}

/** `shown`: kartta gösterilecek versiyon; yoksa son versiyon. */
export function toPromptCard(session: PromptSession, guide: Guide, product: Product, generic = false, shown?: PromptVersion): PromptCard {
  const version = shown ?? session.versions.at(-1)!;
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
    ...(generic ? { genericGuide: true } : {}),
    versionN: version.n,
    variants: version.variants,
    assumptions: version.assumptions.map((a) => {
      const slot = guide.slots.find((s) => s.id === a.slotId)!;
      // Girişe göre üretilmiş soru varsa "Değiştir" aynı soruyu ve seçenekleri gösterir.
      const dynamic = session.questionOverrides?.[a.slotId];
      return {
        ...a,
        question: dynamic?.question ?? slot.question[locale],
        options: dynamic
          ? dynamic.options.map((o) => ({ id: o.id, label: o.label, value: o.value }))
          : slot.options.map((o) => ({ id: o.id, label: o.label[locale], value: o.value })),
      };
    }),
    refinements: [...guideRefinements, ...suggested],
    howToUse: version.howToUse,
    filledBy: filledBy(version.slots ?? session.slots),
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
      // Önce kullanıcının girişine göre üretilmiş soru; yoksa rehberdeki sabit soru.
      const dynamic = session.questionOverrides?.[slotId];
      return {
        slotId,
        question: dynamic?.question ?? slot.question[session.locale],
        options: dynamic
          ? dynamic.options.map((o) => ({ id: o.id, label: o.label }))
          : slot.options.map((o) => ({ id: o.id, label: o.label[session.locale] })),
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
  meta: {
    refinementIds: string[];
    instruction?: string;
    /** Düzenlemenin üzerine yapıldığı versiyon (gösterilen); yoksa son versiyon. */
    base?: PromptVersion;
    /** Bu içeriğe giren kullanıcı istekleri (son istek dahil); yoksa önceki versiyondan devralınır. */
    edits?: string[];
  },
  generic: boolean
): Promise<{ version: PromptVersion; tokens: number }> {
  const previous = meta.base ?? session.versions.at(-1);
  const edits = meta.edits ?? previous?.edits;
  const input = {
    session,
    guide,
    productName: product.name,
    genericGuide: generic,
    llm: deps.llm,
    signal: deps.signal,
    ...(previous && (meta.instruction || meta.refinementIds.length) ? { previous } : {}),
    ...(meta.instruction ? { instruction: meta.instruction } : {}),
    ...(meta.instruction && meta.edits && meta.edits.length > 1 ? { earlierRequests: meta.edits.slice(0, -1) } : {}),
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
      ...(meta.instruction && checked.output.changeSummary ? { summary: checked.output.changeSummary } : {}),
      ...(previous ? { parent: previous.n } : {}),
      ...(edits?.length ? { edits } : {}),
      slots: structuredClone(session.slots),
      createdAt: new Date(deps.now()).toISOString(),
    },
  };
}

export async function startPromptSession(
  input: {
    productId: string;
    goal: string;
    /** Kullanıcının işi (data/tasks.json); rehber seçimi için. Yoksa ürünün ilk görevi. */
    taskId?: string;
    slots?: Record<string, string>;
    conversation: { role: 'user' | 'assistant'; content: string }[];
    locale: 'en' | 'tr';
  },
  deps: PromptDeps
): Promise<PromptResult> {
  const ctx = context(deps, input.productId, input.taskId);
  if ('error' in ctx) return { error: ctx.error!, tokens: 0 };
  const { product, guide, generic } = ctx;

  const extraction = await extractSlots({ conversation: input.conversation, goal: input.goal, guide, locale: input.locale, llm: deps.llm, signal: deps.signal });
  // Ajanın zaten bildiği slotlar (build_prompt argümanı) kullanıcı bilgisi sayılır.
  for (const [id, value] of Object.entries(input.slots ?? {})) {
    if (guide.slots.some((s) => s.id === id) && value.trim()) extraction.slots[id] = { value: value.trim().slice(0, 200), source: 'user', confidence: 1 };
  }
  const plan = planSlots(guide, extraction.slots, { questionAsked: false });
  const questionOverrides = Object.fromEntries(
    plan.questions.filter((q) => extraction.questions[q.id]).map((q) => [q.id, extraction.questions[q.id]])
  );

  const session: PromptSession = {
    id: deps.newId(),
    productId: product.id,
    ...(input.taskId ? { taskId: input.taskId } : {}),
    guideId: guide.id,
    guideVersion: guide.version,
    goal: input.goal.slice(0, 1000),
    locale: input.locale,
    slots: plan.slots,
    questionAsked: plan.questions.length > 0,
    pendingQuestions: plan.questions.map((q) => q.id),
    ...(Object.keys(questionOverrides).length ? { questionOverrides } : {}),
    versions: [],
    refinementCount: 0,
  };

  if (plan.questions.length > 0) {
    await deps.store.set(session);
    return { card: toQuestionCard(session, guide, product), tokens: extraction.tokens, session };
  }

  const { version, tokens } = await produceVersion(session, guide, product, deps, { refinementIds: [] }, generic);
  session.versions.push(version);
  await deps.store.set(session);
  return { card: toPromptCard(session, guide, product, generic), tokens: extraction.tokens + tokens, session };
}

export async function answerPromptQuestions(
  input: { promptSessionId: string; answers: Record<string, string> },
  deps: PromptDeps
): Promise<PromptResult> {
  const session = await deps.store.get(input.promptSessionId);
  if (!session) return { error: 'expired', tokens: 0 };
  if (session.pendingQuestions.length === 0) return { error: 'no_pending_question', tokens: 0 };
  const ctx = context(deps, session.productId, session.taskId);
  if ('error' in ctx) return { error: ctx.error!, tokens: 0 };
  const { product, guide, generic } = ctx;

  session.slots = applyAnswers(guide, session.slots, input.answers, session.pendingQuestions, session.questionOverrides);
  session.pendingQuestions = [];
  const { version, tokens } = await produceVersion(session, guide, product, deps, { refinementIds: [] }, generic);
  session.versions.push(version);
  await deps.store.set(session);
  return { card: toPromptCard(session, guide, product, generic), tokens, session };
}

export type RefineAction =
  | { refinementId: string }
  | { slotId: string; value: string }
  | { instruction: string }
  /** Sohbet mesajı; baseVersion = kullanıcının o an gördüğü sürüm (yoksa son sürüm). */
  | { message: string; baseVersion?: number };

/** Geçmişe eklenen istek kısaltılır (KV kaydı şişmesin); üreticiye giden asıl talimat tam kalır. */
const appendEdit = (edits: string[] | undefined, request: string) => [...(edits ?? []), request.slice(0, EDIT_REQUEST_MAX)].slice(-EDIT_HISTORY_MAX);

/**
 * Sohbet mesajı: önce ne istediği anlaşılır (geri al komutu LLM'siz, gerisi küçük
 * bir sınıflandırma çağrısı), sonra ya düzenleme (gösterilen sürümün üstüne yeni
 * versiyon), ya eski sürüme dönüş (sunucuda yeni versiyon yok), ya kısa cevap.
 */
async function chatTurn(input: { promptSessionId: string; message: string; baseVersion?: number }, deps: PromptDeps): Promise<PromptResult> {
  const session = await deps.store.get(input.promptSessionId);
  if (!session) return { error: 'expired', tokens: 0 };
  if (session.versions.length === 0) return { error: 'invalid', tokens: 0 };
  const message = input.message.trim().slice(0, 1000);
  if (message.length < 2) return { error: 'invalid', tokens: 0 };
  const turns = session.chatTurns ?? 0;
  if (turns >= MAX_CHAT_TURNS) return { error: 'refine_limit', tokens: 0 };
  const ctx = context(deps, session.productId, session.taskId);
  if ('error' in ctx) return { error: ctx.error!, tokens: 0 };
  const { product, guide, generic } = ctx;

  const shown = input.baseVersion === undefined ? session.versions.at(-1) : session.versions.find((v) => v.n === input.baseVersion);
  if (!shown) return { error: 'invalid', tokens: 0 };
  const locale = session.locale;

  let tokens = 0;
  let intent: TurnIntent;
  if (isRevertCommand(message)) {
    intent = { intent: 'revert', target: previousVersionOf(shown), tokens: 0 };
  } else {
    intent = await classifyTurn({ message, session, shown, productName: product.name, llm: deps.llm, signal: deps.signal });
    tokens += intent.tokens;
  }

  // Kart gösterilen sürümle döner; sunucu durumu sadece sohbet sayacı kadar değişir.
  const answer = async (view: PromptVersion, action: ChatOutcome['action'], reply: string): Promise<PromptResult> => {
    session.chatTurns = turns + 1;
    await deps.store.set(session);
    return { card: toPromptCard(session, guide, product, generic, view), tokens, session, chat: { action, reply } };
  };

  if (intent.intent === 'reply') return answer(shown, 'reply', intent.reply || chatText(locale, 'unclear'));

  if (intent.intent === 'revert') {
    const target = intent.target === null ? undefined : session.versions.find((v) => v.n === intent.target);
    if (intent.target === 0) return answer(shown, 'reply', chatText(locale, 'noPrevious'));
    if (!target) return answer(shown, 'reply', chatText(locale, 'unclearVersion'));
    if (target.n === shown.n) return answer(shown, 'reply', chatText(locale, 'sameVersion'));
    return answer(target, 'revert', chatText(locale, 'reverted', target.n));
  }

  // Düzenleme: gösterilen sürümün üstüne yeni versiyon
  if (session.refinementCount >= MAX_REFINEMENTS || session.versions.length >= MAX_VERSIONS) return { error: 'refine_limit', tokens };
  if (shown.slots) session.slots = structuredClone(shown.slots);
  const edits = appendEdit(shown.edits, message);
  const produced = await produceVersion(session, guide, product, deps, { refinementIds: ['chat'], instruction: message, base: shown, edits }, generic);
  tokens += produced.tokens;
  session.versions.push(produced.version);
  session.refinementCount++;
  session.chatTurns = turns + 1;
  await deps.store.set(session);
  return {
    card: toPromptCard(session, guide, product, generic),
    tokens,
    session,
    chat: { action: 'edit', reply: produced.version.summary || chatText(locale, 'edited') },
  };
}

export async function refinePromptSession(
  input: { promptSessionId: string } & RefineAction,
  deps: PromptDeps
): Promise<PromptResult> {
  if ('message' in input) return chatTurn(input, deps);
  const session = await deps.store.get(input.promptSessionId);
  if (!session) return { error: 'expired', tokens: 0 };
  if (session.versions.length === 0) return { error: 'invalid', tokens: 0 };
  if (session.refinementCount >= MAX_REFINEMENTS) return { error: 'refine_limit', tokens: 0 };
  const ctx = context(deps, session.productId, session.taskId);
  if ('error' in ctx) return { error: ctx.error!, tokens: 0 };
  const { product, guide, generic } = ctx;

  let meta: { refinementIds: string[]; instruction?: string; edits?: string[] };
  const setSlot = (slotId: string, value: string): SlotState | null => {
    if (!guide.slots.some((s) => s.id === slotId)) return null;
    return { value: value.trim().slice(0, SLOT_VALUE_MAX), source: 'user' };
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
    const instruction = input.instruction.trim().slice(0, 1000);
    if (!instruction) return { error: 'invalid', tokens: 0 };
    meta = { refinementIds: ['free_text'], instruction, edits: appendEdit(session.versions.at(-1)?.edits, instruction) };
  }

  const { version, tokens } = await produceVersion(session, guide, product, deps, meta, generic);
  session.versions.push(version);
  session.refinementCount++;
  await deps.store.set(session);
  return { card: toPromptCard(session, guide, product, generic), tokens, session };
}
