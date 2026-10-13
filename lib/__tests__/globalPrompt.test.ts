// Global (TR + EN) uçtan uca prompt senaryoları: canlı testte görülen 6 hatanın
// hiçbiri kartta kalmamalı. Geniş hedef -> önce stratejik soru kartı; cevaplardan
// sonra PromptCard'da mekanik etiket, dil sızıntısı, cevap/makale cümlesi ve
// alakasız howToUse yok. Detaylı hedef -> soru yok, disipline uygun PromptCard.

import assert from 'node:assert';
import { describe, it } from 'node:test';
import { loadGuides } from '../promptBuilder/guides';
import { answerPromptQuestions, startPromptSession, type PromptDeps } from '../promptBuilder/service';
import { asksForShallowOutput, assumptionLeaks, cardIssues, howToUseIssues, labelChainLength, sufficiencyIssues, trailingAnswer } from '../promptBuilder/sufficiency';
import { memoryPromptStore } from '../promptBuilder/store';
import type { JsonRequest } from '../promptBuilder/llm';
import type { PromptCard } from '../agent/cards';
import { loadCatalog } from '../catalog/index';

const chat = loadGuides().find((g) => g.id === 'chat-general')!;
type Locale = 'en' | 'tr';
type Slot = { id: string; value: string | null; source: 'user' | 'inferred'; confidence: number; label?: string | null };
type Gen = { prompt: string; howToUse: readonly string[]; assumptions?: readonly { slotId: string; value: string; why: string }[] };

function llmFor(extraction: { slots: Slot[]; isBroadGoal: boolean; questions?: unknown[] }, generations: Gen[]) {
  const calls: JsonRequest[] = [];
  let n = 0;
  const llm = async (req: JsonRequest) => {
    calls.push(req);
    if (req.name === 'slot_extraction') return { data: { ...extraction, goalSummary: 's', questions: extraction.questions ?? [] }, tokens: 10 };
    const g = generations[Math.min(n++, generations.length - 1)];
    return {
      data: {
        intent: 'build',
        variants: [{ id: 'safe', prompt: g.prompt, negativePrompt: null, settings: [] }, { id: 'creative', prompt: g.prompt, negativePrompt: null, settings: [] }],
        assumptions: g.assumptions ?? [],
        suggestedRefinements: [],
        howToUse: [...g.howToUse],
      },
      tokens: 20,
    };
  };
  return { llm, calls };
}

const deps = (llm: PromptDeps['llm']): PromptDeps => {
  let n = 0;
  return { llm, store: memoryPromptStore(), guides: loadGuides(), products: loadCatalog().products, now: () => 0, newId: () => `p_glob${++n}xx` };
};
const guess = (id: string, value: string, label: string): Slot => ({ id, value, source: 'inferred', confidence: 0.45, label });
const said = (id: string, value: string, label: string): Slot => ({ id, value, source: 'user', confidence: 0.95, label });

/** Kartta canlı testteki 6 hatadan hiçbiri yok. */
function assertCleanCard(card: PromptCard, goal: string, locale: Locale) {
  for (const v of card.variants) {
    assert.ok(labelChainLength(v.prompt) <= 3, `mekanik etiket zinciri: ${v.prompt}`);
    assert.deepStrictEqual(trailingAnswer(v.prompt), [], 'prompt sonunda okura konuşan cümle');
    assert.deepStrictEqual(sufficiencyIssues(v, { guide: chat, goal, productName: 'ChatGPT' }), [], v.prompt);
    assert.strictEqual(v.validation.status, 'passed');
  }
  assert.deepStrictEqual(cardIssues({ howToUse: card.howToUse, assumptions: card.assumptions }, { guide: chat, goal, productName: 'ChatGPT', locale }), []);
  assert.deepStrictEqual(assumptionLeaks(card.assumptions, chat, locale), []);
  const english = new Set(chat.slots.flatMap((s) => s.options.map((o) => o.value.toLowerCase())));
  if (locale === 'tr') assert.ok(card.assumptions.every((a) => !english.has(a.value.toLowerCase())), JSON.stringify(card.assumptions));
  assert.ok(card.assumptions.every((a) => !/Belirtilmedi; varsayılan kullanıldı/.test(a.why)));
}

const FILM = {
  tr: {
    goal: 'Sinema filmi yapmak istiyorum',
    questions: [
      { slotId: 'deliverable', question: 'Filmin hangi aşaması için prompt hazırlayalım?', options: [{ label: 'Konsept ve logline', value: 'a concept, logline and synopsis' }, { label: 'Senaryo taslağı', value: 'a scene-by-scene screenplay outline' }, { label: 'Yapım planı', value: 'a production plan with schedule and budget lines' }] },
      { slotId: 'stage', question: 'Proje şu an nerede?', options: [{ label: 'Sadece fikir', value: 'only an idea' }, { label: 'Hikâye hazır', value: 'the story is ready' }] },
    ],
    // Canlı testteki hatalı çıktı: mekanik etiketler + sona eklenen makale cümleleri + genel hayat tavsiyesi
    bad: {
      prompt: 'Rol: Konu uzmanı. Bağlam: Kullanıcı film yapmak istiyor. Görev: Süreç hakkında bilgi ver. Format: Başlangıç seviyesinde kısa bir paragraf. Uzunluk: Orta. Sinema filmi yapmak, hayal gücünüzü gerçeğe dönüştürmek için harika bir fırsattır. İlk adım senaryonuzu yazmaktır.',
      howToUse: ['Yukarıdaki bilgileri okuyun.', 'Senaryonuzu yazmaya başlayın.', 'Ekibinizi ve oyuncularınızı belirleyin.'],
      assumptions: [{ slotId: 'audience', value: 'a beginner', why: 'Belirtilmedi; varsayılan kullanıldı.' }, { slotId: 'tone', value: 'friendly', why: 'Belirtilmedi; varsayılan kullanıldı.' }],
    },
    good: {
      prompt: `Uzun metraj filmler geliştiren kıdemli bir yapımcı ve baş yaratıcı yönetmen gibi davran; bu sinema filmini benimle birlikte fikirden çekime hazır bir projeye dönüştüreceksin.

Projenin bağlamı: Tür, bütçe ve hedef izleyici için [tür], [bütçe aralığı] ve [hedef izleyici] yer tutucularını kullan; bilmediğin bilgiyi uydurma.

Benden beklediğin çıktı:
1. Konsept: tek cümlelik logline ve yarım sayfalık sinopsis.
2. Karakterler ve atmosfer: ana karakterlerin arzusu, çatışması ve görsel dünyanın tonu.
3. Perde ve sahne akışı: üç perdelik yapı, her perdede ana sahneler.
4. Yapım yol haritası: ön yapım, çekim ve post prodüksiyon için kilometre taşları.

Çalışma kuralı: genel bilgi verme, bu dört bölümü şimdi somut olarak üret; kritik bir bilgi eksikse başlamadan önce en fazla 2 soru sor.`,
      howToUse: [
        'Promptu ChatGPT\'ye yapıştır; [tür], [bütçe aralığı] ve [hedef izleyici] alanlarını kendi projene göre doldur.',
        'İlk yanıtta logline ve perde akışının senin hikâyene uyduğunu kontrol et.',
        'Ardından "2. perdenin sahnelerini diyalog taslağıyla genişlet" diye takip mesajı gönder.',
      ],
      assumptions: [{ slotId: 'audience', value: 'a beginner', why: 'Hedef kitle belirtilmedi.' }, { slotId: 'tone', value: 'friendly', why: 'Yaratıcı iş birliği için sıcak bir dil uygun.' }],
    },
    detailed: 'Korku türünde, 90 dakikalık, düşük bütçeli bir sinema filmi yapmak istiyorum; İstanbul\'da geçecek, senaryo taslağına ihtiyacım var',
    detailedPrompt: `Düşük bütçeli korku filmleri geliştiren kıdemli bir senarist ve yapımcı gibi davran; İstanbul'da geçen 90 dakikalık bir korku filminin senaryo taslağını benimle birlikte kur.

Bağlam ve kısıtlar: bütçe düşük, bu yüzden az mekân ve küçük oyuncu kadrosu kullan; ayrıntılı bütçe için [bütçe aralığı] yer tutucusunu bırak.

Benden beklediğin çıktı:
1. Konsept: logline ve korkunun kaynağını anlatan kısa sinopsis.
2. Karakterler ve atmosfer: ana karakterler, korkunun tonu ve İstanbul mekânlarının dokusu.
3. Perde ve sahne akışı: üç perde, her perdede sahne sahne olay örgüsü ve gerilim noktaları.

Çalışma kuralı: genel bilgi verme, taslağı şimdi somut olarak yaz; kritik bir bilgi eksikse başlamadan önce en fazla 2 soru sor.`,
  },
  en: {
    goal: 'I want to make a feature film',
    questions: [
      { slotId: 'deliverable', question: 'Which stage of the film should the prompt cover?', options: [{ label: 'Concept and logline', value: 'a concept, logline and synopsis' }, { label: 'Screenplay outline', value: 'a scene-by-scene screenplay outline' }, { label: 'Production plan', value: 'a production plan with schedule and budget lines' }] },
      { slotId: 'stage', question: 'Where is the project now?', options: [{ label: 'Just an idea', value: 'only an idea' }, { label: 'Story is ready', value: 'the story is ready' }] },
    ],
    bad: {
      prompt: 'Role: Subject expert. Context: The user wants to make a film. Task: Explain the process. Format: A short paragraph at beginner level. Length: Medium. Making a film is a great opportunity to bring your vision to life. The first step is writing your script.',
      howToUse: ['Read the information above.', 'Start writing your script.', 'Find your crew and cast.'],
    },
    good: {
      prompt: `Act as a senior film producer and creative director who develops feature films; you will turn this film with me from an idea into a project ready to shoot.

Project context: use the [genre], [budget range] and [target audience] placeholders and do not invent facts you do not have.

The output I expect from you:
1. Concept: a one-sentence logline and a half-page synopsis.
2. Characters and atmosphere: what the leads want, their conflict and the visual tone.
3. Act and scene flow: a three-act structure with the key scenes of each act.
4. Production roadmap: milestones for pre-production, shooting and post-production.

Working rule: do not give general information; produce these four sections now, and if a critical detail is missing ask at most 2 questions before you start.`,
      howToUse: [
        'Paste the prompt into ChatGPT and fill in [genre], [budget range] and [target audience] for your project.',
        'In the first response, check that the logline and act flow fit your story.',
        'Then send the follow-up "Expand the act 2 scenes with draft dialogue".',
      ],
      assumptions: [{ slotId: 'audience', value: 'a beginner', why: 'No audience given.' }],
    },
    detailed: 'I want to make a 90-minute low-budget horror feature film set in Lisbon and need a screenplay outline',
    detailedPrompt: `Act as a senior screenwriter and producer of low-budget horror films; build with me the screenplay outline of a 90-minute horror feature set in Lisbon.

Context and constraints: the budget is low, so use few locations and a small cast; leave a [budget range] placeholder for the detailed budget.

The output I expect from you:
1. Concept: a logline and a short synopsis that shows the source of the horror.
2. Characters and atmosphere: the leads, the tone of the fear and the texture of the Lisbon locations.
3. Act and scene flow: three acts with a scene-by-scene plot and the tension beats in each act.

Working rule: do not give general information; write the outline now, and if a critical detail is missing ask at most 2 questions before you start.`,
  },
} as const;

for (const locale of ['tr', 'en'] as const) {
  const f = FILM[locale];
  describe(`${locale.toUpperCase()}: "${f.goal}"`, () => {
    it('geniş hedef: önce stratejik navigasyon soru kartı, prompt üretilmez', async () => {
      const { llm, calls } = llmFor({
        isBroadGoal: true,
        slots: [guess('intent', 'build it with me end to end', locale === 'tr' ? 'Birlikte inşa' : 'Build it together'), guess('deliverable', 'a concept, logline and synopsis', locale === 'tr' ? 'Konsept' : 'Concept')],
        questions: [...f.questions],
      }, [f.good]);
      const r = await startPromptSession({ productId: 'chatgpt-gpt-5', goal: f.goal, conversation: [{ role: 'user', content: f.goal }], locale }, deps(llm));
      if ('error' in r || r.card.type !== 'prompt_question') return assert.fail(JSON.stringify(r));
      assert.deepStrictEqual(r.card.questions.map((q) => q.slotId), ['intent', 'deliverable', 'stage']);
      assert.strictEqual(r.card.questions[1].question, f.questions[0].question, 'hedefe özel, kullanıcının dilinde soru');
      assert.deepStrictEqual(calls.map((c) => c.name), ['slot_extraction']);
      assert.match(calls[0].system, new RegExp(`in ${locale === 'tr' ? 'Turkish' : 'English'}`));
    });

    it('cevaplardan sonra: canlı testteki hatalı çıktı (etiket yığını, makale cümleleri, hayat tavsiyesi, ham İngilizce varsayım) onarılır; kart temiz', async () => {
      const { llm, calls } = llmFor({
        isBroadGoal: true,
        slots: [guess('intent', 'build it with me end to end', locale === 'tr' ? 'Birlikte inşa' : 'Build it together'), guess('deliverable', 'a concept, logline and synopsis', locale === 'tr' ? 'Konsept' : 'Concept')],
        questions: [...f.questions],
      }, [f.bad, f.good]);
      const d = deps(llm);
      const q = await startPromptSession({ productId: 'chatgpt-gpt-5', goal: f.goal, conversation: [{ role: 'user', content: f.goal }], locale }, d);
      if ('error' in q || q.card.type !== 'prompt_question') return assert.fail();
      const a = await answerPromptQuestions({ promptSessionId: q.card.promptSessionId, answers: { intent: 'build', deliverable: 'o1', stage: 'o1' } }, d);
      if ('error' in a || a.card.type !== 'prompt') return assert.fail(JSON.stringify(a));

      const repair = JSON.parse(calls.at(-1)!.user).fixTheseValidatorErrors as Record<string, string[]>;
      const msg = repair.safe.join(' ');
      assert.match(msg, /mechanical labels/);
      assert.match(msg, /do not shrink it/);
      assert.match(msg, /not the executor/);
      assert.match(repair.howToUse.join(' '), /using THIS prompt in ChatGPT/);
      assert.strictEqual(a.card.variants[0].prompt, f.good.prompt);
      assert.deepStrictEqual(a.card.howToUse, [...f.good.howToUse]);
      assertCleanCard(a.card, f.goal, locale);
      if (locale === 'tr') {
        const byId = Object.fromEntries(a.card.assumptions.map((x) => [x.slotId, x.value]));
        assert.strictEqual(byId.audience, 'Yeni başlayan biri');
        assert.strictEqual(byId.tone, 'Samimi');
      }
    });

    it('detaylı hedef: soru kartı yok, doğrudan disipline uygun (konsept, karakter, perde akışı) PromptCard', async () => {
      const goal = f.detailed;
      const { llm, calls } = llmFor({
        isBroadGoal: false,
        slots: [said('intent', 'build it with me end to end', locale === 'tr' ? 'Birlikte inşa' : 'Build it together'), said('deliverable', 'a scene-by-scene screenplay outline', locale === 'tr' ? 'Senaryo taslağı' : 'Screenplay outline')],
      }, [{ ...f.good, prompt: f.detailedPrompt }]);
      const r = await startPromptSession({ productId: 'chatgpt-gpt-5', goal, conversation: [{ role: 'user', content: goal }], locale }, deps(llm));
      if ('error' in r || r.card.type !== 'prompt') return assert.fail(JSON.stringify(r));
      assert.deepStrictEqual(calls.map((c) => c.name), ['slot_extraction', 'prompt_generation'], 'soru kartı yok, onarım gerekmedi');
      assert.strictEqual(JSON.parse(calls[1].user).intentHint, 'build');
      assert.match(calls[1].system, /Discipline method: .*creative production -> concept\/logline, characters and atmosphere, scene\/act flow/);
      assert.match(calls[1].system, /End with a short working rule that stops shallow answers/);
      assert.match(calls[1].system, /"safe" = direct, structured, industry-standard/);
      assertCleanCard(r.card, goal, locale);
    });
  });
}

describe('kalkan ayrıntıları (TR/EN)', () => {
  it('niyet küçültme: istek sayılır, olumsuzlanmış kullanım ("genel bilgi verme", "do not give general information") sayılmaz', () => {
    assert.ok(asksForShallowOutput('Süreç hakkında başlangıç seviyesinde kısa bir paragraf yaz.'));
    assert.ok(asksForShallowOutput('Give a brief overview of the process.'));
    assert.ok(!asksForShallowOutput('Çalışma kuralı: genel bilgi verme, taslağı şimdi yaz.'));
    assert.ok(!asksForShallowOutput('Working rule: do not give general information; write the outline now.'));
    assert.ok(!asksForShallowOutput('Produce the full plan, not a short paragraph.'));
  });

  it('talimattan sonra okura konuşan makale cümleleri yakalanır; talimat sonu cümleleri ("olsun", "should") serbest', () => {
    const tr = 'Kıdemli bir yapımcı gibi davran ve filmin konseptini hazırla. Sinema filmi yapmak, hayal gücünüzü gerçeğe dönüştürmek için harika bir fırsattır. İlk adım senaryonuzu yazmaktır.';
    const en = 'Act as a senior producer and draft the film concept. Making a film is a great opportunity to bring your vision to life. The first step is always writing your script.';
    for (const p of [tr, en]) assert.ok(sufficiencyIssues({ prompt: p, negativePrompt: null, settings: [] }, { guide: chat, goal: 'film', productName: 'ChatGPT' }).some((i) => /talk to the user about the topic/.test(i.message)), p);
    const fine = 'Kıdemli bir yapımcı gibi davran ve filmin konseptini hazırla. Ton karanlık ve gerilimli olsun. Her perde en fazla sekiz sahneden oluşmalı.';
    assert.deepStrictEqual(trailingAnswer(fine), []);
    assert.deepStrictEqual(trailingAnswer('Draft the concept. The tone should be dark. Each act must have at most eight scenes.'), []);
  });

  it('howToUse: üç adımın her biri promptun araçta kullanımını anlatmalı; tek bir hayat tavsiyesi bile kabul edilmez', () => {
    assert.strictEqual(howToUseIssues(['Promptu ChatGPT\'ye yapıştır.', 'İlk yanıtı kontrol et.', 'Ekibinizi ve oyuncularınızı belirleyin.'], 'ChatGPT').length, 1);
    assert.strictEqual(howToUseIssues(['Paste the prompt into ChatGPT.', 'Check the first response.', 'Find your crew and cast.'], 'ChatGPT').length, 1);
  });
});
