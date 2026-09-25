// Navigasyon arayüzünün prompt kutusu: araç adı -> ürün id. Harita
// scripts/build-guides.mjs tarafından üretilir (sadece rehberi olan aktif ürünler).

import promptProducts from '../../data/prompt-products.json';

const MAP: Record<string, string> = promptProducts;

/** Aracın rehberi varsa katalogdaki ürün id'si, yoksa null (kutu gösterilmez). */
export function promptProductId(toolName: string): string | null {
  return Object.prototype.hasOwnProperty.call(MAP, toolName) ? MAP[toolName] : null;
}
