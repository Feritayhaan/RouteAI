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
//
// Gizli kullanıcı puanı (options.points, lib/points): verilirse bir görevdeki
// aday ürünler (kanıtlı, editör seçimi ve kanıtsız aktif ürünler) puanı yüksek
// olandan düşüğe sıralanır; eşit puanda eski sıra (RouteAI Skoru → editör seçimi
// → alfabetik) korunur. Puan sonuca ASLA konmaz (istemci görmez). Verilmezse
// (testler, kapalı özellik) davranış eskisiyle birebir aynıdır.

import { classifyTask, type ClassifyTaskOptions, type TaskClassification } from './intent/taskClassifier';
import { extractConstraints } from './intent/parser';
import { domainClarify } from './intent/domainClarify';
import { matchProductByName } from './intent/productName';
import { approximateEnabled, isSupported, relatedTasks, STARTER_TASKS, suggestSpelling, taskSupport, understandingEnabled, unknownTerms } from './intent/understanding';
import { defaultSearchContext, searchCatalog, type SearchContext, type SearchItem } from './catalog/search';
import { fit, type ConstraintKey, type Constraints } from './catalog/fit';
import type { Confidence, Reason } from './catalog/score';
import { loadCatalog } from './catalog/index';
import type { BenchmarkSource, EditorPick, LocaleText, Product } from './catalog/schema';
import { matchesPricingFilter, type PricingFilter } from './pricing';
import { START_POINTS, rankByPoints } from './points/points';
import type { PointsProvider } from './points/store';
import { findMatchingTemplate, MAX_WORKFLOW_STEPS } from './workflow/workflowTemplates';
import { sentenceGateEnabled } from './intent/sentenceEvidence';
import { hasTerm } from './text';
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
  /**
   * 'evidence': RouteAI Skoru (benchmark / uzman / kullanıcı sonucu).
   * 'editor': görevde kanıt yokken data/editor-picks.json'daki "RouteAI
   * tavsiyesi" — puan yok, kartta "editör seçimi" diye yazılır.
   * 'unverified': kanıtı olmayan aktif ürün; yalnızca kullanıcı puanı açıkken
   * listeye girer, kartta "doğrulanmadı" diye yazılır.
   */
  basis: 'evidence' | 'editor' | 'unverified';
  /** basis 'editor' ise seçimin tarafsız gerekçesi. */
  editorNote?: LocaleText;
  /**
   * Ürünün bu sonuçtaki görevi. Sadece iş akışı adımlarında doludur (bir adım
   * birden fazla görevden ürün toplar); oy hangi görev için verildiğini bilsin.
   */
  taskId?: string;
}

export interface RecommendV3Recommendation {
  kind: 'recommendation';
  taskId: string;
  taskLabel: LocaleText;
  taskConfidence: number;
  /** 'user': görevi kullanıcı clarify seçeneklerinden seçti. 'name': sorgu bir ürün adıydı (searchedProductId). */
  taskSource: 'rules' | 'llm' | 'user' | 'name';
  /**
   * Sorgu doğrudan bir ürünün adıydı ("claude"): o ürün items[0]'a sabitlendi ve görev, ürünün
   * RouteAI verisinde en yüksek sırada olduğu görevdir. Arayüz "RouteAI tavsiyesi" yerine
   * "Aradığın ürün" yazar (sabitlenen ürün görevin birincisi olmayabilir).
   */
  searchedProductId?: string;
  items: RecommendationItem[];
  /** Sorgudaki kısıt gevşetildiyse (arayüz filtresi ASLA burada olamaz). */
  relaxedConstraint?: ConstraintKey[];
  /** Editör seçimi varken görevdeki diğer aktif ürünler: puansız, alfabetik, "doğrulanmadı". */
  unverified?: Product[];
  /**
   * Yalnızca TAHMİNİ eşleşmede: katalogda isteğin kendisine uyan bir iş yok; items, yapay zekanın "en yakın" dediği işin
   * araçlarıdır ve o işin RouteAI puanıyla sıralıdır. Ekran bunu açıkça yazar; oy ve "işini gördü mü?" kaydı bu sonuca yazılmaz.
   */
  approximate?: {
    /** Katalogda hiçbir yerde geçmeyen kelimeler (en çok 3). */
    unknownTerms?: string[];
    /** Başka olası işler ("şunu mu demek istedin?" düğmeleri), en olası önce, en çok 3. */
    otherTasks: { taskId: string; label: LocaleText }[];
  };
}

export interface RecommendV3Clarify {
  kind: 'clarify';
  options: { taskId: string; label: LocaleText }[];
  /**
   * Yoksa klasik "hangi iş?" sorusu (alan belirsiz / görevler birbirine yakın).
   *  - 'no_match': isteği tam karşılayan görev yok; options en yakın görevler (lib/intent/understanding.ts)
   *  - 'unclear': isteğin hiçbir kelimesi katalogla örtüşmedi; options başlangıç görevleri
   *  - 'spelling': tek kelimelik sorgu bir ürün adının yazım hatası olabilir; options boş, suggestion dolu
   */
  reason?: 'no_match' | 'unclear' | 'spelling';
  /** Katalogda hiçbir yerde geçmeyen kelimeler (sorgudaki yazımla, en çok 3): "unity" için araç grubumuz yok. */
  unknownTerms?: string[];
  /** Yalnızca 'spelling': düzeltilmiş sorgu ("midjorney" -> "Midjourney"). Aynı sorgu olarak yeniden istenir. */
  suggestion?: string;
}

export interface RecommendV3NoEvidence {
  kind: 'no_evidence';
  taskId: string;
  taskLabel: LocaleText;
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
  /** Gizli kullanıcı puanı sağlayıcısı (lib/points/store.ts). Yoksa puansız (eski) sıralama. */
  points?: PointsProvider;
  ctx?: SearchContext;
  now?: number;
  /**
   * Kullanıcının clarify seçeneklerinden seçtiği görev: sınıflandırma ve iş
   * akışı denemesi atlanır. Katalogda olmayan id yok sayılır (normal akış).
   */
  taskId?: string;
  /** Varsayılan: gerçek katalogdaki seçimler; ctx verilmişse (test) boş. */
  editorPicks?: EditorPick[];
}

type ResolvedTask = Pick<TaskClassification, 'taskId' | 'confidence' | 'constraints'> &
  Partial<Pick<TaskClassification, 'fit' | 'closest' | 'alternatives'>> & { source: RecommendV3Recommendation['taskSource'] };

/** Kullanıcının seçtiği görev: sorgudaki fiyat kısıtı yine sorgudan okunur (classifyTask'taki kuralla). */
function chosenTask(query: string, taskId: string): ResolvedTask {
  const { pricing } = extractConstraints(query);
  // 'freemium' parser'ın "tercih belirtilmedi" varsayılanı: kısıt değil (taskClassifier pickPriceLang ile aynı).
  return { taskId, confidence: 1, source: 'user', constraints: pricing && pricing !== 'freemium' ? { pricing } : {} };
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
    basis: 'evidence',
  };
}

function editorItem(product: Product, pick: EditorPick): RecommendationItem {
  return { product, confidence: 'low', reasons: [], dataDate: pick.date, sources: [], basis: 'editor', editorNote: pick.reason };
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
  unverified?: Product[];
}

interface Env {
  ctx: SearchContext;
  pricingFilter: PricingFilter;
  picks: EditorPick[];
  points?: PointsProvider;
}

/** Puanlı sıralamada en fazla bu kadar araç (ana + alternatifler) döner; kanıtsız artanlar `unverified` listesine gider. */
const MAX_ITEMS = 5;

/**
 * Tek bir görev için: searchCatalog (yumuşak sorgu kısıtıyla) → arayüz fiyat
 * filtresiyle sonradan ele (asla gevşetilmez) → RecommendationItem'lara çevir.
 * Kanıt yoksa products dolu döner (no_evidence listesi için).
 */
function recommendForTaskLegacy(taskId: string, { ctx, pricingFilter, picks }: Env, softPricing?: Constraints['pricing']): TaskOutcome {
  const result = searchCatalog({ taskId, constraints: { pricing: softPricing } }, ctx);
  if (result.noEvidence) {
    const active = activeForTask(ctx, taskId);
    // Kanıt yok ama editör seçimi var: "RouteAI tavsiyesi" (puansız). Arayüz
    // fiyat filtresine uymuyorsa gösterilmez — filtre asla gevşetilmez.
    const pick = picks.find((p) => p.taskId === taskId);
    const picked = pick && active.find((p) => p.id === pick.productId && matchesPricingFilter(p.pricing, pricingFilter));
    if (pick && picked) {
      return { items: [editorItem(picked, pick)], noEvidence: false, products: [], unverified: active.filter((p) => p.id !== picked.id) };
    }
    return { items: [], noEvidence: true, products: active };
  }
  const items = result.items.filter((i) => matchesPricingFilter(i.product.pricing, pricingFilter)).map(toItem);
  return { items, noEvidence: false, products: [], relaxedConstraint: result.relaxedConstraint };
}

function unratedItem(product: Product): RecommendationItem {
  return { product, confidence: 'low', reasons: [], dataDate: null, sources: [], basis: 'unverified' };
}

/**
 * Puanlı sürüm: görevdeki bütün aday ürünler tek listede, puanı yüksek olandan
 * düşüğe. Adaylar: kanıtlı ürünler (RouteAI Skoru sırasıyla), kanıt yoksa editör
 * seçimi, ve kanıtı olmayan diğer aktif ürünler (alfabetik). Eşit puanda bu
 * sıra korunur; hiç oy yokken liste, kanıtsızların eklenmesi dışında, eskisiyle
 * aynıdır. Arayüz fiyat filtresi hiçbir aşamada gevşemez.
 */
async function recommendForTaskRanked(taskId: string, env: Env, softPricing: Constraints['pricing'], points: PointsProvider): Promise<TaskOutcome> {
  const { ctx, pricingFilter, picks } = env;
  const task = ctx.tasksById.get(taskId)!;
  const result = searchCatalog({ taskId, constraints: { pricing: softPricing }, limit: Math.max(ctx.products.length, 1) }, ctx);
  const active = activeForTask(ctx, taskId);

  const evidenceItems = result.noEvidence
    ? []
    : result.items.filter((i) => matchesPricingFilter(i.product.pricing, pricingFilter)).map(toItem);
  const evidenceIds = new Set(result.items.map((i) => i.product.id));

  // Kanıtsız adaylar. Kanıtlı görevde sorgudaki (gevşemiş olabilecek) kısıtlar
  // onlara da uygulanır; kanıtsız görevde eskisi gibi yalnızca arayüz filtresi.
  const effective: Constraints = { pricing: softPricing };
  for (const key of result.relaxedConstraint ?? []) delete effective[key];
  const rest = active.filter(
    (p) => !evidenceIds.has(p.id) && matchesPricingFilter(p.pricing, pricingFilter) && (result.noEvidence || fit(p, task, effective, ctx.reviews).ok)
  );

  const pick = result.noEvidence ? picks.find((p) => p.taskId === taskId) : undefined;
  const picked = pick ? rest.find((p) => p.id === pick.productId) : undefined;
  const ordered: RecommendationItem[] = [
    ...evidenceItems,
    ...(pick && picked ? [editorItem(picked, pick)] : []),
    ...rest.filter((p) => p.id !== picked?.id).map(unratedItem),
  ];

  const pointsOf = await points.load(taskId);
  const voted = ordered.some((i) => (pointsOf.get(i.product.id) ?? START_POINTS) !== START_POINTS);

  // Hiç kanıt, editör seçimi ya da oy yok: dürüst boş durum (alfabetik, sıralama iddiası yok).
  if (result.noEvidence && !picked && !voted) return { items: [], noEvidence: true, products: active };
  // Kanıt var ama arayüz fiyat filtresi hepsini eledi: bu bir hata değil, dürüst sonuçtur.
  if (ordered.length === 0) return { items: [], noEvidence: false, products: [], relaxedConstraint: result.relaxedConstraint };

  const ranked = rankByPoints(
    ordered.map((item, legacyIndex) => ({ value: item, legacyIndex, points: pointsOf.get(item.product.id) ?? START_POINTS }))
  );
  const overflow = ranked
    .slice(MAX_ITEMS)
    .filter((i) => i.basis !== 'evidence')
    .map((i) => i.product)
    .sort((a, b) => a.name.localeCompare(b.name));
  return { items: ranked.slice(0, MAX_ITEMS), noEvidence: false, products: [], relaxedConstraint: result.relaxedConstraint, ...(overflow.length > 0 ? { unverified: overflow } : {}) };
}

function recommendForTask(taskId: string, env: Env, softPricing?: Constraints['pricing']): Promise<TaskOutcome> {
  return env.points ? recommendForTaskRanked(taskId, env, softPricing, env.points) : Promise.resolve(recommendForTaskLegacy(taskId, env, softPricing));
}

/** Birden fazla görevi olan bir adım: sonuçlar birleşir (görev sırasıyla, tekrarsız). */
async function recommendForStep(step: WorkflowStepTemplate, env: Env): Promise<RecommendV3WorkflowStep> {
  const { ctx } = env;
  const seen = new Set<string>();
  const items: RecommendationItem[] = [];
  const products: Product[] = [];
  const seenProduct = new Set<string>();
  let anyEvidence = false;

  for (const taskId of step.tasks) {
    if (!ctx.tasksById.has(taskId)) continue;
    const outcome = await recommendForTask(taskId, env);
    if (!outcome.noEvidence) anyEvidence = true;
    for (const item of outcome.items) {
      if (seen.has(item.product.id)) continue;
      seen.add(item.product.id);
      items.push({ ...item, taskId });
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
// Ürün adı araması ("claude", "midjourney")
// ------------------------------------------------------------------

/** Kanıtsız (alfabetik/"doğrulanmadı") listedeki ürün, puanlı sıradaki herhangi bir ürünün arkasında sayılır. */
const UNRANKED_POSITION = 1000;

/**
 * Aranan ürünü, RouteAI verisinde en yüksek sırada olduğu görevle göster: ürün items[0]'a sabitlenir,
 * altında o görevin diğer araçları kendi sırasıyla durur. Ürünün görevlerinden hiçbirinde (arayüz fiyat
 * filtresi ya da görevi olmaması yüzünden) gösterilebilir değilse null; çağıran normal akışa döner —
 * fiyat filtresi hiçbir aşamada gevşemez.
 */
async function recommendForProductName(product: Product, env: Env): Promise<RecommendV3Recommendation | null> {
  let best: { taskId: string; position: number; outcome: TaskOutcome; item: RecommendationItem } | null = null;

  for (const taskId of product.tasks) {
    if (!env.ctx.tasksById.has(taskId)) continue;
    const outcome = await recommendForTask(taskId, env);
    const index = outcome.items.findIndex((i) => i.product.id === product.id);
    let position: number;
    let item: RecommendationItem;
    if (index >= 0) {
      position = outcome.items[index].basis === 'evidence' ? index : UNRANKED_POSITION + index;
      item = outcome.items[index];
    } else if (outcome.products.some((p) => p.id === product.id) || outcome.unverified?.some((p) => p.id === product.id)) {
      position = UNRANKED_POSITION * 2;
      item = unratedItem(product);
    } else if (matchesPricingFilter(product.pricing, env.pricingFilter)) {
      // Puansız (legacy) sıralamada kanıtsız ürün hiçbir listede yoktur; adıyla arandığı için yine de
      // "doğrulanmadı" olarak gösterilir. Arayüz fiyat filtresi bunu da elerse gösterilmez.
      position = UNRANKED_POSITION * 3;
      item = unratedItem(product);
    } else {
      continue; // arayüz fiyat filtresi eledi
    }
    if (!best || position < best.position) best = { taskId, position, outcome, item };
  }
  if (!best) return null;

  const others = (list: Product[]) => list.filter((p) => p.id !== product.id);
  const unverified = best.outcome.noEvidence ? others(best.outcome.products) : others(best.outcome.unverified ?? []);
  return {
    kind: 'recommendation',
    taskId: best.taskId,
    taskLabel: env.ctx.tasksById.get(best.taskId)!.label,
    taskConfidence: 1,
    taskSource: 'name',
    searchedProductId: product.id,
    items: [best.item, ...best.outcome.items.filter((i) => i.product.id !== product.id)],
    ...(best.outcome.relaxedConstraint?.length ? { relaxedConstraint: best.outcome.relaxedConstraint } : {}),
    ...(unverified.length > 0 ? { unverified } : {}),
  };
}

// ------------------------------------------------------------------
// Anlama kapısı (lib/intent/understanding.ts): tahmin yerine soru
// ------------------------------------------------------------------

/** "Tam uyan iş yok" sorusunda en çok bu kadar görev sunulur (ClarifyDisplay 3'lü ızgara; fazlası karar yorgunluğu). */
const MAX_ASK_OPTIONS = 4;
/** Hiçbir ipucu yokken sunulan başlangıç görevi sayısı (2 satır x 3). */
const STARTER_OPTIONS = 6;

function offerableTask(ctx: SearchContext, taskId: string): boolean {
  return ctx.tasksById.has(taskId) && ctx.products.some((p) => p.status === 'active' && p.tasks.includes(taskId));
}

function clarifyOptions(ctx: SearchContext, taskIds: string[]): RecommendV3Clarify['options'] {
  return taskIds.map((taskId) => ({ taskId, label: ctx.tasksById.get(taskId)!.label }));
}

/**
 * Sistem isteği tam karşılayan bir iş bulamadı: tahmin etmez, kullanıcıya sorar.
 * Adaylar sırayla: çağıranın ipuçları (LLM'in en yakın dedikleri, kural yedeği), sonra katalog sözcük
 * örtüşmesiyle en yakın görevler. Hiç aday yoksa başlangıç görevleri sunulur.
 * reason 'no_match': konuyu biliyoruz ama katalogda karşılığı yok (kelime katalogda geçmiyor ya da en yakın işler var);
 * 'unclear': ne aday ne bilinmeyen kelime var (istek neredeyse tamamen dolgu).
 */
function askWhichTask(query: string, ctx: SearchContext, hints: string[] = []): RecommendV3Clarify {
  const seen = new Set<string>();
  const candidates = [...hints, ...relatedTasks(query, ctx, MAX_ASK_OPTIONS).map((r) => r.taskId)]
    .filter((id) => offerableTask(ctx, id) && !seen.has(id) && seen.add(id))
    .slice(0, MAX_ASK_OPTIONS);
  const unknown = unknownTerms(query, ctx);
  if (candidates.length > 0) {
    return { kind: 'clarify', reason: 'no_match', options: clarifyOptions(ctx, candidates), ...(unknown.length ? { unknownTerms: unknown } : {}) };
  }
  const starters = STARTER_TASKS.filter((id) => offerableTask(ctx, id)).slice(0, STARTER_OPTIONS);
  return {
    kind: 'clarify',
    reason: unknown.length > 0 ? 'no_match' : 'unclear',
    options: clarifyOptions(ctx, starters),
    ...(unknown.length ? { unknownTerms: unknown } : {}),
  };
}

/**
 * Tam uyan iş yok ama LLM yakın işler bildirdi: sormak yerine en yakın işin araçlarını, o işin RouteAI puanıyla sıralı ve
 * "tahmini eşleşme" etiketiyle göster (diğer olası işler düğme olarak yanında).
 *  - Sıra: LLM'in "en yakın" listesi (en yararlı önce), sonra seçtiği görev, sonra alternatifler. Kanıtlı ürünü olan İLK iş gösterilir;
 *    hiçbirinde kanıt yoksa null (çağıran soru sorar). Skor uydurulmaz: her sayı ilgili işin kendi hesabından gelir.
 *  - LLM hiçbir görevin uymadığını söylediyse (fit 'none') null: bu durumda göstermek yanlış olur.
 *  - Puanlar işler arasında karşılaştırılmaz: yalnızca seçilen iş içinde sıralanır.
 */
async function approximateRecommendation(query: string, c: ResolvedTask, env: Env): Promise<RecommendV3Recommendation | null> {
  if (c.fit === 'none' || !approximateEnabled()) return null;
  const { ctx } = env;
  const seen = new Set<string>();
  const order = [...(c.closest ?? []), c.taskId, ...(c.alternatives ?? [])]
    .filter((id) => offerableTask(ctx, id) && !seen.has(id) && seen.add(id))
    .slice(0, MAX_ASK_OPTIONS);
  for (const taskId of order) {
    const outcome = await recommendForTask(taskId, env, toSoftPricing(c.constraints.pricing));
    if (outcome.noEvidence || outcome.items.length === 0) continue;
    const unknown = unknownTerms(query, ctx);
    return {
      kind: 'recommendation',
      taskId,
      taskLabel: ctx.tasksById.get(taskId)!.label,
      taskConfidence: c.confidence,
      taskSource: 'llm',
      items: outcome.items,
      ...(outcome.relaxedConstraint ? { relaxedConstraint: outcome.relaxedConstraint } : {}),
      ...(outcome.unverified?.length ? { unverified: outcome.unverified } : {}),
      approximate: {
        ...(unknown.length ? { unknownTerms: unknown } : {}),
        otherTasks: order.filter((id) => id !== taskId).slice(0, 3).map((id) => ({ taskId: id, label: ctx.tasksById.get(id)!.label })),
      },
    };
  }
  return null;
}

/**
 * LLM bir görev seçti ama bu seçim tahmin mi? İki bağımsız sinyalden biri yeterli (kuşkuda soru sor):
 *  1) LLM'in kendi değerlendirmesi: fit 'partial' ("Unity" gibi hiçbir görevin konusu olmayan bir alan) ya da 'none'.
 *  2) Sorgunun anlam taşıyan hiçbir kelimesi seçilen görevin sözcük dağarcığında geçmiyor (LLM'e güvenmeden doğrulanır).
 * (2) yalnızca en/tr için uygulanır: katalog metni bu iki dilde. LLM başka dil bildirip fit 'exact' dediyse ona güvenilir.
 * Kural katmanının kesin sonuçları ve kullanıcının seçtiği görev buraya hiç gelmez (source 'llm' değil).
 */
function isGuess(c: ResolvedTask, query: string, ctx: SearchContext): boolean {
  if (c.source !== 'llm' || !understandingEnabled()) return false;
  if (c.fit === 'partial' || c.fit === 'none') return true;
  const lang = c.constraints.language;
  if (c.fit === 'exact' && lang && lang !== 'en' && lang !== 'tr') return false;
  return !isSupported(taskSupport(query, c.taskId, ctx));
}

// ------------------------------------------------------------------
// Ana giriş
// ------------------------------------------------------------------

export async function recommendV3(query: string, pricingFilter: PricingFilter = 'all', options: RecommendV3Options = {}): Promise<RecommendV3Result> {
  const ctx = options.ctx ?? defaultSearchContext(options.now);
  const env: Env = { ctx, pricingFilter, picks: options.editorPicks ?? (options.ctx ? [] : loadCatalog().editorPicks), points: options.points };

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
  //
  // Şablon kontrolü LLM'den ÖNCE ve önbelleksiz kural kararıyla yapılır: LLM
  // belirsiz sorguya her zaman tek görev seçer (eval.yml, 2026-09-28:
  // clarifyRate 0/112) ve önbellekteki LLM sonucu da aynı işi görür; ikisi de
  // şablondan önce gelirse iş akışına hiç ulaşılmaz.
  let classified: ResolvedTask | Awaited<ReturnType<typeof classifyTask>>;
  if (options.taskId && ctx.tasksById.has(options.taskId)) {
    classified = chosenTask(query, options.taskId);
  } else {
    // Sorgu doğrudan bir ürünün adı ("claude", "midjourney"): o ürünü göster
    // (lib/intent/productName.ts). Görev sınıflandırmasına, iş akışına ve alan sorusuna
    // gitmeden; adın yanında başka kelime varsa ("claude ile logo yap") bu dal susar.
    const named = matchProductByName(query, ctx.products);
    if (named) {
      const pinned = await recommendForProductName(named, env);
      if (pinned) return pinned;
    } else if (understandingEnabled()) {
      // Tek kelimelik sorgu bir ürün adının yazım hatası olabilir ("midjorney"). Öneri yalnızca düzeltilmiş
      // sorgu gerçekten o ürüne çözülüyorsa yapılır; yoksa normal akış sürer.
      const spelled = suggestSpelling(query, ctx);
      if (spelled && matchProductByName(spelled.corrected, ctx.products)) {
        return { kind: 'clarify', reason: 'spelling', options: [], suggestion: spelled.corrected };
      }
    }
    // Eksik bilgili sorgu ("kodla ilgili yardım", "video", "görsel lazım"): sorgudaki her
    // kelime bir alanı anlatan şemsiye ya da hiçbir şey söylemeyen dolgu kelimesi.
    // Kural katmanı bunu bazen tek göreve bağlar ("görsel" -> image.generate), LLM ise
    // hep tek görev seçer; ikisine de bırakmadan alanın görevlerini sor
    // (lib/intent/domainClarify.ts). Şablonlardan ("podcast…") önce olması güvenlidir:
    // şablon kelimeleri dolgu değildir, o sorgularda bu katman susar.
    const domain = domainClarify(query, ctx);
    if (domain) {
      return { kind: 'clarify', options: domain.map((taskId) => ({ taskId, label: ctx.tasksById.get(taskId)!.label })) };
    }
    const rules = await classifyTask(query, { allowLLM: false, useCache: false });
    if ('clarify' in rules) {
      const template = findMatchingTemplate(query);
      // Şablon yalnızca tetikleyici İFADESİ cümlede geçiyorsa seçilir: kısmi kelime puanı (0,15) tek başına yetmez
      // ("markamın etkinlik davetini ... kart" -> "marka" -> marka kimliği iş akışı). SENTENCE_GATE=off: eski davranış.
      if (template && (!sentenceGateEnabled() || template.triggers.some((t) => hasTerm(query, t)))) {
        const steps = await Promise.all(template.steps.slice(0, MAX_WORKFLOW_STEPS).map((step) => recommendForStep(step, env)));
        return { kind: 'workflow', templateId: template.id, templateName: template.name, steps };
      }
    }
    classified = 'clarify' in rules && options.allowLLM !== false ? await classifyTask(query, { allowLLM: true }) : rules;
  }

  if ('clarify' in classified) {
    // Kural yedeği hiçbir görev anahtar kelimesi tutmadığını bildirdi (puan 0): tasks.json sırasındaki ilk görevler yerine
    // katalogla gerçekten örtüşen görevler ya da başlangıç görevleri sorulur.
    if (classified.reason === 'no_match' || classified.clarify.length === 0) return askWhichTask(query, ctx, classified.clarify);
    return { kind: 'clarify', options: clarifyOptions(ctx, classified.clarify) };
  }

  // LLM seçimi tahmin mi (konu hiçbir görevin işi değil / sorgunun hiçbir kelimesi bu işte geçmiyor)? Öyleyse seçilen aracı
  // göstermek yerine sor: "unity gamedev" -> "uygulama oluşturucu" -> alakasız Replit Agent gibi sonuçlar biter.
  if (isGuess(classified, query, ctx)) {
    // Önce en yakın işin araçları "tahmini eşleşme" olarak gösterilir; kanıtlı araç yoksa ya da LLM hiçbir iş uymuyor dediyse sorulur.
    const approximate = await approximateRecommendation(query, classified, env);
    if (approximate) return approximate;
    // Sıra approximateRecommendation ile aynı: LLM'in "en yararlı" listesi önce.
    return askWhichTask(query, ctx, [
      ...(classified.closest ?? []),
      ...(classified.fit === 'none' ? [] : [classified.taskId]),
      ...(classified.alternatives ?? []),
    ]);
  }

  const taskLabel = ctx.tasksById.get(classified.taskId)!.label;
  const outcome = await recommendForTask(classified.taskId, env, toSoftPricing(classified.constraints.pricing));
  if (outcome.noEvidence) {
    return { kind: 'no_evidence', taskId: classified.taskId, taskLabel, products: outcome.products };
  }

  return {
    kind: 'recommendation',
    taskId: classified.taskId,
    taskLabel,
    taskConfidence: classified.confidence,
    taskSource: classified.source,
    items: outcome.items,
    ...(outcome.relaxedConstraint ? { relaxedConstraint: outcome.relaxedConstraint } : {}),
    ...(outcome.unverified?.length ? { unverified: outcome.unverified } : {}),
  };
}
