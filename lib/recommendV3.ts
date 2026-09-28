// v3 öneri motoru (P12) — görev tabanlı, kanıta dayalı.
//
// Akış: classifyTask (P11) → searchCatalog (RouteAI Skoru). Kanıtsız ürün
// önerilmez (searchCatalog zaten eler); kanıt yoksa dönüş no_evidence'tır,
// sessizce boş liste değil.
//
// Fiyat kısıtı iki kaynaktan gelebilir:
//  - Arayüz filtresi (pricingFilter parametresi): kullanıcının açıkça
//    tıkladığı düğme. ASLA gevşetilmez; searchCatalog'un relax mekanizmasına
//    hiç verilmez — sonuç öğeleri en sonda bununla elenir (matchesPricingFilter).
//    Bu eleme sonrası liste boş kalabilir: bu bir hata değil, dürüst sonuçtur.
//  - Sorgudaki kısıt (classifyTask'ın çıkardığı constraints.pricing): YUMUŞAK.
//    searchCatalog'a verilir, sonuç boşsa searchCatalog kendi kuralıyla
//    gevşetip relaxedConstraint döner (bkz. lib/catalog/search.ts RELAX_ORDER).
//
// Yalnızca data/products.json: searchCatalog zaten sadece bu dosyayı okuyor;
// katalogda olmayan araç yapısal olarak dönemez.

import { classifyTask, type ClassifyTaskOptions } from './intent/taskClassifier';
import { defaultSearchContext, searchCatalog, type SearchContext, type SearchItem } from './catalog/search';
import type { ConstraintKey, Constraints } from './catalog/fit';
import type { Confidence, Reason } from './catalog/score';
import type { BenchmarkSource, LocaleText, Product } from './catalog/schema';
import { matchesPricingFilter, type PricingFilter } from './pricing';
import { findMatchingTemplate, MAX_WORKFLOW_STEPS } from './workflow/workflowTemplates';
import type { WorkflowStepTemplate } from './workflow/workflowTypes';

// ------------------------------------------------------------------
// Dönüş tipleri
// ------------------------------------------------------------------

export interface RecommendationItem {
  product: Product;
  /** RouteAI Skoru'nun güven düzeyi (lib/catalog/score.ts). */
  confidence: Confidence;
  /** Metin değil kod: lib/i18n şablonla metne çevirir. */
  reasons: Reason[];
  /** Kullanılan kanıtın en yenisi (YYYY-MM-DD). */
  dataDate: string | null;
  /** Puana giren benchmark kaynakları (lisans şartı: kaynak adı gösterilmeli). */
  sources: BenchmarkSource[];
}

export interface RecommendV3Recommendation {
  kind: 'recommendation';
  taskId: string;
  taskConfidence: number;
  taskSource: 'rules' | 'llm';
  items: RecommendationItem[];
  /** Sorgudaki kısıt gevşetildiyse (arayüz filtresi ASLA burada olamaz). */
  relaxedConstraint?: ConstraintKey[];
}

export interface RecommendV3Clarify {
  kind: 'clarify';
  options: { taskId: string; label: LocaleText }[];
}

export interface RecommendV3NoEvidence {
  kind: 'no_evidence';
  taskId: string;
  /** Görevdeki aktif ürünler, puansız, alfabetik. Sıralama iddiası yok. */
  products: Product[];
}

export interface RecommendV3WorkflowStep {
  order: number;
  name: string;
  description: string;
  /** Adımın araçlarının bulunduğu görev(ler)i (birden fazlaysa aday havuzu birleşir). */
  taskIds: string[];
  items: RecommendationItem[];
  /** items boşsa true; products "doğrulanmadı" listesidir. */
  noEvidence: boolean;
  products?: Product[];
  tips?: string[];
}

export interface RecommendV3Workflow {
  kind: 'workflow';
  templateId: string;
  templateName: string;
  steps: RecommendV3WorkflowStep[];
}

export type RecommendV3Result = RecommendV3Recommendation | RecommendV3Clarify | RecommendV3NoEvidence | RecommendV3Workflow;

export interface RecommendV3Options extends ClassifyTaskOptions {
  ctx?: SearchContext;
  now?: number;
}

// ------------------------------------------------------------------
// Yardımcılar
// ------------------------------------------------------------------

function toItem(item: SearchItem): RecommendationItem {
  return {
    product: item.product,
    confidence: item.score.confidence,
    reasons: item.score.reasons,
    dataDate: item.score.dataDate,
    sources: [...new Set(item.score.components.benchmarks.map((b) => b.source))],
  };
}

/** classifyTask'ın fiyat sözlüğü -> fit.ts'in (sadece "ücretsize doğru" olan) sözlüğü. 'paid' kısıtsız kalır. */
function toSoftPricing(pricing?: 'free' | 'freemium' | 'paid'): Constraints['pricing'] {
  if (pricing === 'free') return 'free';
  if (pricing === 'freemium') return 'freeTier';
  return undefined;
}

const activeForTask = (ctx: SearchContext, taskId: string): Product[] =>
  ctx.products.filter((p) => p.status === 'active' && p.tasks.includes(taskId)).sort((a, b) => a.name.localeCompare(b.name));

interface TaskOutcome {
  items: RecommendationItem[];
  noEvidence: boolean;
  products: Product[];
  relaxedConstraint?: ConstraintKey[];
}

/**
 * Tek bir görev için: searchCatalog (yumuşak sorgu kısıtıyla) → arayüz fiyat
 * filtresiyle sonradan ele (asla gevşetilmez) → RecommendationItem'lara çevir.
 * Kanıt yoksa products dolu döner (no_evidence listesi için).
 */
function recommendForTask(taskId: string, ctx: SearchContext, pricingFilter: PricingFilter, softPricing?: Constraints['pricing']): TaskOutcome {
  const result = searchCatalog({ taskId, constraints: { pricing: softPricing } }, ctx);
  if (result.noEvidence) {
    return { items: [], noEvidence: true, products: activeForTask(ctx, taskId) };
  }
  const items = result.items.filter((i) => matchesPricingFilter(i.product.pricing, pricingFilter)).map(toItem);
  return { items, noEvidence: false, products: [], relaxedConstraint: result.relaxedConstraint };
}

/** Birden fazla görevi olan bir adım: sonuçlar birleşir (görev sırasıyla, tekrarsız). */
function recommendForStep(step: WorkflowStepTemplate, ctx: SearchContext, pricingFilter: PricingFilter): RecommendV3WorkflowStep {
  const seen = new Set<string>();
  const items: RecommendationItem[] = [];
  const products: Product[] = [];
  const seenProduct = new Set<string>();
  let anyEvidence = false;

  for (const taskId of step.tasks) {
    if (!ctx.tasksById.has(taskId)) continue;
    const outcome = recommendForTask(taskId, ctx, pricingFilter);
    if (!outcome.noEvidence) anyEvidence = true;
    for (const item of outcome.items) {
      if (seen.has(item.product.id)) continue;
      seen.add(item.product.id);
      items.push(item);
    }
    for (const p of outcome.products) {
      if (seenProduct.has(p.id)) continue;
      seenProduct.add(p.id);
      products.push(p);
    }
  }
  products.sort((a, b) => a.name.localeCompare(b.name));

  return {
    order: step.order,
    name: step.name,
    description: step.description,
    taskIds: step.tasks,
    items,
    noEvidence: !anyEvidence,
    ...(anyEvidence ? {} : { products }),
    ...(step.tips ? { tips: step.tips } : {}),
  };
}

// ------------------------------------------------------------------
// Ana giriş
// ------------------------------------------------------------------

export async function recommendV3(query: string, pricingFilter: PricingFilter = 'all', options: RecommendV3Options = {}): Promise<RecommendV3Result> {
  const ctx = options.ctx ?? defaultSearchContext(options.now);

  // ÖNCE tek görev (P11): "podcast kapağı", "e-kitap için kapak" gibi bir
  // projenin TEK PARÇASI istekleri classifyTask'ın kural katmanında (5+5
  // ifadeyle özenle ayarlanmış anahtar kelimeler) zaten kesin ve doğru
  // çözülüyor — "podcast", "e-kitap" gibi tetikleyici kelime geçse de.
  // İş akışı şablonları (lib/workflow) SADECE tek görev belirsiz kaldığında
  // (clarify) denenir: gerçek çok-adımlı proje istekleri ("podcast
  // oluşturmak istiyorum", "e-kitap yazmak istiyorum") kural katmanında
  // belirsiz kalıyor çünkü hiçbir TEK görevin anahtar kelimesi baskın değil
  // — bu doğal ayrım, parser.ts'teki PART_TERMS listesini kopyalamadan aynı
  // sonucu verir (doğrulama: bu dosyanın testleri, lib/__tests__/recommendV3.test.ts).
  const classified = await classifyTask(query, { allowLLM: options.allowLLM });

  if ('clarify' in classified) {
    const template = findMatchingTemplate(query);
    if (template) {
      const steps = template.steps.slice(0, MAX_WORKFLOW_STEPS).map((step) => recommendForStep(step, ctx, pricingFilter));
      return { kind: 'workflow', templateId: template.id, templateName: template.name, steps };
    }
    return {
      kind: 'clarify',
      options: classified.clarify.map((taskId) => ({ taskId, label: ctx.tasksById.get(taskId)!.label })),
    };
  }

  const outcome = recommendForTask(classified.taskId, ctx, pricingFilter, toSoftPricing(classified.constraints.pricing));
  if (outcome.noEvidence) {
    return { kind: 'no_evidence', taskId: classified.taskId, products: outcome.products };
  }

  return {
    kind: 'recommendation',
    taskId: classified.taskId,
    taskConfidence: classified.confidence,
    taskSource: classified.source,
    items: outcome.items,
    ...(outcome.relaxedConstraint ? { relaxedConstraint: outcome.relaxedConstraint } : {}),
  };
}
