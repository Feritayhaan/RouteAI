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
import { loadCatalog } from '../lib/catalog/index.ts';
import { runAgent } from '../lib/agent/loop.ts';
import { openAIChatClient } from '../lib/agent/client.ts';
import { agentModel } from '../lib/agent/config.ts';

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

/**
 * v2: sohbet ajanı, HTTP'siz (lib/agent/loop.ts). ask_user dönerse ilk
 * seçeneği kullanıcı cevabı sayıp bir tur daha çalıştırır. Bütçe ve v1
 * yedeği burada YOK: ölçülen ajanın kendisi; hata olursa satır hata sayılır.
 */
async function v2(query, golden) {
  const deps = { client: openAIChatClient(), model: agentModel(), tasks: loadCatalog().tasks, signal: AbortSignal.timeout(60_000) };
  const locale = golden.lang;
  const messages = [{ role: 'user', content: query }];
  const cards = [];
  const emit = (e) => { if (e.type === 'card') cards.push(e.card); };

  let out = await runAgent({ messages, locale }, deps, emit);
  let tokens = out.usage.totalTokens;
  let rounds = out.modelRounds;
  const clarification = out.endedWith === 'question';
  let question = null;

  if (clarification) {
    question = cards.findLast((c) => c.type === 'question');
    messages.push({ role: 'assistant', content: question.question, kind: 'question' });
    messages.push({ role: 'user', content: question.options[0].label });
    out = await runAgent({ messages, locale }, deps, emit);
    tokens += out.usage.totalTokens;
    rounds += out.modelRounds;
  }

  const rec = cards.findLast((c) => c.type === 'recommendation');
  const workflow = cards.findLast((c) => c.type === 'workflow');
  return {
    task: rec?.taskId ?? out.taskId ?? undefined,
    tools: rec ? rec.items.map((i) => i.name) : workflow ? [...new Set(workflow.steps.map((s) => s.product?.name).filter(Boolean))] : [],
    clarification,
    tokens,
    detail: {
      kind: rec ? 'recommendation' : workflow ? 'workflow' : 'text',
      question: question ? { question: question.question, answered: question.options[0].label } : null,
      noEvidence: rec?.noEvidence ?? null,
      toolCalls: out.toolCalls,
      modelRounds: rounds,
    },
  };
}

export const recommenders = { v1, 'v2-oracle': v2Oracle, v2 };
