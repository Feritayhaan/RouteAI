// Araç ayrıntı bölümünün hangi "neden" içeriğini göstereceği. Ana öneri ve açılır
// alternatifler (components/ToolDetail.tsx) AYNI kuralı kullanır; kural burada, test edilebilsin diye.

import type { RecommendationTool } from './types';

export type ReasonsKind =
  /** Kanıt yokken RouteAI editör seçimi: tarafsız gerekçe, puan iddiası yok. */
  | 'editor'
  /** Kanıtı olmayan araç: "Doğrulanmadı" notu; gerekçe ya da sayı uydurulmaz. */
  | 'unverified'
  /** RouteAI Skoru gerekçe kodları (v3). */
  | 'reasons'
  /** Eski (v1) tek cümlelik gerekçe. */
  | 'why'
  | 'none';

/**
 * forceUnverified: liste zaten "doğrulanmadı" diyorsa (görevdeki diğer araçlar)
 * araçta `basis` alanı olmasa da doğrulanmamış sayılır.
 */
export function reasonsKind(tool: RecommendationTool, forceUnverified = false): ReasonsKind {
  if (tool.basis === 'editor') return 'editor';
  if (forceUnverified || tool.basis === 'unverified') return 'unverified';
  if (tool.reasons) return 'reasons';
  if (tool.why) return 'why';
  return 'none';
}
