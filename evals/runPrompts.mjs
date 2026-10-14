// Prompt oluşturucu eval'i: evals/prompts.jsonl (rehber başına 2 senaryo).
//
//   npm run eval:prompts        (OPENAI_API_KEY gerekir; yoksa her senaryo skipped)
//
// Kontroller:
//  - soru kartı: konuşmada anlamlı bilgi varsa ÇIKMAMALI (eksikler akıllı varsayımla dolar); giriş aşırı belirsizse tek kart çıkmalı
//  - rehber doğrulayıcıları geçiyor mu (iki varyant da)
//  - iki varyant anlamlı ölçüde farklı mı (kelime Jaccard benzerliği < 0.9)
//  - prompt dili doğru mu (promptLanguage 'en' -> Türkçe harf yok; 'user' + tr -> Türkçe)
//  - hazır iyileştirme uygulanınca değer yeni prompta yansıdı mı
//  - sufficiencyScore (0-100): hedef AI yeterlilik rubriği, ilk kartın iki
//    varyantının ortalaması (bağlam tamlığı, araç sentaksı, somutluk, ayar/negatif
//    tutarlılığı; lib/promptBuilder/sufficiency.ts). Düşen kriterler satırda.
//  - kart: howToUse promptun araçta kullanımını anlatıyor, varsayımlar kullanıcı
//    dilinde (sufficiency.cardIssues)
//  - ortalama gecikme ve token; adım başına süre (start / answer / refine) ve
//    canlı zaman aşımını (PROMPT_TIMEOUT_MS) aşan adım (overTimeout)
//  - okumak için: iki varyantın metni, düşen kuralların mesajları, slotların
//    kaynağı (user / inferred / default), sorulan sorular ve soru kartı kararının
//    gerekçesi (isBroadGoal; slot başına modelin iddiası, alıntısı, doğrulandı mı)
//    satıra yazılır
// Sonuç: evals/results/<YYYY-MM-DD>-prompts.json

// env.mjs İLK import (ortam hazırlığı; bkz. o dosya)
import { ROOT, hasOpenAIKey, openaiCallCount, out, quietly } from './env.mjs';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const { startPromptSession, answerPromptQuestions, refinePromptSession, userMessagesFrom } = await import('../lib/promptBuilder/service.ts');
const { memoryPromptStore, newPromptSessionId } = await import('../lib/promptBuilder/store.ts');
const { openAIJsonLLM } = await import('../lib/promptBuilder/llm.ts');
const { PROMPT_TIMEOUT_MS } = await import('../lib/promptBuilder/deps.ts');
const { loadGuides } = await import('../lib/promptBuilder/guides.ts');
const { loadCatalog } = await import('../lib/catalog/index.ts');
const { cardIssues, sufficiencyScore } = await import('../lib/promptBuilder/sufficiency.ts');

const scenarios = readFileSync(path.join(ROOT, 'evals/prompts.jsonl'), 'utf8').split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l));
const guides = loadGuides();
const deps = () => ({
  llm: openAIJsonLLM(),
  store: memoryPromptStore(),
  guides,
  products: loadCatalog().products,
  tasksById: loadCatalog().tasksById,
  now: Date.now,
  newId: newPromptSessionId,
  signal: AbortSignal.timeout(60_000),
});

const words = (s) => new Set(s.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean));
function jaccard(a, b) {
  const A = words(a);
  const B = words(b);
  const inter = [...A].filter((w) => B.has(w)).length;
  return A.size + B.size === 0 ? 1 : inter / (A.size + B.size - inter);
}
const TR_CHARS = /[çğışöüÇĞİŞÖÜ]/;
function languageOk(prompt, guide, locale) {
  if (guide.promptLanguage === 'en') return !TR_CHARS.test(prompt);
  return locale === 'tr' ? TR_CHARS.test(prompt) || /\b(ve|için|bir|ile)\b/i.test(prompt) : !TR_CHARS.test(prompt);
}

out(`[eval:prompts] ${scenarios.length} senaryo | OpenAI anahtarı: ${hasOpenAIKey ? 'var' : 'YOK — senaryolar skipped'}`);
const rows = [];
for (const sc of scenarios) {
  const guide = guides.find((g) => g.id === sc.guideId);
  const row = { id: sc.id, guideId: sc.guideId, expectQuestion: sc.expectQuestion };
  const callsBefore = openaiCallCount();
  const started = performance.now();
  try {
    const d = deps();
    let tokens = 0;
    row.steps = [];
    /** Her istek ayrı ölçülür: canlıda zaman aşımı istek başınadır. */
    const step = async (name, fn) => {
      const t0 = performance.now();
      const res = await quietly(fn);
      row.steps.push({ step: name, ms: Math.round(performance.now() - t0), tokens: res.tokens ?? 0 });
      return res;
    };
    const first = await step('start', () => startPromptSession({ productId: sc.productId, goal: sc.goal, conversation: sc.conversation, locale: sc.locale }, d));
    tokens += first.tokens;
    if ('error' in first) throw new Error(first.error);
    row.slots = Object.fromEntries(Object.entries(first.session.slots).map(([id, st]) => [id, { value: st.value, source: st.source }]));
    // Soru kartı kararının gerekçesi: modelin iddiası, alıntısı, doğrulandı mı (extract.ts verifyEvidence).
    if (first.diagnostics) row.extraction = first.diagnostics;
    row.questionShown = first.card.type === 'prompt_question';
    row.questionCorrect = row.questionShown === sc.expectQuestion;
    let card = first.card;
    if (card.type === 'prompt_question') {
      row.questions = card.questions.length;
      row.askedSlots = card.questions.map((q) => q.slotId);
      const answered = await step('answer', () => answerPromptQuestions({ promptSessionId: card.promptSessionId, answers: Object.fromEntries(card.questions.map((q) => [q.slotId, 'auto'])) }, d));
      tokens += answered.tokens;
      if ('error' in answered) throw new Error(answered.error);
      card = answered.card;
    }
    const [safe, creative] = card.variants;
    row.validatorsPass = card.variants.every((v) => v.validation.status === 'passed');
    row.similarity = Math.round(jaccard(safe.prompt, creative.prompt) * 100) / 100;
    row.variantsDiffer = row.similarity < 0.9;
    row.languageOk = card.variants.every((v) => languageOk(v.prompt, guide, sc.locale));
    const productName = loadCatalog().products.find((p) => p.id === sc.productId)?.name ?? '';
    const scores = card.variants.map((v) => sufficiencyScore(v, { guide, goal: sc.goal, productName, userMessages: userMessagesFrom(sc.conversation, sc.goal) }));
    row.sufficiencyScore = Math.round(scores.reduce((a, x) => a + x.score, 0) / scores.length);
    row.cardOk = cardIssues({ howToUse: card.howToUse, assumptions: card.assumptions }, { guide, goal: sc.goal, productName, locale: sc.locale }).length === 0;
    row.sufficiencyFailed = [...new Set(scores.flatMap((x) => Object.entries(x.criteria).filter(([, ok]) => !ok).map(([c]) => c)))];
    row.variants = card.variants.map((v, i) => ({
      id: v.id,
      prompt: v.prompt,
      negativePrompt: v.negativePrompt,
      settings: v.settings,
      validation: v.validation,
      issues: scores[i].issues.map((x) => `${x.criterion}: ${x.message}`),
    }));
    row.howToUse = card.howToUse;
    if (sc.refinementId) {
      const refined = await step('refine', () => refinePromptSession({ promptSessionId: card.promptSessionId, refinementId: sc.refinementId }, d));
      tokens += refined.tokens;
      if ('error' in refined) throw new Error(refined.error);
      const text = `${refined.card.variants[0].prompt} ${refined.card.variants[0].settings.map((s) => s.value).join(' ')}`;
      row.refinedPrompt = refined.card.variants[0].prompt;
      row.refineReflected = new RegExp(sc.expectAfterRefine, 'i').test(text);
    }
    row.tokens = tokens;
    row.latencyMs = Math.round(performance.now() - started);
    row.overTimeout = row.steps.some((x) => x.ms > PROMPT_TIMEOUT_MS);
  } catch (error) {
    row.error = String(error?.message ?? error);
  }
  if (!hasOpenAIKey && openaiCallCount() > callsBefore) {
    for (const k of Object.keys(row)) if (!['id', 'guideId', 'expectQuestion'].includes(k)) delete row[k];
    row.skipped = 'needs OPENAI_API_KEY';
  }
  rows.push(row);
  const mark = (v) => (v === undefined ? '–' : v ? '✓' : '✗');
  const stepsText = (r) => (r.steps ?? []).map((x) => `${x.step} ${(x.ms / 1000).toFixed(1)} sn`).join(' / ');
  out(`${sc.id.padEnd(16)} soru ${mark(row.questionCorrect)}  doğrulayıcı ${mark(row.validatorsPass)}  farklı ${mark(row.variantsDiffer)}  dil ${mark(row.languageOk)}  iyileştirme ${mark(row.refineReflected)}  yeterlilik ${row.sufficiencyScore ?? '–'}${row.sufficiencyFailed?.length ? ` (${row.sufficiencyFailed.join(', ')})` : ''}  ${row.skipped ?? row.error ?? `${stepsText(row)}, ${row.tokens} token${row.overTimeout ? ` ⚠ canlı sınır ${PROMPT_TIMEOUT_MS / 1000} sn aşıldı` : ''}`}`);
}

const done = rows.filter((r) => !r.skipped && !r.error);
const rate = (key) => {
  const scored = done.filter((r) => r[key] !== undefined);
  return { hits: scored.filter((r) => r[key]).length, n: scored.length };
};
const avg = (key) => (done.length ? Math.round(done.reduce((a, r) => a + r[key], 0) / done.length) : null);
const summary = {
  total: rows.length,
  evaluated: done.length,
  skipped: rows.filter((r) => r.skipped).length,
  errors: rows.filter((r) => r.error).length,
  questionCorrect: rate('questionCorrect'),
  validatorsPass: rate('validatorsPass'),
  variantsDiffer: rate('variantsDiffer'),
  languageOk: rate('languageOk'),
  refineReflected: rate('refineReflected'),
  overTimeout: rate('overTimeout'),
  cardOk: rate('cardOk'),
  avgSufficiency: avg('sufficiencyScore'),
  avgLatencyMs: avg('latencyMs'),
  avgTokens: avg('tokens'),
};
const fmt = ({ hits, n }) => (n ? `${hits}/${n}` : 'n/a');
out('');
out(`ÖZET: değerlendirilen ${summary.evaluated}/${summary.total} (skipped ${summary.skipped}, hata ${summary.errors}) | soru kartı doğru ${fmt(summary.questionCorrect)} | doğrulayıcı ${fmt(summary.validatorsPass)} | varyant farklı ${fmt(summary.variantsDiffer)} | dil ${fmt(summary.languageOk)} | iyileştirme yansıdı ${fmt(summary.refineReflected)} | yeterlilik ort. ${summary.avgSufficiency ?? 'n/a'}/100 | kart (howToUse/varsayım) ${fmt(summary.cardOk)} | canlı sınırı aşan ${fmt(summary.overTimeout)} | ort. ${summary.avgLatencyMs ?? 'n/a'} ms, ${summary.avgTokens ?? 'n/a'} token`);

const date = new Date().toISOString().slice(0, 10);
const file = path.join(ROOT, 'evals/results', `${date}-prompts.json`);
mkdirSync(path.dirname(file), { recursive: true });
writeFileSync(file, `${JSON.stringify({ date, generatedAt: new Date().toISOString(), openaiKey: hasOpenAIKey, summary, rows }, null, 2)}\n`);
out(`[eval:prompts] sonuç yazıldı: ${path.relative(ROOT, file)}`);
