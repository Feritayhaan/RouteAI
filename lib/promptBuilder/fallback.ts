// Hangi rehber kullanılır? Öncelik sırası (ilk bulunan kazanır):
//
//   1. ARAÇA ÖZEL rehber  — ürünün promptGuide'ı, yalnız o ürüne yazılmışsa (appliesTo tek ürün) VE
//                           kullanıcının işi rehberle aynı türdeyse (slayt aracının rehberi, o araçtaki
//                           "web sitesi yapma" işine uygulanmaz).
//   2. GÖREV rehberi      — kullanıcının işi (taskId) için yazılmış ayrıntılı şablon (guide.tasks).
//                           Araç bilgisi içermez; araca özel rehberi olmayan HER araçta çalışır.
//   3. ORTAK rehber       — ürünün promptGuide'ı birden çok ürünle paylaşılıyorsa (iskelet, araç sözdizimi yok).
//   4. TÜR rehberi        — görevin türü (modality) için en genel yedek; görev rehberi olmayan işler için.
//
// İş (taskId) bilinmiyorsa ürünün İLK görevi kullanılır. Ürüne ait olmayan bir taskId
// yok sayılır (yanlış iş bilgisi yanlış şablon seçtirmesin).
//
// Kartta 2. ve 4. durum "Genel rehber" diye yazılır; üreticiye de "bu araca özel değil" denir.

import type { Modality, Product, Task } from '../catalog/schema';
import type { Guide } from './guideSchema';

export const FALLBACK_BY_MODALITY: Record<Modality, string> = {
  text: 'chat-general',
  research: 'chat-general',
  data: 'chat-general',
  automation: 'chat-general',
  code: 'cursor-task',
  image: 'image-natural',
  '3d': 'image-natural',
  video: 'text-to-video',
  audio: 'elevenlabs-voiceover',
  music: 'suno',
  slides: 'gamma',
};

/** Türü yanıltıcı görevler: ses/video aracı ama yazılan şey bir talimat ya da metin. */
export const FALLBACK_BY_TASK: Record<string, string> = {
  'audio.meeting-notes': 'chat-general',
  'audio.transcribe': 'chat-general',
  'audio.cleanup': 'chat-general',
  'video.repurpose-clips': 'chat-general',
  'video.subtitles': 'chat-general',
  // Avatar videosu = seslendirilecek metin (senaryo + ton + tempo)
  'video.avatar-presenter': 'elevenlabs-voiceover',
};

/**
 * Görev rehberi YAZILMAYAN görevler: araca yazılan bir prompt yok (dosya yükle, düğmeye bas,
 * ayar seç). Bunlar tür rehberine (FALLBACK_BY_MODALITY / FALLBACK_BY_TASK) düşer.
 * Yeni bir görev eklenirken ya görev rehberi yazılır ya da buraya eklenir
 * (npm run build:guides eksiği uyarır, lib/__tests__/promptTaskGuides.test.ts kilitler).
 */
export const TASKS_WITHOUT_PROMPT_GUIDE: readonly string[] = [
  'image.background-remove',
  'image.upscale',
  'video.subtitles',
  'video.repurpose-clips',
  'audio.voice-clone',
  'audio.transcribe',
  'audio.cleanup',
  'audio.meeting-notes',
];

/** Tür rehberi id'si (varsayılan: ürünün ilk görevi); görevi yoksa ya da görev bilinmiyorsa null. */
export function fallbackGuideId(
  product: Pick<Product, 'tasks'>,
  tasksById: Map<string, Pick<Task, 'modality'>>,
  contextTaskId?: string
): string | null {
  const taskId = contextTaskId ?? product.tasks[0];
  if (!taskId) return null;
  if (FALLBACK_BY_TASK[taskId]) return FALLBACK_BY_TASK[taskId];
  const task = tasksById.get(taskId);
  return task ? FALLBACK_BY_MODALITY[task.modality] : null;
}

export type GuideRef = Pick<Guide, 'id' | 'appliesTo' | 'tasks' | 'modality'>;

/** Yalnız tek ürüne yazılmış rehber (görev rehberi ve ortak iskelet değil). */
export function isModelSpecific(guide: GuideRef): boolean {
  return guide.tasks.length === 0 && guide.appliesTo.length === 1;
}

/** görev id -> görev rehberi id */
export function taskGuideIndex(guides: GuideRef[]): Map<string, string> {
  const index = new Map<string, string>();
  for (const g of guides) for (const t of g.tasks) if (!index.has(t)) index.set(t, g.id);
  return index;
}

export type GuideKind = 'model' | 'task' | 'family' | 'modality';

export interface ResolvedGuide {
  guideId: string;
  /** true: araca özel değil (görev ya da tür rehberi). */
  generic: boolean;
  kind: GuideKind;
}

export interface ResolveOptions {
  /** Kullanıcının işi (ürünün görevlerinden biri olmalı). Yoksa ürünün ilk görevi. */
  taskId?: string;
  /**
   * Tüm rehberler. VERİLMEZSE eski davranış: ürünün promptGuide'ı, yoksa tür rehberi
   * (görev rehberleri bilinmez). Servis her zaman verir.
   */
  guides?: GuideRef[];
}

export function resolveGuideId(
  product: Pick<Product, 'promptGuide' | 'tasks'>,
  tasksById: Map<string, Pick<Task, 'modality'>> | undefined,
  options: ResolveOptions = {}
): ResolvedGuide | null {
  const { guides, taskId } = options;
  const contextTask = taskId && product.tasks.includes(taskId) ? taskId : product.tasks[0];
  const own = product.promptGuide;
  const ownGuide = own ? guides?.find((g) => g.id === own) : undefined;

  // 1. Araca özel (iş rehberle aynı türdeyse; iş ya da görev haritası bilinmiyorsa tür denetimi yapılmaz)
  const taskModality = contextTask ? tasksById?.get(contextTask)?.modality : undefined;
  if (own && (!guides || (ownGuide && isModelSpecific(ownGuide) && (!taskModality || ownGuide.modality === taskModality)))) {
    return { guideId: own, generic: false, kind: 'model' };
  }

  // 2. Görev
  if (guides) {
    const taskGuide = contextTask ? taskGuideIndex(guides).get(contextTask) : undefined;
    if (taskGuide) return { guideId: taskGuide, generic: true, kind: 'task' };
  }

  // 3. Ortak (birden çok ürünle paylaşılan iskelet). Araca özel ama türü uymayan rehber buraya düşmez.
  if (own && ownGuide && !isModelSpecific(ownGuide)) return { guideId: own, generic: false, kind: 'family' };

  // 4. Tür
  const guideId = tasksById ? fallbackGuideId(product, tasksById, contextTask) : null;
  return guideId ? { guideId, generic: true, kind: 'modality' } : null;
}
