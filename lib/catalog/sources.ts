// Benchmark kaynaklarının atfı. Artificial Analysis ve LMArena verisi
// gösterilirken kaynak adı görünür olmalı (lisans şartı) — kartlar bu
// fonksiyonlardan okur, adı elle yazmaz.

import type { BenchmarkSource } from './schema';

export interface SourceInfo {
  label: string;
  /** Kullanıcıya gösterilecek ana sayfa. */
  url: string;
  /** Sıralama/lider tablosu sayfası. */
  leaderboardUrl: string;
}

export const SOURCES: Record<BenchmarkSource, SourceInfo> = {
  artificialanalysis: {
    label: 'Artificial Analysis',
    url: 'https://artificialanalysis.ai',
    leaderboardUrl: 'https://artificialanalysis.ai/leaderboards/models',
  },
  lmarena: {
    label: 'LMArena',
    url: 'https://lmarena.ai',
    leaderboardUrl: 'https://lmarena.ai/leaderboard',
  },
};

export function sourceLabel(source: BenchmarkSource): string {
  return SOURCES[source].label;
}

export function sourceUrl(source: BenchmarkSource): string {
  return SOURCES[source].url;
}
