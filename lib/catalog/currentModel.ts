// Bir ürünün "güncel modeli": model adı elle tutulmaz. Gece senkronunun
// yazdığı data/models.json içinden:
//   1) ürünün models listesi (elle bağlanmış id'ler) varsa onlar,
//   2) yoksa modelRule'a (üretici + ad parçaları + tür) uyan modeller
// adaylar olur; en yeni çıkış tarihli seçilir (tarih yoksa en iyi sıralı).
// Gösterilirken kaynak adı ve verinin tarihi de döner (AA/LMArena lisans şartı).

import type { BenchmarkSource, Model, ModelRule, Product } from './schema';

export interface CurrentModel {
  id: string;
  name: string;
  releaseDate: string | null;
  source: BenchmarkSource;
  /** Verinin çekildiği tarih (YYYY-MM-DD). */
  fetchedAt: string;
}

const norm = (s: string) => s.toLowerCase();
/** Üretici adı kaynaklar arasında farklı yazılabilir ("Google" / "Google DeepMind", "Runway" / "RunwayML"). */
const compact = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

function matchesRule(model: Model, rule: ModelRule): boolean {
  if (rule.creator && !compact(model.creator).includes(compact(rule.creator))) return false;
  if (rule.modality && !model.modalities.includes(rule.modality)) return false;
  const haystack = [model.id, model.name, ...model.aliases].map(norm);
  const has = (part: string) => haystack.some((h) => h.includes(norm(part)));
  if (!rule.include.some(has)) return false;
  if (rule.exclude?.some(has)) return false;
  return true;
}

/** En iyi sıra (küçük rank) — rank yoksa en yüksek değer. Karşılaştırma için tek sayı. */
function bestRank(model: Model): number {
  const ranks = model.scores.map((s) => s.rank).filter((r): r is number => typeof r === 'number');
  return ranks.length ? Math.min(...ranks) : Number.POSITIVE_INFINITY;
}

function latestScore(model: Model) {
  return [...model.scores].sort((a, b) => b.fetchedAt.localeCompare(a.fetchedAt))[0];
}

export function resolveCurrentModel(product: Pick<Product, 'models' | 'modelRule'>, models: Model[]): CurrentModel | null {
  const candidates = product.models.length > 0
    ? models.filter((m) => product.models.includes(m.id))
    : product.modelRule
      ? models.filter((m) => matchesRule(m, product.modelRule!))
      : [];
  const withScore = candidates.filter((m) => m.scores.length > 0);
  if (withScore.length === 0) return null;

  withScore.sort((a, b) => {
    const da = a.releaseDate ?? '';
    const db = b.releaseDate ?? '';
    if (da !== db) return db.localeCompare(da); // en yeni önce; tarihi olmayan sona
    return bestRank(a) - bestRank(b);
  });
  const model = withScore[0];
  const score = latestScore(model);
  return {
    id: model.id,
    name: model.name,
    releaseDate: model.releaseDate ?? null,
    source: score.source,
    fetchedAt: score.fetchedAt,
  };
}
