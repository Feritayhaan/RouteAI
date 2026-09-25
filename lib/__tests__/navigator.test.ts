import assert from 'node:assert';
import { describe, it } from 'node:test';
import toolsDatabase from '../tools-database.json';
import productsJson from '../../data/products.json';
import guidesJson from '../../data/prompt-guides.json';
import promptProductsJson from '../../data/prompt-products.json';
import { promptProductId } from '../promptBuilder/products';
import { promptStartSchema } from '../validations/prompt';

type Tool = { name: string };
type Product = { id: string; name: string; status: string; promptGuide?: string };

const tools = (Array.isArray(toolsDatabase) ? toolsDatabase : (toolsDatabase as { tools: Tool[] }).tools) as Tool[];
const products = productsJson as Product[];
const guideIds = new Set((guidesJson as { id: string }[]).map((g) => g.id));

describe('navigasyon prompt kutusu: araç adı -> ürün', () => {
  it('haritadaki her ürün aktif ve rehberi var', () => {
    for (const [name, id] of Object.entries(promptProductsJson as Record<string, string>)) {
      const p = products.find((x) => x.id === id);
      assert.ok(p, `${id} katalogda yok`);
      assert.equal(p.name, name);
      assert.equal(p.status, 'active');
      assert.ok(p.promptGuide && guideIds.has(p.promptGuide), `${id} rehbersiz`);
    }
  });

  it('rehberi olan her aktif ürün haritada ve v1 araç adıyla eşleşiyor (kutu görünür)', () => {
    const v1Names = new Set(tools.map((t) => t.name));
    for (const p of products.filter((x) => x.status === 'active' && x.promptGuide)) {
      assert.equal(promptProductId(p.name), p.id);
      assert.ok(v1Names.has(p.name), `${p.name} v1 veritabanında yok; navigasyonda kutu çıkmaz`);
    }
  });

  it('rehberi olmayan araç ve prototip anahtarları null', () => {
    assert.equal(promptProductId('Jasper AI'), null);
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
