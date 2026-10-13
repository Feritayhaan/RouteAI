// Hedef AI yeterlilik rubriği (lib/promptBuilder/sufficiency.ts) + onarım turu.
// Her rehber için: iyi bir prompt dört kriterden de geçer; eksik bağlamlı ya da
// yanlış sentakslı prompt doğru kriterlerde yakalanır ve validateWithRepair onu
// tek onarım turunda düzeltir.

import assert from 'node:assert';
import { describe, it } from 'node:test';
import { loadGuides } from '../promptBuilder/guides';
import { allIssues, CRITERIA, goalEntities, missingEntities, sufficiencyIssues, sufficiencyScore, type Criterion } from '../promptBuilder/sufficiency';
import { sufficiencyContext, validateWithRepair } from '../promptBuilder/validate';
import { startPromptSession, refinePromptSession, type PromptDeps } from '../promptBuilder/service';
import { memoryPromptStore } from '../promptBuilder/store';
import type { JsonRequest } from '../promptBuilder/llm';
import type { PromptSession } from '../promptBuilder/types';
import { loadCatalog } from '../catalog/index';

const guides = loadGuides();
const guide = (id: string) => guides.find((g) => g.id === id)!;

type V = { prompt: string; negativePrompt: string | null; settings: { key: string; value: string }[] };
const v = (prompt: string, negativePrompt: string | null = null, settings: V['settings'] = []): V => ({ prompt, negativePrompt, settings });

interface Fixture {
  guideId: string;
  locale: 'en' | 'tr';
  goal: string;
  good: V;
  bad: V;
  /** bad promptun düşmesi gereken kriterler (tam küme). */
  fails: Criterion[];
}

const FIXTURES: Fixture[] = [
  {
    guideId: 'midjourney', locale: 'tr',
    goal: 'Fırınım "Mavi Fırın" için 1:1 logo, sıcak tonlar',
    good: v('Minimal flat logo for a bakery named "Mavi Fırın", a wheat sheaf inside a round badge, warm terracotta and cream palette, soft studio light, centered composition --ar 1:1', 'photorealistic texture, clutter'),
    bad: v('Please create an image of a bakery logo --ar 1:1'),
    fails: ['selfContainment', 'toolReadiness'],
  },
  {
    guideId: 'ideogram', locale: 'tr',
    goal: 'Cuma akşamı caz gecesi posteri, üzerinde "Friday Jazz" yazsın, 9:16',
    good: v('Typographic poster with the text "Friday Jazz" in large bold art-deco letters at the top, a saxophone silhouette below, deep navy and gold palette, high contrast, vertical 9:16 layout', 'blurry letters', [{ key: 'aspect ratio', value: '9:16' }]),
    bad: v('Sure! Here is a jazz poster with big letters --ar 9:16'),
    fails: ['selfContainment', 'toolReadiness'],
  },
  {
    guideId: 'image-natural', locale: 'tr',
    goal: 'Beyaz arka planda seramik kupa ürün fotoğrafı, kare',
    good: v('A photorealistic product photo of a matte white ceramic mug on a plain white background, soft diffused studio light from the left, gentle shadow, square format, centered composition.', 'text, watermark'),
    bad: v('mug photo, white, etc.'),
    fails: ['actionability'],
  },
  {
    guideId: 'runway', locale: 'tr',
    goal: 'Ürünüm için 5 saniyelik reklam çekimi: kahve fincanından buhar yükseliyor',
    good: v('Slow push-in on a steaming coffee cup on a wooden café table, steam curling upward, warm golden hour light through the window, cinematic commercial look, calm pace, 5-second shot.'),
    bad: v('Make a video of a coffee cup with steam rising slowly in a cafe'),
    fails: ['selfContainment', 'toolReadiness'],
  },
  {
    guideId: 'text-to-video', locale: 'tr',
    goal: 'Sahilde koşan bir köpek, 8 saniye, dalga sesi olsun',
    good: v('Tracking shot: a golden retriever running along the shoreline at sunrise, wet sand splashing, soft warm backlight, realistic style, 8 seconds. Audio: ambient sound of waves and distant seagulls, no music.'),
    bad: v('A dog on a beach at sunrise with warm colors and lots of energy'),
    fails: ['selfContainment', 'toolReadiness'],
  },
  {
    guideId: 'suno', locale: 'tr',
    goal: 'Kızım Elif için doğum günü şarkısı, neşeli pop',
    good: v("Stil: neşeli pop, parlak synth ve el çırpmaları, kadın vokal, orta tempo. Sözler: Elif'in doğum günü için sevgi dolu, eğlenceli sözler; nakaratta adı tekrar edilsin."),
    bad: v('Neşeli bir doğum günü şarkısı, bir şeyler', 'rap'),
    fails: ['selfContainment', 'toolReadiness', 'actionability', 'consistency'],
  },
  {
    guideId: 'elevenlabs-voiceover', locale: 'tr',
    goal: 'E-ticaret reklamı için 30 saniyelik seslendirme, marka adı Lumina',
    good: v('Ses: sıcak kadın sesi, enerjik ama net ton, normal hız, Türkçe. Yaklaşık 30 saniyelik reklam. Metin: "Lumina ile alışveriş artık çok kolay. Aradığın her şey tek uygulamada. Lumina\'yı bugün indir." Telaffuz: Lumina, "Lu-mi-na" diye okunur.'),
    bad: v('Lumina için reklam seslendirmesi yap, enerjik olsun'),
    fails: ['selfContainment', 'toolReadiness'],
  },
  {
    guideId: 'gamma', locale: 'tr',
    goal: 'Yatırımcılar için 10 slaytlık sunum: yapay zekâ destekli tarım uygulamamız TarlaAI',
    good: v('TarlaAI için yatırımcılara yönelik 10 slaytlık bir sunum hazırla. Sunumun amacı, tohum yatırımı görüşmesinde yatırımcıyı ikinci görüşmeye ikna etmek. Slayt akışı şöyle olsun: 1) Problem, 2) Çözüm, 3) Ürün demosu, 4) Pazar, 5) İş modeli, 6) Rekabet, 7) Yol haritası, 8) Ekip, 9) Finansal plan [rakamlar eklenecek], 10) Yatırım talebi. Ton güvenli ve net olsun; her slaytta tek ana mesaj ve sade veri grafikleri kullan.'),
    bad: v('Bir sunum hazırla, TarlaAI anlatılsın, güzel bir şey olsun, slaytlar etkileyici olsun'),
    fails: ['selfContainment', 'toolReadiness', 'actionability'],
  },
  {
    guideId: 'cursor-task', locale: 'tr',
    goal: 'Next.js projemde /api/login 500 hatası veriyor, düzelt; public API değişmesin',
    good: v('Bu Next.js projesinde kıdemli bir backend mühendisi gibi çalış. /api/login uç noktası 500 hatası veriyor; kök nedeni bul ve düzelt. Beklenen davranış: geçerli kimlik bilgileriyle 200 ve oturum çerezi, hatalı bilgilerde 401 dönmeli. İlgili dosya büyük olasılıkla [login route dosyasının yolu]; önce kök nedeni iki üç cümleyle açıkla, sonra küçük adımlarla uygula. Kısıtlar: public API değişmesin ve yeni bağımlılık ekleme. Bitince testleri ve tip kontrolünü çalıştır; kabul kriteri olarak 500 hatası tekrar etmemeli ve mevcut testler geçmeli.'),
    bad: v('Login hatasını düzelt', 'no refactor'),
    fails: ['selfContainment', 'toolReadiness', 'actionability', 'consistency'],
  },
  {
    guideId: 'chat-general', locale: 'tr',
    goal: "Pazartesi toplantısı için Ayşe'ye kısa bir e-posta taslağı yaz, 3 madde",
    good: v("Deneyimli bir iş yazışması editörü olarak Ayşe'ye gönderilecek kısa ve kibar bir e-posta taslağı yaz. Amaç, Pazartesi günkü ekip toplantısından önce Ayşe'yi gündem hakkında bilgilendirmek. E-postayı selamlama, 3 maddelik gündem listesi ve kapanış cümlesiyle kur; en fazla 120 kelime olsun. Ton samimi ama profesyonel olsun; gündem maddelerinin içeriği için [gündem maddeleri] yer tutucusunu kullan."),
    bad: v("Yukarıda konuştuğumuz toplantı için Ayşe'ye e-posta yaz, vb."),
    fails: ['selfContainment', 'toolReadiness', 'actionability'],
  },
];

const ctxFor = (f: Fixture) => ({ guide: guide(f.guideId), goal: f.goal, productName: 'TestTool' });
const failedCriteria = (variant: V, f: Fixture) => [...new Set(allIssues(variant, ctxFor(f)).map((i) => i.criterion))].sort();

describe('yeterlilik rubriği: 10 rehberin hepsi', () => {
  it('her rehber için bir senaryo var', () => {
    assert.deepStrictEqual(FIXTURES.map((f) => f.guideId).sort(), guides.map((g) => g.id).sort());
  });

  for (const f of FIXTURES) {
    it(`${f.guideId}: iyi prompt dört kriterden geçer (puan 100), kötü prompt doğru kriterlerde düşer`, () => {
      assert.deepStrictEqual(allIssues(f.good, ctxFor(f)), [], 'iyi prompt temiz');
      const good = sufficiencyScore(f.good, ctxFor(f));
      assert.strictEqual(good.score, 100);
      assert.ok(CRITERIA.every((c) => good.criteria[c]));

      assert.deepStrictEqual(failedCriteria(f.bad, f), [...f.fails].sort());
      const bad = sufficiencyScore(f.bad, ctxFor(f));
      assert.strictEqual(bad.score, Math.round(((CRITERIA.length - f.fails.length) / CRITERIA.length) * 100));
    });
  }
});

/** Promptun araçta kullanımını anlatan howToUse (kart düzeyi kontrolden geçer). */
const HOW = ['Promptu TestTool aracına yapıştır ve [..] yer tutucularını doldur.', 'İlk çıktıyı ve önerilen ayarları kontrol et.', 'Takip mesajıyla sonucu bir adım daha iyileştirmesini iste.'];

/** Onarım için sahte LLM: her çağrıda verilen varyantları döndürür, istekleri saklar. */
function repairLLM(variants: { safe: V; creative: V }) {
  const calls: JsonRequest[] = [];
  const llm = async (req: JsonRequest) => {
    calls.push(req);
    return {
      data: {
        variants: [{ id: 'safe', ...variants.safe }, { id: 'creative', ...variants.creative }],
        assumptions: [],
        suggestedRefinements: [],
        howToUse: HOW,
      },
      tokens: 20,
    };
  };
  return { llm, calls };
}

const sessionFor = (f: Fixture): PromptSession => ({
  id: 'p_suff', productId: 'x', guideId: f.guideId, guideVersion: guide(f.guideId).version, goal: f.goal, locale: f.locale,
  slots: {}, questionAsked: false, pendingQuestions: [], versions: [], refinementCount: 0,
});

describe('validateWithRepair: eksik bağlam ve yanlış sentaks onarılır', () => {
  for (const f of FIXTURES) {
    it(`${f.guideId}: kötü varyant yakalanır, tek onarımda düzelir; iyi varyant korunur`, async () => {
      const { llm, calls } = repairLLM({ safe: f.good, creative: f.good });
      const output = { variants: [{ id: 'safe' as const, ...f.bad }, { id: 'creative' as const, ...f.good }], assumptions: [], suggestedRefinements: [], howToUse: HOW };
      const r = await validateWithRepair(output, { session: sessionFor(f), guide: guide(f.guideId), productName: 'TestTool', llm });

      assert.strictEqual(calls.length, 1, 'tek onarım');
      assert.ok(r.repaired);
      const sent = JSON.parse(calls[0].user).fixTheseValidatorErrors as Record<string, string[]>;
      assert.deepStrictEqual(Object.keys(sent), ['safe'], 'sadece başarısız varyant');
      const expected = [...new Set(allIssues(f.bad, ctxFor(f)).map((i) => i.message))];
      assert.deepStrictEqual(sent.safe, expected, 'rubrik + rehber hataları onarıma gider');
      assert.deepStrictEqual(r.variants.map((x) => x.validation), [{ status: 'passed', errors: [] }, { status: 'passed', errors: [] }]);
      assert.strictEqual(r.variants[0].prompt, f.good.prompt);
    });
  }

  it('onarım da yetersizse varyant "kontrol edilmedi" ve hatalar kartta', async () => {
    const f = FIXTURES.find((x) => x.guideId === 'cursor-task')!;
    const { llm, calls } = repairLLM({ safe: f.bad, creative: f.bad });
    const output = { variants: [{ id: 'safe' as const, ...f.bad }, { id: 'creative' as const, ...f.good }], assumptions: [], suggestedRefinements: [], howToUse: HOW };
    const r = await validateWithRepair(output, { session: sessionFor(f), guide: guide(f.guideId), productName: 'TestTool', llm });
    assert.strictEqual(calls.length, 1);
    assert.strictEqual(r.variants[0].validation.status, 'unchecked');
    assert.ok(r.variants[0].validation.errors.some((e) => /how to verify/.test(e)));
    assert.strictEqual(r.variants[1].validation.status, 'passed');
  });
});

describe('bağlam tamlığı: amaçtaki kritik varlıklar', () => {
  it('tırnaklı metin, sayılar (binlik ayırıcı, oran) ve cümle ortasındaki özel adlar (ek atılır)', () => {
    const e = goalEntities('Kafem "Mavi Kahve" için Instagram gönderisi; şubemiz Ankara\'da, 1.500 takipçi, 9:16.');
    assert.deepStrictEqual(e, { quoted: ['Mavi Kahve'], numbers: ['1.500', '9:16'], names: ['Instagram', 'Ankara'] });
  });

  it('cümle başı, ürün adı, harfe yapışık sürüm ve iş akışı adım bağlamı varlık sayılmaz', () => {
    assert.deepStrictEqual(goalEntities('Midjourney ile kedi görseli. Midjourney v7 kullanıyorum', 'Midjourney V7'), { quoted: [], numbers: [], names: [] });
    const step = goalEntities('Kafem için tanıtım videosu\n\nBu adım: Kısa video (Reels ve Shorts için kısa videolar hazırla)');
    assert.deepStrictEqual(step, { quoted: [], numbers: [], names: [] });
  });

  it('çeviri ve yazım farkı: İstanbul ~ Istanbul, 1.500 ~ 1,500 ~ 1500', () => {
    const goal = 'Logo for my café in İstanbul with 1.500 followers';
    for (const prompt of ['a café logo, Istanbul skyline, 1,500 followers badge', 'istanbul café logo, 1500 followers']) {
      assert.deepStrictEqual(missingEntities(goal, v(prompt)), [], prompt);
    }
    assert.deepStrictEqual(missingEntities(goal, v('a café logo')), ['1.500', 'İstanbul']);
  });

  it('konuşmaya atıf yakalanır', () => {
    const issues = sufficiencyIssues(v('As discussed above, write the summary in a short table for executives with three columns.'), { guide: guide('chat-general'), goal: 'özet' });
    assert.ok(issues.some((i) => i.criterion === 'selfContainment' && /refer to the conversation/.test(i.message)));
  });

  it('ilk üretimde varlık aranır; iyileştirmede (talimat ya da slot değişikliği) aranmaz', () => {
    const f = FIXTURES[0];
    const base = { session: sessionFor(f), guide: guide(f.guideId), productName: 'Midjourney', llm: repairLLM({ safe: f.good, creative: f.good }).llm };
    assert.strictEqual(sufficiencyContext(base).checkGoalEntities, true);
    assert.strictEqual(sufficiencyContext({ ...base, instruction: 'remove the name' }).checkGoalEntities, false);
    assert.strictEqual(sufficiencyContext({ ...base, previous: { variants: [] } }).checkGoalEntities, false);
  });
});

describe('araç sentaksı, somutluk ve tutarlılık', () => {
  const mj = guide('midjourney');
  const chat = guide('chat-general');

  it('görsel/videoda sohbet dolgusu yakalanır; metin aracında "Create" serbest', () => {
    for (const p of ['Please create an image of a red fox in the snow at dusk --ar 1:1', 'Generate a photo of a red fox in snow at dusk --ar 1:1', 'I want a red fox in snow at dusk, watercolor --ar 1:1', 'A red fox in the snow at dusk, please make it soft --ar 1:1']) {
      assert.ok(sufficiencyIssues(v(p), { guide: mj, goal: 'fox' }).some((i) => i.criterion === 'toolReadiness'), p);
    }
    assert.deepStrictEqual(sufficiencyIssues(v('A red fox in the snow at dusk, watercolor, soft blue light --ar 1:1'), { guide: mj, goal: 'fox' }), []);
    const text = 'Create a 5-day study plan for a beginner learning Python, as a table with one row per day and a short goal for each.';
    assert.deepStrictEqual(sufficiencyIssues(v(text), { guide: chat, goal: 'plan' }), []);
  });

  it('asistan girişi ve doldurulmamış şablon yer tutucusu', () => {
    const issues = sufficiencyIssues(v('Here is your prompt: [konu ve eylem], watercolor style, soft light, centered --ar 1:1'), { guide: mj, goal: 'x' });
    assert.ok(issues.some((i) => /assistant preamble/.test(i.message)));
    assert.ok(issues.some((i) => /\[konu ve eylem\]/.test(i.message)));
  });

  it('muğlak ifade ve çok kısa prompt (somutluk); /etc/hosts yol adı muğlak sayılmaz', () => {
    assert.ok(sufficiencyIssues(v('Write a blog post about coffee, with history, recipes, etc. in a list format please'), { guide: chat, goal: 'x' }).some((i) => i.criterion === 'actionability'));
    assert.ok(sufficiencyIssues(v('red fox --ar 1:1'), { guide: mj, goal: 'x' }).some((i) => /Too short/.test(i.message)));
    const code = 'Görev: /etc/hosts dosyasını okuyan betikteki hatayı düzelt. Kurallar: davranış değişmesin. Doğrulama: testleri çalıştır ve çıktıyı karşılaştır, tip kontrolü de geçsin.';
    assert.ok(!sufficiencyIssues(v(code), { guide: guide('cursor-task'), goal: 'x' }).some((i) => i.criterion === 'actionability'));
  });

  it('negatif prompt: istenen şeyi dışlarsa çelişki; "no ..." ile anılırsa değil; negatif alanı olmayan araçta hata', () => {
    const ideo = guide('ideogram');
    const p = 'Typographic poster with text "SALE" in red block letters, plain white background, centered layout';
    assert.ok(sufficiencyIssues(v(p, 'text, blur'), { guide: ideo, goal: 'x' }).some((i) => i.criterion === 'consistency' && /text/.test(i.message)));
    assert.ok(!sufficiencyIssues(v('A red sports car on a mountain road, no text, golden hour, wide shot', 'text'), { guide: guide('image-natural'), goal: 'x' }).some((i) => i.criterion === 'consistency'));
    assert.ok(sufficiencyIssues(v('Rol: editör. Görev: bu metni kısalt. Format: tek paragraf, en fazla 80 kelime, sade dil.', 'jargon'), { guide: chat, goal: 'x' }).some((i) => /no negative prompt field/.test(i.message)));
  });

  it('ayarlar: promptla çelişen oran, tekrarlanan anahtar, boş değer', () => {
    const p = 'A lighthouse on a cliff at night, storm clouds, cinematic, dramatic rim light --ar 16:9';
    const issues = sufficiencyIssues(v(p, null, [{ key: 'aspect', value: '9:16' }, { key: 'stylize', value: '100' }, { key: 'stylize', value: '250' }, { key: 'chaos', value: ' ' }]), { guide: mj, goal: 'x' });
    const messages = issues.filter((i) => i.criterion === 'consistency').map((i) => i.message).join('\n');
    assert.match(messages, /conflicts with the aspect ratio/);
    assert.match(messages, /given twice/);
    assert.match(messages, /key and a value/);
  });

  it("rehber validator'ları kritere göre sayılır: forbidRegex ve bayraklar", () => {
    const issues = allIssues(v('A photorealistic photo of a ceramic mug on a plain white background, soft light --ar 1:1'), { guide: guide('image-natural'), goal: 'x' });
    assert.deepStrictEqual(issues.map((i) => i.criterion), ['toolReadiness']);
    assert.match(issues[0].message, /--parameters/);
    assert.ok(allIssues(v('a b c --ar 1:1 d e f g --ar 9:16'), { guide: mj, goal: 'x' }).some((i) => i.criterion === 'consistency' && /single --ar/.test(i.message)));
  });
});

describe('prompt oturumu ile uçtan uca', () => {
  function sessionLLM(first: V, repaired: V) {
    const calls: JsonRequest[] = [];
    const llm = async (req: JsonRequest) => {
      calls.push(req);
      if (req.name === 'slot_extraction') {
        return { data: { slots: [{ id: 'text', value: 'Friday Jazz', source: 'user', confidence: 1 }, { id: 'style', value: 'typographic poster', source: 'user', confidence: 1 }], goalSummary: 's', questions: [] }, tokens: 10 };
      }
      const isRepair = 'fixTheseValidatorErrors' in JSON.parse(req.user);
      const p = isRepair ? repaired : first;
      return { data: { variants: [{ id: 'safe', ...p }, { id: 'creative', ...p }], assumptions: [], suggestedRefinements: [], howToUse: HOW }, tokens: 20 };
    };
    return { llm, calls };
  }
  const deps = (llm: PromptDeps['llm']): PromptDeps => {
    let n = 0;
    return { llm, store: memoryPromptStore(), guides, products: loadCatalog().products, now: () => 0, newId: () => `p_suff${++n}xx` };
  };
  const f = FIXTURES.find((x) => x.guideId === 'ideogram')!;

  it('ilk üretim tırnaklı metni düşürürse onarılır; kart "passed"', async () => {
    const { llm, calls } = sessionLLM(v('Typographic jazz poster with large art-deco letters, saxophone silhouette, navy and gold, vertical 9:16 layout'), f.good);
    const r = await startPromptSession({ productId: 'ideogram-20', goal: f.goal, conversation: [{ role: 'user', content: f.goal }], locale: 'tr' }, deps(llm));
    if ('error' in r || r.card.type !== 'prompt') return assert.fail(JSON.stringify(r));
    assert.deepStrictEqual(calls.map((c) => c.name), ['slot_extraction', 'prompt_generation', 'prompt_generation']);
    assert.match(JSON.parse(calls[2].user).fixTheseValidatorErrors.safe.join(' '), /"Friday Jazz"/);
    assert.ok(r.card.variants.every((x) => x.validation.status === 'passed'));
    assert.strictEqual(r.tokens, 50);
    // Üretici kuralı: hedef araç konuşmayı görmez, görselde araca seslenme yok
    assert.match(calls[1].system, /never sees this conversation: the prompt must be self-contained/);
    assert.match(calls[1].system, /Do not address the tool/);
  });

  it('iyileştirme talimatı bir varlığı bilerek kaldırınca onarım tetiklenmez', async () => {
    const { llm, calls } = sessionLLM(f.good, f.good);
    const d = deps(llm);
    const r = await startPromptSession({ productId: 'ideogram-20', goal: f.goal, conversation: [], locale: 'tr' }, d);
    if ('error' in r) return assert.fail();
    const noNumber = v('Typographic poster with the text "Friday Jazz" in bold art-deco letters, saxophone silhouette, deep navy and gold palette, square layout');
    const second = sessionLLM(noNumber, noNumber);
    const before = calls.length;
    const refined = await refinePromptSession({ promptSessionId: r.card.promptSessionId, instruction: 'kare yap' }, { ...d, llm: second.llm });
    if ('error' in refined || refined.card.type !== 'prompt') return assert.fail();
    assert.strictEqual(second.calls.length, 1, 'onarım yok: 9:16 bilerek değişti');
    assert.strictEqual(calls.length, before);
    assert.ok(refined.card.variants.every((x) => x.validation.status === 'passed'));
  });
});
