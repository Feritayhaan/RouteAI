// Sorgu doğrudan bir ürünün adıysa onu bul (lib/intent/productName.ts) — kapsam: ÜRÜN adları.
// Gerçek katalog kullanılır. "Eşleşmemeli" listesi hassasiyetin (yanlış ürün göstermeme) bekçisidir.
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { matchProductByName } from '../intent/productName';
import { defaultSearchContext } from '../catalog/search';
import { parseGolden } from '../../evals/metrics.mjs';
import { product } from './catalogFixtures';

const { products } = defaultSearchContext();
const idOf = (q: string) => matchProductByName(q, products)?.id ?? null;

describe('ürün adı: eşleşmeli', () => {
  const cases: [string, string][] = [
    // tam ad, büyük/küçük harf, boşluk ve noktalama
    ['claude', 'claude-ai-claude-4'], ['CLAUDE', 'claude-ai-claude-4'], ['  Claude  ', 'claude-ai-claude-4'],
    ['chatgpt', 'chatgpt-gpt-5'], ['ChatGPT', 'chatgpt-gpt-5'], ['chat gpt', 'chatgpt-gpt-5'],
    ['midjourney', 'midjourney-v7'], ['cursor', 'cursor'], ['grok', 'grok-41'], ['gemini', 'gemini-25-pro'],
    ['eleven labs', 'elevenlabs'], ['stable diffusion', 'stable-diffusion-xl'], ['dall-e', 'dall-e-3'], ['dalle', 'dall-e-3'],
    ['copy.ai', 'copyai'], ['beautiful.ai', 'beautifulai'], ['github copilot', 'github-copilot'],
    // parantezli adın iki ürününden doğrusu
    ['chatgpt görsel', 'chatgpt-gpt-4o-image'], ['gemini görsel', 'gemini-3-pro-image'], ['claude code', 'claude-code-anthropic'],
    ['grok imagine', 'grok-imagine-v09-xai'],
    // sondaki "AI" olmadan
    ['gamma', 'gamma-ai'], ['gamma ai', 'gamma-ai'], ['kling', 'kling-ai-21'], ['suno', 'suno-ai'], ['canva', 'canva-ai-magic-studio'],
    // adın ilk kelimesi (katalogda tek)
    ['replit', 'replit-agent'], ['pika', 'pika-labs'], ['luma', 'luma-dream-machine-ray2'],
    // Türkçe ek, dolgu ve "nedir"
    ["Claude'u", 'claude-ai-claude-4'], ["ChatGPT'nin", 'chatgpt-gpt-5'], ['claude nedir', 'claude-ai-claude-4'],
    ['what is chatgpt', 'chatgpt-gpt-5'], ['midjourney hakkında bilgi', 'midjourney-v7'], ['claude lazım', 'claude-ai-claude-4'],
    ['I need claude', 'claude-ai-claude-4'], ['chatgpt fiyatı', 'chatgpt-gpt-5'],
  ];
  for (const [query, id] of cases) {
    it(`"${query}" -> ${id}`, () => assert.strictEqual(idOf(query), id));
  }

  it('her aktif ürünün kendi adı kendisine eşleşir (yeni ürün eklenince ad çakışması burada görünür)', () => {
    const misses = products
      .filter((p) => p.status === 'active')
      .filter((p) => matchProductByName(p.name, products)?.id !== p.id)
      .map((p) => p.name);
    assert.deepStrictEqual(misses, []);
  });
});

describe('ürün adı: eşleşmemeli (hassasiyet)', () => {
  it('adın yanında başka bir istek ya da kelime varsa dokunmaz', () => {
    for (const q of [
      'claude ile logo yap', 'claude vs chatgpt', 'chatgpt alternatifi', 'chatgpt ile logo', 'midjourney v7', 'cursor ile kod yaz',
      'claude code ile hata ayıkla', 'ücretsiz claude indir', 'best gemini prompt', 'runway video',
    ]) assert.strictEqual(idOf(q), null, q);
  });

  it('model adları bu aşamada kapsam dışı (ürün adı değil)', () => {
    for (const q of ['gpt-5', 'gpt 5', 'claude opus 4.5', 'gemini 2.5 pro', 'llama', 'llama 3', 'grok 4', 'sdxl', 'flux 1.1 pro']) {
      assert.strictEqual(idOf(q), null, q);
    }
  });

  it('şirket adı, ortak sözcük ve belirsiz kısaltma tek başına ürün sayılmaz', () => {
    for (const q of ['google', 'microsoft', 'github', 'openai', 'anthropic', 'adobe', 'copilot', 'video', 'logo', 'görsel', 'kod', 'ai', 'mistral']) {
      assert.strictEqual(idOf(q), null, q);
    }
  });

  it('uzun cümle, boş sorgu ve alan sorguları', () => {
    for (const q of ['', '   ', '???', 'claude gemini chatgpt grok cursor midjourney runway', 'kodla ilgili yardım almak istiyorum', 'görsel lazım']) {
      assert.strictEqual(idOf(q), null, JSON.stringify(q));
    }
  });

  it('kapanmış (retired) ve aday (candidate) ürünler eşleşmez', () => {
    const retired = { ...product('sora-2-openai', { tasks: ['video.text-to-video'] }), name: 'Sora (OpenAI)', status: 'retired' as const };
    const candidate = { ...product('yeni-arac', { tasks: ['image.logo'] }), name: 'Yeni Araç', status: 'candidate' as const };
    assert.strictEqual(matchProductByName('sora', [retired]), null);
    assert.strictEqual(matchProductByName('yeni araç', [candidate]), null);
    assert.strictEqual(idOf('sora'), null, 'gerçek katalogda Sora kapalı');
  });

  it('aynı kademede birden çok ürün varsa tahmin etmez', () => {
    const a = { ...product('a'), name: 'Foo Studio' };
    const b = { ...product('b'), name: 'Foo Labs' };
    assert.strictEqual(matchProductByName('foo', [a, b]), null, 'ilk kelime iki üründe de var');
    assert.strictEqual(matchProductByName('foo studio', [a, b])?.id, 'a', 'tam ad ise ayırır');
    const dup1 = { ...product('c'), name: 'Zeta' };
    const dup2 = { ...product('d'), name: 'Zeta (Pro)' };
    assert.strictEqual(matchProductByName('zeta', [dup1, dup2])?.id, 'c', 'tam ad (kademe 0) parantezli ada (kademe 1) üstündür');
  });
});

describe('ürün adı: altın set', () => {
  it('altın setteki hiçbir sorgu ürün adı sayılmaz (mevcut akış bozulmaz)', () => {
    const golden = parseGolden(readFileSync(new URL('../../evals/golden.jsonl', import.meta.url), 'utf8'));
    const hits = golden.filter((r) => idOf(r.query) !== null).map((r) => r.query);
    assert.deepStrictEqual(hits, []);
  });
});
