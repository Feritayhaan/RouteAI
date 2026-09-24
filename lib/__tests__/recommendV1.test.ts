import assert from 'node:assert';
import { describe, it } from 'node:test';

// Bu testler canlı servislere dokunmaz. KV ve OpenAI değişkenleri modüller
// yüklenmeden silinir: katalog lib/tools-database.json'dan okunur (getTools'un
// 3. kademesi), vektör araması kapalıdır (anahtar kelime yolu), LLM çağrılmaz.
for (const key of Object.keys(process.env)) {
  if (/^(KV_|UPSTASH_|OPENAI_)/.test(key) || key === 'VECTOR_SEARCH_ENABLED') delete process.env[key];
}

const { detectCategory } = await import('../keywords');
const { extractConstraints, parseUserIntent } = await import('../intent/parser');
const { analyzeIntent } = await import('../intent/index');
const { searchTools, searchTerms, wordsMatch } = await import('../vectorService');
const { getTools } = await import('../toolsService');
const { categoryOutputMap, selectV1Tools } = await import('../recommendV1');

/** route.ts'in simple dalı: niyet + anahtar kelime araması + aday seçimi. */
async function mainRecommendation(query: string) {
  const intent = await analyzeIntent(query);
  if ('code' in intent) throw new Error(`niyet çıkarılamadı (${intent.code}): ${query}`);
  assert.strictEqual(intent.complexity, 'simple', `workflow dalına düştü: ${query}`);

  const searchResults = await searchTools(query, 8);
  const selection = selectV1Tools({ intent, searchResults, allTools: await getTools(), pricingFilter: 'all' });
  if (!selection) throw new Error(`öneri çıkmadı: ${query}`);
  return selection;
}

describe('v1 yedek yolu: ana öneri', () => {
  it('"sunum hazırla" -> Gamma AI ilk sırada', async () => {
    const { main } = await mainRecommendation('sunum hazırla');
    assert.strictEqual(main.name, 'Gamma AI');
  });

  it('"freelancer olarak fatura şablonu" -> kategori video değil, fiyat kısıtı free değil', () => {
    const query = 'freelancer olarak fatura şablonu';
    assert.notStrictEqual(detectCategory(query), 'video');
    assert.notStrictEqual(extractConstraints(query).pricing, 'free');
  });

  it('"Instagram için reels videosu" -> ana önerinin kategorisi video', async () => {
    const { main } = await mainRecommendation('Instagram için reels videosu');
    assert.strictEqual(main.category, 'video');
  });

  it('"python kodumda hata var" -> ana önerinin kategorisi kod', async () => {
    const { main } = await mainRecommendation('python kodumda hata var');
    assert.strictEqual(main.category, 'kod');
  });
});

describe('altyazı sorguları', () => {
  it('LLM çağrılmadan (Kademe 1) video kategorisine düşer', async () => {
    // LLM yolu gerçekten denenebilsin diye sahte bir anahtar verilir ve tüm ağ
    // çağrıları yakalanır: Kademe 1 tutmazsa parser OpenAI'a istek atar ve
    // `calls` boş kalmaz.
    const originalFetch = globalThis.fetch;
    const calls: string[] = [];
    globalThis.fetch = (async (input: string | URL | Request) => {
      calls.push(input instanceof Request ? input.url : String(input));
      return new Response('{}', { status: 400 });
    }) as typeof fetch;
    process.env.OPENAI_API_KEY = 'sk-test-kullanilmamali';

    try {
      const categories: Record<string, string> = {};
      for (const query of ['YouTube altyazı çevirme', 'youtube videosu için altyazı']) {
        const intent = await parseUserIntent(query);
        categories[query] = 'code' in intent ? intent.code : intent.primaryCategory;
      }
      assert.deepStrictEqual(calls, [], 'OpenAI çağrısı yapılmamalı');
      assert.deepStrictEqual(categories, {
        'YouTube altyazı çevirme': 'video',
        'youtube videosu için altyazı': 'video',
      });
    } finally {
      globalThis.fetch = originalFetch;
      delete process.env.OPENAI_API_KEY;
    }
  });
});

describe('categoryOutputMap', () => {
  it('metin kategorisi document çıktısını kabul eder (sunum araçları)', () => {
    assert.ok(categoryOutputMap.metin.includes('document'));
  });
});

describe('detectCategory kelime sınırı', () => {
  it('kelime içinden eşleşmez', () => {
    assert.strictEqual(detectCategory('freelancer'), null); // "reel"
    assert.strictEqual(detectCategory('startup'), null); // "art"
    assert.strictEqual(detectCategory('startup için pitch deck'), 'metin');
  });

  it('kelime sonundaki ekleri tolere eder', () => {
    assert.strictEqual(detectCategory('videosu'), 'video');
    assert.strictEqual(detectCategory('instagram reels'), 'video');
    assert.strictEqual(detectCategory('kodumda'), 'kod');
    assert.strictEqual(detectCategory('sunumu'), 'metin');
  });

  it('"art" sadece tam kelime olarak eşleşir', () => {
    assert.strictEqual(detectCategory('digital art'), 'gorsel');
    assert.strictEqual(detectCategory('artificial intelligence'), null);
    assert.strictEqual(detectCategory('satış artışı'), null);
  });

  it('çok kelimeli anahtarı sıralı ve komşu kelime dizisi olarak arar', () => {
    assert.strictEqual(detectCategory('tasarım yap'), 'gorsel');
    assert.strictEqual(detectCategory('yap tasarım'), null);
    assert.strictEqual(detectCategory('tasarım da yap'), null);
  });
});

describe('extractConstraints fiyat kısıtı', () => {
  it('"free" ve "pro" kelime sınırlı', () => {
    assert.strictEqual(extractConstraints('freelancer logo').pricing, 'freemium');
    assert.strictEqual(extractConstraints('free logo maker').pricing, 'free');
    assert.strictEqual(extractConstraints('ücretsiz logo').pricing, 'free');
    assert.strictEqual(extractConstraints('pro plan').pricing, 'paid');
    assert.strictEqual(extractConstraints('prompt yaz').pricing, 'freemium');
  });
});

describe('anahtar kelime araması', () => {
  it('dolgu kelimelerini ve 2 harften kısa kelimeleri atar', () => {
    assert.deepStrictEqual(searchTerms('Instagram için reels videosu'), ['instagram', 'reels', 'videosu']);
    assert.deepStrictEqual(searchTerms('I want a logo for my cafe'), ['logo', 'cafe']);
    assert.deepStrictEqual(searchTerms('python kodumda hata var'), ['python', 'kodumda', 'hata']);
  });

  it('önek kuralı: araç kelimesi (≥3) sorgu kelimesinin, sorgu kelimesi (≥4) araç kelimesinin öneki', () => {
    assert.ok(wordsMatch('videosu', 'video'));
    assert.ok(wordsMatch('kodumda', 'kod'));
    assert.ok(wordsMatch('sunu', 'sunum'));
    assert.ok(!wordsMatch('var', 'variations'));
    assert.ok(!wordsMatch('kod', 'kodlama'));
    assert.ok(!wordsMatch('reel', 'freelancer'));
  });

  it('sadece dolgu kelimesinden oluşan sorgu hiçbir aracı eşleştirmez', async () => {
    assert.deepStrictEqual(await searchTools('için ve bir bu', 8), []);
  });
});
