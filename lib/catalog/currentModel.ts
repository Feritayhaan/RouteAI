// Bir ürünün "güncel modeli": model adı elle tutulmaz. Gece senkronunun
// yazdığı data/models.json içinden:
//   1) ürünün models listesi (elle bağlanmış id'ler) varsa onlar,
//   2) yoksa modelRule'a (üretici + ad parçaları + tür) uyan modeller
// adaylar olur; en yeni çıkış tarihli seçilir (tarih yoksa en iyi sıralı).
// Gösterilirken kaynak adı ve verinin tarihi de döner (AA/LMArena lisans şartı).
// Ürüne elle bağlanmış model id'leri data/model-aliases.json üzerinden kanonik
// id'ye çözülür: models.json'da ad değişse de ürün doğru modele bağlı kalır.
// Bağlam penceresi ve fiyat sadece models.json'da kaynağıyla varsa döner.

import aliasesJson from '../../data/model-aliases.json';
import type { BenchmarkSource, Model, ModelRule, Product } from './schema';

export interface CurrentModel {
  id: string;
  name: string;
  releaseDate: string | null;
  source: BenchmarkSource;
  /** Verinin çekildiği tarih (YYYY-MM-DD). */
  fetchedAt: string;
  /** Son doğrulama: modelin en yeni skor verisinin tarihi (fetchedAt ile aynı). */
  lastVerified: string;
  /** Kaynağıyla birlikte; yoksa alan yok (uydurulmaz). */
  contextWindow?: NonNullable<Model['contextWindow']>;
  pricing?: NonNullable<Model['pricing']>;
}

const DEFAULT_ALIASES: Record<string, string> = (aliasesJson as { aliases?: Record<string, string> }).aliases ?? {};

/** scripts/sync/core.mjs normalizeModelKey ile aynı: küçük harf, ayırıcılar tek '-'. */
export function normalizeModelKey(s: string): string {
  return s
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Ürünün bağlı model id'leri -> models.json'daki kanonik id'ler (takma ad çözülür, bulunamayan atılır). */
export function resolveModelIds(ids: string[], models: Pick<Model, 'id'>[], aliases: Record<string, string> = DEFAULT_ALIASES): string[] {
  const known = new Set(models.map((m) => m.id));
  return [...new Set(ids.map((id) => {
    if (known.has(id)) return id;
    const key = normalizeModelKey(id);
    return aliases[key] ?? key;
  }).filter((id) => known.has(id)))];
}

const norm = (s: string) => s.toLowerCase();
/** Üretici adı kaynaklar arasında farklı yazılabilir ("Google" / "Google DeepMind", "Runway" / "RunwayML"). */
const compact = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

export function matchesRule(model: Model, rule: ModelRule): boolean {
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

export function resolveCurrentModel(product: Pick<Product, 'models' | 'modelRule'>, models: Model[], aliases: Record<string, string> = DEFAULT_ALIASES): CurrentModel | null {
  const linked = resolveModelIds(product.models, models, aliases);
  const candidates = product.models.length > 0
    ? models.filter((m) => linked.includes(m.id))
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
    lastVerified: score.fetchedAt,
    ...(model.contextWindow ? { contextWindow: model.contextWindow } : {}),
    ...(model.pricing ? { pricing: model.pricing } : {}),
  };
}
