import assert from 'node:assert';
import { describe, it } from 'node:test';
import { readFileSync, readdirSync } from 'node:fs';
import { YamlError, parseYamlSubset, parseScalar, splitFrontmatter, splitSections } from '../promptBuilder/yaml';
import { guideRuleErrors, type Guide } from '../promptBuilder/guideSchema';
import { loadGuides } from '../promptBuilder/guides';
import { applyAnswers, planSlots } from '../promptBuilder/plan';
import { checkPrompt, validateWithRepair } from '../promptBuilder/validate';
import { answerPromptQuestions, refinePromptSession, startPromptSession, type PromptDeps } from '../promptBuilder/service';
import { memoryPromptStore } from '../promptBuilder/store';
import type { JsonRequest } from '../promptBuilder/llm';
import { MAX_REFINEMENTS } from '../promptBuilder/types';
import { loadCatalog } from '../catalog/index';
import { makeBuildPromptTool } from '../promptBuilder/agentTool';

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

function fakeLLM(opts: { extracted?: Record<string, string | null>; failRegexTimes?: number } = {}) {
  const calls: JsonRequest[] = [];
  let failures = opts.failRegexTimes ?? 0;
  const llm = async (req: JsonRequest) => {
    calls.push(req);
    const input = JSON.parse(req.user);
    if (req.name === 'slot_extraction') {
      const slots = Object.entries(opts.extracted ?? {}).map(([id, value]) => ({ id, value, source: 'user', confidence: value ? 0.9 : 0 }));
      return { data: { slots, goalSummary: 'summary' }, tokens: 10 };
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
        assumptions: [{ slotId: 'mood', value: values.mood, why: 'chosen' }],
        suggestedRefinements: [{ label: 'Try teal', slotId: 'mood', value: 'teal', instruction: null }],
        howToUse: ['1', '2', '3', '4'],
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

describe('plan (LLM yok)', () => {
  const g = midjourney();

  it("eksik ya da düşük güvenli 'high' slotlar sorulur, en fazla 3, rehber sırasıyla", () => {
    const plan = planSlots(g, { subject: { value: 'cat', source: 'user', confidence: 0.9 }, style: { value: 'x', source: 'inferred', confidence: 0.4 } }, { questionAsked: false });
    assert.deepStrictEqual(plan.questions.map((q) => q.id), ['style', 'aspect']);
    assert.strictEqual(plan.slots.subject.source, 'user');
    assert.strictEqual(plan.slots.mood.source, 'default');
    assert.strictEqual(plan.slots.detail.value, 'minimal'); // default seçenek değeri
  });

  it('soru bütçesi bittiyse soru yok, boşluklar default', () => {
    const plan = planSlots(g, {}, { questionAsked: true });
    assert.deepStrictEqual(plan.questions, []);
    assert.ok(Object.values(plan.slots).every((s) => s.source === 'default'));
  });

  it("cevaplar: seçenek id'si -> değer, 'auto' -> default, metin -> serbest", () => {
    const plan = planSlots(g, {}, { questionAsked: false });
    const next = applyAnswers(g, plan.slots, { subject: 'product', style: 'auto', aspect: 'sinematik geniş' }, ['subject', 'style', 'aspect']);
    assert.deepStrictEqual(next.subject, { value: 'a product', source: 'user' });
    assert.deepStrictEqual(next.style, { value: null, source: 'default' });
    assert.deepStrictEqual(next.aspect, { value: 'sinematik geniş', source: 'user' });
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
    const base = { variants: [{ id: 'safe' as const, prompt: 'cat --ar 1:1', negativePrompt: null, settings: [] }, { id: 'creative' as const, prompt: 'cat', negativePrompt: null, settings: [] }], assumptions: [], suggestedRefinements: [], howToUse: [] };

    const ok = fakeLLM();
    const fixed = await validateWithRepair(base, { session, guide: g, productName: 'MJ', llm: ok.llm });
    assert.strictEqual(ok.calls.length, 1);
    assert.ok(fixed.repaired);
    assert.deepStrictEqual(fixed.variants.map((v) => v.validation.status), ['passed', 'passed']);
    assert.strictEqual(fixed.variants[0].prompt, 'cat --ar 1:1', 'geçen varyant korunur');
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

  it("eksik 'high' slot varsa tek soru kartı; cevaptan sonra PromptCard", async () => {
    const { llm } = fakeLLM({ extracted: { subject: 'a bakery logo' } });
    const d = deps(llm);
    const r = await startPromptSession({ productId: 'midjourney-v7', goal: 'bakery logo', conversation, locale: 'en' }, d);
    assert.ok(!('error' in r) && r.card.type === 'prompt_question');
    if ('error' in r || r.card.type !== 'prompt_question') return;
    assert.deepStrictEqual(r.card.questions.map((q) => q.slotId), ['style', 'aspect']);

    const a = await answerPromptQuestions({ promptSessionId: r.card.promptSessionId, answers: { style: 'photo', aspect: 'auto' } }, d);
    assert.ok(!('error' in a) && a.card.type === 'prompt');
    if ('error' in a || a.card.type !== 'prompt') return;
    assert.match(a.card.variants[0].prompt, /photorealistic photo/);
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

  it('ajan aracı build_prompt: kart + token, ajanın bildiği slotlar kullanıcı bilgisi sayılır', async () => {
    const { llm } = fakeLLM({ extracted: { subject: 'x' } });
    const tool = makeBuildPromptTool(() => deps(llm));
    const out = await tool({ productId: 'midjourney-v7', goal: 'logo', slots: { style: 'illustration', aspect: '1:1' } }, 'en', conversation);
    assert.ok(!('error' in out));
    if ('error' in out) return;
    assert.strictEqual(out.card.type, 'prompt');
    assert.strictEqual(out.tokens, 30);
  });
});

// Tip kontrolü için: Guide tipinin dışa açık olduğunu kullan
export type _G = Guide;
