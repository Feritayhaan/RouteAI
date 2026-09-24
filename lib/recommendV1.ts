// v1 öneri yolu — TEK yer.
//
// Bu mantık app/api/recommend/route.ts'in içindeydi ve scripts/run-queries.mjs
// onun elle tutulan bir kopyasını taşıyordu. Route dosyası Next.js kuralı
// gereği bu fonksiyonu dışarı açamadığı için test edilemiyordu; kopya da
// zamanla kayıyordu. Artık route, bench scripti, eval (evals/run.mjs) ve
// testler aynı kodu çalıştırır.
//
// İki katman:
//  - recommendV1(): rate limit ve istek doğrulaması SONRASI tüm akış —
//    niyet + arama + workflow dalı + aday seçimi. HTTP yanıtını kurmak
//    çağıranın işi (route.ts); burası sadece sonucu döner.
//  - selectV1Tools(): arama sonucu + niyet + katalog -> ana öneri ve alternatifler.

import type { IntentParsingError, ParsedIntent } from './intent/types';
import type { GeneratedWorkflow } from './workflow/workflowTypes';
import { analyzeIntent } from './intent/index';
import { generateWorkflow } from './workflow/workflowGenerator';
import { searchTools, type SearchResult } from './vectorService';
import { getTools, type Tool } from './toolsService';
import { PricingFilter, getPricingModel, isPaidOnly, matchesPricingFilter } from './pricing';
import { rankTools } from './ranking';

// ============================================================
// Kategori → beklenen outputTypes haritası
// Vector search yanlış kategori araç döndürürse filtrelemek için.
// metin'de 'document' şart: sunum araçları (Gamma, Beautiful.ai, Tome) metin
// kategorisinde ama çıktıları 'document'; yoksa hiç önerilemiyorlardı.
// ============================================================
export const categoryOutputMap: Record<string, string[]> = {
  video: ['video'],
  gorsel: ['image'],
  ses: ['audio'],
  kod: ['code', 'text'],
  metin: ['text', 'document'],
  arastirma: ['text'],
  veri: ['text', 'image'],
};

export interface V1SelectionInput {
  intent: ParsedIntent;
  searchResults: SearchResult[];
  /** getTools() çıktısı: deprecated kayıtlar dahil tüm katalog. */
  allTools: Tool[];
  /** UI'daki fiyat filtresi (kullanıcının açıkça tıkladığı). */
  pricingFilter?: PricingFilter;
}

export interface V1Selection {
  main: Tool;
  alternatives: Tool[];
  /** Kısıt gevşetildiyse hangisi — sessiz kalınmaz, kullanıcıya bildirilir. */
  relaxedConstraint: 'pricing' | null;
  /** Kategori havuzuna düşüldü mü (bench raporu için). */
  usedFallback: boolean;
}

/** Uygun araç yoksa null döner. */
export function selectV1Tools({ intent, searchResults, allTools, pricingFilter }: V1SelectionInput): V1Selection | null {
  const searchScores = new Map<string, number>();
  const candidates: Tool[] = [];
  for (const result of searchResults) {
    const tool = allTools.find(t => t.name === result.metadata.name);
    // deprecated kayıtlar arama sonucundan da elenmeli. Kategori fallback'i
    // (categoryPool) bunu zaten yapıyordu ama arama yolu yapmıyordu: karantina
    // triyajıyla emekliye ayrılan araçlar buradan sızıyordu.
    if (!tool || tool.deprecated) continue;
    candidates.push(tool);
    searchScores.set(tool.name, result.score);
  }

  // ============================================================
  // Filtreler tek yerde tanımlı: hem arama dalında hem kategori
  // fallback'inde AYNI kurallar çalışsın diye (eskiden kopyalanmıştı).
  // ============================================================

  // UI'dan gelen filtre + sorgunun kendi fiyat kısıtı.
  // relaxIntent=true iken sorgu kısıtı düşer, UI filtresi ASLA düşmez:
  // kullanıcının açıkça tıkladığı filtreyi gevşetme hakkımız yok.
  const filterByPricing = (list: Tool[], relaxIntent: boolean): Tool[] => {
    let out = list;

    // "Ücretli" artık freemium'u KAPSAMIYOR (bkz. lib/pricing.ts)
    if (pricingFilter && pricingFilter !== 'all') {
      out = out.filter(t => matchesPricingFilter(t.pricing, pricingFilter));
    }

    if (!relaxIntent) {
      // Kullanıcı "ücretsiz" dediyse freemium yeterli değil: ücretsiz
      // sanıp ödeme duvarına çarpmak, az seçenek görmekten kötü.
      if (intent.constraints?.pricing === 'free') {
        out = out.filter(t => getPricingModel(t.pricing) === 'free');
      } else if (intent.constraints?.pricing === 'paid') {
        out = out.filter(t => isPaidOnly(t.pricing));
      }
    }

    return out;
  };

  // outputTypes çapraz kontrolü: kategoriyle uyumlu çıktı veren araçları tut.
  // Örn: "video üret" => sadece outputTypes 'video' olan araçlar kalsın.
  const filterByOutputs = (list: Tool[]): Tool[] => {
    const expected = categoryOutputMap[intent.primaryCategory];
    if (!expected) return list;
    return list.filter(t =>
      !t.outputTypes || // outputTypes tanımlı değilse geç (legacy araç)
      t.outputTypes.some(o => expected.includes(o))
    );
  };

  const categoryPool = (): Tool[] =>
    allTools.filter(t => t.category === intent.primaryCategory && !t.deprecated);

  // ============================================================
  // Aday seçimi: aramadan başla, boşalırsa sırayla gevşet.
  // Kısıtı gevşetmek sessizce olmaz — relaxedConstraint ile bildirilir.
  // ============================================================
  let relaxedConstraint: 'pricing' | null = null;
  let usedFallback = false;
  let recommendedTools = filterByOutputs(filterByPricing(candidates, false));

  if (recommendedTools.length === 0) {
    // Arama ya boş döndü ya da bulduğu araçlar kategori/fiyat kısıtına
    // uymuyor. Eskiden bu durumda kısıt SESSİZCE yok sayılıp kategori dışı
    // araç ana öneri oluyordu ("YouTube altyazı" -> OpusClip, video aracı).
    usedFallback = true;
    recommendedTools = filterByOutputs(filterByPricing(categoryPool(), false));
  }

  if (recommendedTools.length === 0) {
    relaxedConstraint = 'pricing';
    recommendedTools = filterByOutputs(filterByPricing(candidates, true));
    if (recommendedTools.length === 0) {
      usedFallback = true;
      recommendedTools = filterByOutputs(filterByPricing(categoryPool(), true));
    }
  }

  if (recommendedTools.length === 0) return null;

  // Tek sıralama yolu: arama skoru > karantina cezası > strength > lastUpdated
  recommendedTools = rankTools(recommendedTools, { searchScores });

  const [main, ...rest] = recommendedTools;

  // Alternatifler ana aracın ya da sorgunun kategorisiyle ilgili olmalı.
  // Eskiden hiçbir filtreden geçmiyordu: "ses klonlama podcast" sorgusunda
  // 1. alternatif GitHub Copilot (kod) çıkıyordu. 3'ten az kalırsa az
  // gösteriyoruz — alakasız araçla doldurmak boşluktan kötü.
  const allowedCategories = new Set<string>([
    main.category,
    intent.primaryCategory,
    ...(intent.secondaryCategories ?? []),
  ]);
  const alternatives = rest
    .filter(t =>
      allowedCategories.has(t.category) ||
      t.secondaryCategories?.some(c => allowedCategories.has(c))
    )
    .slice(0, 3);

  return { main, alternatives, relaxedConstraint, usedFallback };
}

// ============================================================
// Tüm v1 akışı: rate limit ve istek doğrulaması SONRASI.
// ============================================================

export type V1Result =
  /** Niyet çıkarılamadı. LOW_CONFIDENCE = kullanıcıdan daha fazla ayrıntı istenir. */
  | { kind: 'error'; error: IntentParsingError }
  | { kind: 'workflow'; intent: ParsedIntent; workflow: GeneratedWorkflow }
  /** Kısıtlar gevşetildiği halde uygun araç kalmadı. */
  | { kind: 'empty'; intent: ParsedIntent; searchResults: SearchResult[] }
  | { kind: 'simple'; intent: ParsedIntent; searchResults: SearchResult[]; selection: V1Selection };

export async function recommendV1(
  prompt: string,
  pricingFilter?: PricingFilter,
  options: { allowLLM?: boolean } = {}
): Promise<V1Result> {
  // Niyet analizi ve arama PARALEL
  const [intentResult, searchResults] = await Promise.all([
    analyzeIntent(prompt, options),
    searchTools(prompt, 8),
  ]);

  if ('code' in intentResult) {
    return { kind: 'error', error: intentResult };
  }
  const intent = intentResult;

  // Workflow LAZY: sadece multi-step niyette üretilir. null dönerse
  // (şablon yok, AI üretimi de başarısız) tek araç önerisine düşülür.
  // allowLLM false iken workflow da atlanır: şablon bulunamazsa AI üretimine
  // gidiyor, bu da OpenAI çağrısı demek.
  if (intent.complexity === 'multi-step' && options.allowLLM !== false) {
    const workflow = await generateWorkflow(intent, prompt);
    if (workflow) {
      return { kind: 'workflow', intent, workflow };
    }
  }

  const allTools = await getTools();
  const selection = selectV1Tools({ intent, searchResults, allTools, pricingFilter });
  if (!selection) {
    return { kind: 'empty', intent, searchResults };
  }

  return { kind: 'simple', intent, searchResults, selection };
}
