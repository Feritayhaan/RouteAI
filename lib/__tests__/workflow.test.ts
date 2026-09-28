import assert from 'node:assert';
import { describe, it } from 'node:test';

// Canlı servislere dokunmaz: KV ve OpenAI değişkenleri modüller yüklenmeden
// silinir; araçlar lib/tools-database.json + katalogdan gelir, LLM çağrılmaz.
for (const key of Object.keys(process.env)) {
  if (/^(KV_|UPSTASH_|OPENAI_)/.test(key) || key === 'VECTOR_SEARCH_ENABLED') delete process.env[key];
}

const { WORKFLOW_TEMPLATES, MAX_WORKFLOW_STEPS, getWorkflowTemplateById } = await import('../workflow/workflowTemplates');
const { buildWorkflow, formatWorkflowForApi } = await import('../workflow/workflowGenerator');
const { getTools } = await import('../toolsService');
const { productTasks } = await import('../catalog/navigator');
const { parseUserIntent } = await import('../intent/parser');
const { recommendV1 } = await import('../recommendV1');
const { hasTerm } = await import('../text');
const { hasFreeTier, isPaidOnly, makePricing } = await import('../pricing');
const tasksJson = (await import('../../data/tasks.json', { with: { type: 'json' } })).default as { id: string }[];

import type { ParsedIntent } from '../intent/types';
import type { Tool } from '../toolsService';
import type { WorkflowTemplate } from '../workflow/workflowTypes';

const TASK_IDS = new Set(tasksJson.map((t) => t.id));

const intent = (over: Partial<ParsedIntent> = {}): ParsedIntent => ({
  primaryCategory: 'metin', secondaryCategories: [], confidence: 0.8, userGoal: '', keywords: [], reasoning: '',
  constraints: { pricing: 'freemium' }, complexity: 'multi-step', workflowHints: [], ...over,
});

const template = (id: string): WorkflowTemplate => {
  const t = getWorkflowTemplateById(id);
  assert.ok(t, `şablon yok: ${id}`);
  return t;
};

describe('workflow şablonları', () => {
  it('her şablon 2-3 adım; her adımın görevi katalogda var', () => {
    for (const t of WORKFLOW_TEMPLATES) {
      assert.ok(t.steps.length >= 2 && t.steps.length <= MAX_WORKFLOW_STEPS, `${t.id}: ${t.steps.length} adım`);
      for (const s of t.steps) {
        assert.ok(s.tasks.length > 0, `${t.id}/${s.name}: görev yok`);
        for (const task of s.tasks) assert.ok(TASK_IDS.has(task), `${t.id}/${s.name}: bilinmeyen görev ${task}`);
      }
    }
  });

  it('tek araçla yapılan işlerin şablonu yok', () => {
    for (const id of ['presentation', 'blog-content', 'logo-design', 'translation-localization', 'product-photography', 'data-dashboard', 'mobile-app-design']) {
      assert.strictEqual(getWorkflowTemplateById(id), null, id);
    }
  });

  it('şablonda süre, karmaşıklık ya da hazır prompt metni yok', () => {
    for (const t of WORKFLOW_TEMPLATES) {
      assert.ok(!('estimatedDuration' in t) && !('complexity' in t), t.id);
      for (const s of t.steps) assert.ok(!('promptTemplate' in s), `${t.id}/${s.name}`);
    }
  });
});

describe('adım araçları katalog görevinden', async () => {
  const tools = await getTools();

  it('podcast: metin -> seslendirme -> kapak; her ana araç o görevi yapar, alternatif farklı ürün', () => {
    const wf = buildWorkflow(template('podcast-creation'), intent(), 'podcast başlatmak istiyorum', tools);
    assert.ok(wf);
    assert.deepStrictEqual(wf.steps.map((s) => s.taskId), ['text.write-longform', 'audio.tts-voiceover', 'image.generate']);
    for (const s of wf.steps) {
      const p = s.primary.tool;
      assert.ok(p.productId && productTasks(p.productId).includes(s.taskId), `${s.name}: ${p.name}`);
      assert.ok(!p.deprecated, p.name);
      if (s.alternative) assert.notStrictEqual(s.alternative.tool.productId, p.productId, s.name);
    }
    // Eski hata: seslendirme ve kapak adımlarında müzik aracı çıkıyordu.
    assert.ok(!wf.steps.some((s) => /suno|udio/i.test(s.primary.tool.name)));
  });

  it('bütün şablonlar gerçek katalogla üretilebiliyor, en fazla 3 adım', () => {
    for (const t of WORKFLOW_TEMPLATES) {
      const wf = buildWorkflow(t, intent(), t.name, tools);
      assert.ok(wf, t.id);
      assert.ok(wf.steps.length >= 2 && wf.steps.length <= MAX_WORKFLOW_STEPS, t.id);
      assert.deepStrictEqual(wf.steps.map((s) => s.order), wf.steps.map((_, i) => i + 1));
    }
  });

  it('fiyat filtresi gevşetilmez: ya her araç filtreye uyar ya workflow yok', () => {
    for (const t of WORKFLOW_TEMPLATES) {
      const free = buildWorkflow(t, intent(), t.name, tools, { pricingFilter: 'free' });
      if (free) for (const s of free.steps) {
        assert.ok(hasFreeTier(s.primary.tool.pricing), `${t.id}/${s.name}`);
        if (s.alternative) assert.ok(hasFreeTier(s.alternative.tool.pricing));
      }
      const paid = buildWorkflow(t, intent(), t.name, tools, { pricingFilter: 'paid' });
      if (paid) for (const s of paid.steps) assert.ok(isPaidOnly(s.primary.tool.pricing), `${t.id}/${s.name}`);
    }
  });

  it('API çıktısında süre ve karmaşıklık yok; adımda ürün kimliği var', () => {
    const wf = buildWorkflow(template('youtube-video'), intent(), 'youtube videosu', tools);
    assert.ok(wf);
    const api = formatWorkflowForApi(wf, 'tr');
    assert.ok(!('estimatedDuration' in api) && !('complexity' in api));
    assert.ok(api.steps.every((s) => typeof s.primary.productId === 'string'));
  });
});

describe('adım birleştirme ve fiyat tercihi (sahte araçlar)', () => {
  const tool = (id: string, pricing = makePricing('freemium', 10, '2026-09-01')): Tool => ({
    id, productId: id, name: id, category: 'metin', description: { en: '', tr: '' }, url: `https://${id}.example.com`,
    pricing, bestFor: { en: [], tr: [] }, strength: 9,
  });
  const tasks: Record<string, string[]> = {
    genel: ['text.write-longform', 'image.generate'],
    ses: ['audio.tts-voiceover'],
    gorsel: ['image.generate'],
  };
  const tasksOf = (id: string) => tasks[id] ?? [];
  const tpl: WorkflowTemplate = {
    id: 'test', name: 'Test', nameEn: 'Test', description: '', triggers: [], semanticDescription: '', minConfidence: 0,
    primaryCategories: [], tags: [],
    steps: [
      { order: 1, name: 'Metin', description: 'yaz', category: 'metin', tasks: ['text.write-longform'] },
      { order: 2, name: 'Görsel', description: 'çiz', category: 'gorsel', tasks: ['image.generate'] },
      { order: 3, name: 'Ses', description: 'seslendir', category: 'ses', tasks: ['audio.tts-voiceover'] },
    ],
  };

  it('ardışık adımların ana aracı aynıysa tek adım olur', () => {
    const wf = buildWorkflow(tpl, intent(), 'x', [tool('genel', makePricing('freemium', 10, '2026-09-01')), tool('ses')], { tasksOf });
    assert.ok(wf);
    assert.deepStrictEqual(wf.steps.map((s) => s.name), ['Metin + Görsel', 'Ses']);
    assert.deepStrictEqual(wf.steps.map((s) => s.order), [1, 2]);
  });

  it('tek araç kalırsa workflow değildir', () => {
    const one: WorkflowTemplate = { ...tpl, steps: tpl.steps.slice(0, 2) };
    assert.strictEqual(buildWorkflow(one, intent(), 'x', [tool('genel')], { tasksOf }), null);
  });

  it('bir adıma aday yoksa workflow yok (tek araç yoluna düşülür)', () => {
    assert.strictEqual(buildWorkflow(tpl, intent(), 'x', [tool('genel')], { tasksOf }), null);
  });

  it('emekli ya da katalogda olmayan araç seçilmez', () => {
    const retired = { ...tool('gorsel'), deprecated: true };
    const unknown = { ...tool('gorsel'), productId: undefined };
    const wf = buildWorkflow({ ...tpl, steps: tpl.steps.slice(1) }, intent(), 'x', [retired, unknown, tool('ses'), tool('genel')], { tasksOf });
    assert.ok(wf);
    assert.strictEqual(wf.steps[0].primary.tool.productId, 'genel');
    assert.strictEqual(wf.steps[0].alternative, null);
  });

  it('sorguda "ücretsiz" varsa ücretsiz katmanı olan araç öne alınır', () => {
    const paid = { ...tool('gorsel', makePricing('paid', 10, '2026-09-01')), strength: 9.9 };
    const free = { ...tool('genel', makePricing('free')), strength: 8 };
    const steps = { ...tpl, steps: tpl.steps.slice(1) };
    const normal = buildWorkflow(steps, intent(), 'x', [paid, free, tool('ses')], { tasksOf });
    const wantsFree = buildWorkflow(steps, intent({ constraints: { pricing: 'free' } }), 'x', [paid, free, tool('ses')], { tasksOf });
    assert.strictEqual(normal?.steps[0].primary.tool.productId, 'gorsel');
    assert.strictEqual(wantsFree?.steps[0].primary.tool.productId, 'genel');
  });
});

describe('workflow sadece gerçekten gerekince', () => {
  const complexity = async (q: string) => {
    const r = await parseUserIntent(q, { allowLLM: false });
    assert.ok(!('code' in r), `niyet yok: ${q}`);
    return r.complexity;
  };

  it('farklı türde araç isteyen projeler çok adımlı', async () => {
    for (const q of ['podcast başlatmak istiyorum', 'çizgi roman', 'e-kitap yazmak istiyorum', 'müzik albümü yap', 'youtube videosu hazırla']) {
      assert.strictEqual(await complexity(q), 'multi-step', q);
    }
  });

  it('tek araçla yapılan işler ve bir projenin tek parçası tek araç', async () => {
    for (const q of [
      'sunum hazırla', 'blog yazısı', 'müzik yap', 'logo', 'podcast kapağı', 'youtube videosu için altyazı',
      'YouTube kanalım için ses lazım', 'remove background noise and echo from my podcast recording',
      'write ad copy for a Facebook campaign selling running shoes',
    ]) {
      assert.strictEqual(await complexity(q), 'simple', q);
    }
  });

  it('kelime başına bağlı eşleşme', () => {
    assert.ok(hasTerm('Podcastimi başlatıyorum', 'podcast'));
    assert.ok(hasTerm('E-KİTAP yaz', 'e-kitap'));
    assert.ok(!hasTerm('Facebook reklamı', 'ebook'));
  });

  it('recommendV1: proje -> workflow, parçası -> tek araç, uymayan fiyat filtresi -> tek araç yolu', async () => {
    const wf = await recommendV1('podcast başlatmak istiyorum', 'all');
    assert.strictEqual(wf.kind, 'workflow');
    if (wf.kind === 'workflow') assert.ok(wf.workflow.steps.length <= MAX_WORKFLOW_STEPS);

    assert.strictEqual((await recommendV1('podcast kapağı', 'all')).kind, 'simple');
    assert.notStrictEqual((await recommendV1('podcast başlatmak istiyorum', 'paid')).kind, 'workflow');
  });
});
