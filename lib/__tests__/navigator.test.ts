import assert from 'node:assert';
import { describe, it } from 'node:test';
import toolsDatabase from '../tools-database.json';
import productsJson from '../../data/products.json';
import guidesJson from '../../data/prompt-guides.json';
import promptProductsJson from '../../data/prompt-products.json';
import { AUTO_TOOL, promptProductId, resolvePromptTarget } from '../promptBuilder/products';
import { promptStartSchema } from '../validations/prompt';
import { withCatalog } from '../catalog/navigator';
import tasksJson from '../../data/tasks.json';
import { resolveGuideId } from '../promptBuilder/fallback';

type Tool = { id?: string; name: string };
type Product = { id: string; name: string; status: string; promptGuide?: string; tasks: string[] };

const tools = (Array.isArray(toolsDatabase) ? toolsDatabase : (toolsDatabase as { tools: Tool[] }).tools) as Tool[];
const products = productsJson as Product[];
const guideIds = new Set((guidesJson as { id: string }[]).map((g) => g.id));
const tasksById = new Map((tasksJson as { id: string; modality: 'text' }[]).map((t) => [t.id, t]));

describe('ana sayfa prompt oluşturucu: araç adı -> ürün', () => {
  it('haritadaki her ürün aktif ve özel ya da genel rehberi var', () => {
    for (const [name, id] of Object.entries(promptProductsJson as Record<string, string>)) {
      const p = products.find((x) => x.id === id);
      assert.ok(p, `${id} katalogda yok`);
      assert.equal(p.name, name);
      assert.equal(p.status, 'active');
      const guideId = resolveGuideId(p, tasksById)?.guideId;
      assert.ok(guideId && guideIds.has(guideId), `${id} rehbersiz`);
    }
  });

  it('görevi olan her aktif ürün haritada (rehberi yoksa genel rehberle)', () => {
    for (const p of products.filter((x) => x.status === 'active' && x.tasks.length > 0)) {
      assert.equal(promptProductId(p.name), p.id, `${p.id} prompt kutusunda yok`);
    }
  });

  it('rehberi olan her aktif ürün haritada; ana sayfa aynı adı gösteriyor (id ile v1 aracına bağlı)', () => {
    const v1Ids = new Set(tools.map((t) => (t as { id?: string }).id));
    const shown = new Map(withCatalog(tools as unknown as Parameters<typeof withCatalog>[0]).map((t) => [t.id, t.name]));
    for (const p of products.filter((x) => x.status === 'active' && x.promptGuide)) {
      assert.equal(promptProductId(p.name), p.id);
      assert.ok(v1Ids.has(p.id), `${p.id} v1 veritabanında yok; ana sayfada önerilmez`);
      assert.equal(shown.get(p.id), p.name, `${p.id}: ana sayfadaki ad katalogdakiyle aynı olmalı`);
    }
  });

  it('görevi olmayan ya da katalogda olmayan araç ve prototip anahtarları null', () => {
    assert.equal(promptProductId('ClickUp Brain (Project AI)'), null);
    assert.equal(promptProductId('Olmayan Araç'), null);
    assert.equal(promptProductId('toString'), null);
    assert.equal(promptProductId('__proto__'), null);
  });
});

describe('/api/prompt/start doğrulaması', () => {
  it('geçerli istek; locale varsayılanı tr', () => {
    const r = promptStartSchema.safeParse({ productId: 'midjourney-v7', goal: 'fırınım için logo' });
    assert.ok(r.success);
    assert.equal(r.success && r.data.locale, 'tr');
  });

  it('boş amaç, geçersiz ürün id ve bilinmeyen dil reddedilir', () => {
    assert.equal(promptStartSchema.safeParse({ productId: 'midjourney-v7', goal: ' ' }).success, false);
    assert.equal(promptStartSchema.safeParse({ productId: '../etc', goal: 'logo' }).success, false);
    assert.equal(promptStartSchema.safeParse({ productId: 'midjourney-v7', goal: 'logo', locale: 'de' }).success, false);
    assert.equal(promptStartSchema.safeParse({ productId: 'midjourney-v7', goal: 'x'.repeat(1001) }).success, false);
  });
});

describe('prompt aracı seçimi (kart ve prompt kutusundaki düğmeler)', () => {
  it('belirli araç seçilince sonuçtan bağımsız o araç', () => {
    assert.deepEqual(resolvePromptTarget('Midjourney', []), { productId: 'midjourney-v7', toolName: 'Midjourney' });
    assert.deepEqual(resolvePromptTarget('Midjourney', ['Suno AI']), { productId: 'midjourney-v7', toolName: 'Midjourney' });
    assert.deepEqual(resolvePromptTarget('Jasper AI', []), { productId: 'jasper-ai', toolName: 'Jasper AI' }, 'genel rehberle');
    assert.equal(resolvePromptTarget('Olmayan Araç', []), null);
  });

  it("varsayılan (auto): rehberi olan ilk önerilen araç; yoksa ilk araç eksik olarak", () => {
    assert.deepEqual(resolvePromptTarget(AUTO_TOOL, ['Jasper AI', 'Suno AI']), { productId: 'jasper-ai', toolName: 'Jasper AI' });
    assert.deepEqual(resolvePromptTarget(AUTO_TOOL, ['Olmayan Araç', 'Suno AI']), { productId: 'suno-ai', toolName: 'Suno AI' });
    assert.deepEqual(resolvePromptTarget(AUTO_TOOL, ['ClickUp Brain (Project AI)', 'Olmayan Araç']), { missing: 'ClickUp Brain (Project AI)' });
    assert.equal(resolvePromptTarget(AUTO_TOOL, []), null);
  });
});
