// Evrensel prompt mimarisi: niyet modu, navigasyon eşiği (geniş/detaylı hedef),
// meta-sınır (prompt yerine cevap yok), niyet küçültme, mekanik etiket zinciri,
// howToUse ve kullanıcı dilinde varsayımlar. Alana özel kural yok: senaryolar
// farklı alanlardan (yazılım, iş, eğitim, içerik) seçildi.

import assert from 'node:assert';
import { describe, it } from 'node:test';
import { loadGuides } from '../promptBuilder/guides';
import { classifyIntent } from '../promptBuilder/intent';
import { displayValue } from '../promptBuilder/plan';
import { allIssues, assumptionLeaks, cardIssues, hasInstruction, howToUseIssues, labelChainLength, sufficiencyIssues } from '../promptBuilder/sufficiency';
import { startPromptSession, type PromptDeps } from '../promptBuilder/service';
import { memoryPromptStore } from '../promptBuilder/store';
import type { JsonRequest } from '../promptBuilder/llm';
import { loadCatalog } from '../catalog/index';

const guides = loadGuides();
const guide = (id: string) => guides.find((g) => g.id === id)!;
const chat = guide('chat-general');
const v = (prompt: string, negativePrompt: string | null = null) => ({ prompt, negativePrompt, settings: [] as { key: string; value: string }[] });

describe('niyet modu (intent.ts)', () => {
  it('beş evrensel mod; alan fark etmez, fiil kalıbı belirler', () => {
    const cases: [string, string | null][] = [
      ['Bir mobil uygulama yapmak istiyorum', 'build'],
      ['Film çekmek istiyorum', 'build'],
      ['Şarkı yapacağım', 'build'],
      ['Fırınım için logo lazım', 'build'],
      ['I want to build a SaaS for dentists', 'build'],
      ['Sitem çok yavaş, hızlandırmak istiyorum', 'solve'],
      ['My React app crashes on login', 'solve'],
      ['Üç CRM aracını karşılaştır', 'analyze'],
      ['Bu metni İngilizceye çevir', 'transform'],
      ['Rewrite my CV for a product role', 'transform'],
      ['Yapay zekâ nedir?', 'learn'],
      ['Bana blokzincirin nasıl çalıştığını anlat', 'learn'],
      ['Explain quantum computing', 'learn'],
      ['Kurumsal sunum', null],
    ];
    for (const [goal, mode] of cases) assert.strictEqual(classifyIntent(goal), mode, goal);
  });
});

describe('mekanik etiket zinciri', () => {
  const robotic = 'Rol: deneyimli bir uzman. Bağlam: kullanıcı bir kafe açmak istiyor. Görev: plan yap. Format: kısa bir paragraf. Uzunluk: orta.';

  it('4+ ardışık "Etiket: değer" yakalanır; başlıklı doğal bölümler ve yer tutucu listesi serbest', () => {
    assert.strictEqual(labelChainLength(robotic), 5);
    assert.strictEqual(labelChainLength('Role: expert. Context: cafe. Task: plan. Format: table.'), 4);
    const natural = '**1. Rol ve amaç**\nKıdemli bir kurucu ortak gibi davran ve kafeyi benimle birlikte kur.\n\n**2. Bağlam**\nŞehir merkezinde küçük bir kafe açmak istiyorum.\n\n**3. Benim bilgilerim**\n- Bütçe: [bütçen]\n- Konum: [semt]\n- Açılış tarihi: [tarih]\n- Ekip: [kişi sayısı]';
    assert.ok(labelChainLength(natural) <= 1, String(labelChainLength(natural)));
  });

  it('metin/kod/sunum araçlarında toolReadiness hatası; ses/müzik gibi araç-doğal etiketler serbest', () => {
    assert.ok(sufficiencyIssues(v(robotic), { guide: chat, goal: 'Kafe açmak istiyorum' }).some((i) => i.criterion === 'toolReadiness' && /mechanical labels/.test(i.message)));
    const voice = 'Ses: sıcak kadın sesi. Ton: enerjik. Hız: normal. Dil: Türkçe. Metin: "Yeni sezon ürünlerimiz mağazalarda, hemen gel ve keşfet."';
    assert.ok(!sufficiencyIssues(v(voice), { guide: guide('elevenlabs-voiceover'), goal: 'reklam seslendirmesi' }).some((i) => /mechanical labels/.test(i.message)));
  });
});

describe('meta-sınır ve niyet küçültme', () => {
  it('konuyu anlatan cevap metni prompt sayılmaz (TR ve EN)', () => {
    const answerTr = 'Yapay zekâ, makinelerin verilerden öğrenmesini sağlayan bir teknolojidir. Günümüzde sağlık ve finans gibi birçok alanda kullanılır. En bilinen örnekleri sohbet botlarıdır.';
    const answerEn = 'A business plan is a document that describes a company. It usually covers the market, the product and the finances. Most banks expect one.';
    for (const text of [answerTr, answerEn]) {
      assert.ok(!hasInstruction(text), text);
      assert.ok(sufficiencyIssues(v(text), { guide: chat, goal: 'x', productName: 'ChatGPT' }).some((i) => i.criterion === 'actionability' && /not the executor/.test(i.message)), text);
    }
  });

  it('talimat veren doğal promptlar geçer (emir, "sen"/"you" hitabı, "istiyorum")', () => {
    for (const p of [
      'Kıdemli bir ürün stratejisti olarak benimle birlikte bir yol haritası hazırla. Önce hedef kitleyi netleştir, sonra üç aşamalı bir plan çıkar.',
      'You are a senior data analyst. Compare the three options against explicit criteria and recommend one.',
      'Senden işletmem için bir pazarlama planı istiyorum. Plan dört bölümden oluşsun ve her bölüm somut adımlar içersin.',
    ]) assert.ok(hasInstruction(p), p);
  });

  it('üretim isteği "kısa bilgi" ödevine küçültülürse yakalanır; öğrenme isteğinde serbest', () => {
    const shallow = 'Mobil uygulamalar hakkında başlangıç seviyesinde kısa bir paragraf bilgi ver ve temel kavramları açıkla.';
    const build = sufficiencyIssues(v(shallow), { guide: chat, goal: 'Bir mobil uygulama yapmak istiyorum' });
    assert.ok(build.some((i) => /do not shrink it/.test(i.message)));
    const learn = sufficiencyIssues(v(shallow), { guide: chat, goal: 'Mobil uygulama nedir, bana anlat' });
    assert.ok(!learn.some((i) => /do not shrink it/.test(i.message)));
    const asked = sufficiencyIssues(v(shallow), { guide: chat, goal: 'Uygulama fikrim için kısa bir paragraf yazmak istiyorum' });
    assert.ok(!asked.some((i) => /do not shrink it/.test(i.message)), 'kullanıcı kısa paragrafı kendisi istediyse küçültme değil');
  });

  it('değişikliklerin kısa özeti küçültme değil (2026-10-14 eval, cursor-full yanlış alarmı)', () => {
    const cursor = guide('cursor-task');
    const ok = 'You are a lead architect. Fix the bug in src/auth/login.ts where expired tokens are accepted; do not alter the public API. Run the entire test suite, then provide a brief summary of the changes made.';
    assert.ok(!sufficiencyIssues(v(ok), { guide: cursor, goal: 'fix expired token bug' }).some((i) => /do not shrink it/.test(i.message)));
    const tr = 'Sen kıdemli bir mühendissin. Hatayı düzelt, testleri çalıştır ve değişikliklerin kısa bir özetini ver.';
    assert.ok(!sufficiencyIssues(v(tr), { guide: cursor, goal: 'Giriş hatasını düzelt' }).some((i) => /do not shrink it/.test(i.message)));
    const shallow = 'You are a senior engineer. Give a brief overview of token authentication and explain the basic concepts.';
    assert.ok(sufficiencyIssues(v(shallow), { guide: cursor, goal: 'fix expired token bug' }).some((i) => /do not shrink it/.test(i.message)), 'konu özeti hâlâ yakalanır');
  });

  it('prompt RouteAI\'a hitap etmez (2026-10-14 eval, replit-generic)', () => {
    const cursor = guide('cursor-task');
    const bad = 'RouteAI, bir kuaför randevu sitesi geliştirmek için kıdemli mühendis olarak çalış. Hizmet listesi, fiyatlar ve online randevu formu olsun; formun çalıştığını test et.';
    assert.ok(sufficiencyIssues(v(bad), { guide: cursor, goal: 'kuaför sitesi', productName: 'Replit Agent' }).some((i) => i.criterion === 'selfContainment' && /Do not mention RouteAI/.test(i.message)));
    const good = bad.replace('RouteAI,', 'Sen');
    assert.ok(!sufficiencyIssues(v(good), { guide: cursor, goal: 'kuaför sitesi', productName: 'Replit Agent' }).some((i) => /RouteAI/.test(i.message)));
  });
});

describe('howToUse ve varsayım dili', () => {
  it('konu hakkında genel tavsiye howToUse sayılmaz; araçta kullanım anlatımı geçer', () => {
    assert.strictEqual(howToUseIssues(['Ekibini kur.', 'Pazarı araştır.', 'Yukarıdaki bilgileri oku.'], 'ChatGPT').length, 1);
    assert.deepStrictEqual(howToUseIssues([
      'Promptu ChatGPT\'ye yapıştır; [bütçen] ve [şehir] yer tutucularını kendi bilgilerinle doldur.',
      'İlk yanıtta yol haritasının aşamalarını ve süreleri kontrol et.',
      'Ardından "1. aşamayı haftalık görevlere böl" diye takip mesajı gönder.',
    ], 'ChatGPT'), []);
  });

  it('Türkçe ekranda ham İngilizce seçenek değeri ve İngilizce gerekçe yakalanır; etiket gösterilir', () => {
    const leaks = assumptionLeaks([
      { slotId: 'audience', value: 'a beginner', why: 'x' },
      { slotId: 'tone', value: 'Samimi', why: 'Not specified; used the default.' },
    ], chat, 'tr');
    assert.strictEqual(leaks.length, 2);
    assert.deepStrictEqual(assumptionLeaks([{ slotId: 'audience', value: 'a beginner', why: 'x' }], chat, 'en'), []);
    const audience = chat.slots.find((s) => s.id === 'audience')!;
    assert.strictEqual(displayValue(audience, 'a beginner', 'tr'), 'Yeni başlayan biri');
    assert.strictEqual(displayValue(audience, 'a beginner', 'en'), 'A beginner');
    assert.strictEqual(displayValue(audience, 'girişimciler', 'tr'), 'girişimciler', 'serbest değer olduğu gibi');
    assert.strictEqual(displayValue(audience, 'founders', 'tr', { label: 'Kurucular' }), 'Kurucular');
  });
});

// ------------------------------------------------------------------
// Uçtan uca (chat-general, ChatGPT): sahte LLM
// ------------------------------------------------------------------
type Slot = { id: string; value: string | null; source: 'user' | 'inferred'; confidence: number; label?: string | null };
type Gen = { prompt: string; howToUse?: string[]; assumptions?: { slotId: string; value: string; why: string }[] };

const GOOD_HOW = [
  'Promptu ChatGPT\'ye yapıştır; köşeli parantezli yer tutucuları kendi bilgilerinle doldur.',
  'İlk yanıtta istenen bölümlerin ve aşamaların eksiksiz geldiğini kontrol et.',
  'Ardından "ilk aşamayı haftalık görevlere böl" diye takip mesajı gönder.',
];

function scriptedLLM(extraction: { slots: Slot[]; isBroadGoal: boolean; questions?: unknown[] }, generations: Gen[]) {
  const calls: JsonRequest[] = [];
  let n = 0;
  const llm = async (req: JsonRequest) => {
    calls.push(req);
    if (req.name === 'slot_extraction') {
      // Kanıt: slot başına kullanıcının ilk mesajından farklı bir kelime (ayrı ayrıntı sayılır).
      const words = (/(?:^|\n)user: ([^\n]*)/.exec(JSON.parse(req.user).conversation)?.[1] ?? '').split(/\s+/).filter((w) => w.length >= 2);
      const slots = extraction.slots.map((x, i) => ({ evidence: words.length ? words[i % words.length] : null, ...x }));
      return { data: { ...extraction, slots, goalSummary: 's', questions: extraction.questions ?? [] }, tokens: 10 };
    }
    const g = generations[Math.min(n++, generations.length - 1)];
    return {
      data: {
        intent: 'build',
        variants: [{ id: 'safe', prompt: g.prompt, negativePrompt: null, settings: [] }, { id: 'creative', prompt: g.prompt, negativePrompt: null, settings: [] }],
        assumptions: g.assumptions ?? [],
        suggestedRefinements: [],
        howToUse: g.howToUse ?? GOOD_HOW,
      },
      tokens: 20,
    };
  };
  return { llm, calls };
}

const deps = (llm: PromptDeps['llm']): PromptDeps => {
  let n = 0;
  return { llm, store: memoryPromptStore(), guides, products: loadCatalog().products, now: () => 0, newId: () => `p_arch${++n}xx` };
};

const guessed = (id: string, value: string, label: string): Slot => ({ id, value, source: 'inferred', confidence: 0.45, label });
const said = (id: string, value: string, label?: string): Slot => ({ id, value, source: 'user', confidence: 0.95, label: label ?? value });

const DEEP_PROMPT = `Diş klinikleri için mobil uygulama geliştiren kıdemli bir kurucu ortak ve baş yazılım mimarı gibi davran; bu ürünü benimle uçtan uca inşa edeceksin.

Bağlam: Hedefimiz randevu alma ve otomatik hatırlatma özellikleri olan bir mobil uygulama. React Native kullanacağız ve 3 ay içinde MVP çıkarmak istiyoruz. Bütçe ve ekip bilgisi için [bütçe] ve [ekip büyüklüğü] yer tutucularını kullan.

Senden beklediğim çıktı:
1. MVP kapsamı: olmazsa olmaz özellikler ve sonraya kalacaklar.
2. Mimari: istemci, sunucu, veri modeli ve bildirim altyapısı için öneri ve gerekçesi.
3. 12 haftalık yol haritası: haftalık kilometre taşları ve riskler.

Eksik kritik bir bilgi varsa önce en fazla 3 net soru sor, sonra planı teslim et.`;

describe('uçtan uca: navigasyon eşiği, derinlik, yerelleştirme, onarım', () => {
  it('geniş/kısa hedef ("Bir uygulama yapmak istiyorum"): rastgele prompt yerine hedefe özel navigasyon soru kartı', async () => {
    const { llm, calls } = scriptedLLM({
      isBroadGoal: true,
      slots: [guessed('intent', 'build it with me end to end', 'Birlikte inşa'), guessed('deliverable', 'a step-by-step roadmap with milestones', 'Yol haritası'), guessed('stage', 'starting from an idea, nothing built yet', 'Fikir aşaması')],
      questions: [
        { slotId: 'deliverable', question: 'Uygulamanın hangi aşaması için prompt hazırlayalım?', options: [{ label: 'Fikir ve MVP kapsamı', value: 'an MVP scope and feature list' }, { label: 'Teknik mimari', value: 'a technical architecture plan' }, { label: 'Lansman planı', value: 'a launch plan' }] },
        { slotId: 'stage', question: 'Uygulama şu an ne durumda?', options: [{ label: 'Sadece fikir', value: 'only an idea' }, { label: 'Prototip var', value: 'a working prototype exists' }] },
      ],
    }, [{ prompt: 'kullanılmamalı' }]);
    const r = await startPromptSession({ productId: 'chatgpt-gpt-5', goal: 'Bir uygulama yapmak istiyorum', conversation: [{ role: 'user', content: 'Bir uygulama yapmak istiyorum' }], locale: 'tr' }, deps(llm));
    if ('error' in r || r.card.type !== 'prompt_question') return assert.fail(JSON.stringify(r));
    assert.deepStrictEqual(r.card.questions.map((q) => q.slotId), ['intent', 'deliverable', 'stage']);
    assert.strictEqual(r.card.questions[1].question, 'Uygulamanın hangi aşaması için prompt hazırlayalım?');
    assert.deepStrictEqual(calls.map((c) => c.name), ['slot_extraction'], 'prompt üretilmedi');
  });

  it('detaylı hedef: soru kartı atlanır, derinlikli ve doğal yapıda PromptCard; meta-sınır ve niyet ipucu üreticiye gider', async () => {
    const goal = 'Diş klinikleri için randevu ve hatırlatma özellikli bir mobil uygulama yapmak istiyorum; React Native ile 3 ayda MVP';
    const { llm, calls } = scriptedLLM({
      isBroadGoal: false,
      slots: [said('intent', 'build it with me end to end', 'Birlikte inşa'), said('deliverable', 'an MVP scope, architecture and roadmap', 'MVP kapsamı ve yol haritası'), guessed('stage', 'starting from an idea, nothing built yet', 'Fikir aşaması')],
    }, [{ prompt: DEEP_PROMPT }]);
    const r = await startPromptSession({ productId: 'chatgpt-gpt-5', goal, conversation: [{ role: 'user', content: goal }], locale: 'tr' }, deps(llm));
    if ('error' in r || r.card.type !== 'prompt') return assert.fail(JSON.stringify(r));
    assert.deepStrictEqual(calls.map((c) => c.name), ['slot_extraction', 'prompt_generation'], 'onarım gerekmedi');
    assert.ok(r.card.variants.every((x) => x.validation.status === 'passed'), JSON.stringify(r.card.variants.map((x) => x.validation)));
    assert.deepStrictEqual(allIssues(r.card.variants[0], { guide: chat, goal, productName: 'ChatGPT' }), []);

    const gen = calls[1];
    assert.strictEqual(JSON.parse(gen.user).intentHint, 'build');
    assert.match(gen.system, /you are the prompt architect, NEVER the executor/);
    assert.match(gen.system, /the role belongs to ChatGPT, in the second person/);
    assert.match(gen.system, /the goal and situation belong to the user, in the first person/);
    assert.match(gen.system, /never give the user's goal to ChatGPT/, '2026-10-14 eval: "... geliştirmek istiyorsun"');
    assert.match(gen.system, /never mentions RouteAI/);
    assert.match(gen.system, /build \(make, create, produce.*never write a prompt that asks for general information/);
    assert.match(gen.system, /Never write a chain of mechanical labels/);
    assert.match(gen.system, /howToUse: exactly 3 short steps about using THIS prompt in ChatGPT, never general advice/);
    assert.ok((gen.schema as { required: string[] }).required.includes('intent'));
  });

  it('yerelleştirme: Türkçe kartta "a beginner", "friendly" gibi ham değerler yok; etiketler ve Türkçe gerekçeler var', async () => {
    const goal = 'Kafem için 6 aylık bir sosyal medya içerik planı hazırlamak istiyorum, Instagram ve TikTok';
    const { llm } = scriptedLLM({
      isBroadGoal: false,
      slots: [said('intent', 'build it with me end to end', 'Birlikte inşa'), said('deliverable', 'a 6-month content calendar', '6 aylık içerik takvimi'), guessed('depth', 'thorough, covering every part', 'Kapsamlı')],
    }, [{
      prompt: 'Kıdemli bir sosyal medya stratejisti olarak kafem için Instagram ve TikTok odaklı 6 aylık bir içerik planı hazırla. Planı aylara böl; her ay için tema, haftalık paylaşım sıklığı ve örnek gönderi fikirleri çıkar. Kafenin adı ve konumu için [kafe adı] ve [semt] yer tutucularını kullan.',
      assumptions: [{ slotId: 'audience', value: 'a beginner', why: 'Hedef kitle belirtilmedi.' }, { slotId: 'tone', value: 'friendly', why: 'Kafe için sıcak bir dil uygun.' }],
    }]);
    const r = await startPromptSession({ productId: 'chatgpt-gpt-5', goal, conversation: [{ role: 'user', content: goal }], locale: 'tr' }, deps(llm));
    if ('error' in r || r.card.type !== 'prompt') return assert.fail(JSON.stringify(r));
    const byId = Object.fromEntries(r.card.assumptions.map((a) => [a.slotId, a]));
    assert.strictEqual(byId.audience.value, 'Yeni başlayan biri');
    assert.strictEqual(byId.tone.value, 'Samimi');
    assert.strictEqual(byId.depth.value, 'Kapsamlı', 'çıkarımın kullanıcı dilindeki etiketi');
    const english = new Set(chat.slots.flatMap((s) => s.options.map((o) => o.value.toLowerCase())));
    assert.ok(r.card.assumptions.every((a) => !english.has(a.value.toLowerCase())), JSON.stringify(r.card.assumptions));
    assert.deepStrictEqual(assumptionLeaks(r.card.assumptions, chat, 'tr'), []);
    assert.ok(r.card.assumptions.every((a) => !/Belirtilmedi; varsayılan kullanıldı|Not specified/.test(a.why)));
    assert.deepStrictEqual(cardIssues({ howToUse: r.card.howToUse, assumptions: r.card.assumptions }, { guide: chat, goal, productName: 'ChatGPT', locale: 'tr' }), []);
  });

  it('mekanik şablon ve niyet küçültme onarılır; konu tavsiyesi olan howToUse da aynı turda düzelir', async () => {
    const goal = 'Online kurs platformu kurmak istiyorum, yazılım eğitimleri satacağım';
    const robotic = 'Rol: deneyimli bir uzman. Bağlam: kullanıcı online kurs platformu kurmak istiyor. Görev: konuyu anlat. Format: kısa bir paragraf. Uzunluk: orta.';
    const natural = 'Online eğitim işinde deneyimli bir kurucu ortak ve ürün mimarı gibi davran; yazılım eğitimleri satan bir kurs platformunu benimle birlikte kur. Önce hedef öğrenci profilini ve gelir modelini netleştir, sonra platformun MVP özelliklerini, teknik altyapı seçeneklerini ve ilk 90 günün lansman planını bölüm bölüm çıkar. Bütçem için [bütçe] yer tutucusunu kullan.';
    const { llm, calls } = scriptedLLM({ isBroadGoal: false, slots: [said('intent', 'build it with me end to end'), said('deliverable', 'a launch plan')] }, [
      { prompt: robotic, howToUse: ['Ekibini kur.', 'Rakipleri araştır.', 'Yukarıdaki bilgileri oku.'] },
      { prompt: natural, howToUse: GOOD_HOW },
    ]);
    const r = await startPromptSession({ productId: 'chatgpt-gpt-5', goal, conversation: [{ role: 'user', content: goal }], locale: 'tr' }, deps(llm));
    if ('error' in r || r.card.type !== 'prompt') return assert.fail(JSON.stringify(r));
    assert.deepStrictEqual(calls.map((c) => c.name), ['slot_extraction', 'prompt_generation', 'prompt_generation']);
    const sent = JSON.parse(calls[2].user).fixTheseValidatorErrors as Record<string, string[]>;
    assert.match(sent.safe.join(' '), /mechanical labels/);
    assert.match(sent.safe.join(' '), /do not shrink it/);
    assert.match(sent.howToUse.join(' '), /using THIS prompt in ChatGPT/);
    assert.ok(r.card.variants.every((x) => x.validation.status === 'passed'));
    assert.strictEqual(r.card.variants[0].prompt, natural);
    assert.deepStrictEqual(r.card.howToUse, GOOD_HOW);
  });

  it('prompt yerine cevap yazılırsa (meta-sınır ihlali) onarılır', async () => {
    const goal = 'E-ticaret sitem için iade politikası metni yazmak istiyorum';
    const answer = 'İade politikası, müşterilerin ürünleri hangi koşullarda geri gönderebileceğini anlatan metindir. Çoğu e-ticaret sitesi bu süreyi belirli bir gün sayısıyla sınırlar. Açık bir politika müşteri güvenini artırır.';
    const prompt = 'Tüketici hukukunu bilen kıdemli bir e-ticaret içerik yazarı olarak sitem için yayınlanmaya hazır bir iade politikası metni yaz. Metin; iade süresi, ürün koşulları, kargo ücreti ve para iadesi adımlarını ayrı başlıklar altında anlatsın. Süre ve ücret gibi bilgiler için [iade süresi] ve [kargo ücreti] yer tutucularını kullan.';
    const { llm, calls } = scriptedLLM({ isBroadGoal: false, slots: [said('intent', 'build it with me end to end'), said('deliverable', 'a ready-to-use first draft of the work')] }, [{ prompt: answer }, { prompt }]);
    const r = await startPromptSession({ productId: 'chatgpt-gpt-5', goal, conversation: [{ role: 'user', content: goal }], locale: 'tr' }, deps(llm));
    if ('error' in r || r.card.type !== 'prompt') return assert.fail(JSON.stringify(r));
    assert.match(JSON.parse(calls[2].user).fixTheseValidatorErrors.safe.join(' '), /not the executor/);
    assert.strictEqual(r.card.variants[0].prompt, prompt);
    assert.ok(r.card.variants.every((x) => x.validation.status === 'passed'));
  });
});

describe('rehberler (v3)', () => {
  it('chat-general: mekanik şablon yok, sığ varsayılan yok; tüm rehberlerde etiket zincirli şablon yok', () => {
    assert.ok(!/Rol: \[rol\]\. Bağlam:/.test(chat.body.template));
    assert.ok(chat.slots.every((s) => s.default === 'infer'), 'derinlik isteğe göre seçilir');
    assert.deepStrictEqual(chat.slots.filter((s) => s.impact === 'high').map((s) => s.id), ['intent', 'deliverable', 'stage']);
    for (const g of guides.filter((x) => ['text', 'code', 'slides'].includes(x.modality))) {
      assert.ok(labelChainLength(g.body.template.replace(/\n/g, ' ')) <= 3, g.id);
    }
    for (const g of guides) assert.ok(g.version >= 3, g.id);
  });
});
