import assert from 'node:assert';
import { describe, it } from 'node:test';
import { resolveCurrentModel } from '../catalog/currentModel';
import { withCatalog, type CatalogTool } from '../catalog/navigator';
import type { Model, Product } from '../catalog/schema';
import { makePricing } from '../pricing';

// Sahte modeller (gerçek veri değil): sadece seçim kuralını sınar.
const score = (fetchedAt: string, rank?: number) => ({ source: 'artificialanalysis' as const, key: 'aa-index', value: 50, rank, fetchedAt });
const model = (id: string, over: Partial<Model> = {}): Model => ({
  id, name: id, creator: 'OpenAI', aliases: [], modalities: ['text'], scores: [score('2026-09-20')], ...over,
});

const MODELS: Model[] = [
  model('gpt-a', { releaseDate: '2026-01-10' }),
  model('gpt-b', { releaseDate: '2026-06-01' }),
  model('gpt-b-mini', { releaseDate: '2026-07-01' }),
  model('gpt-image-x', { modalities: ['image'], releaseDate: '2026-08-01' }),
  model('gpt-noscore', { releaseDate: '2026-09-01', scores: [] }),
  model('gemini-x', { creator: 'Google DeepMind', releaseDate: '2026-05-01' }),
  model('claude-p', { creator: 'Anthropic', scores: [score('2026-09-21', 3)] }),
  model('claude-q', { creator: 'Anthropic', scores: [score('2026-09-21', 1)] }),
];

describe('güncel model: sürüm elle yazılmaz, kuraldan seçilir', () => {
  it('kurala uyan en yeni model; exclude ve tür süzülür, skoru olmayan sayılmaz', () => {
    const cm = resolveCurrentModel({ models: [], modelRule: { creator: 'openai', include: ['gpt'], exclude: ['mini'], modality: 'text' } }, MODELS);
    assert.equal(cm?.id, 'gpt-b');
    assert.equal(cm?.source, 'artificialanalysis');
    assert.equal(cm?.fetchedAt, '2026-09-20');
    assert.equal(cm?.releaseDate, '2026-06-01');
  });

  it('yeni model gelince kendiliğinden o seçilir', () => {
    const next = [...MODELS, model('gpt-c', { releaseDate: '2026-09-15' })];
    assert.equal(resolveCurrentModel({ models: [], modelRule: { creator: 'OpenAI', include: ['gpt'], exclude: ['mini'], modality: 'text' } }, next)?.id, 'gpt-c');
  });

  it('üretici adı toleranslı ("Google" ~ "Google DeepMind"); tür filtresi görseli ayırır', () => {
    assert.equal(resolveCurrentModel({ models: [], modelRule: { creator: 'Google', include: ['gemini'] } }, MODELS)?.id, 'gemini-x');
    assert.equal(resolveCurrentModel({ models: [], modelRule: { creator: 'OpenAI', include: ['gpt'], modality: 'image' } }, MODELS)?.id, 'gpt-image-x');
  });

  it('çıkış tarihi yoksa en iyi sıralı model', () => {
    assert.equal(resolveCurrentModel({ models: [], modelRule: { creator: 'Anthropic', include: ['claude'] } }, MODELS)?.id, 'claude-q');
  });

  it('elle bağlanmış models listesi kuraldan önce gelir; eşleşme yoksa null', () => {
    assert.equal(resolveCurrentModel({ models: ['gpt-a'], modelRule: { include: ['gpt'] } }, MODELS)?.id, 'gpt-a');
    assert.equal(resolveCurrentModel({ models: [], modelRule: { include: ['yok-boyle-model'] } }, MODELS), null);
    assert.equal(resolveCurrentModel({ models: [] }, MODELS), null);
    assert.equal(resolveCurrentModel({ models: [], modelRule: { include: ['gpt'] } }, []), null);
  });
});

describe('ana sayfa araçlarına katalog uygulanır', () => {
  const product = (over: Partial<Product>): Product => ({
    id: 'tool-a', name: 'Araç A', url: 'https://example.com/a', description: { en: '', tr: '' }, tasks: [], models: [],
    pricing: makePricing('freemium', 9, '2026-09-01'), access: [], status: 'active', reviewStatus: 'reviewed', addedAt: '2026-09-01', ...over,
  });
  const products = new Map([
    ['tool-a', product({ modelRule: { creator: 'OpenAI', include: ['gpt'], exclude: ['mini'], modality: 'text' } })],
    ['tool-r', product({ id: 'tool-r', name: 'Emekli', status: 'retired' })],
  ]);
  const tools: CatalogTool[] = [
    { id: 'tool-a', name: 'Eski Ad v1', url: 'https://old.example.com', pricing: makePricing('paid', 30, '2025-01-01') },
    { id: 'tool-r', name: 'Emekli Araç 2.0', url: 'https://r.example.com', pricing: makePricing('free') },
    { id: 'katalogda-yok', name: 'Bilinmeyen', url: 'https://x.example.com', pricing: makePricing('free') },
  ];

  it('ad, link ve fiyat katalogdan; güncel model eklenir', () => {
    const [a] = withCatalog(tools, { products, models: MODELS });
    assert.equal(a.name, 'Araç A');
    assert.equal(a.url, 'https://example.com/a');
    assert.equal(a.pricing.priceCheckedAt, '2026-09-01');
    assert.equal(a.productId, 'tool-a');
    assert.equal(a.currentModel?.id, 'gpt-b');
    assert.equal(a.deprecated, false);
  });

  it('emekli ürün önerilmez (deprecated); katalogda olmayan araç değişmez', () => {
    const [, r, x] = withCatalog(tools, { products, models: MODELS });
    assert.equal(r.deprecated, true);
    assert.deepEqual(x, tools[2]);
  });
});
