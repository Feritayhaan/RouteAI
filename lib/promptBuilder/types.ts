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
  /** Bu versiyonu üreten hazır butonlar ('assumption', 'free_text', 'chat', 'revert' da olabilir). */
  refinementIds: string[];
  instruction?: string;
  /** Üretici modelin "ne değiştirdim" cümlesi (sohbet cevabı); ilk versiyonda yok. */
  summary?: string;
  /** Bu versiyon hangi versiyondan türetildi (ilkinde yok). "Geri al" buraya döner. */
  parent?: number;
  /** Bu içeriğe giren kullanıcı istekleri (eskiden yeniye, en fazla EDIT_HISTORY_MAX); "az önce eklediğini çıkar" gibi mesajlar için. */
  edits?: string[];
  /** Versiyon üretilirken slot değerleri; bu versiyondan düzenlemeye devam edilince oturumdaki slotlar buna döner. Eski oturumlarda yok. */
  slots?: Record<string, SlotState>;
  createdAt: string;
}

/**
 * Kullanıcının ilk girişine göre üretilmiş soru (rehberdeki sabit sorunun
 * yerine). Seçenek değeri doğrudan prompta girer (rehberin prompt dilinde).
 */
export interface DynamicQuestion {
  question: string;
  options: { id: string; label: string; value: string }[];
}

export interface PromptSession {
  id: string;
  productId: string;
  /** Kullanıcının işi (rehber seçimi için); eski oturumlarda yok -> ürünün ilk görevi. */
  taskId?: string;
  guideId: string;
  guideVersion: number;
  goal: string;
  locale: 'en' | 'tr';
  slots: Record<string, SlotState>;
  /** Oturum başına en fazla 1 soru kartı. */
  questionAsked: boolean;
  /** Soru kartında sorulan slotlar (cevap bekleniyor). */
  pendingQuestions: string[];
  /** Girişe göre üretilmiş sorular (slotId -> soru); yoksa rehberdeki sabit soru. */
  questionOverrides?: Record<string, DynamicQuestion>;
  versions: PromptVersion[];
  /** Yeni içerik üreten düzenlemeler (sohbette ekleme/çıkarma, düğme, varsayım). "Geri al" ve sohbet cevapları sayılmaz. */
  refinementCount: number;
  /** Sohbet mesajı sayısı (düzenleme + geri al + cevap); sınırsız LLM çağrısını önler. */
  chatTurns?: number;
}

export const MAX_REFINEMENTS = 20;
/** Bir oturumda en fazla bu kadar sohbet mesajı (geri al ve soru-cevap dahil). */
export const MAX_CHAT_TURNS = 60;
/** Bir oturumda en fazla bu kadar versiyon (KV kaydı şişmesin). */
export const MAX_VERSIONS = 40;
/** Sohbetten gelen "ne istendi" geçmişinin tutulan uzunluğu (istek sayısı) ve her isteğin saklanan en fazla uzunluğu. */
export const EDIT_HISTORY_MAX = 8;
export const EDIT_REQUEST_MAX = 300;
export const SESSION_TTL_SECONDS = 24 * 60 * 60;
