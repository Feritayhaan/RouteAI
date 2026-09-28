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
import { classifyTask } from '../lib/intent/taskClassifier.ts';
import { recommendV3 } from '../lib/recommendV3.ts';
import { hasOpenAIKey } from './env.mjs';

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

/**
 * task: SADECE görev sınıflandırma doğruluğu (P11). Ürün önermez, tools
 * hep boş — top1Hit/top3Hit bu adaptörde anlamsız, taskMatch'e bakılır.
 *
 * OPENAI_API_KEY yoksa (bu ortamda hasOpenAIKey=false) allowLLM:false
 * verilir: LLM'e HİÇ gidilmez, hiçbir satır 'skipped' sayılmaz — dönen
 * taskMatch kural katmanının TEK BAŞINA doğruluğunu raporlar (P11 kabul:
 * ≥ %80). Anahtar varsa (eval.yml) allowLLM:true: belirsiz sorgular LLM'e
 * gider, taskMatch bütün sistemi ölçer (P11 kabul: ≥ %90).
 */
async function task(query) {
  const r = await classifyTask(query, { allowLLM: hasOpenAIKey });
  if ('clarify' in r) {
    return { tools: [], clarification: true, detail: { kind: 'clarify', clarify: r.clarify } };
  }
  return {
    task: r.taskId,
    tools: [],
    clarification: false,
    detail: { kind: r.source, confidence: r.confidence, alternatives: r.alternatives },
  };
}

/**
 * v3: görev tabanlı, kanıta dayalı öneri (P12, lib/recommendV3.ts). v1 ile
 * yan yana raporlanır: top1/top3 (ürün önerdiğinde), taskMatch, clarifyRate
 * hepsi anlamlı; no_evidence oranı detail.kind üzerinden run.mjs tablosunda
 * görünür (npm run eval -- --recommender=v3'te "detail" sütunu).
 */
async function v3(query) {
  const result = await recommendV3(query, 'all', { allowLLM: hasOpenAIKey });
  switch (result.kind) {
    case 'recommendation':
      return {
        task: result.taskId,
        tools: result.items.map((i) => i.product.name),
        clarification: false,
        detail: { kind: 'recommendation', taskSource: result.taskSource, relaxedConstraint: result.relaxedConstraint ?? null },
      };
    case 'clarify':
      return { tools: [], clarification: true, detail: { kind: 'clarify', options: result.options.map((o) => o.taskId) } };
    case 'no_evidence':
      // Görev doğru bulundu ama kanıt yok: taskMatch'e girsin, tools boş kalsın
      // (ürün önerilmedi, sadece "doğrulanmadı" listesi — top1/top3'e girmez).
      return { task: result.taskId, tools: [], clarification: false, detail: { kind: 'no_evidence', productCount: result.products.length } };
    case 'workflow':
      return {
        tools: [...new Set(result.steps.flatMap((s) => s.items.map((i) => i.product.name)))],
        clarification: false,
        detail: { kind: 'workflow', templateId: result.templateId, steps: result.steps.length },
      };
    default:
      throw new Error(`recommendV3 bilinmeyen sonuç: ${result.kind}`);
  }
}

export const recommenders = { v1, 'v2-oracle': v2Oracle, v2, task, v3 };
