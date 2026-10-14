import assert from 'node:assert';
import { describe, it } from 'node:test';
import { readFileSync, readdirSync } from 'node:fs';
import { YamlError, parseYamlSubset, parseScalar, splitFrontmatter, splitSections } from '../promptBuilder/yaml';
import { guideRuleErrors, type Guide } from '../promptBuilder/guideSchema';
import { loadGuides } from '../promptBuilder/guides';
import { applyAnswers, distinctDetails, hasEnoughDetail, planSlots } from '../promptBuilder/plan';
import { extractSlots, sanitizeQuestions, UNVERIFIED_CONFIDENCE_CAP, verifyEvidence } from '../promptBuilder/extract';
import { checkPrompt, validateWithRepair } from '../promptBuilder/validate';
import { answerPromptQuestions, refinePromptSession, startPromptSession, userMessagesFrom, USER_MESSAGES_CHARS, USER_MESSAGES_MAX, type PromptDeps } from '../promptBuilder/service';
import { memoryPromptStore, PERSIST_USER_MESSAGES, toStored } from '../promptBuilder/store';
import type { JsonRequest } from '../promptBuilder/llm';
import { MAX_REFINEMENTS } from '../promptBuilder/types';
import { loadCatalog } from '../catalog/index';
import { makeBuildPromptTool } from '../promptBuilder/agentTool';
import { fallbackGuideId, resolveGuideId } from '../promptBuilder/fallback';
import { guideSection, maxPromptChars } from '../promptBuilder/generate';
import { buildChatRequest, CHARS_PER_TOKEN, isReasoningModel, maxTokensFor, promptReasoningEffort, REASONING_ALLOWANCE } from '../promptBuilder/llm';
import { PROMPT_TIMEOUT_MS, promptTimeoutMs, REASONING_PROMPT_TIMEOUT_MS } from '../promptBuilder/deps';
import { promptAnswerSchema, promptRefineSchema } from '../validations/prompt';

describe('YAML alt kümesi', () => {
  it('iç içe eşleme, dizi, eşleme dizisi, skalerler, satır içi dizi, yorum', () => {
    const doc = parseYamlSubset(`# yorum
id: "midjourney"
version: 1
ratio: 0.5
draft: true
empty: ""
none: null
tags: [a, "b c", 3]
plain: hello world # satır sonu yorumu
colon: "--ar 16:9"
single: 'it''s'
slots:
- id: subject
  impact: high
  question:
    en: "What?"
    tr: Ne?
  options:
  - id: a
    value: x
  - id: b
    value: y
list:
  - bir
  - iki
`);
    assert.deepStrictEqual(doc, {
      id: 'midjourney', version: 1, ratio: 0.5, draft: true, empty: '', none: null,
      tags: ['a', 'b c', 3], plain: 'hello world', colon: '--ar 16:9', single: "it's",
      slots: [{ id: 'subject', impact: 'high', question: { en: 'What?', tr: 'Ne?' }, options: [{ id: 'a', value: 'x' }, { id: 'b', value: 'y' }] }],
      list: ['bir', 'iki'],
    });
  });

  it('çift tırnakta kaçış: regex değeri', () => {
    assert.strictEqual(parseScalar('"--ar \\\\d+:\\\\d+"'), '--ar \\d+:\\d+');
  });

  it('desteklenmeyen yapılar açık hata verir', () => {
    assert.throws(() => parseYamlSubset('a: {b: 1}'), YamlError);
    assert.throws(() => parseYamlSubset('a: |\n  metin'), YamlError);
    assert.throws(() => parseYamlSubset('a: 1\na: 2'), /tekrar eden anahtar/);
    assert.throws(() => parseYamlSubset('a:\n\t- x'), /sekme/);
    assert.throws(() => parseYamlSubset('a: "kapanmamış'), YamlError);
    assert.throws(() => parseYamlSubset('a: 1\n  b: 2'), /beklenmeyen girinti/);
  });

  it('frontmatter ve ## bölümleri', () => {
    const { frontmatter, body } = splitFrontmatter('---\nid: x\n---\n\n## Sözdizimi\n\nA\n\n## Şablon\nB\n');
    assert.strictEqual(frontmatter, 'id: x');
    assert.deepStrictEqual(splitSections(body), { 'Sözdizimi': 'A', 'Şablon': 'B' });
  });
});

describe('rehberler (data/prompt-guides)', () => {
  const guides = loadGuides();

  it("10 rehber derlenmiş; kurallar temiz; her rehberde ≥4 slot, ≥2 'high', 4–8 refinement", () => {
    const files = readdirSync(new URL('../../data/prompt-guides/', import.meta.url)).filter((f) => f.endsWith('.md'));
    assert.strictEqual(guides.length, files.length);
    assert.strictEqual(guides.length, 10);
    for (const g of guides) {
      assert.deepStrictEqual(guideRuleErrors(g), [], g.id);
      assert.ok(g.slots.length >= 4 && g.slots.filter((s) => s.impact === 'high').length >= 2, g.id);
      assert.ok(g.refinements.length >= 4 && g.refinements.length <= 8, g.id);
    }
  });

  it('kaynaksız rehberler taslak ve gövdede KAYNAK GEREKLİ yazıyor (uydurma yok)', () => {
    for (const g of guides) {
      if (g.sources.length > 0) continue;
      assert.strictEqual(g.reviewedBy, '', g.id);
      assert.match(g.body.syntax, /KAYNAK GEREKLİ/, g.id);
    }
  });

  it('ürün.promptGuide ile appliesTo tutarlı', () => {
    const products = loadCatalog().products;
    for (const g of guides) for (const id of g.appliesTo) assert.strictEqual(products.find((p) => p.id === id)?.promptGuide, g.id);
    const json = JSON.parse(readFileSync(new URL('../../data/prompt-guides.json', import.meta.url), 'utf8'));
    assert.strictEqual(json.length, guides.length);
  });
});

// ------------------------------------------------------------------
// Sahte LLM: slot çıkarımı konfigürasyondan, üretim slot değerlerinden
// ------------------------------------------------------------------
const midjourney = () => loadGuides().find((g) => g.id === 'midjourney')!;

type RawQuestion = { slotId: string; question: string; options: { label: string; value: string }[] };

type FakeSlot = string | null | { value: string | null; source: 'user' | 'inferred'; confidence: number; evidence?: string | null };
/** Akıllı varsayım: kullanıcı söylemedi, LLM amaca göre seçti (güven < MIN_CONFIDENCE). */
const guess = (value: string) => ({ value, source: 'inferred' as const, confidence: 0.45 });

/** Promptun araçta kullanımını anlatan howToUse (sufficiency.howToUseIssues'tan geçer). */
const HOW_TO_USE = ['Promptu Midjourney içine yapıştır; ek bir yer tutucu yok.', 'İlk çıktıda en-boy oranını ve ışığı kontrol et.', 'Takip mesajı olarak "aynı sahneyi daha sıcak ışıkla üret" yaz.'];

/** Sahte kanıt: konuşmadaki ilk kullanıcı mesajının i. kelimesi (döngüsel). */
function fakeQuotes(conversation: string) {
  const words = (/(?:^|\n)user: ([^\n]*)/.exec(conversation)?.[1] ?? '').split(/\s+/).filter((w) => w.length >= 2);
  return (i: number) => (words.length ? words[i % words.length] : null);
}

function fakeLLM(opts: { extracted?: Record<string, FakeSlot>; failRegexTimes?: number; questions?: RawQuestion[]; isBroadGoal?: boolean } = {}) {
  const calls: JsonRequest[] = [];
  let failures = opts.failRegexTimes ?? 0;
  const llm = async (req: JsonRequest) => {
    calls.push(req);
    const input = JSON.parse(req.user);
    if (req.name === 'slot_extraction') {
      // Kanıt: slot başına kullanıcının ilk mesajından farklı bir kelime (verifyEvidence geçer, ayrı ayrıntı sayılır).
      const quote = fakeQuotes(input.conversation);
      const slots = Object.entries(opts.extracted ?? {}).map(([id, v], i) =>
        v !== null && typeof v === 'object' ? { id, evidence: quote(i), ...v } : { id, value: v, source: 'user', confidence: v ? 0.9 : 0, evidence: quote(i) }
      );
      return { data: { slots, goalSummary: 'summary', isBroadGoal: opts.isBroadGoal ?? false, ...(opts.questions ? { questions: opts.questions } : {}) }, tokens: 10 };
    }
    const values = Object.fromEntries(input.slots.map((s: { id: string; value: string | null }) => [s.id, s.value ?? 'auto']));
    const ar = failures > 0 ? '' : ` --ar ${values.aspect === 'auto' ? '1:1' : values.aspect}`;
    if (failures > 0) failures--;
    const extra = input.refinementInstruction ? ` [${input.refinementInstruction}]` : '';
    return {
      data: {
        variants: [
          { id: 'safe', prompt: `${values.subject}, ${values.style}, ${values.mood}${extra}${ar}`, negativePrompt: null, settings: [] },
          { id: 'creative', prompt: `bold take on ${values.subject}, ${values.style}${extra}${ar}`, negativePrompt: null, settings: [] },
        ],
        assumptions: [{ slotId: 'mood', value: values.mood ?? 'auto', why: 'chosen' }],
        suggestedRefinements: [{ label: 'Try teal', slotId: 'mood', value: 'teal', instruction: null }],
        howToUse: [...HOW_TO_USE, 'fazladan adım'],
      },
      tokens: 20,
    };
  };
  return { llm, calls };
}

function deps(llm: PromptDeps['llm'], store = memoryPromptStore()): PromptDeps {
  let n = 0;
  return { llm, store, guides: loadGuides(), products: loadCatalog().products, now: () => Date.parse('2026-09-24T00:00:00Z'), newId: () => `p_test${++n}xx` };
}

const full = { subject: 'a bakery logo', style: 'illustration', aspect: '1:1', mood: null, detail: null };

describe('çıkarım: kanıt (alıntı) denetimi', () => {
  it('verifyEvidence: kullanıcının sözünde geçen alıntı; Türkçe ek, büyük harf ve noktalama serbest', () => {
    const text = 'Cuma akşamı caz gecesi posteri, üzerinde "Friday Jazz" yazsın, 9:16';
    for (const e of ['caz gecesi posteri', 'poster', 'friday jazz', 'CUMA AKŞAMI', '9:16', 'Friday Jazz"']) assert.ok(verifyEvidence(e, text), e);
    for (const e of [null, '', 'x', 'investors', '8-10 slides', 'oster']) assert.ok(!verifyEvidence(e, text), String(e));
    assert.ok(!verifyEvidence('Midjourney', 'Midjourney ile bir görsel yapmak istiyorum', 'Midjourney'), 'sadece ürün adı kanıt değil');
    assert.ok(!verifyEvidence('AI', 'Suno AI ile şarkı', 'Suno AI'));
    assert.ok(verifyEvidence('bir görsel', 'Midjourney ile bir görsel yapmak istiyorum', 'Midjourney'));
  });

  it('aynı alıntı birden çok slota verilse de tek ayrıntı sayılır (2026-10-14 eval, gamma-missing)', () => {
    const gamma = loadGuides().find((g) => g.id === 'gamma')!;
    const same = (value: string, confidence: number) => ({ value, source: 'inferred' as const, confidence, evidence: 'make me a presentation' });
    const gamed = { audience: same('investors', 0.65), length: same('8-10 slides', 0.65), tone: same('formal', 0.35), visuals: same('data charts', 0.35) };
    assert.strictEqual(distinctDetails(Object.entries(gamed)), 1);
    assert.ok(!hasEnoughDetail(gamma, gamed), 'tek cümle her slota alıntılanmış: soru kartı');
    assert.ok(planSlots(gamma, gamed, { questionAsked: false }).questions.length > 0);
    // Gerçekten ayrıntılı istek: farklı alıntılar
    const said = (value: string, evidence: string) => ({ value, source: 'user' as const, confidence: 0.9, evidence });
    const detailed = { audience: said('investors', 'yatirimcilar icin'), length: said('8-10 slides', '8 10 slaytlik'), tone: said('formal', 'resmi tonda') };
    assert.ok(hasEnoughDetail(gamma, detailed));
    // Alıntısız (ajanın verdiği) slotlar kendi başına sayılır
    assert.strictEqual(distinctDetails([['a', { value: 'x', source: 'user', confidence: 1 }], ['b', { value: 'y', source: 'user', confidence: 1 }]]), 2);
  });

  it('şemada alıntı değerden önce gelir (model önce kanıtı yazar, sonra karar verir); ima için de alıntı istenir', async () => {
    const { llm, calls } = fakeLLM({ extracted: full });
    await startPromptSession({ productId: 'midjourney-v7', goal: 'logo', conversation: [{ role: 'user', content: 'logo for my bakery' }], locale: 'en' }, deps(llm));
    const ex = calls.find((c) => c.name === 'slot_extraction')!;
    const item = (ex.schema as { properties: { slots: { items: { properties: Record<string, unknown>; required: string[] } } } }).properties.slots.items;
    assert.deepStrictEqual(Object.keys(item.properties).slice(0, 3), ['id', 'evidence', 'value']);
    assert.ok(item.required.includes('evidence'));
    assert.match(ex.system, /required for source "user" AND for strongly implied values/);
  });

  it('kanıtsız "user" ya da yüksek güvenli değer akıllı varsayıma iner (2026-10-14 eval: "Make me a presentation.")', async () => {
    const llm = async () => ({
      data: {
        slots: [
          { id: 'audience', value: 'investors', source: 'user', confidence: 0.9, label: null, evidence: 'investors' },
          { id: 'length', value: '8-10 slides', source: 'user', confidence: 0.95, label: null, evidence: null },
          { id: 'tone', value: 'formal', source: 'inferred', confidence: 0.8, label: null, evidence: 'presentation' },
          { id: 'visuals', value: 'data charts', source: 'inferred', confidence: 0.45, label: null, evidence: null },
        ],
        goalSummary: 's', isBroadGoal: false, questions: [],
      },
      tokens: 1,
    });
    const gamma = loadGuides().find((g) => g.id === 'gamma')!;
    const x = await extractSlots({ conversation: [{ role: 'user', content: 'Make me a presentation.' }, { role: 'assistant', content: 'For investors? 8-10 slides?' }], goal: 'investor presentation', guide: gamma, locale: 'en', llm, productName: 'Gamma AI' });
    assert.deepStrictEqual(x.slots.audience, { value: 'investors', source: 'inferred', confidence: UNVERIFIED_CONFIDENCE_CAP }, 'goal ve asistan mesajı kanıt değil');
    assert.strictEqual(x.slots.length.source, 'inferred');
    assert.deepStrictEqual(x.slots.tone, { value: 'formal', source: 'inferred', confidence: 0.8, evidence: 'presentation' }, 'kanıtı doğru alıntı: korunur (normalize alıntıyla)');
    assert.strictEqual(x.slots.visuals.confidence, 0.45, 'akıllı varsayım dokunulmaz');
    assert.deepStrictEqual(x.evidence.audience, { claimed: 'user', claimedConfidence: 0.9, quote: 'investors', verified: false }, 'teşhis: iddia, alıntı, doğrulama');
    assert.strictEqual(x.evidence.tone.verified, true);
    const plan = planSlots(gamma, x.slots, { questionAsked: false });
    assert.ok(plan.questions.length > 0, 'uydurma ayrıntı soru kartını artık atlatmaz');
  });
});

describe('plan (LLM yok)', () => {
  const g = midjourney();

  const user = (value: string, confidence = 0.9) => ({ value, source: 'user' as const, confidence });
  const known = { subject: user('cat'), aspect: user('16:9'), style: guess('x') };

  it('kullanıcı en az 2 açık ayrıntı verdiyse soru kartı yok; akıllı varsayım ezilmez, source default', () => {
    const plan = planSlots(g, known, { questionAsked: false });
    assert.deepStrictEqual(plan.questions, []);
    assert.deepStrictEqual(plan.slots.subject, { value: 'cat', source: 'user' });
    assert.deepStrictEqual(plan.slots.style, { value: 'x', source: 'default' }, 'LLM değeri kalır, varsayım olarak işaretlenir');
    assert.strictEqual(plan.slots.mood.source, 'default');
    assert.deepStrictEqual(plan.slots.detail, { value: null, source: 'default' }, "sığ varsayılan yok: detail 'infer'");
  });

  it("tüm 'high' slotlar güvenle (>= 0.65) çıkarıldıysa soru yok", () => {
    const inferred = (value: string) => ({ value, source: 'inferred' as const, confidence: 0.7 });
    const plan = planSlots(g, { subject: inferred('a fox'), style: inferred('watercolor'), aspect: inferred('1:1') }, { questionAsked: false });
    assert.deepStrictEqual(plan.questions, []);
    assert.deepStrictEqual(plan.slots.style, { value: 'watercolor', source: 'inferred' });
  });

  it("tek açık ayrıntı yetmez: eksik 'high' slotlar sorulur (en fazla 3, rehber sırasıyla)", () => {
    const plan = planSlots(g, { subject: user('cat'), style: guess('x') }, { questionAsked: false });
    assert.deepStrictEqual(plan.questions.map((q) => q.id), ['style', 'aspect']);
    assert.ok(!hasEnoughDetail(g, { subject: user('cat'), aspect: user('1:1', 0.7) }), 'güveni 0.75 altı açık ayrıntı sayılmaz');
  });

  it("giriş aşırı belirsizse eksik ya da düşük güvenli 'high' slotlar sorulur, en fazla 3, rehber sırasıyla", () => {
    const vague = { subject: guess('an image'), style: guess('illustration') };
    const plan = planSlots(g, vague, { questionAsked: false });
    assert.deepStrictEqual(plan.questions.map((q) => q.id), ['subject', 'style', 'aspect']);
    assert.deepStrictEqual(plan.slots.style, { value: 'illustration', source: 'default' }, 'sorulan slotta da LLM değeri kalır');
  });

  it('geniş hedef (isBroadGoal): ayrıntı sayısına bakılmadan önce soru kartı', () => {
    const plan = planSlots(g, { subject: user('cat'), mood: user('calm'), style: guess('x') }, { questionAsked: false, isBroadGoal: true });
    assert.deepStrictEqual(plan.questions.map((q) => q.id), ['style', 'aspect']);
  });

  it('forceAutoGenerate: false -> eski davranış: eksik/düşük güvenli high slotlar sorulur', () => {
    const plan = planSlots(g, known, { questionAsked: false, forceAutoGenerate: false });
    assert.deepStrictEqual(plan.questions.map((q) => q.id), ['style']);
    assert.strictEqual(plan.slots.subject.source, 'user');
  });

  it('soru bütçesi bittiyse soru yok, boşluklar default', () => {
    const plan = planSlots(g, {}, { questionAsked: true });
    assert.deepStrictEqual(plan.questions, []);
    assert.ok(Object.values(plan.slots).every((s) => s.source === 'default'));
  });

  it("cevaplar: seçenek id'si -> değer, 'auto' -> default, metin -> serbest", () => {
    const plan = planSlots(g, {}, { questionAsked: false });
    const next = applyAnswers(g, plan.slots, { subject: 'product', style: 'auto', aspect: 'sinematik geniş' }, ['subject', 'style', 'aspect']);
    assert.deepStrictEqual(next.subject, { value: 'a product', source: 'user', label: 'Bir ürün' }, 'etiket kullanıcı dilinde');
    assert.deepStrictEqual(next.style, { value: null, source: 'default' });
    assert.deepStrictEqual(next.aspect, { value: 'sinematik geniş', source: 'user' });
  });

  it("'auto' ya da boş cevap akıllı varsayımı korur", () => {
    const plan = planSlots(g, { subject: guess('a cozy bakery logo'), style: guess('hand-drawn') }, { questionAsked: false });
    const next = applyAnswers(g, plan.slots, { subject: 'auto' }, ['subject', 'style']);
    assert.deepStrictEqual(next.subject, { value: 'a cozy bakery logo', source: 'default' });
    assert.deepStrictEqual(next.style, { value: 'hand-drawn', source: 'default' });
  });
});

describe('doğrulama ve tek onarım', () => {
  const g = midjourney();

  it('regex / maxLength / mustInclude', () => {
    assert.deepStrictEqual(checkPrompt('cat --ar 1:1', g.validators), []);
    assert.strictEqual(checkPrompt('cat', g.validators).length, 1);
    assert.deepStrictEqual(checkPrompt('Hello World', [{ id: 'm', type: 'mustInclude', value: 'world', message: 'x' }]), []);
    assert.strictEqual(checkPrompt('x'.repeat(1501), g.validators).length, 2);
  });

  it('başarısız varyant için BİR onarım; ikinci kez de başarısızsa "kontrol edilmedi"', async () => {
    const session = { id: 's', productId: 'midjourney-v7', guideId: g.id, guideVersion: 1, goal: 'logo', locale: 'en' as const, slots: {}, questionAsked: false, pendingQuestions: [], versions: [], refinementCount: 0 };
    const cat = 'a ginger cat asleep on a sunny windowsill, watercolor, soft morning light';
    const base = { variants: [{ id: 'safe' as const, prompt: `${cat} --ar 1:1`, negativePrompt: null, settings: [] }, { id: 'creative' as const, prompt: cat, negativePrompt: null, settings: [] }], assumptions: [], suggestedRefinements: [], howToUse: [] };

    const ok = fakeLLM();
    const fixed = await validateWithRepair(base, { session, guide: g, productName: 'MJ', llm: ok.llm });
    assert.strictEqual(ok.calls.length, 1);
    assert.ok(fixed.repaired);
    assert.deepStrictEqual(fixed.variants.map((v) => v.validation.status), ['passed', 'passed']);
    assert.strictEqual(fixed.variants[0].prompt, `${cat} --ar 1:1`, 'geçen varyant korunur');
    assert.ok(JSON.parse(ok.calls[0].user).fixTheseValidatorErrors.creative);

    const bad = fakeLLM({ failRegexTimes: 5 });
    const still = await validateWithRepair(base, { session, guide: g, productName: 'MJ', llm: bad.llm });
    assert.strictEqual(bad.calls.length, 1, 'en fazla bir onarım');
    assert.strictEqual(still.variants[1].validation.status, 'unchecked');
    assert.ok(still.variants[1].validation.errors.length > 0);
  });
});

describe('prompt oturumu', () => {
  const conversation = [{ role: 'user' as const, content: 'logo for my bakery' }];

  it('bilgiler konuşmada varsa soru kartı YOK, doğrudan iki varyant', async () => {
    const { llm, calls } = fakeLLM({ extracted: full });
    const r = await startPromptSession({ productId: 'midjourney-v7', goal: 'bakery logo', conversation, locale: 'tr' }, deps(llm));
    assert.ok(!('error' in r));
    if ('error' in r) return;
    assert.strictEqual(r.card.type, 'prompt');
    if (r.card.type !== 'prompt') return;
    assert.deepStrictEqual(r.card.variants.map((v) => v.id), ['safe', 'creative']);
    assert.ok(r.card.variants.every((v) => v.validation.status === 'passed'));
    assert.strictEqual(r.card.howToUse.length, 3);
    assert.strictEqual(r.card.draft, true);
    // Kullanıcının söylemediği her slot varsayımlarda
    assert.deepStrictEqual(r.card.assumptions.map((a) => a.slotId).sort(), ['detail', 'mood']);
    assert.ok(r.card.refinements.some((x) => x.kind === 'suggested'));
    assert.deepStrictEqual(calls.map((c) => c.name), ['slot_extraction', 'prompt_generation']);
    assert.strictEqual(r.tokens, 30);
  });

  it("detaylı hedef (en az 2 açık ayrıntı): eksik 'high' slotlar akıllı varsayımla dolar, doğrudan PromptCard", async () => {
    const { llm } = fakeLLM({ extracted: { subject: 'a bakery logo', mood: 'warm and cozy', style: guess('warm hand-drawn logo'), aspect: guess('1:1') } });
    const r = await startPromptSession({ productId: 'midjourney-v7', goal: 'bakery logo', conversation, locale: 'en' }, deps(llm));
    if ('error' in r || r.card.type !== 'prompt') return assert.fail('prompt kartı yok');
    assert.match(r.card.variants[0].prompt, /a bakery logo, warm hand-drawn logo/, 'akıllı varsayım prompta girdi');
    assert.match(r.card.variants[0].prompt, /--ar 1:1/);
    assert.deepStrictEqual(r.card.assumptions.map((a) => a.slotId).sort(), ['aspect', 'detail', 'style']);
    assert.deepStrictEqual(r.card.filledBy, { user: 2, inferred: 0, default: 3 });
  });

  it('geniş hedef ("logo yapmak istiyorum"): çıkarılan değerler güvenli görünse de önce navigasyon soru kartı', async () => {
    const inferred = (value: string) => ({ value, source: 'inferred' as const, confidence: 0.8 });
    const { llm, calls } = fakeLLM({ isBroadGoal: true, extracted: { subject: inferred('a logo'), style: inferred('flat vector logo'), aspect: inferred('1:1') } });
    const r = await startPromptSession({ productId: 'midjourney-v7', goal: 'Logo yapmak istiyorum', conversation: [{ role: 'user', content: 'Logo yapmak istiyorum' }], locale: 'tr' }, deps(llm));
    if ('error' in r || r.card.type !== 'prompt_question') return assert.fail('soru kartı yok');
    assert.deepStrictEqual(r.card.questions.map((q) => q.slotId), ['subject', 'style', 'aspect']);
    assert.deepStrictEqual(calls.map((c) => c.name), ['slot_extraction'], 'prompt üretilmedi');
    assert.match(calls[0].system, /isBroadGoal: true when the user only names a general goal/);
    assert.ok((calls[0].schema as { required: string[] }).required.includes('isBroadGoal'));
  });

  it("giriş aşırı belirsizse tek soru kartı; cevaptan sonra PromptCard", async () => {
    const { llm } = fakeLLM({ extracted: { subject: guess('a bakery logo'), style: guess('illustration') } });
    const d = deps(llm);
    const r = await startPromptSession({ productId: 'midjourney-v7', goal: 'bakery logo', conversation, locale: 'en' }, d);
    assert.ok(!('error' in r) && r.card.type === 'prompt_question');
    if ('error' in r || r.card.type !== 'prompt_question') return;
    assert.deepStrictEqual(r.card.questions.map((q) => q.slotId), ['subject', 'style', 'aspect']);

    const a = await answerPromptQuestions({ promptSessionId: r.card.promptSessionId, answers: { subject: 'auto', style: 'photo', aspect: 'auto' } }, d);
    assert.ok(!('error' in a) && a.card.type === 'prompt');
    if ('error' in a || a.card.type !== 'prompt') return;
    assert.match(a.card.variants[0].prompt, /^a bakery logo, photorealistic photo/, "'auto' akıllı varsayımı korudu");
    // İkinci kez cevap yok (oturum başına 1 soru kartı)
    const again = await answerPromptQuestions({ promptSessionId: r.card.promptSessionId, answers: {} }, d);
    assert.deepStrictEqual(again, { error: 'no_pending_question', tokens: 0 });
  });

  it('iyileştirmenin üç türü: hazır buton (patch), varsayım değişikliği, serbest talimat', async () => {
    const { llm, calls } = fakeLLM({ extracted: full });
    const d = deps(llm);
    const r = await startPromptSession({ productId: 'midjourney-v7', goal: 'bakery logo', conversation, locale: 'en' }, d);
    if ('error' in r || r.card.type !== 'prompt') return assert.fail('kart yok');
    const id = r.card.promptSessionId;

    const button = await refinePromptSession({ promptSessionId: id, refinementId: 'vertical' }, d);
    if ('error' in button || button.card.type !== 'prompt') return assert.fail('buton');
    assert.match(button.card.variants[0].prompt, /--ar 9:16/, 'patch yeni prompta yansıdı');
    assert.strictEqual(button.card.versionN, 2);

    const assumption = await refinePromptSession({ promptSessionId: id, slotId: 'mood', value: 'soft pastel' }, d);
    if ('error' in assumption || assumption.card.type !== 'prompt') return assert.fail('varsayım');
    assert.match(assumption.card.variants[0].prompt, /soft pastel/);
    assert.ok(!assumption.card.assumptions.some((a) => a.slotId === 'mood'), 'artık kullanıcı bilgisi, varsayım değil');

    const free = await refinePromptSession({ promptSessionId: id, instruction: 'more playful' }, d);
    if ('error' in free || free.card.type !== 'prompt') return assert.fail('serbest');
    assert.match(free.card.variants[0].prompt, /\[more playful\]/);
    const lastUser = JSON.parse(calls.at(-1)!.user);
    assert.ok(lastUser.previousVersion, 'önceki versiyon + talimat');

    const suggested = await refinePromptSession({ promptSessionId: id, refinementId: 'suggested-1' }, d);
    if ('error' in suggested || suggested.card.type !== 'prompt') return assert.fail('önerilen');
    assert.match(suggested.card.variants[0].prompt, /teal/);
    assert.strictEqual(suggested.card.versionN, 5);
    assert.strictEqual(suggested.card.refinementsLeft, MAX_REFINEMENTS - 4);

    assert.deepStrictEqual(await refinePromptSession({ promptSessionId: id, refinementId: 'yok' }, d), { error: 'unknown_refinement', tokens: 0 });
  });

  it('iyileştirmede değişen slot üreticiye ayrıca söylenir; önceki versiyon temel alınır (2026-10-14 eval, cursor-full)', async () => {
    const { llm, calls } = fakeLLM({ extracted: full });
    const d = deps(llm);
    const r = await startPromptSession({ productId: 'midjourney-v7', goal: 'bakery logo', conversation, locale: 'en' }, d);
    if ('error' in r || r.card.type !== 'prompt') return assert.fail('kart yok');
    const id = r.card.promptSessionId;
    const lastGen = () => JSON.parse(calls.filter((c) => c.name === 'prompt_generation').at(-1)!.user);

    await refinePromptSession({ promptSessionId: id, refinementId: 'vertical' }, d);
    assert.deepStrictEqual(lastGen().changedSlots, { aspect: '9:16' }, 'hazır buton (patch)');
    assert.ok(lastGen().previousVersion);
    await refinePromptSession({ promptSessionId: id, slotId: 'mood', value: 'soft pastel' }, d);
    assert.deepStrictEqual(lastGen().changedSlots, { mood: 'soft pastel' }, 'varsayım değişikliği');
    await refinePromptSession({ promptSessionId: id, instruction: 'more playful' }, d);
    assert.strictEqual(lastGen().changedSlots, undefined, 'serbest talimatta slot değişmez');
    const system = calls.at(-1)!.system;
    assert.match(system, /previousVersion \(when given\) is the base: keep every concrete detail/);
    assert.match(system, /changedSlots are the slots the user just changed/);
  });

  it(`oturum başına en fazla ${MAX_REFINEMENTS} iyileştirme`, async () => {
    const { llm } = fakeLLM({ extracted: full });
    const d = deps(llm);
    const r = await startPromptSession({ productId: 'midjourney-v7', goal: 'logo', conversation, locale: 'en' }, d);
    if ('error' in r) return assert.fail();
    const id = r.card.promptSessionId;
    for (let i = 0; i < MAX_REFINEMENTS; i++) {
      assert.ok(!('error' in (await refinePromptSession({ promptSessionId: id, instruction: `v${i}` }, d))));
    }
    assert.deepStrictEqual(await refinePromptSession({ promptSessionId: id, instruction: 'bir tane daha' }, d), { error: 'refine_limit', tokens: 0 });
  });

  it('süresi dolmuş oturum', async () => {
    let now = 0;
    const store = memoryPromptStore(() => now);
    const { llm } = fakeLLM({ extracted: full });
    const d = { ...deps(llm, store) };
    const r = await startPromptSession({ productId: 'midjourney-v7', goal: 'logo', conversation, locale: 'en' }, d);
    if ('error' in r) return assert.fail();
    now = 24 * 60 * 60 * 1000 + 1;
    assert.deepStrictEqual(await refinePromptSession({ promptSessionId: r.card.promptSessionId, instruction: 'x y' }, d), { error: 'expired', tokens: 0 });
    assert.deepStrictEqual(await answerPromptQuestions({ promptSessionId: r.card.promptSessionId, answers: {} }, d), { error: 'expired', tokens: 0 });
  });

  it('rehberi olmayan ya da aktif olmayan ürün', async () => {
    const { llm } = fakeLLM();
    assert.deepStrictEqual(await startPromptSession({ productId: 'tableau', goal: 'dashboard', conversation, locale: 'en' }, deps(llm)), { error: 'no_guide', tokens: 0 });
    assert.deepStrictEqual(await startPromptSession({ productId: 'yok-urun', goal: 'x', conversation, locale: 'en' }, deps(llm)), { error: 'unknown_product', tokens: 0 });
  });

  it('rehberi olmayan ürün: aynı türdeki araçların genel rehberiyle yazılır, kartta "Genel rehber"', async () => {
    const { llm, calls } = fakeLLM({ extracted: { subject: 'a fox', style: 'watercolor', aspect: '1:1', mood: 'calm', background: 'forest' } });
    const d = { ...deps(llm), tasksById: loadCatalog().tasksById };
    const r = await startPromptSession({ productId: 'leonardo-ai', goal: 'watercolor fox', conversation, locale: 'en' }, d);
    if ('error' in r || r.card.type !== 'prompt') return assert.fail(JSON.stringify(r));
    assert.strictEqual(r.card.guideId, 'image-natural');
    assert.strictEqual(r.card.genericGuide, true);
    assert.match(calls.find((c) => c.name === 'prompt_generation')!.system, /general guide for this kind of tool, not specific to Leonardo/);
    // İyileştirme de aynı genel rehberle
    const refined = await refinePromptSession({ promptSessionId: r.card.promptSessionId, instruction: 'add a red scarf' }, d);
    if ('error' in refined || refined.card.type !== 'prompt') return assert.fail();
    assert.strictEqual(refined.card.genericGuide, true);

    // Özel rehberi olan üründe "genel" notu yok
    const own = fakeLLM({ extracted: full });
    const mj = await startPromptSession({ productId: 'midjourney-v7', goal: 'logo', conversation, locale: 'en' }, { ...deps(own.llm), tasksById: loadCatalog().tasksById });
    if ('error' in mj || mj.card.type !== 'prompt') return assert.fail();
    assert.strictEqual(mj.card.genericGuide, undefined);
    assert.doesNotMatch(own.calls.find((c) => c.name === 'prompt_generation')!.system, /not specific to/);
  });

  it('üretici kuralları: kullanıcının isteği ve iyileştirme talimatı rehberden önce gelir', async () => {
    const { llm, calls } = fakeLLM({ extracted: full });
    await startPromptSession({ productId: 'midjourney-v7', goal: 'logo', conversation, locale: 'en' }, deps(llm));
    const system = calls.find((c) => c.name === 'prompt_generation')!.system;
    assert.match(system, /The user's goal comes first/);
    assert.match(system, /refinementInstruction overrides the previous version, the slots and the template/);
    assert.match(system, /own brand, product, business or name can be used freely/);
    assert.doesNotMatch(system, /deceptively imitate real people or brands/);
  });

  it('kullanıcının kendi mesajları üreticiye gider (goal sadece özet); depoya yazılmaz', async () => {
    const { llm, calls } = fakeLLM({ extracted: full });
    const store = memoryPromptStore();
    const chat = [
      { role: 'user' as const, content: 'I need a square illustration of a fox reading a book in a cozy library.' },
      { role: 'assistant' as const, content: 'Midjourney is the strongest option.' },
      { role: 'user' as const, content: 'Ok, write the prompt for Midjourney.' },
    ];
    const r = await startPromptSession({ productId: 'midjourney-v7', goal: 'fox reading a book illustration', conversation: chat, locale: 'en' }, deps(llm, store));
    if ('error' in r) return assert.fail(r.error);
    const gen = calls.find((c) => c.name === 'prompt_generation')!;
    assert.deepStrictEqual(JSON.parse(gen.user).userMessages, [chat[0].content, chat[2].content], 'asistan mesajı yok, eskiden yeniye');
    assert.match(gen.system, /"userMessages" \(when given\) are the user's own words/);
    assert.strictEqual(PERSIST_USER_MESSAGES, false);
    const stored = await store.get(r.card.promptSessionId);
    assert.ok(stored && !('userMessages' in stored), 'ham mesajlar KV oturumuna yazılmaz');
    assert.deepStrictEqual(toStored({ ...stored!, userMessages: ['x'] }, true).userMessages, ['x'], 'anahtar açılınca saklanır');
  });

  it('teşhis (alıntılar) sonuçta var ama depoya yazılmaz', async () => {
    const { llm } = fakeLLM({ extracted: full });
    const store = memoryPromptStore();
    const chat = [{ role: 'user' as const, content: 'zanzibar bakery logo, illustration, square' }];
    const r = await startPromptSession({ productId: 'midjourney-v7', goal: 'bakery logo', conversation: chat, locale: 'en' }, deps(llm, store));
    if ('error' in r) return assert.fail(r.error);
    assert.strictEqual(r.diagnostics?.evidence.subject.quote, 'zanzibar');
    assert.strictEqual(r.diagnostics?.evidence.subject.verified, true);
    const stored = await store.get(r.card.promptSessionId);
    assert.ok(!JSON.stringify(stored).toLowerCase().includes('zanzibar'), 'alıntı KV oturumunda yok');
  });

  it('userMessagesFrom: sadece kullanıcı mesajları, sınırlar, amaçla aynı tek mesaj boş', () => {
    assert.deepStrictEqual(userMessagesFrom([{ role: 'user', content: 'logo yap' }], 'logo yap'), [], '/api/prompt/start: goal zaten o metin');
    const many = Array.from({ length: 10 }, (_, i) => ({ role: 'user' as const, content: `m${i}` }));
    assert.deepStrictEqual(userMessagesFrom(many), many.slice(-USER_MESSAGES_MAX).map((m) => m.content), 'en yeniler korunur');
    const long = userMessagesFrom([{ role: 'user', content: 'eski' }, { role: 'user', content: 'x'.repeat(USER_MESSAGES_CHARS + 50) }]);
    assert.deepStrictEqual(long.map((m) => m.length), [USER_MESSAGES_CHARS], 'toplam karakter sınırı, son mesaj kırpılır');
    assert.deepStrictEqual(userMessagesFrom([{ role: 'user', content: '  ' }, { role: 'assistant', content: 'a' }]), []);
  });

  it('rehberin boş "KAYNAK GEREKLİ" bölümleri modele gitmez; RouteAI kuralları ve kaynaksız uyarısı gider', async () => {
    assert.strictEqual(guideSection('KAYNAK GEREKLİ — erişilemedi.\n\nRouteAI kuralları:\n\n- Bir'), 'RouteAI kuralları:\n\n- Bir');
    assert.strictEqual(guideSection('KAYNAK GEREKLİ — erişilemedi.'), '');
    // Kaynaksız rehber (ideogram): boş bölümler atlanır, kaynaksız uyarısı gider
    const unsourced = fakeLLM({ extracted: { text: 'Friday Jazz', style: 'typographic poster', subject: 'a saxophone' } });
    await startPromptSession({ productId: 'ideogram-20', goal: 'poster', conversation: [{ role: 'user', content: 'jazz poster "Friday Jazz" saxophone' }], locale: 'en' }, deps(unsourced.llm));
    const system = unsourced.calls.find((c) => c.name === 'prompt_generation')!.system;
    assert.doesNotMatch(system, /KAYNAK GEREKLİ/);
    assert.doesNotMatch(system, /## Syntax|## Examples/, 'boş bölüm başlığıyla atlanır');
    assert.match(system, /## Template\n/);
    assert.match(system, /## Do \/ Don't\nRouteAI kuralları/);
    assert.match(system, /no verified Ideogram documentation yet/);
    // Kaynaklı rehber (midjourney v5): sözdizimi ve örnekler gider, kaynaksız uyarısı gitmez
    const { llm, calls } = fakeLLM({ extracted: full });
    await startPromptSession({ productId: 'midjourney-v7', goal: 'logo', conversation, locale: 'en' }, deps(llm));
    const mjSystem = calls.find((c) => c.name === 'prompt_generation')!.system;
    assert.match(mjSystem, /## Syntax\nKaynak: \[Aspect Ratio\]/);
    assert.match(mjSystem, /## Examples\n[\s\S]*--ar 2:3/);
    assert.doesNotMatch(mjSystem, /no verified Midjourney documentation/);
  });

  it('Cursor kısıt kuralı Türkçe zorunluluk ekini tanır (2026-10-14 eval, replit-generic yanlış alarmı)', () => {
    const v = loadGuides().find((g) => g.id === 'cursor-task')!.validators.filter((x) => x.id === 'constraints');
    for (const p of ['Tüm sayfaları sen oluşturmalısın.', 'Site hizmet listesi içermelidir.', 'Mevcut koda uyulmalıdır.', 'Never add dependencies.', 'Public API değiştirme.', 'Ensure that the public API does not change.', "It's crucial that the public API remains intact."]) assert.deepStrictEqual(checkPrompt(p, v), [], p);
    assert.strictEqual(checkPrompt('Bir kuaför sitesi yap ve sayfaları oluştur.', v).length, 1, 'kısıt yoksa yine uyarır');
  });

  it('Midjourney v5 (kaynak: Aspect Ratio sayfası): oran sonda --ar/--aspect, tam sayı; düz metin oran geçmez', () => {
    const v = midjourney().validators;
    assert.deepStrictEqual(checkPrompt('a fox in a cozy library, watercolor --ar 16:9', v), []);
    assert.deepStrictEqual(checkPrompt('portrait of an astronaut, studio light --aspect 2:3', v), []);
    assert.strictEqual(checkPrompt('a fox in a cozy library, watercolor, square format 1:1', v).length, 1, '2026-10-14 eval: düz metin oran');
    assert.ok(checkPrompt('a fox --ar 1.5:1', v).some((m) => /whole numbers/.test(m)));
    assert.ok(checkPrompt('a fox --ar 1:1 --aspect 9:16', v).some((m) => /single aspect ratio/.test(m)));
  });

  it('ElevenLabs v4 (kaynak: TTS best practices): prompt sesli okunan metin; etiket ve break tag yok', () => {
    const v = loadGuides().find((g) => g.id === 'elevenlabs-voiceover')!.validators;
    assert.deepStrictEqual(checkPrompt('Bu derste bütçe yapmayı öğreneceğiz. Önce gelirini yaz… sonra giderlerini.', v), []);
    assert.deepStrictEqual(checkPrompt('Dur — bu ses ne? Saat on dörtte buluşalım.', v), [], 'cümle içi iki nokta yok, tire serbest');
    for (const bad of ["Ses ayarları: kadın sesi, sakin. Metin: 'Bu derste bütçe yapmayı öğreneceğiz.'", 'Voice settings: neutral voice. Script: I want a voiceover.', 'Merhaba. Ton: sakin.', 'Dur bir düşüneyim. <break time="1.5s" /> Tamam.']) {
      assert.ok(checkPrompt(bad, v).length >= 1, bad);
    }
    // Etiketsiz ama tarifli metin de okunur (2026-10-14 kısmi eval)
    for (const bad of ["Türkçe e-öğrenme videom için sakin, net bir kadın sesiyle: 'Bu derste bütçe yapmayı öğreneceğiz.'", 'This is a voiceover for an ad in another language, delivered in a calm tone using a neutral voice.', 'Read this in a warm voice: welcome to our store.']) {
      assert.ok(checkPrompt(bad, v).some((m) => /Do not describe the voiceover/.test(m)), bad);
    }
    for (const ok of ['Bu derste bütçe yapmayı öğreneceğiz. Hadi başlayalım!', 'Bu… şey, işe yarayabilir. Dur — bu ses ne?', 'Lumina ile alışveriş artık çok kolay. Lumina\'yı bugün indir.']) {
      assert.deepStrictEqual(checkPrompt(ok, v), [], ok);
    }
  });

  it('onarım mesajı yasaklı ifadenin geçtiği yeri gösterir (genel mesaj onarımı tutturmuyordu)', async () => {
    const el = loadGuides().find((g) => g.id === 'elevenlabs-voiceover')!;
    const { allIssues } = await import('../promptBuilder/sufficiency');
    const prompt = "Türkçe e-öğrenme videom için sakin, net bir kadın sesiyle: 'Bu derste bütçe yapmayı öğreneceğiz.'";
    const issue = allIssues({ prompt, negativePrompt: null, settings: [] }, { guide: el, goal: 'x' }).find((i) => /Do not describe the voiceover/.test(i.message))!;
    assert.match(issue.message, /Found: "[^"]*net bir kadın sesiyle: 'Bu derste[^"]*"\. Rewrite or remove that part\./);
    const regexOnly = allIssues({ prompt: 'a fox in a library', negativePrompt: null, settings: [] }, { guide: midjourney(), goal: 'x' }).find((i) => /aspect ratio parameter/.test(i.message))!;
    assert.doesNotMatch(regexOnly.message, /Found:/, 'eşleşmesi gereken kuralda alıntı yok');
  });

  it('ses aracı için üretici kuralı: prompt sesli okunur, ayarlar settings\'e', async () => {
    const { llm, calls } = fakeLLM({ extracted: { language: 'Turkish', tone: 'calm', voice: 'female voice' } });
    await startPromptSession({ productId: 'elevenlabs', goal: 'ders seslendirmesi', conversation: [{ role: 'user', content: 'Türkçe sakin kadın sesiyle ders seslendirmesi' }], locale: 'tr' }, deps(llm));
    const system = calls.find((c) => c.name === 'prompt_generation')!.system;
    assert.match(system, /reads "prompt" aloud word for word/);
    assert.match(system, /voice and speed go into "settings"/);
    assert.match(system, /never appear as words in "prompt"/);
    assert.match(system, /Never a description of the voiceover/);
    assert.match(system, /delivery details \(voice, tone, pace, language, purpose\) are kept by putting them into "settings"/, 'kural 1 ile çelişki yok (2026-10-14 kısmi eval)');
    assert.match(system, /a single placeholder: \[okunacak metin\]/, 'metin ve konu yoksa tek yer tutucu (tr)');
    // Ses dışı araçta bu istisna yok
    const mj = fakeLLM({ extracted: full });
    await startPromptSession({ productId: 'midjourney-v7', goal: 'logo', conversation, locale: 'en' }, deps(mj.llm));
    assert.doesNotMatch(mj.calls.find((c) => c.name === 'prompt_generation')!.system, /delivery details/);
    assert.doesNotMatch(system, /describe the subject, scene/);
  });

  it('ajan aracı build_prompt: kart + token, ajanın bildiği slotlar kullanıcı bilgisi sayılır', async () => {
    const { llm } = fakeLLM({ extracted: { subject: 'x' } });
    const tool = makeBuildPromptTool(() => deps(llm));
    const out = await tool({ productId: 'midjourney-v7', goal: 'logo', slots: { style: 'illustration', aspect: '1:1' } }, 'en', conversation);
    assert.ok(!('error' in out));
    if ('error' in out) return;
    assert.ok(!('diagnostics' in out) && !JSON.stringify(out).includes('"evidence"'), 'teşhis (kullanıcı alıntısı) ajana dönmez');
    assert.strictEqual(out.card.type, 'prompt');
    assert.strictEqual(out.tokens, 30);
  });
});

// Tip kontrolü için: Guide tipinin dışa açık olduğunu kullan
export type _G = Guide;

describe('girişe göre dinamik sorular', () => {
  const g = midjourney();
  const opts = (...labels: string[]) => labels.map((l, i) => ({ label: l, value: `value ${i + 1}` }));

  it('doğrulama: bilinmeyen slot, tekrar eden slot, <2 seçenek, ayrılmış seçenek ve tekrar eden etiket elenir; en fazla 4', () => {
    const q = sanitizeQuestions([
      { slotId: 'yok-boyle-slot', question: 'Ne?', options: opts('A', 'B') },
      { slotId: 'style', question: 'Logon nasıl bir tarzda olsun?', options: [...opts('Minimal', 'minimal', 'Sen seç', 'El çizimi', 'Vintage', 'Oyuncu', 'Fazla')] },
      { slotId: 'style', question: 'İkinci soru', options: opts('X', 'Y') },
      { slotId: 'aspect', question: 'Hangi format?', options: opts('Kare') },
      { slotId: 'mood', question: 'x'.repeat(161), options: opts('A', 'B') },
    ], g);
    assert.deepStrictEqual(Object.keys(q), ['style']);
    assert.strictEqual(q.style.question, 'Logon nasıl bir tarzda olsun?');
    assert.deepStrictEqual(q.style.options.map((o) => [o.id, o.label]), [['o1', 'Minimal'], ['o2', 'El çizimi'], ['o3', 'Vintage'], ['o4', 'Oyuncu']]);
  });

  it('soru kartı girişe uygun soruyu gösterir; olmayan slot için rehberdeki soru; cevap seçeneğin değerini prompta koyar', async () => {
    const { llm, calls } = fakeLLM({
      extracted: { subject: guess('a logo') },
      questions: [{ slotId: 'style', question: 'Logon nasıl bir tarzda olsun?', options: [
        { label: 'Minimal ve modern', value: 'minimal modern flat logo' },
        { label: 'El çizimi, samimi', value: 'hand-drawn rustic logo' },
        { label: 'Vintage fırın havası', value: 'vintage bakery badge logo' },
      ] }],
    });
    const d = deps(llm);
    const r = await startPromptSession({ productId: 'midjourney-v7', goal: 'Fırınım için logo lazım', conversation: [{ role: 'user', content: 'Fırınım için logo lazım' }], locale: 'tr' }, d);
    if ('error' in r || r.card.type !== 'prompt_question') return assert.fail('soru kartı yok');
    const [, style, aspect] = r.card.questions;
    assert.strictEqual(style.question, 'Logon nasıl bir tarzda olsun?');
    assert.deepStrictEqual(style.options.map((o) => o.label), ['Minimal ve modern', 'El çizimi, samimi', 'Vintage fırın havası']);
    assert.strictEqual(aspect.slotId, 'aspect');
    assert.strictEqual(aspect.question, g.slots.find((s) => s.id === 'aspect')!.question.tr);
    // İstek: sorular kullanıcının dilinde istenir, şema soruları zorunlu tutar
    assert.match(calls[0].system, /in Turkish/);
    assert.ok((calls[0].schema as { required: string[] }).required.includes('questions'));

    const a = await answerPromptQuestions({ promptSessionId: r.card.promptSessionId, answers: { style: 'o2', aspect: 'auto' } }, d);
    if ('error' in a || a.card.type !== 'prompt') return assert.fail('prompt kartı yok');
    assert.match(a.card.variants[0].prompt, /hand-drawn rustic logo/);
  });

  it('soru kartı atlansa da girişe göre üretilmiş soru PromptCard varsayımında "Değiştir" seçenekleri olur', async () => {
    const { llm, calls } = fakeLLM({
      extracted: { subject: 'a bakery logo', mood: 'warm', style: guess('warm hand-drawn logo'), aspect: guess('1:1') },
      questions: [{ slotId: 'style', question: 'Logon nasıl bir tarzda olsun?', options: [
        { label: 'Minimal ve modern', value: 'minimal modern flat logo' },
        { label: 'El çizimi, samimi', value: 'hand-drawn rustic logo' },
      ] }],
    });
    const d = deps(llm);
    const r = await startPromptSession({ productId: 'midjourney-v7', goal: 'Fırınım için logo', conversation: [{ role: 'user', content: 'Fırınım için logo' }], locale: 'tr' }, d);
    if ('error' in r || r.card.type !== 'prompt') return assert.fail('prompt kartı yok');
    const style = r.card.assumptions.find((x) => x.slotId === 'style')!;
    assert.strictEqual(style.question, 'Logon nasıl bir tarzda olsun?');
    assert.deepStrictEqual(style.options.map((o) => o.value), ['minimal modern flat logo', 'hand-drawn rustic logo']);
    const aspect = r.card.assumptions.find((x) => x.slotId === 'aspect')!;
    assert.strictEqual(aspect.question, g.slots.find((s) => s.id === 'aspect')!.question.tr, 'dinamik soru yoksa rehberdeki soru');
    // İstek: yazılmayan slot için akıllı varsayım istenir; null sadece anlamsız girişte
    assert.match(calls[0].system, /Not mentioned: do NOT return null/);
    assert.deepStrictEqual({ maxTokens: calls[0].maxTokens, temperature: calls[0].temperature }, { maxTokens: 1000, temperature: 0.1 });

    // "Değiştir": dinamik seçeneğin değeri kullanıcı bilgisi olur
    const changed = await refinePromptSession({ promptSessionId: r.card.promptSessionId, slotId: 'style', value: style.options[1].value }, d);
    if ('error' in changed || changed.card.type !== 'prompt') return assert.fail('değişiklik');
    assert.match(changed.card.variants[0].prompt, /hand-drawn rustic logo/);
    assert.ok(!changed.card.assumptions.some((x) => x.slotId === 'style'));
  });

  it('model soru yazmazsa rehberdeki sabit sorular kullanılır (geriye uyumlu)', async () => {
    const { llm } = fakeLLM({ extracted: { subject: guess('a bakery logo') } });
    const r = await startPromptSession({ productId: 'midjourney-v7', goal: 'bakery logo', conversation: [], locale: 'en' }, deps(llm));
    if ('error' in r || r.card.type !== 'prompt_question') return assert.fail('soru kartı yok');
    assert.strictEqual(r.card.questions.find((q) => q.slotId === 'style')!.question, g.slots.find((s) => s.id === 'style')!.question.en);
  });

  it('applyAnswers: dinamik seçenek önce, sonra rehber seçeneği, sonra serbest metin', () => {
    const plan = planSlots(g, {}, { questionAsked: false });
    const overrides = { style: { question: 'q', options: [{ id: 'o1', label: 'Minimal', value: 'minimal flat' }, { id: 'o2', label: 'Vintage', value: 'vintage badge' }] } };
    const next = applyAnswers(g, plan.slots, { style: 'o2', aspect: 'kendi formatım' }, ['style', 'aspect'], overrides);
    assert.deepStrictEqual(next.style, { value: 'vintage badge', source: 'user', label: 'Vintage' });
    assert.deepStrictEqual(next.aspect, { value: 'kendi formatım', source: 'user' });
  });
});

describe('genel rehber seçimi (lib/promptBuilder/fallback.ts)', () => {
  const { products, tasksById } = loadCatalog();
  const guideIds = new Set(loadGuides().map((g) => g.id));
  const byId = (id: string) => products.find((p) => p.id === id)!;

  it('görevi olan her aktif ürünün (özel ya da genel) var olan bir rehberi var', () => {
    for (const p of products.filter((x) => x.status === 'active' && x.tasks.length > 0)) {
      const r = resolveGuideId(p, tasksById);
      assert.ok(r && guideIds.has(r.guideId), `${p.id}: rehber yok`);
      assert.strictEqual(r.generic, !p.promptGuide);
    }
  });

  it('ilk görevin türü ya da görev istisnası belirler', () => {
    const expect: Record<string, string> = {
      'leonardo-ai': 'image-natural',
      'replit-agent': 'cursor-task',
      'github-copilot': 'cursor-task',
      'perplexity-ai': 'chat-general',
      'n8n-ai-workflow-builder': 'chat-general',
      'kling-ai-21': 'text-to-video',
      udio: 'suno',
      tome: 'gamma',
      murfai: 'elevenlabs-voiceover',
      'fathom-meeting-assistant': 'chat-general',
      'opusclip-video-repurposing': 'chat-general',
      'synthesia-30': 'elevenlabs-voiceover',
    };
    for (const [id, guideId] of Object.entries(expect)) assert.strictEqual(fallbackGuideId(byId(id), tasksById), guideId, id);
    assert.strictEqual(fallbackGuideId({ tasks: [] }, tasksById), null);
    assert.strictEqual(resolveGuideId(byId('leonardo-ai'), undefined), null, 'görev haritası yoksa sadece özel rehber');
  });
});

describe('prompt istek sınırları', () => {
  const id = 'p_test1xxxx';
  it('serbest iyileştirme 1000, cevap ve varsayım 300 karaktere kadar', () => {
    assert.ok(promptRefineSchema.safeParse({ promptSessionId: id, instruction: 'x'.repeat(1000) }).success);
    assert.ok(!promptRefineSchema.safeParse({ promptSessionId: id, instruction: 'x'.repeat(1001) }).success);
    assert.ok(promptRefineSchema.safeParse({ promptSessionId: id, slotId: 'mood', value: 'x'.repeat(300) }).success);
    assert.ok(!promptRefineSchema.safeParse({ promptSessionId: id, slotId: 'mood', value: 'x'.repeat(301) }).success);
    assert.ok(promptAnswerSchema.safeParse({ promptSessionId: id, answers: { mood: 'x'.repeat(300) } }).success);
    assert.ok(!promptAnswerSchema.safeParse({ promptSessionId: id, answers: { mood: 'x'.repeat(301) } }).success);
  });
});

describe('üretim çıktı tavanı (maxTokensFor)', () => {
  it('rehberin izin verdiği iki tam boy varyant tavana sığar (cursor-full yarım JSON hatası)', () => {
    assert.strictEqual(maxTokensFor('image'), 1000);
    assert.strictEqual(maxTokensFor('code'), 1800);
    for (const g of loadGuides()) {
      const chars = maxPromptChars(g);
      assert.ok(chars, `${g.id}: maxLength yok`);
      const cap = maxTokensFor(g.modality, chars);
      assert.ok(cap * CHARS_PER_TOKEN >= 2 * chars!, `${g.id}: ${cap} token, 2 x ${chars} karakter sığmıyor`);
      assert.ok(cap >= maxTokensFor(g.modality), `${g.id}: taban altına inmez`);
    }
  });

  it('üretim çağrısı rehberin sınırına göre tavanı kullanır', async () => {
    const { llm, calls } = fakeLLM({ extracted: full });
    await startPromptSession({ productId: 'midjourney-v7', goal: 'logo', conversation: [{ role: 'user', content: 'logo for my bakery' }], locale: 'en' }, deps(llm));
    assert.strictEqual(calls.find((c) => c.name === 'prompt_generation')!.maxTokens, maxTokensFor('image', 1500));
  });
});

describe('düşünen model desteği (lib/promptBuilder/llm.ts)', () => {
  const req = { name: 'prompt_generation', system: 'sys', user: 'u', schema: { type: 'object' }, maxTokens: 1800, temperature: 0.4 };

  it('o-serisi ve gpt-5 düşünen model; gpt-5 sohbet sürümü ve gpt-4 ailesi değil', () => {
    for (const m of ['o1', 'o3-mini', 'o4-mini', 'gpt-5', 'gpt-5-mini', 'gpt-5.1', 'openai/gpt-5-nano', ' GPT-5 ']) assert.ok(isReasoningModel(m), m);
    for (const m of ['gpt-4o-mini', 'gpt-4.1', 'gpt-5-chat-latest', 'omni-moderation-latest']) assert.ok(!isReasoningModel(m), m);
  });

  it('düşünen model: developer rolü, max_completion_tokens (düşünme payı dahil), reasoning_effort; temperature yok', () => {
    const body = buildChatRequest('gpt-5-mini', req, 'low');
    assert.strictEqual(body.messages[0].role, 'developer');
    assert.deepStrictEqual(
      { max_completion_tokens: (body as { max_completion_tokens?: number }).max_completion_tokens, reasoning_effort: (body as { reasoning_effort?: string }).reasoning_effort },
      { max_completion_tokens: 1800 + REASONING_ALLOWANCE.low, reasoning_effort: 'low' }
    );
    assert.ok(!('temperature' in body) && !('max_tokens' in body));
    assert.strictEqual(body.response_format.json_schema.strict, true);
  });

  it('normal model: system rolü, max_tokens ve temperature (eski davranış)', () => {
    const body = buildChatRequest('gpt-4o-mini', req, 'low');
    assert.strictEqual(body.messages[0].role, 'system');
    assert.deepStrictEqual({ max_tokens: (body as { max_tokens?: number }).max_tokens, temperature: (body as { temperature?: number }).temperature }, { max_tokens: 1800, temperature: 0.4 });
    assert.ok(!('max_completion_tokens' in body) && !('reasoning_effort' in body));
  });

  it('düşünme düzeyi ortam değişkeninden; boş ya da geçersizse low. Zaman aşımı modele göre', () => {
    const old = process.env.OPENAI_PROMPT_REASONING_EFFORT;
    try {
      delete process.env.OPENAI_PROMPT_REASONING_EFFORT;
      assert.strictEqual(promptReasoningEffort(), 'low');
      process.env.OPENAI_PROMPT_REASONING_EFFORT = ' Medium ';
      assert.strictEqual(promptReasoningEffort(), 'medium');
      process.env.OPENAI_PROMPT_REASONING_EFFORT = 'çok';
      assert.strictEqual(promptReasoningEffort(), 'low');
    } finally {
      if (old === undefined) delete process.env.OPENAI_PROMPT_REASONING_EFFORT;
      else process.env.OPENAI_PROMPT_REASONING_EFFORT = old;
    }
    assert.strictEqual(promptTimeoutMs('gpt-4o-mini'), PROMPT_TIMEOUT_MS);
    assert.strictEqual(promptTimeoutMs('o4-mini'), REASONING_PROMPT_TIMEOUT_MS);
    assert.ok(REASONING_PROMPT_TIMEOUT_MS < 60_000, 'route maxDuration (60 sn) altında');
    assert.strictEqual(PROMPT_TIMEOUT_MS, 40_000, '2026-10-14 kararı: uzun promptlarda hata yerine bekleme');
    assert.ok(PROMPT_TIMEOUT_MS <= REASONING_PROMPT_TIMEOUT_MS && PROMPT_TIMEOUT_MS < 60_000);
  });

  it('prompt uçları Node çalışma zamanında, maxDuration 60', () => {
    for (const r of ['start', 'answer', 'refine']) {
      const src = readFileSync(`app/api/prompt/${r}/route.ts`, 'utf8');
      assert.match(src, /export const runtime = "nodejs";/, r);
      assert.match(src, /export const maxDuration = 60;/, r);
    }
  });
});
