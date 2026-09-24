// Değerlendirilen öneri sistemleri (adaptörler).
//
// Recommender arayüzü:
//   (query: string, golden: GoldenRow) => Promise<{
//     task?: string,           // görev kimliği (ör. "slides.create"); v1 döndürmez
//     tools: string[],         // sıralı; ilk eleman ana öneri
//     clarification?: boolean, // kullanıcıdan netleştirme istendi mi
//     skipped?: string,        // değerlendirilemedi, nedeni
//     detail?: object,         // rapor için ek bilgi (metriklere girmez)
//   }>
//
// `golden` sadece oracle adaptörü içindir (doğru görevi bilir); gerçek
// öneri sistemleri yalnızca `query`'yi kullanır.
//
// Bu dosya evals/run.mjs tarafından ortam hazırlandıktan SONRA yüklenir:
// lib modülleri bazı değişkenleri (ör. VECTOR_SEARCH_ENABLED) yüklenirken okur.

import { recommendV1 } from '../lib/recommendV1.ts';
import { searchCatalog } from '../lib/catalog/search.ts';

/** v1: /api/recommend ile aynı akış (lib/recommendV1.ts). UI filtresi yok = 'all'. */
async function v1(query) {
  const result = await recommendV1(query, 'all');

  switch (result.kind) {
    case 'simple': {
      const { main, alternatives, usedFallback, relaxedConstraint } = result.selection;
      return {
        tools: [main, ...alternatives].map((t) => t.name),
        clarification: false,
        detail: { kind: 'simple', category: result.intent.primaryCategory, usedFallback, relaxedConstraint },
      };
    }
    case 'workflow': {
      // Workflow'da tek bir ana öneri yok: adımların birincil araçları adım
      // sırasıyla (tekrarsız) listelenir, ilk adımın aracı "ilk öneri" sayılır.
      const tools = [...new Set(result.workflow.steps.map((s) => s.primary.tool.name))];
      return {
        tools,
        clarification: false,
        detail: { kind: 'workflow', category: result.intent.primaryCategory, steps: result.workflow.steps.length },
      };
    }
    case 'empty':
      return { tools: [], clarification: false, detail: { kind: 'empty', category: result.intent.primaryCategory } };
    case 'error':
      // LOW_CONFIDENCE: v1 "biraz daha detay verir misin?" der — netleştirme.
      return {
        tools: [],
        clarification: result.error.code === 'LOW_CONFIDENCE',
        detail: { kind: 'error', code: result.error.code },
      };
    default:
      throw new Error(`recommendV1 bilinmeyen sonuç: ${result.kind}`);
  }
}

/**
 * v2-oracle: görevi golden'dan DOĞRU kabul eder, sadece RouteAI Skoru
 * sıralamasını ölçer ("soğuk başlangıç kalitesi"). Görev döndürmez: taskMatch
 * burada anlamsız olurdu.
 */
async function v2Oracle(_query, golden) {
  const result = searchCatalog({ taskId: golden.expectedTask, limit: 5 });
  return {
    tools: result.items.map((i) => i.product.name),
    clarification: false,
    detail: {
      kind: result.noEvidence ? 'noEvidence' : 'search',
      items: result.items.map((i) => ({ name: i.product.name, q: i.score.q, confidence: i.score.confidence, benchmarkShare: i.score.benchmarkShare })),
      filteredOut: result.filteredOut,
    },
  };
}

/** v2: P5'te (sohbet ajanı) dolacak. */
async function v2() {
  return { tools: [], skipped: 'not implemented' };
}

export const recommenders = { v1, 'v2-oracle': v2Oracle, v2 };
