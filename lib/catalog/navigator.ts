// Ana sayfanın (navigasyon, v1 öneri motoru) araç listesine katalog uygulanır.
// Araç listesi (lib/tools-database.json ya da canlıdaki KV kopyası) öneri için
// kategori/güç/anahtar kelime bilgisini taşır; kullanıcıya görünen ad, link,
// fiyat ve aktif/emekli durumu ise TEK kaynaktan, data/products.json'dan gelir.
// Böylece merge edilen fiyat ve ad değişiklikleri KV'yi yeniden doldurmadan
// bir sonraki yayında sitede görünür. Güncel model data/models.json'dan hesaplanır.

import productsJson from '../../data/products.json';
import modelsJson from '../../data/models.json';
import type { Model, Product } from './schema';
import type { ToolPricing } from '../pricing';
import { resolveCurrentModel, type CurrentModel } from './currentModel';

export interface CatalogTool {
  id?: string;
  name: string;
  url: string;
  pricing: ToolPricing;
  deprecated?: boolean;
  productId?: string;
  currentModel?: CurrentModel | null;
}

const PRODUCTS = new Map((productsJson as Product[]).map((p) => [p.id, p]));
const MODELS = modelsJson as Model[];
const CURRENT = new Map<string, CurrentModel | null>();

function currentModelOf(product: Product, models: Model[]): CurrentModel | null {
  if (models !== MODELS) return resolveCurrentModel(product, models);
  if (!CURRENT.has(product.id)) CURRENT.set(product.id, resolveCurrentModel(product, MODELS));
  return CURRENT.get(product.id)!;
}

/**
 * Katalogda karşılığı olan araç: ad/url/fiyat katalogdan, retired ve candidate
 * -> deprecated (önerilmez). Katalogda olmayan araç olduğu gibi kalır.
 */
export function withCatalog<T extends CatalogTool>(
  tools: T[],
  catalog: { products?: Map<string, Product>; models?: Model[] } = {}
): T[] {
  const products = catalog.products ?? PRODUCTS;
  const models = catalog.models ?? MODELS;
  return tools.map((tool) => {
    const product = tool.id ? products.get(tool.id) : undefined;
    if (!product) return tool;
    return {
      ...tool,
      name: product.name,
      url: product.url,
      pricing: product.pricing,
      deprecated: tool.deprecated || product.status !== 'active',
      productId: product.id,
      currentModel: currentModelOf(product, models),
    };
  });
}
