// Ana sayfadaki prompt oluşturucu: araç adı -> ürün id. Harita
// scripts/build-guides.mjs tarafından üretilir (sadece rehberi olan aktif ürünler).

import promptProducts from '../../data/prompt-products.json';

const MAP: Record<string, string> = promptProducts;

/** Aracın rehberi varsa katalogdaki ürün id'si, yoksa null. */
export function promptProductId(toolName: string): string | null {
  return Object.prototype.hasOwnProperty.call(MAP, toolName) ? MAP[toolName] : null;
}

/** Prompt aracı listesi (rehberi olan araçlar, alfabetik). */
export function promptToolNames(): string[] {
  return Object.keys(MAP).sort((a, b) => a.localeCompare(b, 'tr'));
}

export const AUTO_TOOL = 'auto';

export type PromptTarget = { productId: string; toolName: string } | { missing: string };

/**
 * Hangi araç için prompt yazılacak?
 *  - choice bir araç adıysa: o araç (rehberi yoksa null).
 *  - choice 'auto' ise: önerilen araçlar sırasıyla denenir, rehberi olan ilk
 *    araç seçilir; hiçbirinin rehberi yoksa ilk araç { missing } olarak döner.
 *  - önerilen araç yoksa (henüz sonuç yok): null.
 */
export function resolvePromptTarget(choice: string, recommended: string[]): PromptTarget | null {
  if (choice !== AUTO_TOOL) {
    const productId = promptProductId(choice);
    return productId ? { productId, toolName: choice } : null;
  }
  for (const toolName of recommended) {
    const productId = promptProductId(toolName);
    if (productId) return { productId, toolName };
  }
  return recommended.length > 0 ? { missing: recommended[0] } : null;
}
