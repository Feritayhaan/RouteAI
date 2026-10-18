// Prompt üretimi: TEK OpenAI çağrısı (json_schema strict). İki varyant:
// 'safe' rehbere en sadık, 'creative' aynı amaçla daha cesur yorum.

import { z } from 'zod';
import type { Guide } from './guideSchema';
import { maxTokensFor, type JsonLLM } from './llm';
import type { Assumption, PromptSession, SuggestedRefinement, Variant } from './types';

export interface GenerateOutput {
  variants: Omit<Variant, 'validation'>[];
  assumptions: Assumption[];
  suggestedRefinements: SuggestedRefinement[];
  howToUse: string[];
}

const outputSchema = z.object({
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
  required: ['variants', 'assumptions', 'suggestedRefinements', 'howToUse'],
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
  /** Doğrulayıcı onarımı: varyant başına hata mesajları. */
  repairErrors?: Record<string, string[]>;
  /** Ürünün özel rehberi yok; aynı türdeki araçlar için genel rehber (fallback.ts). */
  genericGuide?: boolean;
}

function systemPrompt(guide: Guide, productName: string, locale: 'en' | 'tr', generic = false): string {
  const userLang = locale === 'tr' ? 'Turkish' : 'English';
  const promptLang = guide.promptLanguage === 'en' ? 'English' : userLang;
  const guideNote = generic
    ? ` It is a general guide for this kind of tool, not specific to ${productName}: write plain instructions that work in ${productName}.`
    : '';
  return `You write prompts for ${productName}. RouteAI's prompt guide below is your starting point.${guideNote}

Rules, most important first:
1. The user's goal comes first. Deliver exactly what they asked for, including unusual, very specific or long requests. Keep every detail they gave (names, texts, numbers, languages, lengths, features, constraints), even when no slot covers it. Never water the request down to fit the guide or the slots.
2. A refinementInstruction overrides the previous version, the slots and the template wherever they conflict. Apply it fully, even if it changes the direction.
3. Slots only fill in what the user did not say. A null slot is yours to choose, and every choice you make goes into "assumptions". If a slot does not fit this request, leave it out of the prompt instead of forcing it in.
4. Use the guide's template, do/don't list and checklist to shape the prompt, adapting them to the request rather than filling in the template mechanically. Where a guide section says "KAYNAK GEREKLİ" (source needed), use plain, widely compatible wording and do not rely on undocumented tool syntax.
5. Match depth to the request: a complex request (an app, a long document, a multi-part task) gets a complete, detailed prompt that lists every requirement; a simple request gets a short, clean prompt.
- Return exactly two variants: "safe" = closest to what the user said; "creative" = same goal, a bolder interpretation. They must differ meaningfully.
- Do not refuse or dilute ordinary requests. The user's own brand, product, business or name can be used freely. Do not impersonate real people or produce deceptive content (fake endorsements, forged documents); for copyrighted characters or logos, describe an original look with a similar feel instead.
- Do not invent facts, statistics, prices or quotes the user did not give; use clearly marked placeholders for them.
- The prompt text is in ${promptLang}. "howToUse" (exactly 3 short steps), "assumptions[].why" and "suggestedRefinements[].label" are in ${userLang}.
- suggestedRefinements: at most 2, different from the guide's ready buttons. Each has either slotId + value, or an instruction.
- settings: tool settings you recommend (key/value); empty if none.

Guide "${guide.id}" v${guide.version}
## Syntax
${guide.body.syntax}
## Template
${guide.body.template}
## Do / Don't
${guide.body.dosDonts}
## Examples
${guide.body.examples}
## Checklist
${guide.checklist.map((c) => `- ${c}`).join('\n')}
## Validators (the prompt must pass)
${guide.validators.map((v) => `- ${v.type} ${v.value}: ${v.message}`).join('\n') || '- none'}`;
}

export async function generatePrompt(input: GenerateInput): Promise<{ output: GenerateOutput; tokens: number }> {
  const { session, guide, productName, llm, signal, previous, instruction, repairErrors } = input;
  const slots = guide.slots.map((s) => ({
    id: s.id,
    question: s.question.en,
    value: session.slots[s.id]?.value ?? null,
    source: session.slots[s.id]?.source ?? 'default',
    options: s.options.map((o) => o.value),
  }));
  const user = JSON.stringify({
    goal: session.goal,
    slots,
    ...(previous ? { previousVersion: { variants: previous.variants.map((v) => ({ id: v.id, prompt: v.prompt })) } } : {}),
    ...(instruction ? { refinementInstruction: instruction } : {}),
    ...(repairErrors ? { fixTheseValidatorErrors: repairErrors } : {}),
  });

  const { data, tokens } = await llm({
    name: 'prompt_generation',
    system: systemPrompt(guide, productName, session.locale, input.genericGuide),
    user,
    schema: JSON_SCHEMA,
    maxTokens: maxTokensFor(guide.modality),
    signal,
  });
  const parsed = outputSchema.parse(data);

  // Normalleştirme: tam olarak safe + creative; eksik varsayımları deterministik ekle.
  const safe = parsed.variants.find((v) => v.id === 'safe') ?? parsed.variants[0];
  const creative = parsed.variants.find((v) => v.id === 'creative') ?? parsed.variants[1] ?? safe;
  if (!safe) throw new Error('varyant yok');
  const variants = [{ ...safe, id: 'safe' as const }, { ...creative, id: 'creative' as const }];

  const slotIds = new Set(guide.slots.map((s) => s.id));
  const assumptions = parsed.assumptions.filter((a) => slotIds.has(a.slotId) && session.slots[a.slotId]?.source !== 'user');
  for (const s of guide.slots) {
    const state = session.slots[s.id];
    if (state && state.source !== 'user' && !assumptions.some((a) => a.slotId === s.id)) {
      assumptions.push({ slotId: s.id, value: state.value ?? '—', why: session.locale === 'tr' ? 'Belirtilmedi; varsayılan kullanıldı.' : 'Not specified; used the default.' });
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
    },
    tokens,
  };
}
