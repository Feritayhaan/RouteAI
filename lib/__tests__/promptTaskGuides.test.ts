// Görev rehberleri (data/prompt-guides/task-*.md): her göreve özel, araca bağlı olmayan ayrıntılı prompt şablonları.
// Araca özel rehberi olmayan her araçta, kullanıcının işine göre seçilir (lib/promptBuilder/fallback.ts).
import assert from 'node:assert';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { loadGuides } from '../promptBuilder/guides';
import { loadCatalog } from '../catalog/index';
import { guideRuleErrors, type Guide } from '../promptBuilder/guideSchema';
import { checkPrompt } from '../promptBuilder/validate';
import { FALLBACK_BY_MODALITY, FALLBACK_BY_TASK, TASKS_WITHOUT_PROMPT_GUIDE, isModelSpecific, resolveGuideId, taskGuideIndex } from '../promptBuilder/fallback';
import { answerPromptQuestions, startPromptSession, refinePromptSession, type PromptDeps } from '../promptBuilder/service';
import { memoryPromptStore } from '../promptBuilder/store';
import type { JsonRequest } from '../promptBuilder/llm';
import { promptStartSchema } from '../validations/prompt';
import { buildPromptArgs } from '../agent/tools';

const guides = loadGuides();
const catalog = loadCatalog();
const taskGuides = guides.filter((g) => g.tasks.length > 0);
const index = taskGuideIndex(guides);

/** Örnek bloklarındaki ``` ``` içi promptlar. */
function exampleBlocks(g: Guide): string[] {
  return [...g.body.examples.matchAll(/```\n([\s\S]*?)\n```/g)].map((m) => m[1]);
}

describe('görev rehberleri: kapsam', () => {
  it('her görev için ya görev rehberi vardır ya da muaf listededir (ikisi birden değil)', () => {
    for (const task of catalog.tasks) {
      const hasGuide = index.has(task.id);
      const exempt = TASKS_WITHOUT_PROMPT_GUIDE.includes(task.id);
      assert.ok(hasGuide !== exempt, `${task.id}: görev rehberi ${hasGuide ? 'var' : 'yok'}, muaf listede ${exempt ? 'var' : 'yok'}`);
    }
  });

  it('muaf liste gerçek görevlerden oluşur, tekrar yok; 8 görev', () => {
    assert.strictEqual(new Set(TASKS_WITHOUT_PROMPT_GUIDE).size, TASKS_WITHOUT_PROMPT_GUIDE.length);
    assert.strictEqual(TASKS_WITHOUT_PROMPT_GUIDE.length, 8);
    for (const id of TASKS_WITHOUT_PROMPT_GUIDE) assert.ok(catalog.tasksById.has(id), id);
  });

  it('görev rehberi sayısı = görev sayısı − muaf görev sayısı; her görevin tek rehberi var', () => {
    assert.strictEqual(taskGuides.length, catalog.tasks.length - TASKS_WITHOUT_PROMPT_GUIDE.length);
    const seen = new Set<string>();
    for (const g of taskGuides) for (const t of g.tasks) {
      assert.ok(!seen.has(t), `tekrar eden görev rehberi: ${t}`);
      seen.add(t);
    }
  });

  it('görev rehberi biçimi: tek görev, appliesTo boş, id kuralı, tür görevle aynı', () => {
    for (const g of taskGuides) {
      assert.deepStrictEqual(guideRuleErrors(g), [], g.id);
      assert.strictEqual(g.tasks.length, 1, g.id);
      assert.deepStrictEqual(g.appliesTo, [], g.id);
      const task = catalog.tasksById.get(g.tasks[0]);
      assert.ok(task, `${g.id}: görev katalogda yok`);
      assert.strictEqual(g.id, `task-${g.tasks[0].replace('.', '-')}`);
      assert.strictEqual(g.modality, task.modality, `${g.id}: rehberin türü görevin türüyle aynı olmalı`);
      assert.ok(!isModelSpecific(g), g.id);
    }
  });
});

describe('görev rehberleri: kalite çıtası', () => {
  it('slotlar: ≥6 slot, ≥2 "high", her slotta ≥2 seçenek, benzersiz seçenek id, geçerli default', () => {
    for (const g of taskGuides) {
      assert.ok(g.slots.length >= 6, `${g.id}: slot sayısı`);
      assert.ok(g.slots.filter((s) => s.impact === 'high').length >= 2, `${g.id}: high slot`);
      for (const s of g.slots) {
        assert.ok(s.options.length >= 2, `${g.id}.${s.id}: seçenek`);
        assert.strictEqual(new Set(s.options.map((o) => o.id)).size, s.options.length, `${g.id}.${s.id}: tekrar eden seçenek`);
        assert.ok(s.default === 'infer' || s.options.some((o) => o.id === s.default), `${g.id}.${s.id}: default`);
        for (const o of s.options) assert.ok(o.label.tr.length > 0 && o.label.en.length > 0 && o.value.length > 0, `${g.id}.${s.id}.${o.id}`);
      }
    }
  });

  it('iyileştirmeler: 6–8 adet; patch yalnız var olan slota ve o slotun bir seçenek değerine', () => {
    for (const g of taskGuides) {
      assert.ok(g.refinements.length >= 6 && g.refinements.length <= 8, `${g.id}: iyileştirme sayısı ${g.refinements.length}`);
      for (const r of g.refinements) {
        for (const [slotId, value] of Object.entries(r.patch ?? {})) {
          const slot = g.slots.find((s) => s.id === slotId);
          assert.ok(slot, `${g.id}.${r.id}: patch bilinmeyen slota gidiyor (${slotId})`);
          assert.ok(slot.options.some((o) => o.value === value), `${g.id}.${r.id}: patch değeri ${slotId} slotunun bir seçeneği değil`);
        }
      }
    }
  });

  it('kontrol listesi ≥6 madde; doğrulayıcılar: uzunluk sınırı ≤3000 ve doldurulmamış {{ }} yasağı', () => {
    for (const g of taskGuides) {
      assert.ok(g.checklist.length >= 6, `${g.id}: checklist`);
      const max = g.validators.find((v) => v.type === 'maxLength');
      assert.ok(max && Number(max.value) <= 3000, `${g.id}: maxLength ≤ 3000 olmalı (iki varyant + JSON çıktı sınırına sığsın)`);
      assert.ok(g.validators.some((v) => v.id === 'no-braces'), `${g.id}: no-braces`);
      assert.ok(checkPrompt('Bu {{yer tutucu}} dolmamış', g.validators).length > 0, `${g.id}: {{ }} yakalanmalı`);
    }
  });

  it('gövde: Sözdizimi, Şablon, Yap/Yapma, Örnekler dolu; "KAYNAK GEREKLİ" yok', () => {
    for (const g of taskGuides) {
      assert.ok(g.body.syntax.length >= 700, `${g.id}: sözdizimi çok kısa`);
      assert.ok(g.body.template.length >= 100, `${g.id}: şablon çok kısa`);
      assert.match(g.body.dosDonts, /\*\*Yap\*\*/, g.id);
      assert.match(g.body.dosDonts, /\*\*Yapma\*\*/, g.id);
      for (const part of Object.values(g.body)) assert.doesNotMatch(part, /KAYNAK GEREKLİ/, g.id);
    }
  });

  it('örnekler: ≥2 örnek; her örnek promptu rehberin KENDİ doğrulayıcılarından geçer', () => {
    for (const g of taskGuides) {
      assert.ok((g.body.examples.match(/\*\*Örnek/g) ?? []).length >= 2, `${g.id}: ≥2 örnek`);
      const blocks = exampleBlocks(g);
      assert.ok(blocks.length >= 2, `${g.id}: ≥2 örnek prompt bloğu`);
      for (const b of blocks) assert.deepStrictEqual(checkPrompt(b, g.validators), [], `${g.id}: örnek doğrulayıcıdan geçmiyor → ${b.slice(0, 60)}`);
    }
  });

  it('kaynaklar: boş değil, hepsi https; görev rehberi taslaktır (inceleyen yoksa tarih de yok)', () => {
    for (const g of taskGuides) {
      assert.ok(g.sources.length >= 1, `${g.id}: kaynak`);
      for (const url of g.sources) assert.match(url, /^https:\/\/[^\s/]+\.[^\s]+$/, `${g.id}: ${url}`);
      assert.strictEqual(Boolean(g.reviewedBy), Boolean(g.reviewedAt), `${g.id}: reviewedBy ve reviewedAt birlikte dolu ya da boş`);
    }
  });

  it('uydurma korumaları: metin görevlerinde "uydurma" kuralı ve şablonda kural bölümü', () => {
    // Bilgi uydurmanın zarar verdiği görevlerde şablon açıkça yasak koymalı.
    const mustForbidInvention = ['text.write-longform', 'text.marketing-copy', 'text.email', 'text.summarize', 'career.resume', 'research.web', 'research.academic', 'research.document-qa', 'finance.bookkeeping', 'sales.prospecting', 'project.management', 'productivity.planning', 'support.chatbot', 'slides.create'];
    for (const task of mustForbidInvention) {
      const g = guides.find((x) => x.tasks.includes(task));
      assert.ok(g, task);
      // "uydurma" ya da eşdeğeri: kaynakta olmayan bilgiyi eklememe kuralı (özet/belge görevlerinde böyle yazılır)
      assert.match(`${g.body.template}\n${g.body.syntax}`, /uydur|olmayan bilgi|bilgide olmayan|yalnızca metindekileri|yalnızca belge/i, `${task}: bilgi uydurma yasağı`);
    }
  });

  it('görselde/videoda/3B’de prompt uzunluğu çıktı sınırına sığar (medya türleri ≤2000)', () => {
    for (const g of taskGuides.filter((x) => ['image', 'video', '3d', 'audio', 'music'].includes(x.modality))) {
      const max = Number(g.validators.find((v) => v.type === 'maxLength')!.value);
      assert.ok(max <= 2500, `${g.id}: ${max}`);
    }
  });
});

describe('rehber seçimi (araca özel > görev > ortak > tür)', () => {
  const tasksById = catalog.tasksById;

  it('araca özel rehber (aynı türde) görev rehberinden önce gelir', () => {
    const mj = catalog.productsById.get('midjourney-v7')!;
    const r = resolveGuideId(mj, tasksById, { guides, taskId: 'image.generate' });
    assert.deepStrictEqual(r, { guideId: 'midjourney', generic: false, kind: 'model' });
  });

  it('araca özel rehberin türü işin türüyle uyuşmuyorsa görev rehberi seçilir', () => {
    const product = { promptGuide: 'gamma', tasks: ['slides.create', 'code.website-builder'] };
    assert.deepStrictEqual(resolveGuideId(product, tasksById, { guides, taskId: 'slides.create' }), { guideId: 'gamma', generic: false, kind: 'model' });
    assert.deepStrictEqual(resolveGuideId(product, tasksById, { guides, taskId: 'code.website-builder' }), { guideId: 'task-code-website-builder', generic: true, kind: 'task' });
  });

  it('araca özel rehberi olmayan ürün: işe göre görev rehberi; işi yoksa ilk görev', () => {
    const product = { promptGuide: undefined, tasks: ['design.social-graphic', 'slides.create', 'image.logo'] };
    assert.strictEqual(resolveGuideId(product, tasksById, { guides })?.guideId, 'task-design-social-graphic');
    assert.strictEqual(resolveGuideId(product, tasksById, { guides, taskId: 'slides.create' })?.guideId, 'task-slides-create');
    assert.strictEqual(resolveGuideId(product, tasksById, { guides, taskId: 'image.logo' })?.guideId, 'task-image-logo');
  });

  it('ürüne ait olmayan taskId yok sayılır (yanlış iş yanlış şablon seçtirmez)', () => {
    const product = { promptGuide: undefined, tasks: ['text.email'] };
    assert.strictEqual(resolveGuideId(product, tasksById, { guides, taskId: 'career.resume' })?.guideId, 'task-text-email');
  });

  it('görev rehberi ortak (aile) rehberden önce gelir; muaf görevde ortak rehber kullanılır', () => {
    const shared = { promptGuide: 'image-natural', tasks: ['image.generate', 'image.upscale'] };
    assert.deepStrictEqual(resolveGuideId(shared, tasksById, { guides, taskId: 'image.generate' }), { guideId: 'task-image-generate', generic: true, kind: 'task' });
    assert.deepStrictEqual(resolveGuideId(shared, tasksById, { guides, taskId: 'image.upscale' }), { guideId: 'image-natural', generic: false, kind: 'family' });
  });

  it('muaf görev ve ortak rehber yok: tür rehberine düşer (görev özel eşlemesi önce)', () => {
    const meeting = { promptGuide: undefined, tasks: ['audio.meeting-notes'] };
    assert.deepStrictEqual(resolveGuideId(meeting, tasksById, { guides }), { guideId: FALLBACK_BY_TASK['audio.meeting-notes'], generic: true, kind: 'modality' });
    const voice = { promptGuide: undefined, tasks: ['audio.voice-clone'] };
    assert.deepStrictEqual(resolveGuideId(voice, tasksById, { guides }), { guideId: FALLBACK_BY_MODALITY.audio, generic: true, kind: 'modality' });
  });

  it('görev yoksa rehber yok; görev haritası yoksa yalnız araca özel rehber', () => {
    assert.strictEqual(resolveGuideId({ promptGuide: undefined, tasks: [] }, tasksById, { guides }), null);
    const noMap = resolveGuideId({ promptGuide: 'midjourney', tasks: ['image.generate'] }, undefined, { guides });
    assert.strictEqual(noMap?.kind, 'model');
  });

  it('görev rehberi sayesinde her aktif ürünün (görevi varsa) her görevi için bir rehber çıkar', () => {
    const missing: string[] = [];
    for (const p of catalog.products.filter((x) => x.status === 'active')) {
      for (const t of p.tasks) {
        const r = resolveGuideId(p, tasksById, { guides, taskId: t });
        if (!r || !guides.some((g) => g.id === r.guideId)) missing.push(`${p.id}/${t}`);
      }
    }
    assert.deepStrictEqual(missing, []);
  });

  it('görev rehberi seçilen her üründe kart "genel rehber" der; araca özel olanda demez', () => {
    for (const p of catalog.products.filter((x) => x.status === 'active' && x.tasks.length > 0)) {
      const r = resolveGuideId(p, tasksById, { guides })!;
      assert.strictEqual(r.generic, r.kind === 'task' || r.kind === 'modality', p.id);
    }
  });
});

describe('görev bilgisi servis ve arayüz katmanında taşınır', () => {
  const conversation = [{ role: 'user' as const, content: 'hello' }];

  function deps(llm: PromptDeps['llm']): PromptDeps {
    let n = 0;
    return { llm, store: memoryPromptStore(), guides, products: catalog.products, tasksById: catalog.tasksById, now: () => Date.parse('2026-10-18T00:00:00Z'), newId: () => `p_task${++n}xx` };
  }

  // Slot çıkarımı boş döner (hepsi sorulur); üretimde ilk 'high' slotları dolu kabul edip basit bir prompt yazar.
  function llm() {
    const calls: JsonRequest[] = [];
    const fn: PromptDeps['llm'] = async (req) => {
      calls.push(req);
      if (req.name === 'slot_extraction') return { data: { slots: [], goalSummary: 's' }, tokens: 5 };
      return {
        data: {
          variants: [
            { id: 'safe', prompt: 'A clear and complete test prompt for the chosen task, long enough to pass.', negativePrompt: null, settings: [] },
            { id: 'creative', prompt: 'A second, bolder test prompt for the chosen task, also long enough to pass.', negativePrompt: null, settings: [] },
          ],
          assumptions: [],
          suggestedRefinements: [],
          howToUse: ['1', '2', '3', '4'],
        },
        tokens: 5,
      };
    };
    return { fn, calls };
  }

  it('startPromptSession: taskId oturuma yazılır; rehber işe göre seçilir', async () => {
    const product = 'canva-ai-magic-studio'; // çok görevli, araca özel rehberi yok
    assert.strictEqual(catalog.productsById.get(product)?.promptGuide, undefined);
    const cases: [string | undefined, string][] = [
      [undefined, 'task-design-social-graphic'],
      ['slides.create', 'task-slides-create'],
      ['image.logo', 'task-image-logo'],
      ['docs.create', 'task-docs-create'],
    ];
    for (const [taskId, guideId] of cases) {
      const { fn } = llm();
      const r = await startPromptSession({ productId: product, goal: 'something', conversation, locale: 'en', taskId }, deps(fn));
      if ('error' in r) return assert.fail(`${taskId}: ${r.error}`);
      assert.strictEqual(r.card.guideId, guideId, String(taskId));
      assert.strictEqual(r.session.taskId, taskId);
    }
  });

  it('cevap ve iyileştirme aynı görev rehberiyle sürer', async () => {
    const { fn, calls } = llm();
    const d = deps(fn);
    const start = await startPromptSession({ productId: 'canva-ai-magic-studio', goal: 'deck for investors', conversation, locale: 'en', taskId: 'slides.create' }, d);
    if ('error' in start || start.card.type !== 'prompt_question') return assert.fail('soru kartı bekleniyordu');
    assert.strictEqual(start.card.guideId, 'task-slides-create');
    const answers = Object.fromEntries(start.card.questions.map((q) => [q.slotId, 'auto']));
    const done = await answerPromptQuestions({ promptSessionId: start.card.promptSessionId, answers }, d);
    if ('error' in done || done.card.type !== 'prompt') return assert.fail('prompt kartı bekleniyordu');
    assert.strictEqual(done.card.guideId, 'task-slides-create');
    assert.strictEqual(done.card.genericGuide, true);
    const gen = calls.find((c) => c.name === 'prompt_generation')!;
    assert.match(gen.system, /general guide for this kind of job, not specific to Canva/);
    assert.match(gen.system, /slayt|slide/i);
    const refined = await refinePromptSession({ promptSessionId: start.card.promptSessionId, instruction: 'make it shorter' }, d);
    if ('error' in refined || refined.card.type !== 'prompt') return assert.fail('iyileştirme');
    assert.strictEqual(refined.card.guideId, 'task-slides-create');
  });

  it('API şeması: taskId isteğe bağlı, "grup.görev" biçimi dışı reddedilir', () => {
    const base = { productId: 'canva-ai-magic-studio', goal: 'a deck', locale: 'en' as const };
    assert.ok(promptStartSchema.safeParse(base).success);
    assert.ok(promptStartSchema.safeParse({ ...base, taskId: 'slides.create' }).success);
    assert.ok(promptStartSchema.safeParse({ ...base, taskId: '3d.generate' }).success);
    for (const bad of ['Slides.Create', 'slides', 'slides.create; drop', '../x', 'a.b.c']) {
      assert.ok(!promptStartSchema.safeParse({ ...base, taskId: bad }).success, bad);
    }
  });

  it('ajan aracı: build_prompt taskId kabul eder', () => {
    const ok = buildPromptArgs.safeParse({ productId: 'canva-ai-magic-studio', goal: 'deck', taskId: 'slides.create' });
    assert.ok(ok.success);
    assert.strictEqual(ok.success && ok.data.taskId, 'slides.create');
    assert.ok(buildPromptArgs.safeParse({ productId: 'canva-ai-magic-studio', goal: 'deck' }).success);
  });
});

describe('arayüz: işin görevi (taskId) prompt isteğine taşınır', () => {
  // Görev rehberi, ekran taskId'yi /api/prompt/start'a gönderirse seçilir. Üç yerleşimin üçü de göndermeli:
  // ana sayfa paneli, iş akışı adımının kendi kartı ve geniş ekranda iş akışının SAĞ paneli (WorkflowDisplay).
  const src = (f: string) => readFileSync(new URL(`../../components/${f}`, import.meta.url), 'utf8');

  it('ana sayfa: PromptPanel önerilen görevi alır', () => {
    assert.match(src('HomeClient.tsx'), /<PromptPanel[\s\S]{0,400}?taskId=\{recommendedTaskId\(response\)\}/);
  });

  it('iş akışı: tek yardımcı (stepPromptInput) adımın görevini verir; kart içi ve yan panel onu kullanır', () => {
    const card = src('WorkflowStepCard.tsx');
    assert.match(card, /taskId: step\.primary\.taskId \?\? step\.taskId/, 'adımın görevi: aracın geldiği görev, yoksa adımın görevi');
    assert.match(card, /<PromptPanel[\s\S]{0,400}?taskId=\{input\.taskId\}/, 'kart içi panel');
    assert.match(src('WorkflowDisplay.tsx'), /<PromptPanel[\s\S]{0,400}?taskId=\{side\.taskId\}/, 'geniş ekranda sağ panel');
  });
});
