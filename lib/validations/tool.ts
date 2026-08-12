import { z } from "zod";
import { SUPPORTED_LOCALES } from "../toolsService";
import { PRICE_STATUSES, PRICING_MODELS } from "../pricing";

// Locale map şemaları SUPPORTED_LOCALES'ten türer: yeni dil eklemek için
// tek yapılacak sabite eklemek, şema kendiliğinden yeni anahtarı zorunlu kılar.
function localeMap<T extends z.ZodTypeAny>(value: T) {
  return z.object(
    Object.fromEntries(SUPPORTED_LOCALES.map((locale) => [locale, value])) as Record<
      (typeof SUPPORTED_LOCALES)[number],
      T
    >
  );
}

export const localeTextSchema = localeMap(z.string());
export const localeListSchema = localeMap(z.array(z.string()));

const categorySchema = z.enum([
  "gorsel",
  "metin",
  "ses",
  "arastirma",
  "video",
  "veri",
  "kod",
]);

const mediaTypeSchema = z.enum(["text", "image", "audio", "video", "data", "code"]);

export const pricingModelSchema = z.enum(PRICING_MODELS);
export const priceStatusSchema = z.enum(PRICE_STATUSES);

export const pricingSchema = z.object({
  // Tek doğru alan. free/freemium/paidOnly bundan türer, superRefine çelişkiyi
  // hata sayar — böylece elle yazılmış tutarsız bir fiyat nesnesi DB'ye giremez.
  model: pricingModelSchema,
  free: z.boolean(),
  freemium: z.boolean(),
  paidOnly: z.boolean(),
  // null = veri girilmemiş, 0 = gerçekten ücretsiz. optional DEĞİL: alanın
  // yokluğu ile bilinmezliği aynı şeye karışmasın.
  startingPrice: z.number().nonnegative().nullable(),
  currency: z.literal("USD"),
  priceStatus: priceStatusSchema,
  priceCheckedAt: z.string().nullable().optional(),
});

const toolShape = z.object({
  id: z.string().optional(),
  name: z.string(),
  category: categorySchema,
  secondaryCategories: z.array(categorySchema).optional(),
  description: localeTextSchema,
  url: z.string().url(),
  pricing: pricingSchema,
  bestFor: localeListSchema,
  strength: z.number(),
  reviewStatus: z.enum(["reviewed", "unreviewed"]),
  features: z.array(z.string()).optional(),
  lastUpdated: z.string().optional(),
  deprecated: z.boolean().optional(),
  inputTypes: z.array(mediaTypeSchema).optional(),
  outputTypes: z.array(mediaTypeSchema.or(z.literal("document"))).optional(),
  skillLevel: z.enum(["beginner", "intermediate", "advanced"]).optional(),
  speed: z.enum(["fast", "medium", "slow"]).optional(),
});

export const toolSchema = toolShape.superRefine((tool, ctx) => {
  const pricing = tool.pricing;

  const derived = {
    free: pricing.model === "free",
    freemium: pricing.model === "freemium",
    paidOnly: pricing.model === "paid",
  } as const;

  for (const flag of ["free", "freemium", "paidOnly"] as const) {
    if (pricing[flag] !== derived[flag]) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["pricing", flag],
        message: `bayrak model ile çelişiyor: model '${pricing.model}' iken ${flag}=${pricing[flag]} (beklenen ${derived[flag]}). makePricing() kullan.`,
      });
    }
  }

  if (pricing.model === "free" && pricing.startingPrice !== 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["pricing", "startingPrice"],
      message: `model 'free' ise startingPrice 0 olmalı, ${pricing.startingPrice} bulundu.`,
    });
  }

  if (pricing.model === "paid" && pricing.startingPrice === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["pricing", "startingPrice"],
      message: "model 'paid' ise startingPrice 0 olamaz — fiyat bilinmiyorsa null yaz.",
    });
  }

  if (pricing.startingPrice === null && pricing.priceStatus !== "unknown") {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["pricing", "priceStatus"],
      message: `startingPrice null ise priceStatus 'unknown' olmalı, '${pricing.priceStatus}' bulundu.`,
    });
  }
});

export const toolsDatabaseSchema = z.array(toolSchema);

export type ValidatedTool = z.infer<typeof toolSchema>;
