// RouteAI v2 katalog şeması — data/*.json dosyalarının TEK tanımı.
//
// Katalog git'te JSON olarak durur (bkz. docs/ROADMAP-v2.md "Mimari").
// Her JSON bu şemalarla doğrulanır: yüklenirken (lib/catalog/index.ts) ve
// `npm run validate:catalog` ile. Şema değişirse veri de aynı commit'te değişir.

import { z } from 'zod';
import { PRICE_STATUSES, PRICING_MODELS, type ToolPricing } from '../pricing';

// ------------------------------------------------------------------
// Ortak parçalar
// ------------------------------------------------------------------

export const CATALOG_LOCALES = ['en', 'tr'] as const;
export type CatalogLocale = (typeof CATALOG_LOCALES)[number];

/** İki dilde de zorunlu metin. */
export const localeTextSchema = z.object({
  en: z.string().min(1),
  tr: z.string().min(1),
});
export type LocaleText = z.infer<typeof localeTextSchema>;

/** YYYY-MM-DD ya da ISO tarih-saat. Kaynağı olmayan tarih yazılmaz. */
export const dateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}(T[\d:.]+(Z|[+-]\d{2}:\d{2})?)?$/, 'YYYY-MM-DD ya da ISO tarih olmalı');

export const idSchema = z.string().regex(/^[a-z0-9]+(?:[a-z0-9-]*[a-z0-9])?$/, 'küçük harf, rakam ve tire');

/** "grup.görev" — ör. image.logo, video.text-to-video */
export const taskIdSchema = z.string().regex(/^[a-z0-9]+\.[a-z0-9-]+$/, '"grup.görev" biçiminde olmalı');

export const MODALITIES = [
  'text', 'image', 'video', 'audio', 'music', 'code', 'data', 'slides', 'research', 'automation', '3d',
] as const;
export type Modality = (typeof MODALITIES)[number];

export const OUTPUT_TYPES = ['text', 'image', 'audio', 'video', 'data', 'code', 'document', '3d'] as const;

export const BENCHMARK_SOURCES = ['artificialanalysis', 'lmarena'] as const;
export type BenchmarkSource = (typeof BENCHMARK_SOURCES)[number];

// ------------------------------------------------------------------
// Task — görev taksonomisi (data/tasks.json)
// ------------------------------------------------------------------

export const taskSlotSchema = z.object({
  id: idSchema,
  question: localeTextSchema,
  options: z.array(z.object({ id: idSchema, label: localeTextSchema })).min(2).optional(),
  /** true: cevap öneriyi değiştirir, eksikse ajan sorabilir. */
  critical: z.boolean(),
});

export const taskBenchmarkSchema = z.object({
  source: z.enum(BENCHMARK_SOURCES),
  /** lib/catalog/benchmarkKeys.ts'teki sabitlerden biri. */
  key: z.string().min(1),
});

export const taskSchema = z.object({
  id: taskIdSchema,
  label: localeTextSchema,
  description: localeTextSchema,
  modality: z.enum(MODALITIES),
  benchmark: z.array(taskBenchmarkSchema),
  slots: z.array(taskSlotSchema).max(3),
  outputTypes: z.array(z.enum(OUTPUT_TYPES)).min(1),
});
export type Task = z.infer<typeof taskSchema>;
export type TaskSlot = z.infer<typeof taskSlotSchema>;

// ------------------------------------------------------------------
// Model (data/models.json) — P3'te gece senkronuyla dolar
// ------------------------------------------------------------------

export const modelScoreSchema = z.object({
  source: z.enum(BENCHMARK_SOURCES),
  key: z.string().min(1),
  value: z.number(),
  ciLow: z.number().optional(),
  ciHigh: z.number().optional(),
  votes: z.number().int().nonnegative().optional(),
  rank: z.number().int().positive().optional(),
  fetchedAt: dateStringSchema,
});
export type ModelScore = z.infer<typeof modelScoreSchema>;

export const modelSchema = z.object({
  id: idSchema,
  name: z.string().min(1),
  creator: z.string().min(1),
  aliases: z.array(z.string()),
  modalities: z.array(z.enum(MODALITIES)),
  releaseDate: dateStringSchema.optional(),
  scores: z.array(modelScoreSchema),
  pricing: z
    .object({
      inputPerMTok: z.number().nonnegative().optional(),
      outputPerMTok: z.number().nonnegative().optional(),
      source: z.enum(BENCHMARK_SOURCES),
      fetchedAt: dateStringSchema,
    })
    .optional(),
});
export type Model = z.infer<typeof modelSchema>;

// ------------------------------------------------------------------
// Product (data/products.json) — seçilmiş ürünler
// ------------------------------------------------------------------

/** lib/pricing.ts'teki ToolPricing; bayraklar model'den türemek zorunda. */
export const toolPricingSchema: z.ZodType<ToolPricing> = z
  .object({
    model: z.enum(PRICING_MODELS),
    free: z.boolean(),
    freemium: z.boolean(),
    paidOnly: z.boolean(),
    startingPrice: z.number().nonnegative().nullable(),
    currency: z.literal('USD'),
    priceStatus: z.enum(PRICE_STATUSES),
    priceCheckedAt: dateStringSchema.nullable().optional(),
  })
  .refine(
    (p) => p.free === (p.model === 'free') && p.freemium === (p.model === 'freemium') && p.paidOnly === (p.model === 'paid'),
    'free/freemium/paidOnly bayrakları model ile çelişiyor (makePricing kullan)'
  );

export const ACCESS_CHANNELS = ['web', 'mobile', 'desktop', 'api'] as const;
export const PRODUCT_STATUSES = ['active', 'candidate', 'retired'] as const;
export const REVIEW_STATUSES = ['reviewed', 'unreviewed'] as const;

/** RouteAI'ın kendi topladığı ürün gerçekleri; bilinmeyen alan YAZILMAZ. */
export const productFactsSchema = z.object({
  freeTierLimit: z.string().min(1).optional(),
  watermarkOnFree: z.boolean().optional(),
  commercialUse: z.enum(['yes', 'paid-only', 'no']).optional(),
  source: z.string().url(),
  checkedAt: dateStringSchema,
});

export const productSchema = z.object({
  id: idSchema,
  name: z.string().min(1),
  url: z.string().url(),
  pricingUrl: z.string().url().optional(),
  description: localeTextSchema,
  tasks: z.array(taskIdSchema),
  models: z.array(idSchema),
  pricing: toolPricingSchema,
  /** Boş dizi = bilinmiyor (henüz doğrulanmadı). */
  access: z.array(z.enum(ACCESS_CHANNELS)),
  /** data/prompt-guides/<promptGuide>.md */
  promptGuide: idSchema.optional(),
  status: z.enum(PRODUCT_STATUSES),
  reviewStatus: z.enum(REVIEW_STATUSES),
  addedAt: dateStringSchema,
  facts: productFactsSchema.optional(),
});
export type Product = z.infer<typeof productSchema>;
export type ProductFacts = z.infer<typeof productFactsSchema>;

// ------------------------------------------------------------------
// Brief ve ExpertReview (data/briefs.json, data/reviews.json)
// ------------------------------------------------------------------

export const briefSchema = z.object({
  id: idSchema,
  taskId: taskIdSchema,
  text: localeTextSchema,
});
export type Brief = z.infer<typeof briefSchema>;

const rubricScore = z.number().int().min(1).max(5);

export const expertReviewSchema = z.object({
  productId: idSchema,
  taskId: taskIdSchema,
  briefId: idSchema,
  rubric: z.object({
    quality: rubricScore,
    ease: rubricScore,
    value: rubricScore,
    speed: rubricScore,
  }),
  notes: z.object({ en: z.string().optional(), tr: z.string().optional() }),
  reviewer: z.string().min(1),
  date: dateStringSchema,
  evidenceUrl: z.string().url().optional(),
});
export type ExpertReview = z.infer<typeof expertReviewSchema>;

// ------------------------------------------------------------------
// Signal (data/signals.json) — kendi gözlemlerimizin toplamı.
// Sadece scripts/aggregate-signals.mjs (P8) yazar.
// ------------------------------------------------------------------

const count = z.number().int().nonnegative();

export const signalSchema = z.object({
  productId: idSchema,
  taskId: taskIdSchema,
  outcomes: z.object({ yes: count, partial: count, no: count }),
  comparisons: z.object({ wins: count, losses: count }),
  votes: z.object({ up: count, down: count }),
  /** En yeni gözlemin tarihi. */
  lastAt: dateStringSchema,
});
export type Signal = z.infer<typeof signalSchema>;

// ------------------------------------------------------------------
// Candidate (data/candidates.json) — keşiften gelen adaylar. searchCatalog
// bu dosyayı HİÇ okumaz; Ferit products.json'a status 'active' ile taşır.
// ------------------------------------------------------------------

export const candidateSchema = z.object({
  id: idSchema,
  name: z.string().min(1),
  url: z.string().url(),
  domain: z.string().min(3),
  /** Kaynağın kendi metni (başlık/tagline) ya da sınıflandırıcının özeti; doğrulanmadı. */
  description: z.object({ en: z.string(), tr: z.string() }),
  tasks: z.array(taskIdSchema),
  isWebProduct: z.boolean().nullable(),
  pricingModel: z.literal('unknown'),
  status: z.literal('candidate'),
  source: z.enum(['hackernews', 'producthunt']),
  sourceUrl: z.string().url(),
  discoveredAt: dateStringSchema,
});
export type Candidate = z.infer<typeof candidateSchema>;
export const candidatesFileSchema = z.array(candidateSchema);

// ------------------------------------------------------------------
// Dosya şemaları
// ------------------------------------------------------------------

export const tasksFileSchema = z.array(taskSchema);
export const modelsFileSchema = z.array(modelSchema);
export const productsFileSchema = z.array(productSchema);
export const briefsFileSchema = z.array(briefSchema);
export const reviewsFileSchema = z.array(expertReviewSchema);
export const signalsFileSchema = z.array(signalSchema);
