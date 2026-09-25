// Benchmark arenaları — data/tasks.json'daki `benchmark[].key` değerleri
// SADECE buradaki sabitlerden gelir (validate:catalog kontrol eder).
//
// `sourceField`: kaynağın API'sindeki karşılık. scripts/sync-models.mjs bu
// alandan okur; alan yanıtta yoksa değer yazmaz, data/sync-report.md'ye hata
// yazar (tahmin yok).
//  - lmarena: Hugging Face `lmarena-ai/leaderboard-dataset` config adı.
//  - artificialanalysis: "<uç>#<alan yolu>", ör. "/data/media/text-to-image#elo".
//
// DOĞRULANMADI: P3 yazılırken geliştirme ortamı bu API'lere erişemedi. Uçlar
// ve üst düzey alanlar (evaluations, elo, rank, ci95, appearances) AA
// dokümanından; `evaluations` altındaki indeks adları ilk senkron raporunda
// doğrulanmalı (rapor bulunamayan alanı ve mevcut alanları listeler).

import type { BenchmarkSource } from './schema';

export interface BenchmarkArena {
  source: BenchmarkSource;
  key: string;
  /** Kartta gösterilecek kısa ad. */
  label: string;
  /** Kaynaktaki karşılığı: LMArena config adı ya da AA "<uç>#<alan yolu>". */
  sourceField: string;
}

export const BENCHMARK_ARENAS = [
  // LMArena (Hugging Face: lmarena-ai/leaderboard-dataset).
  { source: 'lmarena', key: 'text', label: 'Text', sourceField: 'text' },
  { source: 'lmarena', key: 'webdev', label: 'WebDev', sourceField: 'webdev' },
  { source: 'lmarena', key: 'search', label: 'Search', sourceField: 'search' },
  { source: 'lmarena', key: 'document', label: 'Document', sourceField: 'document' },
  { source: 'lmarena', key: 'text_to_image', label: 'Text-to-Image', sourceField: 'text_to_image' },
  { source: 'lmarena', key: 'image_edit', label: 'Image Edit', sourceField: 'image_edit' },
  { source: 'lmarena', key: 'text_to_video', label: 'Text-to-Video', sourceField: 'text_to_video' },
  { source: 'lmarena', key: 'image_to_video', label: 'Image-to-Video', sourceField: 'image_to_video' },
  { source: 'lmarena', key: 'video_edit', label: 'Video Edit', sourceField: 'video_edit' },
  // Artificial Analysis (artificialanalysis.ai/api/v2).
  { source: 'artificialanalysis', key: 'llm_intelligence', label: 'Intelligence Index', sourceField: '/data/llms/models#evaluations.artificial_analysis_intelligence_index' },
  { source: 'artificialanalysis', key: 'llm_coding', label: 'Coding Index', sourceField: '/data/llms/models#evaluations.artificial_analysis_coding_index' },
  { source: 'artificialanalysis', key: 'text-to-image', label: 'Text-to-Image', sourceField: '/data/media/text-to-image#elo' },
  { source: 'artificialanalysis', key: 'image-editing', label: 'Image Editing', sourceField: '/data/media/image-editing#elo' },
  { source: 'artificialanalysis', key: 'text-to-video', label: 'Text-to-Video', sourceField: '/data/media/text-to-video#elo' },
  { source: 'artificialanalysis', key: 'image-to-video', label: 'Image-to-Video', sourceField: '/data/media/image-to-video#elo' },
  { source: 'artificialanalysis', key: 'text-to-speech', label: 'Text-to-Speech', sourceField: '/data/media/text-to-speech#elo' },
] as const satisfies readonly BenchmarkArena[];

export type BenchmarkKey = (typeof BENCHMARK_ARENAS)[number]['key'];

export function findArena(source: string, key: string): BenchmarkArena | undefined {
  return BENCHMARK_ARENAS.find((a) => a.source === source && a.key === key);
}

export function isKnownArena(source: string, key: string): boolean {
  return findArena(source, key) !== undefined;
}
