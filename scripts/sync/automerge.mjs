// Gece verisi PR'ı otomatik merge edilebilir mi? Saf karar fonksiyonu
// (scripts/automerge-guard.mjs çağırır, testler doğrudan sınar).
// Şüpheli her durumda PR açık kalır ve Ferit'i bekler.

import { resolveCurrentModel } from '../../lib/catalog/currentModel.ts';

export const AUTO_MERGE_FILES = ['data/models.json', 'data/sync-report.md', 'data/signals.json', 'data/signals-anomalies.md'];
export const MIN_MODEL_RATIO = 0.8;

/**
 * @param {{ changedFiles: string[], oldModels: any[], newModels: any[], products: any[], anomaliesMd: string }} input
 * @returns {{ ok: boolean, reasons: string[] }}
 */
export function autoMergeDecision({ changedFiles, oldModels, newModels, products, anomaliesMd }) {
  const reasons = [];
  const unexpected = changedFiles.filter((f) => !AUTO_MERGE_FILES.includes(f));
  if (unexpected.length) reasons.push(`Beklenmeyen dosya değişti: ${unexpected.join(', ')}`);

  if (oldModels.length === 0 && newModels.length > 0) {
    reasons.push('İlk model senkronu: kaynakların alan eşlemesi ve ürün → model tablosu elle incelenmeli.');
  } else if (newModels.length < oldModels.length * MIN_MODEL_RATIO) {
    reasons.push(`Model sayısı %${Math.round((1 - newModels.length / oldModels.length) * 100)} düştü (${oldModels.length} → ${newModels.length}).`);
  }

  const lost = products
    .filter((p) => p.status === 'active' && (p.modelRule || p.models?.length))
    .filter((p) => resolveCurrentModel(p, oldModels) && !resolveCurrentModel(p, newModels))
    .map((p) => p.name);
  if (lost.length) reasons.push(`Güncel modeli kaybolan ürün: ${lost.join(', ')}`);

  if (/^- (?!yok\s*$)/m.test(anomaliesMd ?? '')) reasons.push('Sinyal anormalliği var (data/signals-anomalies.md).');

  return { ok: reasons.length === 0, reasons };
}
