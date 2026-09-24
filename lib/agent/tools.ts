// Ajanın araçları: OpenAI function tanımları, argümanların Zod doğrulaması
// ve yürütücüler. Puan her zaman deterministik kod hesaplar (searchCatalog);
// model sadece hangi aracı hangi argümanla çağıracağına karar verir.

import { z } from 'zod';
import { hasFreeTier } from '../pricing';
import { ACCESS_CHANNELS, type Task } from '../catalog/schema';
import { searchCatalog, type SearchContext, type SearchResult } from '../catalog/search';
import { SOURCES } from '../catalog/sources';
import { findMatchingTemplate } from '../workflow/workflowTemplates';
import type { WorkflowStepTemplate } from '../workflow/workflowTypes';
import type { Card, PromptCard, PromptQuestionCard, QuestionCard, RecommendationCard, RecommendationItem, WorkflowCard } from './cards';

// ------------------------------------------------------------------
// Argüman şemaları
// ------------------------------------------------------------------

export const constraintsSchema = z.object({
  pricing: z.enum(['free', 'freeTier', 'any']).optional(),
  maxMonthlyUsd: z.number().positive().max(100000).optional(),
  access: z.array(z.enum(ACCESS_CHANNELS)).max(4).optional(),
  commercialUse: z.boolean().optional(),
  skill: z.enum(['beginner', 'advanced']).optional(),
}).strict();

export const searchCatalogArgs = z.object({
  taskId: z.string(),
  constraints: constraintsSchema.optional(),
}).strict();

export const askUserArgs = z.object({
  question: z.string().min(3).max(300),
  options: z.array(z.string().min(1).max(80)).min(2).max(4),
  allowFreeText: z.boolean().optional(),
}).strict();

export const buildPromptArgs = z.object({
  productId: z.string(),
  goal: z.string().min(3).max(1000),
  slots: z.record(z.string().max(300)).optional(),
}).strict();

export const getWorkflowArgs = z.object({
  goal: z.string().min(3).max(500),
}).strict();

export type ToolName = 'search_catalog' | 'ask_user' | 'build_prompt' | 'get_workflow';

// ------------------------------------------------------------------
// OpenAI function tanımları
// ------------------------------------------------------------------

export function toolDefinitions(tasks: Task[]) {
  const constraints = {
    type: 'object',
    description: 'Only constraints the user actually stated.',
    properties: {
      pricing: { type: 'string', enum: ['free', 'freeTier', 'any'], description: "'free' = completely free; 'freeTier' = has a free plan" },
      maxMonthlyUsd: { type: 'number', description: 'Monthly budget cap in USD' },
      access: { type: 'array', items: { type: 'string', enum: [...ACCESS_CHANNELS] }, description: 'Required platforms' },
      commercialUse: { type: 'boolean', description: 'Output will be used commercially' },
      skill: { type: 'string', enum: ['beginner', 'advanced'] },
    },
    additionalProperties: false,
  };
  return [
    {
      type: 'function',
      function: {
        name: 'search_catalog',
        description: 'Ranked products for one task from the RouteAI catalog, with scores, confidence, prices and sources. The only source of product names and numbers.',
        parameters: {
          type: 'object',
          properties: { taskId: { type: 'string', enum: tasks.map((t) => t.id) }, constraints },
          required: ['taskId'],
          additionalProperties: false,
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'ask_user',
        description: 'Ask ONE clarifying question with 2-4 short options when a critical detail is missing and would change the recommendation. Ends your turn.',
        parameters: {
          type: 'object',
          properties: {
            question: { type: 'string' },
            options: { type: 'array', items: { type: 'string' }, minItems: 2, maxItems: 4 },
            allowFreeText: { type: 'boolean' },
          },
          required: ['question', 'options'],
          additionalProperties: false,
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'build_prompt',
        description: 'Build a ready-to-use prompt for a product the user chose, following that product\'s prompt guide.',
        parameters: {
          type: 'object',
          properties: {
            productId: { type: 'string', description: 'productId from a search_catalog result' },
            goal: { type: 'string', description: 'What the user wants to create, in their words' },
            slots: { type: 'object', additionalProperties: { type: 'string' }, description: 'Details already known' },
          },
          required: ['productId', 'goal'],
          additionalProperties: false,
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'get_workflow',
        description: 'For goals that need several tools in sequence (comic, podcast, brand identity, YouTube video...). Returns steps with a catalog product per step.',
        parameters: {
          type: 'object',
          properties: { goal: { type: 'string' } },
          required: ['goal'],
          additionalProperties: false,
        },
      },
    },
  ];
}

// ------------------------------------------------------------------
// Yürütücüler
// ------------------------------------------------------------------

export type BuildPromptFn = (
  args: z.infer<typeof buildPromptArgs>,
  locale: 'en' | 'tr',
  conversation: { role: 'user' | 'assistant'; content: string }[]
) => Promise<
  | { card: PromptCard | PromptQuestionCard; summary: Record<string, unknown>; tokens: number }
  | { error: string; tokens?: number }
>;

export interface ToolContext {
  search: SearchContext;
  locale: 'en' | 'tr';
  /** Bu konuşmada şimdiye kadar sorulan netleştirme sayısı. */
  questionsAsked: number;
  maxQuestions: number;
  buildPrompt?: BuildPromptFn;
  /** build_prompt'un konuşmadan bilgi çıkarması için. */
  conversation?: { role: 'user' | 'assistant'; content: string }[];
}

export interface ToolExecution {
  /** Modele dönen (JSON'a çevrilecek) sonuç. */
  result: Record<string, unknown>;
  card?: Card;
  /** true: kart gönderildi, tur burada biter (ask_user, build_prompt). */
  endTurn?: boolean;
  taskId?: string;
  /** Aracın kendi LLM token'ları (bütçeye sayılır). */
  tokens?: number;
}

function sourcesFor(item: SearchResult['items'][number]): RecommendationItem['sources'] {
  const out: RecommendationItem['sources'] = [];
  for (const source of new Set(item.score.components.benchmarks.map((b) => b.source))) {
    out.push({ id: source, label: SOURCES[source].label, url: SOURCES[source].leaderboardUrl });
  }
  if (item.score.ownN > 0) out.push({ id: 'routeai-users', label: 'RouteAI users' });
  if (item.score.components.E !== undefined) out.push({ id: 'routeai-expert', label: 'RouteAI expert review' });
  return out;
}

export function toRecommendationCard(result: SearchResult): RecommendationCard {
  return {
    type: 'recommendation',
    mode: 'catalog',
    taskId: result.taskId,
    noEvidence: result.noEvidence,
    ...(result.relaxedConstraint ? { relaxedConstraint: result.relaxedConstraint } : {}),
    items: result.items.slice(0, 3).map((item) => ({
      productId: item.product.id,
      name: item.product.name,
      url: item.product.url,
      q: item.score.q,
      confidence: item.score.confidence,
      ownN: item.score.ownN,
      benchmarkShare: item.score.benchmarkShare,
      shares: { users: item.score.ownShare, expert: item.score.expertShare, benchmark: item.score.benchmarkShare },
      reasons: [...item.score.reasons, ...item.fitReasons],
      pricing: { ...item.product.pricing },
      dataDate: item.score.dataDate,
      sources: sourcesFor(item),
    })),
  };
}

/** Modele giden özet: kararı verebileceği kadar, fazlası değil. */
function searchSummary(result: SearchResult) {
  return {
    taskId: result.taskId,
    noEvidence: result.noEvidence,
    relaxedConstraint: result.relaxedConstraint ?? null,
    filteredOut: result.filteredOut,
    items: result.items.slice(0, 3).map((i) => ({
      productId: i.product.id,
      name: i.product.name,
      q: i.score.q,
      confidence: i.score.confidence,
      ownN: i.score.ownN,
      benchmarkShare: i.score.benchmarkShare,
      freeTier: hasFreeTier(i.product.pricing),
      startingPriceUsd: i.product.pricing.startingPrice,
      reasons: [...i.score.reasons, ...i.fitReasons].map((r) => r.code),
      dataDate: i.score.dataDate,
    })),
  };
}

// Workflow şablonundaki adım -> görev (şablondaki sabit araç adları KULLANILMAZ).
const STEP_TASK_RULES: [RegExp, string][] = [
  [/logo/, 'image.logo'],
  [/background removal|cutout/, 'image.background-remove'],
  [/thumbnail|social media graphics|carousel|stories|color palette|layout|typography|comic lettering/, 'design.social-graphic'],
  [/slide design|presentation/, 'slides.create'],
  [/video generation|animation/, 'video.text-to-video'],
  [/video editing|b-roll/, 'video.edit-short-social'],
  [/voice synthesis|text to speech|dubbing|recording/, 'audio.tts-voiceover'],
  [/noise reduction|mastering|mixing|audio editing/, 'audio.cleanup'],
  [/music generation|beat making|melody|sound effects/, 'music.generate'],
  [/translation|localization/, 'text.translate'],
  [/proofreading/, 'text.rewrite-edit'],
  [/charts|data viz|dashboard/, 'data.dashboard'],
  [/data analysis|statistics/, 'data.spreadsheet-analysis'],
  [/wireframe|ui components|mobile ui|prototype|design system|screen design|ux research/, 'code.app-builder'],
  [/cover|album art|infographic|featured image|blog images|character design|concept art|illustration|image generation|scene|lifestyle/, 'image.generate'],
  [/copywriting|hashtags|engagement/, 'text.marketing-copy'],
  [/seo|research|trend analysis|strategy|analysis/, 'research.web'],
  [/formatting|epub/, 'docs.create'],
  [/writing|story|songwriting|lyrics|outline|planning|documentation|guidelines|content calendar|brief|concept|structure/, 'text.write-longform'],
];
const CATEGORY_TASK: Record<string, string> = {
  gorsel: 'image.generate', metin: 'text.write-longform', ses: 'audio.tts-voiceover', video: 'video.text-to-video',
  kod: 'code.assistant-ide', arastirma: 'research.web', veri: 'data.spreadsheet-analysis',
};

export function stepTaskId(step: WorkflowStepTemplate): string {
  const text = `${step.capabilities.join(' ')} ${step.name}`.toLowerCase();
  for (const [re, taskId] of STEP_TASK_RULES) if (re.test(text)) return taskId;
  return CATEGORY_TASK[step.category] ?? 'chat.general-assistant';
}

function invalid(error: z.ZodError) {
  return { result: { error: 'invalid_arguments', details: error.issues.map((i) => `${i.path.join('.')}: ${i.message}`) } };
}

export async function executeTool(name: string, rawArgs: string, ctx: ToolContext): Promise<ToolExecution> {
  let args: unknown;
  try {
    args = JSON.parse(rawArgs || '{}');
  } catch {
    return { result: { error: 'invalid_json' } };
  }

  switch (name) {
    case 'search_catalog': {
      const parsed = searchCatalogArgs.safeParse(args);
      if (!parsed.success) return invalid(parsed.error);
      if (!ctx.search.tasksById.has(parsed.data.taskId)) return { result: { error: 'unknown_task', taskId: parsed.data.taskId } };
      const result = searchCatalog({ taskId: parsed.data.taskId, constraints: parsed.data.constraints, limit: 5 }, ctx.search);
      return { result: searchSummary(result), card: toRecommendationCard(result), taskId: result.taskId };
    }

    case 'ask_user': {
      const parsed = askUserArgs.safeParse(args);
      if (!parsed.success) return invalid(parsed.error);
      if (ctx.questionsAsked >= ctx.maxQuestions) {
        return { result: { error: 'question_budget_exhausted', instruction: 'Do not ask again. State your assumption in one sentence and continue with search_catalog.' } };
      }
      const card: QuestionCard = {
        type: 'question',
        question: parsed.data.question,
        options: parsed.data.options.map((label, i) => ({ id: `o${i + 1}`, label })),
        allowFreeText: parsed.data.allowFreeText ?? true,
      };
      return { result: { shown: true }, card, endTurn: true };
    }

    case 'build_prompt': {
      const parsed = buildPromptArgs.safeParse(args);
      if (!parsed.success) return invalid(parsed.error);
      if (!ctx.buildPrompt) return { result: { error: 'not_available' } };
      const out = await ctx.buildPrompt(parsed.data, ctx.locale, ctx.conversation ?? []);
      if ('error' in out) return { result: { error: out.error }, tokens: out.tokens ?? 0 };
      // Kart kendini anlatıyor (soru ya da iki varyant): tur burada biter.
      return { result: out.summary, card: out.card, endTurn: true, tokens: out.tokens };
    }

    case 'get_workflow': {
      const parsed = getWorkflowArgs.safeParse(args);
      if (!parsed.success) return invalid(parsed.error);
      const template = findMatchingTemplate(parsed.data.goal);
      if (!template) return { result: { error: 'no_workflow', instruction: 'Use search_catalog for a single task instead.' } };
      const steps = template.steps.map((step) => {
        const taskId = stepTaskId(step);
        const top = searchCatalog({ taskId, limit: 1 }, ctx.search).items[0];
        return {
          order: step.order,
          name: step.name,
          description: step.description,
          taskId,
          product: top
            ? { productId: top.product.id, name: top.product.name, url: top.product.url, q: top.score.q, confidence: top.score.confidence }
            : null,
          promptTemplate: step.promptTemplate ?? null,
        };
      });
      const card: WorkflowCard = {
        type: 'workflow',
        templateId: template.id,
        name: ctx.locale === 'en' ? template.nameEn : template.name,
        estimatedDuration: template.estimatedDuration,
        steps,
      };
      return {
        result: {
          workflow: template.id,
          steps: steps.map((s) => ({ order: s.order, name: s.name, taskId: s.taskId, product: s.product?.name ?? null })),
          note: 'Steps without a product have no reliable catalog data yet.',
        },
        card,
      };
    }

    default:
      return { result: { error: 'unknown_tool', name } };
  }
}
