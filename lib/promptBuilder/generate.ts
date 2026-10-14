// Prompt üretimi: TEK OpenAI çağrısı (json_schema strict). İki varyant:
// 'safe' rehbere en sadık, 'creative' aynı amaçla daha cesur yorum.
//
// Evrensel prompt mühendisliği ilkeleri (systemPrompt):
//  - Meta-sınır: model promptun mimarıdır, uygulayıcısı değil; konuyu cevaplamaz.
//  - Niyet modu (intent.ts): build / solve / analyze / transform / learn; üretim
//    isteği "kısa bilgi ver" ödevine küçültülmez.
//  - Aracın doğal dili: metin/kod/sunum araçlarına doğal bölümlü uzman promptu
//    (mekanik "Rol: X. Bağlam: Y." etiket zinciri yok); görsel/video/ses
//    araçlarına doğrudan sahne/yapı tarifi.
//  - howToUse: bu promptun araçta nasıl kullanılacağı (yer tutucular, ayar/ilk
//    çıktı, takip komutu); konu hakkında genel tavsiye değil.
//  - Varsayımlar kullanıcı dilinde; ham İngilizce seçenek değeri gösterilmez.
//  - Kullanıcının kendi sözleri (session.userMessages) ayrıntının kaynağıdır;
//    goal ajanın kısa özetidir ve slotu olmayan ayrıntıyı (ör. mekân) taşımaz.

import { z } from 'zod';
import type { Guide } from './guideSchema';
import { classifyIntent, INTENT_MODES, type IntentMode } from './intent';
import { maxTokensFor, type JsonLLM } from './llm';
import { displayValue } from './plan';
import type { Assumption, PromptSession, SuggestedRefinement, Variant } from './types';

export interface GenerateOutput {
  variants: Omit<Variant, 'validation'>[];
  assumptions: Assumption[];
  suggestedRefinements: SuggestedRefinement[];
  howToUse: string[];
  /** Modelin seçtiği niyet modu (eski yanıtlarda yok). */
  intent?: IntentMode;
}

const outputSchema = z.object({
  intent: z.enum(INTENT_MODES).optional(),
  variants: z.array(z.object({
    id: z.enum(['safe', 'creative']),
    prompt: z.string().min(1),
    negativePrompt: z.string().nullable(),
    settings: z.array(z.object({ key: z.string(), value: z.string() })),
  })),
  assumptions: z.array(z.object({ slotId: z.string(), value: z.string(), why: z.string() })),
  suggestedRefinements: z.array(z.object({
    label: z.string(),
    slotId: z.string().nullable(),
    value: z.string().nullable(),
    instruction: z.string().nullable(),
  })),
  howToUse: z.array(z.string()),
});

const JSON_SCHEMA = {
  type: 'object',
  properties: {
    intent: { type: 'string', enum: [...INTENT_MODES] },
    variants: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', enum: ['safe', 'creative'] },
          prompt: { type: 'string' },
          negativePrompt: { type: ['string', 'null'] },
          settings: {
            type: 'array',
            items: { type: 'object', properties: { key: { type: 'string' }, value: { type: 'string' } }, required: ['key', 'value'], additionalProperties: false },
          },
        },
        required: ['id', 'prompt', 'negativePrompt', 'settings'],
        additionalProperties: false,
      },
    },
    assumptions: {
      type: 'array',
      items: {
        type: 'object',
        properties: { slotId: { type: 'string' }, value: { type: 'string' }, why: { type: 'string' } },
        required: ['slotId', 'value', 'why'],
        additionalProperties: false,
      },
    },
    suggestedRefinements: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          label: { type: 'string' },
          slotId: { type: ['string', 'null'] },
          value: { type: ['string', 'null'] },
          instruction: { type: ['string', 'null'] },
        },
        required: ['label', 'slotId', 'value', 'instruction'],
        additionalProperties: false,
      },
    },
    howToUse: { type: 'array', items: { type: 'string' } },
  },
  required: ['intent', 'variants', 'assumptions', 'suggestedRefinements', 'howToUse'],
  additionalProperties: false,
};

export interface GenerateInput {
  session: PromptSession;
  guide: Guide;
  productName: string;
  llm: JsonLLM;
  signal?: AbortSignal;
  /** İyileştirmede ya da onarımda önceki varyantlar. */
  previous?: { variants: { id: string; prompt: string }[] };
  instruction?: string;
  /** İyileştirmede kullanıcının az önce değiştirdiği slotlar (slotId -> yeni değer). */
  changedSlots?: Record<string, string>;
  /** Doğrulayıcı onarımı: varyant başına hata mesajları. */
  repairErrors?: Record<string, string[]>;
  /** Ürünün özel rehberi yok; aynı türdeki araçlar için genel rehber (fallback.ts). */
  genericGuide?: boolean;
}

const LLM_MODALITIES = new Set(['text', 'code', 'slides']);
const MEDIA_MODALITIES = new Set(['image', 'video', 'audio', 'music']);

/** Rehberin prompt başına karakter sınırı (maxLength validator'ı); yoksa undefined. */
export function maxPromptChars(guide: Guide): number | undefined {
  const v = guide.validators.find((x) => x.type === 'maxLength');
  return v ? Number(v.value) : undefined;
}

/** "KAYNAK GEREKLİ" paragrafı bilgi taşımaz: modele gitmez. Bölümün geri kalanı (ör. RouteAI kuralları) gider. */
export function guideSection(text: string): string {
  return text
    .split(/\n\s*\n/)
    .filter((p) => !/^KAYNAK GEREKLİ/.test(p.trim()))
    .join('\n\n')
    .trim();
}

/** Rehber gövdesi: boş kalan bölüm başlığıyla birlikte atlanır. Rehber doldurulunca kendiliğinden gider. */
function guideBody(guide: Guide): string {
  const sections: [string, string][] = [
    ['Syntax', guide.body.syntax],
    ['Template', guide.body.template],
    ["Do / Don't", guide.body.dosDonts],
    ['Examples', guide.body.examples],
  ];
  return sections
    .map(([title, text]) => [title, guideSection(text)])
    .filter(([, text]) => text)
    .map(([title, text]) => `## ${title}\n${text}\n`)
    .join('');
}

function systemPrompt(guide: Guide, productName: string, locale: 'en' | 'tr', generic = false): string {
  const userLang = locale === 'tr' ? 'Turkish' : 'English';
  const promptLang = guide.promptLanguage === 'en' ? 'English' : userLang;
  const guideNote = generic
    ? ` It is a general guide for this kind of tool, not specific to ${productName}: write plain instructions that work in ${productName}.`
    : '';
  const visual = guide.modality === 'image' || guide.modality === 'video';
  const noNegative = ['text', 'code', 'slides', 'audio', 'music'].includes(guide.modality);
  const toolForm = LLM_MODALITIES.has(guide.modality)
    ? `${productName} is a text/code/document AI. Write a natural, professional system/task prompt in flowing sections: (1) the expert role and the goal: the role belongs to ${productName}, in the second person ("You are a senior…" / "Sen kıdemli bir…sın."); the goal and situation belong to the user, in the first person ("I want to build…" / "Ben … geliştirmek istiyorum."). Never give the role to the user ("As a senior architect, I want to build…") and never give the user's goal to ${productName} ("You want to build…" / "… geliştirmek istiyorsun"), (2) the project/task context and constraints, (3) the expected output structure or working steps, (4) [square-bracket placeholders] for facts only the user can fill in. Never write a chain of mechanical labels like "Role: X. Context: Y. Task: Z. Format: W."`
    : guide.modality === 'audio'
      ? `${productName} reads "prompt" aloud word for word, from the first word to the last. "prompt" is only what the speaker says: no labels ("Script:", "Voice settings:"), no stage directions, no sentence about the voiceover itself ("In a calm female voice: …", "This is a voiceover for an ad…"). The slots (language, tone, voice, pace, use) describe the delivery and never appear as words in "prompt": voice and speed go into "settings", the tone shapes the wording, the language is the language of the text. If the user gave the text, "prompt" is exactly that text (from the quotes, without the user's request around it). If not, but the topic is clear, write the words the speaker says (for an ad, the ad copy itself). If there is nothing to say yet (no text and no topic), "prompt" is a single placeholder: [${userLang === 'Turkish' ? 'okunacak metin' : 'text to be spoken'}]. Never a description of the voiceover.`
      : MEDIA_MODALITIES.has(guide.modality)
        ? `${productName} generates ${guide.modality}. No conversational sentences: describe the subject, scene, composition, light, camera, or the music structure directly, in the tool's own style.`
      : `Write the prompt in the form ${productName} expects.`;
  return `You are RouteAI's prompt architect for ${productName}. RouteAI's prompt guide below is your starting point.${guideNote}

META-BOUNDARY (most important): you are the prompt architect, NEVER the executor.
- Do not answer the user's request, explain the topic or give information about it yourself. You write the instruction that makes ${productName} do the work.
- "prompt" is exactly the command the user pastes into ${productName}: no introduction, no explanation of the subject, no closing notes about the topic.

Rules, most important first:
1. The user's goal comes first. "userMessages" (when given) are the user's own words, oldest first; "goal" is RouteAI's short summary of them. Take the details from userMessages: a later message overrides an earlier one, and what is only about choosing a tool (budget, price, platform, which tool to use) does not go into the prompt. Deliver exactly what they asked for, including unusual, very specific or long requests. Keep every detail they gave (names, texts, numbers, languages, lengths, features, constraints), even when no slot covers it.${guide.modality === 'audio' ? ' For this text-to-speech tool, delivery details (voice, tone, pace, language, purpose) are kept by putting them into "settings" and into the wording, never by writing them into the spoken text.' : ''} Never water the request down to fit the guide or the slots.
2. Intent: classify the goal into one mode, return it in "intent" and build the prompt for that mode. "intentHint" is a keyword guess; override it when the goal clearly says otherwise.
   - build (make, create, produce, develop, design, write, launch): never write a prompt that asks for general information or a short overview. Put ${productName} in the role of a senior co-founder / lead architect / creative director who builds the thing end to end with the user, and ask for a concrete deliverable: a roadmap with milestones, a production draft, a structured spec or outline, or the work itself.
   - solve (fix, debug, improve, optimize): ask for root-cause analysis, a step-by-step fix and how to verify it.
   - analyze (compare, decide, plan a strategy): ask for explicit criteria, a decision matrix or table/framework and a recommendation.
   - transform (rewrite, translate, summarize, convert): state what must be preserved from the input and the target tone/format; add a [placeholder] for the input if the user did not give it.
   - learn: ONLY when the user explicitly asks what something is, how it works, or to be taught: an explanatory, teaching prompt.
   Match depth to the intent: build, solve and analyze requests get a complete, detailed prompt. Never shrink a request to "a short paragraph" or "beginner level" unless the user asked for that.
3. Tool-native form: ${toolForm}
4. previousVersion (when given) is the base: keep every concrete detail it has (names, file paths, quoted texts, numbers, constraints) and change only what changedSlots or refinementInstruction ask for. changedSlots are the slots the user just changed: the new value must appear in the new prompt, replacing the old one. A refinementInstruction overrides the previous version, the slots and the template wherever they conflict. Apply it fully, even if it changes the direction.
5. Slots only fill in what the user did not say. A null slot is yours to choose, and every choice you make goes into "assumptions". If a slot does not fit this request, leave it out of the prompt instead of forcing it in.
6. Use the guide's template, do/don't list and checklist to shape the prompt, adapting them to the request rather than filling in the template mechanically.${guide.sources.length === 0 ? ` This guide has no verified ${productName} documentation yet: use plain, widely compatible wording and do not rely on undocumented tool syntax.` : ''}
7. ${productName} never sees this conversation: the prompt must be self-contained. ${productName} has never heard of RouteAI, so the prompt never mentions RouteAI (if it addresses anyone, it addresses ${productName}). Write it ready to paste: no preamble ("Sure", "Here is"), no references to the chat, no unfilled template brackets, no vague filler ("etc.", "something nice").${visual ? ' Do not address the tool ("Please create an image of..."); start directly with the subject or shot and describe subject, setting, composition/camera, light and style.' : ''} negativePrompt and settings must not contradict the prompt${noNegative ? '; this kind of tool has no negative prompt field, so negativePrompt is null and exclusions go into the prompt' : ''}.
- Return exactly two variants: "safe" = closest to what the user said; "creative" = same goal, a bolder interpretation. They must differ meaningfully.
- Do not refuse or dilute ordinary requests. The user's own brand, product, business or name can be used freely. Do not impersonate real people or produce deceptive content (fake endorsements, forged documents); for copyrighted characters or logos, describe an original look with a similar feel instead.
- Do not invent facts, statistics, prices or quotes the user did not give; use clearly marked placeholders for them.
- The prompt text is in ${promptLang}. "howToUse", "assumptions" and "suggestedRefinements[].label" are in ${userLang}.
- howToUse: exactly 3 short steps about using THIS prompt in ${productName}, never general advice about the user's topic: (1) paste it into ${productName} and what to write into each [placeholder] (or that it is ready as is); (2) which setting, or what in the first output, to check; (3) one concrete follow-up message to send to ${productName} to improve the result.
- assumptions: value and why in ${userLang}, never raw English option codes (e.g. "a beginner", "friendly") in a ${userLang} interface; use the slot's "label" when given. value: a short phrase; why: one sentence on why it fits this request.
- suggestedRefinements: at most 2, different from the guide's ready buttons. Each has either slotId + value, or an instruction.
- settings: tool settings you recommend (key/value); empty if none.

Guide "${guide.id}" v${guide.version}
${guideBody(guide)}## Checklist
${guide.checklist.map((c) => `- ${c}`).join('\n')}
## Validators (the prompt must pass)
${guide.validators.map((v) => `- ${v.type} ${v.value}: ${v.message}`).join('\n') || '- none'}`;
}

export async function generatePrompt(input: GenerateInput): Promise<{ output: GenerateOutput; tokens: number }> {
  const { session, guide, productName, llm, signal, previous, instruction, repairErrors } = input;
  const locale = session.locale;
  const slots = guide.slots.map((s) => {
    const state = session.slots[s.id];
    const value = state?.value ?? null;
    return {
      id: s.id,
      question: s.question.en,
      value,
      // Kullanıcı dilindeki karşılık: varsayım listesine bu yazılır.
      label: value ? displayValue(s, value, locale, { label: state?.label, dynamic: session.questionOverrides?.[s.id] }) : null,
      source: state?.source ?? 'default',
      options: s.options.map((o) => o.value),
    };
  });
  const intentHint = classifyIntent(session.goal);
  const user = JSON.stringify({
    goal: session.goal,
    ...(session.userMessages?.length ? { userMessages: session.userMessages } : {}),
    ...(intentHint ? { intentHint } : {}),
    slots,
    ...(previous ? { previousVersion: { variants: previous.variants.map((v) => ({ id: v.id, prompt: v.prompt })) } } : {}),
    ...(instruction ? { refinementInstruction: instruction } : {}),
    ...(input.changedSlots && Object.keys(input.changedSlots).length ? { changedSlots: input.changedSlots } : {}),
    ...(repairErrors ? { fixTheseValidatorErrors: repairErrors } : {}),
  });

  const { data, tokens } = await llm({
    name: 'prompt_generation',
    system: systemPrompt(guide, productName, session.locale, input.genericGuide),
    user,
    schema: JSON_SCHEMA,
    maxTokens: maxTokensFor(guide.modality, maxPromptChars(guide)),
    signal,
  });
  const parsed = outputSchema.parse(data);

  // Normalleştirme: tam olarak safe + creative; eksik varsayımları deterministik ekle.
  const safe = parsed.variants.find((v) => v.id === 'safe') ?? parsed.variants[0];
  const creative = parsed.variants.find((v) => v.id === 'creative') ?? parsed.variants[1] ?? safe;
  if (!safe) throw new Error('varyant yok');
  const variants = [{ ...safe, id: 'safe' as const }, { ...creative, id: 'creative' as const }];

  const slotIds = new Set(guide.slots.map((s) => s.id));
  const assumptions = parsed.assumptions
    .filter((a) => slotIds.has(a.slotId) && session.slots[a.slotId]?.source !== 'user')
    .map((a) => ({ ...a, value: localizedValue(guide, session, a.slotId, a.value) }));
  for (const s of guide.slots) {
    const state = session.slots[s.id];
    if (state && state.source !== 'user' && !assumptions.some((a) => a.slotId === s.id)) {
      assumptions.push(fallbackAssumption(guide, session, s.id));
    }
  }

  return {
    output: {
      variants,
      assumptions,
      suggestedRefinements: parsed.suggestedRefinements
        .filter((r) => (r.slotId && r.value && slotIds.has(r.slotId)) || r.instruction)
        .slice(0, 2),
      howToUse: parsed.howToUse.slice(0, 3),
      ...(parsed.intent ? { intent: parsed.intent } : {}),
    },
    tokens,
  };
}

/** Varsayım değeri kullanıcı dilinde: slot etiketi, dinamik ya da rehber seçeneğinin etiketi. */
function localizedValue(guide: Guide, session: PromptSession, slotId: string, value: string): string {
  const slot = guide.slots.find((s) => s.id === slotId);
  const state = session.slots[slotId];
  return displayValue(slot, value, session.locale, {
    label: state?.value && state.value.trim().toLowerCase() === value.trim().toLowerCase() ? state.label : undefined,
    dynamic: session.questionOverrides?.[slotId],
  });
}

const FALLBACK_WHY = {
  smart: { tr: 'Belirtmediğin için isteğine en uygun seçenek seçildi.', en: "You didn't specify this; chosen to fit your request." },
  guide: { tr: 'Belirtmediğin için RouteAI varsayılanı kullanıldı.', en: "You didn't specify this; RouteAI's default was used." },
  open: { tr: 'Belirtmediğin için isteğine göre seçilecek.', en: "You didn't specify this; it will be chosen to fit your request." },
  openValue: { tr: 'İsteğe göre', en: 'To fit the request' },
} as const;

/** Model bir varsayımı yazmadıysa deterministik varsayım (kullanıcı dilinde). */
function fallbackAssumption(guide: Guide, session: PromptSession, slotId: string): Assumption {
  const slot = guide.slots.find((s) => s.id === slotId)!;
  const state = session.slots[slotId];
  const locale = session.locale;
  if (!state?.value) return { slotId, value: FALLBACK_WHY.openValue[locale], why: FALLBACK_WHY.open[locale] };
  const fromGuideDefault = slot.default !== 'infer' && slot.options.find((o) => o.id === slot.default)?.value === state.value && !state.label;
  return {
    slotId,
    value: localizedValue(guide, session, slotId, state.value),
    why: fromGuideDefault ? FALLBACK_WHY.guide[locale] : FALLBACK_WHY.smart[locale],
  };
}
