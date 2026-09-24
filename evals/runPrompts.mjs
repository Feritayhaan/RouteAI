// Prompt oluşturucu eval'i: evals/prompts.jsonl (rehber başına 2 senaryo).
//
//   npm run eval:prompts        (OPENAI_API_KEY gerekir; yoksa her senaryo skipped)
//
// Kontroller:
//  - soru kartı: bilgi konuşmada verilmişse ÇIKMAMALI; eksik 'high' slot varsa tek kart çıkmalı
//  - rehber doğrulayıcıları geçiyor mu (iki varyant da)
//  - iki varyant anlamlı ölçüde farklı mı (kelime Jaccard benzerliği < 0.9)
//  - prompt dili doğru mu (promptLanguage 'en' -> Türkçe harf yok; 'user' + tr -> Türkçe)
//  - hazır iyileştirme uygulanınca değer yeni prompta yansıdı mı
//  - ortalama gecikme ve token
// Sonuç: evals/results/<YYYY-MM-DD>-prompts.json

// env.mjs İLK import (ortam hazırlığı; bkz. o dosya)
import { ROOT, hasOpenAIKey, openaiCallCount, out, quietly } from './env.mjs';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const { startPromptSession, answerPromptQuestions, refinePromptSession } = await import('../lib/promptBuilder/service.ts');
const { memoryPromptStore, newPromptSessionId } = await import('../lib/promptBuilder/store.ts');
const { openAIJsonLLM } = await import('../lib/promptBuilder/llm.ts');
const { loadGuides } = await import('../lib/promptBuilder/guides.ts');
const { loadCatalog } = await import('../lib/catalog/index.ts');

const scenarios = readFileSync(path.join(ROOT, 'evals/prompts.jsonl'), 'utf8').split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l));
const guides = loadGuides();
const deps = () => ({
  llm: openAIJsonLLM(),
  store: memoryPromptStore(),
  guides,
  products: loadCatalog().products,
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
    const first = await quietly(() => startPromptSession({ productId: sc.productId, goal: sc.goal, conversation: sc.conversation, locale: sc.locale }, d));
    tokens += first.tokens;
    if ('error' in first) throw new Error(first.error);
    row.questionShown = first.card.type === 'prompt_question';
    row.questionCorrect = row.questionShown === sc.expectQuestion;
    let card = first.card;
    if (card.type === 'prompt_question') {
      row.questions = card.questions.length;
      const answered = await quietly(() => answerPromptQuestions({ promptSessionId: card.promptSessionId, answers: Object.fromEntries(card.questions.map((q) => [q.slotId, 'auto'])) }, d));
      tokens += answered.tokens;
      if ('error' in answered) throw new Error(answered.error);
      card = answered.card;
    }
    const [safe, creative] = card.variants;
    row.validatorsPass = card.variants.every((v) => v.validation.status === 'passed');
    row.similarity = Math.round(jaccard(safe.prompt, creative.prompt) * 100) / 100;
    row.variantsDiffer = row.similarity < 0.9;
    row.languageOk = card.variants.every((v) => languageOk(v.prompt, guide, sc.locale));
    if (sc.refinementId) {
      const refined = await quietly(() => refinePromptSession({ promptSessionId: card.promptSessionId, refinementId: sc.refinementId }, d));
      tokens += refined.tokens;
      if ('error' in refined) throw new Error(refined.error);
      const text = `${refined.card.variants[0].prompt} ${refined.card.variants[0].settings.map((s) => s.value).join(' ')}`;
      row.refineReflected = new RegExp(sc.expectAfterRefine, 'i').test(text);
    }
    row.tokens = tokens;
    row.latencyMs = Math.round(performance.now() - started);
  } catch (error) {
    row.error = String(error?.message ?? error);
  }
  if (!hasOpenAIKey && openaiCallCount() > callsBefore) {
    for (const k of Object.keys(row)) if (!['id', 'guideId', 'expectQuestion'].includes(k)) delete row[k];
    row.skipped = 'needs OPENAI_API_KEY';
  }
  rows.push(row);
  const mark = (v) => (v === undefined ? '–' : v ? '✓' : '✗');
  out(`${sc.id.padEnd(16)} soru ${mark(row.questionCorrect)}  doğrulayıcı ${mark(row.validatorsPass)}  farklı ${mark(row.variantsDiffer)}  dil ${mark(row.languageOk)}  iyileştirme ${mark(row.refineReflected)}  ${row.skipped ?? row.error ?? `${row.latencyMs} ms, ${row.tokens} token`}`);
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
  avgLatencyMs: avg('latencyMs'),
  avgTokens: avg('tokens'),
};
const fmt = ({ hits, n }) => (n ? `${hits}/${n}` : 'n/a');
out('');
out(`ÖZET: değerlendirilen ${summary.evaluated}/${summary.total} (skipped ${summary.skipped}, hata ${summary.errors}) | soru kartı doğru ${fmt(summary.questionCorrect)} | doğrulayıcı ${fmt(summary.validatorsPass)} | varyant farklı ${fmt(summary.variantsDiffer)} | dil ${fmt(summary.languageOk)} | iyileştirme yansıdı ${fmt(summary.refineReflected)} | ort. ${summary.avgLatencyMs ?? 'n/a'} ms, ${summary.avgTokens ?? 'n/a'} token`);

const date = new Date().toISOString().slice(0, 10);
const file = path.join(ROOT, 'evals/results', `${date}-prompts.json`);
mkdirSync(path.dirname(file), { recursive: true });
writeFileSync(file, `${JSON.stringify({ date, generatedAt: new Date().toISOString(), openaiKey: hasOpenAIKey, summary, rows }, null, 2)}\n`);
out(`[eval:prompts] sonuç yazıldı: ${path.relative(ROOT, file)}`);
