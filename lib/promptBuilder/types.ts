// Prompt oturumu (KV'de `ps:<id>`, 24 saat). Kullanıcı metni burada sadece
// `goal` ve serbest iyileştirme talimatı olarak durur; hiçbir yerde loglanmaz.

export type SlotSource = 'user' | 'inferred' | 'default';

export interface SlotState {
  /** null = üretici seçsin (varsayılan 'infer' ya da bilinmiyor). */
  value: string | null;
  source: SlotSource;
}

export interface VariantValidation {
  status: 'passed' | 'unchecked';
  errors: string[];
}

export interface Variant {
  id: 'safe' | 'creative';
  prompt: string;
  negativePrompt: string | null;
  settings: { key: string; value: string }[];
  validation: VariantValidation;
}

export interface Assumption {
  slotId: string;
  value: string;
  why: string;
}

export interface SuggestedRefinement {
  label: string;
  slotId: string | null;
  value: string | null;
  instruction: string | null;
}

export interface PromptVersion {
  n: number;
  variants: Variant[];
  assumptions: Assumption[];
  suggestedRefinements: SuggestedRefinement[];
  howToUse: string[];
  /** Bu versiyonu üreten hazır butonlar ('assumption', 'free_text' de olabilir). */
  refinementIds: string[];
  instruction?: string;
  createdAt: string;
}

export interface PromptSession {
  id: string;
  productId: string;
  guideId: string;
  guideVersion: number;
  goal: string;
  locale: 'en' | 'tr';
  slots: Record<string, SlotState>;
  /** Oturum başına en fazla 1 soru kartı. */
  questionAsked: boolean;
  /** Soru kartında sorulan slotlar (cevap bekleniyor). */
  pendingQuestions: string[];
  versions: PromptVersion[];
  refinementCount: number;
}

export const MAX_REFINEMENTS = 10;
export const SESSION_TTL_SECONDS = 24 * 60 * 60;
