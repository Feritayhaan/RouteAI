// Rehberi olmayan aktif ürün için genel rehber. Bugünkü rehberlerin hepsi
// araca özel sözdizimi içermeyen RouteAI iskeletleri (bkz. her rehberin
// "Şablon" bölümü), bu yüzden aynı türdeki başka bir araç için de kullanılabilir.
// Kartta "Genel rehber" diye yazılır; üreticiye de "bu araca özel değil" denir.
//
// Seçim: ürünün İLK görevi. Önce görev istisnası, yoksa görevin türü (modality).
// Özel rehberi olan ürün (product.promptGuide) bu dosyaya hiç girmez.

import type { Modality, Product, Task } from '../catalog/schema';

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

/** Ürünün genel rehber id'si; görevi yoksa ya da görev bilinmiyorsa null. */
export function fallbackGuideId(product: Pick<Product, 'tasks'>, tasksById: Map<string, Pick<Task, 'modality'>>): string | null {
  const taskId = product.tasks[0];
  if (!taskId) return null;
  if (FALLBACK_BY_TASK[taskId]) return FALLBACK_BY_TASK[taskId];
  const task = tasksById.get(taskId);
  return task ? FALLBACK_BY_MODALITY[task.modality] : null;
}

/** Özel rehber varsa o (generic: false), yoksa genel rehber (generic: true). */
export function resolveGuideId(
  product: Pick<Product, 'promptGuide' | 'tasks'>,
  tasksById: Map<string, Pick<Task, 'modality'>> | undefined
): { guideId: string; generic: boolean } | null {
  if (product.promptGuide) return { guideId: product.promptGuide, generic: false };
  const guideId = tasksById ? fallbackGuideId(product, tasksById) : null;
  return guideId ? { guideId, generic: true } : null;
}
