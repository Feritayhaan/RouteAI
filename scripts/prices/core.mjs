// Fiyat kontrolü — saf mantık (sayfa çekme ve LLM dışarıdan verilir).
// Kaynak: ürünün pricingUrl sayfası. LLM sadece sayfadaki metinden çıkarır ve
// kanıt cümlesini döndürür; emin değilse 'unknown'. İnsan PR'da onaylar.

export function htmlToText(html) {
  return String(html ?? '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 12000);
}

export async function extractPrice({ text, productName, llm }) {
  const { data, tokens } = await llm({
    name: 'price_extraction',
    system: 'Extract the pricing of the named product from its pricing page text. Use ONLY the given text. model: "free" (no paid plan), "freemium" (free plan + paid plans), "paid" (no free plan) or "unknown". startingPrice: the cheapest paid plan per month in the page currency, or null. evidence: a short exact quote from the text supporting it. If unsure, use "unknown" and null.',
    user: JSON.stringify({ productName, pageText: text }),
    maxTokens: 300,
    temperature: 0,
    schema: {
      type: 'object',
      properties: {
        model: { type: 'string', enum: ['free', 'freemium', 'paid', 'unknown'] },
        startingPrice: { type: ['number', 'null'] },
        currency: { type: ['string', 'null'] },
        evidence: { type: 'string' },
      },
      required: ['model', 'startingPrice', 'currency', 'evidence'],
      additionalProperties: false,
    },
  });
  return { ...data, tokens };
}

/**
 * Bir ürünün kontrol sonucu:
 *  - 'no_url': pricingUrl yok
 *  - 'error': sayfa ya da çıkarım hatası
 *  - 'unknown': sayfadan emin olunamadı / USD değil -> dokunulmaz
 *  - 'same': değişmedi -> priceCheckedAt tazelenir (PR merge edilince geçerli)
 *  - 'changed': fark var -> yeni fiyat önerilir
 */
export function comparePrice(product, extracted) {
  if (!extracted || extracted.model === 'unknown') return { status: 'unknown' };
  if (extracted.startingPrice !== null && extracted.currency && extracted.currency.toUpperCase() !== 'USD') {
    return { status: 'unknown', note: `para birimi ${extracted.currency}` };
  }
  const price = extracted.model === 'free' ? 0 : extracted.startingPrice;
  const same = product.pricing.model === extracted.model && (product.pricing.startingPrice ?? null) === (price ?? null);
  return { status: same ? 'same' : 'changed', model: extracted.model, startingPrice: price ?? null };
}
