// Prompt rehberi şeması (data/prompt-guides/*.md frontmatter + gövde bölümleri).
// Derlenmiş hali data/prompt-guides.json (edge'de fs yok).

import { z } from 'zod';
import { idSchema, localeTextSchema, MODALITIES } from '../catalog/schema';

export const GUIDE_SECTIONS = { syntax: 'Sözdizimi', template: 'Şablon', dosDonts: 'Yap / Yapma', examples: 'Örnekler' } as const;

export const guideSlotSchema = z.object({
  id: idSchema,
  impact: z.enum(['high', 'medium', 'low']),
  question: localeTextSchema,
  options: z.array(z.object({ id: idSchema, label: localeTextSchema, value: z.string().min(1) })).min(2),
  /** Seçenek id'si ya da 'infer' (üretici konuşmadan/amaçtan çıkarır). */
  default: z.string().min(1),
});

export const guideRefinementSchema = z
  .object({
    id: idSchema,
    label: localeTextSchema,
    patch: z.record(z.string()).optional(),
    instruction: z.string().min(3).optional(),
  })
  .refine((r) => (r.patch ? 1 : 0) + (r.instruction ? 1 : 0) === 1, 'patch ya da instruction (sadece biri)');

export const guideValidatorSchema = z.object({
  id: idSchema,
  type: z.enum(['regex', 'maxLength', 'mustInclude']),
  value: z.union([z.string().min(1), z.number().int().positive()]),
  message: z.string().min(3),
});

export const guideSchema = z.object({
  id: idSchema,
  version: z.number().int().positive(),
  appliesTo: z.array(idSchema).min(1),
  modality: z.enum(MODALITIES),
  promptLanguage: z.enum(['en', 'user']),
  sources: z.array(z.string().url()),
  /** Boş = taslak (kartta "Taslak rehber"). */
  reviewedBy: z.string(),
  reviewedAt: z.string(),
  slots: z.array(guideSlotSchema).min(4),
  refinements: z.array(guideRefinementSchema).min(4).max(8),
  checklist: z.array(z.string().min(3)).min(1),
  validators: z.array(guideValidatorSchema),
  body: z.object({
    syntax: z.string(),
    template: z.string(),
    dosDonts: z.string(),
    examples: z.string(),
  }),
});
export type Guide = z.infer<typeof guideSchema>;
export type GuideSlot = z.infer<typeof guideSlotSchema>;
export type GuideRefinement = z.infer<typeof guideRefinementSchema>;
export type GuideValidator = z.infer<typeof guideValidatorSchema>;

export const guidesFileSchema = z.array(guideSchema);

/** Şemanın ötesindeki kurallar; hata listesi döner (boş = geçerli). */
export function guideRuleErrors(guide: Guide): string[] {
  const errors: string[] = [];
  const slotIds = new Set(guide.slots.map((s) => s.id));
  if (slotIds.size !== guide.slots.length) errors.push('tekrar eden slot id');
  if (guide.slots.filter((s) => s.impact === 'high').length < 2) errors.push("en az 2 'high' slot olmalı");
  for (const s of guide.slots) {
    const optionIds = new Set(s.options.map((o) => o.id));
    if (optionIds.size !== s.options.length) errors.push(`slot ${s.id}: tekrar eden seçenek id`);
    if (optionIds.has('auto')) errors.push(`slot ${s.id}: 'auto' seçenek id'si ayrılmış ("Sen seç")`);
    if (s.default !== 'infer' && !optionIds.has(s.default)) errors.push(`slot ${s.id}: default "${s.default}" seçeneklerde yok`);
  }
  const refIds = new Set<string>();
  for (const r of guide.refinements) {
    if (refIds.has(r.id)) errors.push(`tekrar eden refinement id ${r.id}`);
    refIds.add(r.id);
    for (const slotId of Object.keys(r.patch ?? {})) {
      if (!slotIds.has(slotId)) errors.push(`refinement ${r.id}: tanımsız slot "${slotId}"`);
    }
  }
  for (const v of guide.validators) {
    if (v.type === 'regex') {
      try {
        new RegExp(String(v.value));
      } catch {
        errors.push(`validator ${v.id}: regex derlenmiyor`);
      }
    }
    if (v.type === 'maxLength' && typeof v.value !== 'number') errors.push(`validator ${v.id}: maxLength sayı olmalı`);
  }
  return errors;
}
