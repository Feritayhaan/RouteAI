// Benchmark arenaları — data/tasks.json'daki `benchmark[].key` değerleri
// SADECE buradaki sabitlerden gelir (validate:catalog kontrol eder).
//
// `sourceField`: kaynağın API'sindeki karşılık. scripts/sync-models.mjs bu
// alandan okur; alan yanıtta yoksa değer yazmaz, data/sync-report.md'ye hata
// yazar (tahmin yok).
//  - lmarena: Hugging Face `lmarena-ai/leaderboard-dataset` config adı.
//  - artificialanalysis: "<uç>#<alan yolu>", ör. "/data/media/text-to-image#elo".
//
// LMArena (P10, 2026-09-28): config listesi (buradaki 9'u dahil), 'latest'
// split'i ve satır alan adları (model_name, rating, rating_lower/upper,
// vote_count, rank, category) HF datasets-server'dan DOĞRULANDI; sourceField
// değerleri (config adları) doğru. release_date/released alanı veride YOK,
// releaseDate o yüzden null kalıyor — uydurulmadı.
//
// Artificial Analysis: HÂLÂ DOĞRULANMADI (bu ortamda AA_API_KEY yok, gerçek
// yanıt görülemedi). Uçlar ve üst düzey alanlar (evaluations, elo, rank,
// ci95, appearances) AA dokümanından; `evaluations` altındaki indeks adları
// AA_API_KEY tanımlı bir gece koşusunun raporunda doğrulanmalı (rapor
// bulunamayan alanı ve mevcut alanları listeler).

// Alt kategori arenaları (2026-10-18): LMArena config'lerinin `category` satırları.
// Anahtar `<config>/<kategori>` (ör. `text/creative_writing`); gece senkronu bunları genel arenayla
// BİRLİKTE data/models.json'a yazar. Yalnızca tasks.json'da kullanılanlar burada tutulur (dosya
// büyümesin). Kategori adları 2026-10-16 gerçek senkron raporundan/denetim tablosundan alındı;
// yeni bir tane eklenmeden önce kaynakta gerçekten var olduğu görülmeli (uydurma yok).
// Alt kategori arenasında veri yoksa (senkron henüz çalışmadı ya da kategori alınamadı) skor
// hesabı otomatik olarak üst (genel) arenaya döner: lib/catalog/score.ts.

import type { BenchmarkSource } from './schema';

export interface BenchmarkArena {
  source: BenchmarkSource;
  key: string;
  /** Kartta gösterilecek kısa ad. */
  label: string;
  /** Kaynaktaki karşılığı: LMArena config adı ya da AA "<uç>#<alan yolu>". */
  sourceField: string;
  /**
   * Yalnızca LMArena alt kategorisi için: config içindeki `category` değeri (ör. 'creative_writing').
   * Anahtar her zaman `<sourceField>/<category>` olur ve genel arena (`<sourceField>`) üst arenasıdır.
   */
  category?: string;
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
  // LMArena alt kategorileri (üst arenaları yukarıdaki genel arenalardır).
  { source: 'lmarena', key: 'text/creative_writing', label: 'Text · Creative Writing', sourceField: 'text', category: 'creative_writing' },
  { source: 'lmarena', key: 'text/longer_query', label: 'Text · Longer Query', sourceField: 'text', category: 'longer_query' },
  { source: 'lmarena', key: 'text/instruction_following', label: 'Text · Instruction Following', sourceField: 'text', category: 'instruction_following' },
  { source: 'lmarena', key: 'text/non_english', label: 'Text · Non-English', sourceField: 'text', category: 'non_english' },
  { source: 'lmarena', key: 'text/multi_turn', label: 'Text · Multi-Turn', sourceField: 'text', category: 'multi_turn' },
  { source: 'lmarena', key: 'text_to_image/text_rendering', label: 'Text-to-Image · Text Rendering', sourceField: 'text_to_image', category: 'text_rendering' },
  { source: 'lmarena', key: 'text_to_image/commercial_design', label: 'Text-to-Image · Commercial Design', sourceField: 'text_to_image', category: 'commercial_design' },
  { source: 'lmarena', key: 'text_to_image/photorealistic', label: 'Text-to-Image · Photorealistic', sourceField: 'text_to_image', category: 'photorealistic' },
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

/** Bir arenada karşılaştırma için en az bu kadar model gerekir (lib/catalog/score.ts ile scripts/audit aynı kuralı kullanır). */
export const MIN_ARENA_MODELS = 2;

/** Alt kategori anahtarının üst (genel) arenası: 'text/creative_writing' -> 'text'. Alt kategori değilse null. */
export function parentArenaKey(key: string): string | null {
  const i = key.indexOf('/');
  return i > 0 ? key.slice(0, i) : null;
}

/** Alt kategori arenası mı? (sync bunları genel arenalardan ayrı işler.) */
export function isCategoryArena(arena: BenchmarkArena): boolean {
  return arena.category !== undefined;
}

export interface CategoryArenaCoverage {
  source: string;
  key: string;
  /** Bu arenada skoru olan model sayısı. */
  models: number;
  /** En az MIN_ARENA_MODELS model var: sıralama bu kategoriden hesaplanır. */
  usable: boolean;
  /** Kullanılamıyorsa skor hesabının düştüğü üst (genel) arena. */
  fallsBackTo: string | null;
  /** Bu kategoriyi kullanan görevler. */
  tasks: string[];
}

/**
 * tasks.json'da kullanılan alt kategori arenalarının veri durumu (validate:catalog yazdırır).
 * Gece senkronundan sonra beklenen: hepsi `usable`. Değilse skor hesabı genel arenaya düşer ve sıra eskisiyle aynı kalır.
 */
export function categoryArenaCoverage(
  tasks: readonly { id: string; benchmark: readonly { source: string; key: string }[] }[],
  models: readonly { scores: readonly { source: string; key: string }[] }[],
): CategoryArenaCoverage[] {
  const out = new Map<string, CategoryArenaCoverage>();
  for (const task of tasks) {
    for (const b of task.benchmark) {
      const arena = findArena(b.source, b.key);
      if (!arena || !isCategoryArena(arena)) continue;
      const id = `${b.source}:${b.key}`;
      let entry = out.get(id);
      if (!entry) {
        const count = models.filter((m) => m.scores.some((s) => s.source === b.source && s.key === b.key)).length;
        const usable = count >= MIN_ARENA_MODELS;
        entry = { source: b.source, key: b.key, models: count, usable, fallsBackTo: usable ? null : parentArenaKey(b.key), tasks: [] };
        out.set(id, entry);
      }
      if (!entry.tasks.includes(task.id)) entry.tasks.push(task.id);
    }
  }
  return [...out.values()].sort((a, b) => a.key.localeCompare(b.key));
}
