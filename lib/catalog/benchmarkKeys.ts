// Benchmark arenaları — data/tasks.json'daki `benchmark[].key` değerleri
// SADECE buradaki sabitlerden gelir (validate:catalog kontrol eder).
//
// `sourceField`: kaynağın API'sindeki gerçek alan/uç. P3'te (scripts/sync-models.mjs)
// gerçek yanıtlar görülerek doldurulur; null = henüz bağlanmadı. Tahminle
// doldurulmaz.

import type { BenchmarkSource } from './schema';

export interface BenchmarkArena {
  source: BenchmarkSource;
  key: string;
  /** Kartta gösterilecek kısa ad. */
  label: string;
  /** Kaynaktaki gerçek karşılığı: LMArena config adı ya da AA uç + alan yolu. */
  sourceField: string | null;
}

export const BENCHMARK_ARENAS = [
  // LMArena (Hugging Face: lmarena-ai/leaderboard-dataset). key = dataset config adı.
  { source: 'lmarena', key: 'text', label: 'Text', sourceField: null },
  { source: 'lmarena', key: 'webdev', label: 'WebDev', sourceField: null },
  { source: 'lmarena', key: 'search', label: 'Search', sourceField: null },
  { source: 'lmarena', key: 'document', label: 'Document', sourceField: null },
  { source: 'lmarena', key: 'text_to_image', label: 'Text-to-Image', sourceField: null },
  { source: 'lmarena', key: 'image_edit', label: 'Image Edit', sourceField: null },
  { source: 'lmarena', key: 'text_to_video', label: 'Text-to-Video', sourceField: null },
  { source: 'lmarena', key: 'image_to_video', label: 'Image-to-Video', sourceField: null },
  { source: 'lmarena', key: 'video_edit', label: 'Video Edit', sourceField: null },
  // Artificial Analysis (artificialanalysis.ai/api/v2).
  { source: 'artificialanalysis', key: 'llm_intelligence', label: 'Intelligence Index', sourceField: null },
  { source: 'artificialanalysis', key: 'llm_coding', label: 'Coding Index', sourceField: null },
  { source: 'artificialanalysis', key: 'text-to-image', label: 'Text-to-Image', sourceField: null },
  { source: 'artificialanalysis', key: 'image-editing', label: 'Image Editing', sourceField: null },
  { source: 'artificialanalysis', key: 'text-to-video', label: 'Text-to-Video', sourceField: null },
  { source: 'artificialanalysis', key: 'image-to-video', label: 'Image-to-Video', sourceField: null },
  { source: 'artificialanalysis', key: 'text-to-speech', label: 'Text-to-Speech', sourceField: null },
] as const satisfies readonly BenchmarkArena[];

export type BenchmarkKey = (typeof BENCHMARK_ARENAS)[number]['key'];

export function findArena(source: string, key: string): BenchmarkArena | undefined {
  return BENCHMARK_ARENAS.find((a) => a.source === source && a.key === key);
}

export function isKnownArena(source: string, key: string): boolean {
  return findArena(source, key) !== undefined;
}
