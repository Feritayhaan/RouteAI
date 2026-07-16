import { z } from "zod";
import { SUPPORTED_LOCALES } from "../toolsService";

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

export const toolSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  category: categorySchema,
  secondaryCategories: z.array(categorySchema).optional(),
  description: localeTextSchema,
  url: z.string().url(),
  pricing: z.object({
    free: z.boolean(),
    freemium: z.boolean(),
    paidOnly: z.boolean(),
    startingPrice: z.number().optional(),
    currency: z.literal("USD"),
  }),
  bestFor: localeListSchema,
  strength: z.number(),
  features: z.array(z.string()).optional(),
  lastUpdated: z.string().optional(),
  deprecated: z.boolean().optional(),
  inputTypes: z.array(mediaTypeSchema).optional(),
  outputTypes: z.array(mediaTypeSchema.or(z.literal("document"))).optional(),
  skillLevel: z.enum(["beginner", "intermediate", "advanced"]).optional(),
  speed: z.enum(["fast", "medium", "slow"]).optional(),
});

export const toolsDatabaseSchema = z.array(toolSchema);

export type ValidatedTool = z.infer<typeof toolSchema>;
