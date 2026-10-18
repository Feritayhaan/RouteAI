// Sorgu doğrudan bir ürünün ADI mı? ("claude", "ChatGPT", "midjourney", "chat gpt",
// "claude'u", "gamma ai", "claude nedir")  ->  o ürünü bul.
//
// Sorun: ad yazan kullanıcıya şimdiye kadar ya alakasız bir görev sorusu ya da
// sınıflandırıcının uydurduğu bir görev çıkıyordu ("claude" -> hiçbir görev kelimesi
// tutmaz). Ürün adı bir ARAMA niyetidir: o ürünü göstermek gerekir (recommendV3 aranan
// ürünü en üste sabitler, altında aynı görevin diğer araçları durur).
//
// Kasıtlı olarak DAR (önce hassasiyet, lib/intent/domainClarify.ts ile aynı ilke):
//  - Sorgunun TAMAMI ürün adı + dolgu/nedir-türü kelimelerden oluşmalı. "claude ile logo
//    yap", "claude vs chatgpt", "midjourney v7" gibi sorgulara dokunmaz (normal akış sürer).
//  - Yalnızca aktif ürünler. Model adları ("gpt-5", "claude opus 4.5") bu aşamada yok:
//    kapsam ürün adlarıdır (Kerem, 2026-10-16).
//  - Belirsizse (aynı kademede birden çok ürün) hiçbir şey dönmez.
//
// Eşleşme kademeleri (en iyi kademe kazanır, eşitlikte tek ürün şartı):
//  0: tam ad ("ChatGPT (görsel)" yazan kullanıcı ona gider; "chatgpt" yazan ChatGPT'ye)
//  1: parantezsiz ad ("DALL-E", "Windsurf") ve sondaki "AI"siz hâli ("Gamma AI" -> "gamma")
//  2: adın ilk kelimesi ("replit" -> Replit Agent); ≥4 harf, katalogda tek ve şirket adı değil
// Boşluk ve noktalama önemsiz: "chat gpt" = "chatgpt", "eleven labs" = "elevenlabs".

import { tokenizeTr } from '../text';
import type { Product } from '../catalog/schema';
import { isFillerToken } from './domainClarify';

/** Ad dışında kalabilecek, ürünü değiştirmeyen kelimeler (normalize: diakritiksiz, küçük harf). */
const NAME_NOISE = new Set([
  // tr
  'nedir', 'hakkinda', 'bilgi', 'kimdir', 'nasil', 'calisir', 'ozellikleri', 'fiyat', 'fiyati',
  // en
  'what', 'is', 'about', 'info', 'information', 'price', 'pricing',
]);

/** Tek başına ürün anlamına gelmeyen şirket/marka kelimeleri: "google" Gemini mi Veo mu? Bilinmez. */
const GENERIC_FIRST_TOKENS = new Set(['google', 'microsoft', 'github', 'adobe', 'openai', 'anthropic', 'meta', 'world', 'black']);

/** Bir sorgu bundan uzunsa ad aramasından çok cümledir; denenmez. */
const MAX_QUERY_TOKENS = 6;

const MIN_FIRST_TOKEN_CHARS = 4;

const isNoise = (token: string) => NAME_NOISE.has(token) || isFillerToken(token);

type Tier = 0 | 1 | 2;

function formsOf(product: Product): { form: string; tier: Tier }[] {
  const full = tokenizeTr(product.name);
  const base = tokenizeTr(product.name.replace(/\([^)]*\)/g, ' '));
  const forms: { form: string; tier: Tier }[] = [];
  if (full.length > 0) forms.push({ form: full.join(''), tier: 0 });
  if (base.length > 0) forms.push({ form: base.join(''), tier: 1 });
  // "Gamma AI" -> "gamma", "Copy.ai" -> "copy"
  if (base.length > 1 && base[base.length - 1] === 'ai') forms.push({ form: base.slice(0, -1).join(''), tier: 1 });
  const first = base[0];
  if (first && first.length >= MIN_FIRST_TOKEN_CHARS && !GENERIC_FIRST_TOKENS.has(first) && base.length > 1) {
    forms.push({ form: first, tier: 2 });
  }
  return forms;
}

/** Sorgunun bir ardışık parçası `form`a eşitse ve geri kalan kelimelerin hepsi dolgu/nedir-türü ise true. */
function queryIsForm(tokens: string[], form: string): boolean {
  for (let i = 0; i < tokens.length; i++) {
    let compact = '';
    for (let j = i; j < tokens.length; j++) {
      compact += tokens[j];
      if (compact.length > form.length) break;
      if (compact === form) {
        const rest = [...tokens.slice(0, i), ...tokens.slice(j + 1)];
        if (rest.every(isNoise)) return true;
      }
    }
  }
  return false;
}

/**
 * Sorgu tam olarak bir (aktif) ürünün adıysa o ürün; aksi halde null.
 * `products`: aranacak ürünler (çağıran aktif olanları verir).
 */
export function matchProductByName(query: string, products: Product[]): Product | null {
  // "Claude'u", "ChatGPT'nin": kesme işaretinden sonraki Türkçe ek atılır.
  const tokens = tokenizeTr(query.replace(/['’`´]\p{L}+/gu, ''));
  if (tokens.length === 0 || tokens.length > MAX_QUERY_TOKENS) return null;

  const hits: { product: Product; tier: Tier }[] = [];
  for (const product of products) {
    if (product.status !== 'active') continue;
    const tier = formsOf(product)
      .filter((f) => f.form.length > 0 && queryIsForm(tokens, f.form))
      .reduce<Tier | null>((best, f) => (best === null || f.tier < best ? f.tier : best), null);
    if (tier !== null) hits.push({ product, tier });
  }
  if (hits.length === 0) return null;

  const best = Math.min(...hits.map((h) => h.tier));
  const top = hits.filter((h) => h.tier === best);
  return top.length === 1 ? top[0].product : null;
}
