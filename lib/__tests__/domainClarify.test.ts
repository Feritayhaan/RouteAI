// Eksik bilgili sorgu -> soru sor (lib/intent/domainClarify.ts, recommendV3 entegrasyonu).
// Gerçek katalog kullanılır; OpenAI çağrısı yapılmaz (allowLLM: false ya da LLM'e hiç inmeyen yollar).
//
// Sorgu listeleri sözlükten BAĞIMSIZ yazıldı (sözlüğe bakmadan, "kullanıcı bunu yazar mı?"
// diye): hem "sorulmalı" hem "sorulmamalı" tarafı var. Sözlüğü genişletirken bu iki listeyi
// de büyüt; "sorulmamalı" listesi hassasiyetin (yanlış alarm = 0) bekçisidir.
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { DOMAINS, FILLERS, domainClarify } from '../intent/domainClarify';
import { defaultSearchContext } from '../catalog/search';
import { recommendV3 } from '../recommendV3';
import { loadCatalog } from '../catalog/index';
import { parseGolden } from '../../evals/metrics.mjs';
import { ctx, product, task } from './catalogFixtures';

const noLLM = { allowLLM: false } as const;
const real = defaultSearchContext();

const CODE = ['code.assistant-ide', 'code.debug', 'code.app-builder', 'code.agent-cli'];
const VIDEO = ['video.text-to-video', 'video.image-to-video', 'video.edit-short-social', 'video.avatar-presenter', 'video.repurpose-clips', 'video.subtitles'];
const IMAGE = ['image.generate', 'image.edit', 'image.logo', 'image.product-photo', 'image.background-remove', 'image.upscale'];
const AUDIO = ['audio.tts-voiceover', 'audio.voice-clone', 'audio.transcribe', 'audio.cleanup', 'music.generate'];
const WRITING = ['text.write-longform', 'text.marketing-copy', 'text.email', 'text.rewrite-edit'];
const CONTENT = ['text.write-longform', 'text.marketing-copy', 'design.social-graphic', 'video.edit-short-social'];
const RESEARCH = ['research.web', 'research.academic', 'research.document-qa'];

describe('eksik bilgili sorgu: SORULMALI', () => {
  const cases: [string, string[]][] = [
    // kod
    ['kodla ilgili yardım almak istiyorum', CODE],
    ['kodlama konusunda yardıma ihtiyacım var', CODE],
    ['kodumla ilgili yardım lazım', CODE],
    ['yazılım projem için yardım lazım', CODE],
    ['I need help with coding', CODE],
    ["I'm a developer and need some help", CODE],
    ['help with my code', CODE],
    // video
    ['video', VIDEO],
    ['VİDEO LAZIM', VIDEO],
    ['video yapmak istiyorum', VIDEO],
    ['bana bir video lazım', VIDEO],
    ['yapay zeka ile video yapmak istiyorum', VIDEO],
    ['I want to make a video', VIDEO],
    ['I need a video for my business', VIDEO],
    ['help me with video', VIDEO],
    // görsel
    ['görsel lazım', IMAGE],
    ['gorsel lazim', IMAGE],
    ['resim yapmak istiyorum', IMAGE],
    ['fotoğraf lazım', IMAGE],
    ['I need an image', IMAGE],
    ['I need a picture for my brand', IMAGE],
    // ses
    ['ses lazım', AUDIO],
    ['ses ile ilgili yardım istiyorum', AUDIO],
    ['I need audio', AUDIO],
    // yazı
    ['yazı yazmak istiyorum', WRITING],
    ['bir şeyler yazmak istiyorum', WRITING],
    ['metin lazım', WRITING],
    ['I want to write something', WRITING],
    ['help me with writing', WRITING],
    // içerik
    ['içerik lazım', CONTENT],
    ['içerik ile ilgili yardım istiyorum', CONTENT],
    ['I need content', CONTENT],
    ['help me with content for my company', CONTENT],
    // araştırma
    ['araştırma yapmak istiyorum', RESEARCH],
    ['araştırma lazım', RESEARCH],
    ['I need help with research', RESEARCH],
    ['I need research', RESEARCH],
  ];

  for (const [query, expected] of cases) {
    it(`"${query}" -> ${expected.length} seçenek`, () => {
      assert.deepStrictEqual(domainClarify(query, real), expected);
    });
  }
});

describe('eksik bilgili sorgu: SORULMAMALI (hassasiyet)', () => {
  it('sorguda görev bilgisi taşıyan gerçek bir kelime varsa susar', () => {
    for (const q of [
      // video + belirli bir iş
      'video altyazı ekle', 'video üret', 'video üretmek istiyorum', 'videoya altyazı lazım', 'instagram için video',
      'make a video from text', 'video from my photos', 'generate a video', 'videodan klip çıkar',
      // görsel + belirli bir iş
      'logo lazım', 'logo yap', 'görseli düzenle', 'resmi büyüt', 'ürün fotoğrafı lazım', 'photoshop lazım',
      'görsel oluştur', 'create an image', 'fotoğraf düzenleme',
      // ses + belirli bir iş
      'ses temizle', 'sesimi klonla', 'seslendirme lazım', 'voiceover for my video', 'audiobook', 'ses kaydını yazıya dök',
      // yazı + belirli bir iş
      'blog yazmak istiyorum', 'email yazmak istiyorum', 'I want to write a blog', 'ön yazı lazım', 'çeviri yap',
      // içerik / araştırma + belirli bir iş
      'podcast için içerik', 'sosyal medya içeriği lazım', 'akademik araştırma yapmak istiyorum', 'research online',
      'tez için araştırma', 'araştır',
      // kod + belirli bir iş
      'python ile bir script yazmak istiyorum', 'kodumda hata var', 'kod yazmadan uygulama yapmak istiyorum',
      'kodlama bilmeden mobil uygulama yapmak istiyorum', 'terminalden kod ajanı arıyorum', 'I need a coding assistant',
      // programlama olmayan "kod/program/yazılım"
      'QR kod oluşturmak istiyorum', 'indirim kodu bulmak istiyorum', 'doğrulama kodu gelmiyor', 'kod lazım',
      'discount code for a subscription', 'diyet programı hazırla', 'muhasebe yazılımı öner',
      // alan bile yok
      'merhaba', 'hello', 'bir şeyler yapmak istiyorum ama ne yapacağımı bilmiyorum', 'işim için yapay zeka aracı lazım',
      'excel analizi', 'toplantı notu', 'sunum hazırla', '', '   ', '???',
    ]) {
      assert.strictEqual(domainClarify(q, real), null, JSON.stringify(q));
    }
  });

  it('birden çok alana yayılan sorguda susar (hangisini istediği belli değil, tahmin etme)', () => {
    for (const q of ['video ve görsel lazım', 'I need video and audio', 'kodlama ve içerik için yardım istiyorum']) {
      assert.strictEqual(domainClarify(q, real), null, q);
    }
  });

  it('eylem fiilleri dolgu değildir (tasks.json anahtar kelimeleri onlara dayanır)', () => {
    const actionVerbs = ['üret', 'üretmek', 'oluştur', 'oluşturmak', 'hazırla', 'tasarla', 'düzenle', 'create', 'generate', 'edit', 'build', 'design'];
    const fillers = new Set(FILLERS.map((f) => f.replace(/\*$/, '')));
    for (const v of actionVerbs) assert.ok(!fillers.has(v), `"${v}" dolgu listesinde olmamalı`);
  });
});

describe('eksik bilgili sorgu: altın set (evals/golden.jsonl)', () => {
  const golden = parseGolden(readFileSync(new URL('../../evals/golden.jsonl', import.meta.url), 'utf8'));

  it('belirsiz OLMAYAN hiçbir altın satırda soru çıkmaz (yanlış alarm = 0)', () => {
    const falseAlarms = golden.filter((r) => !r.needsClarification && domainClarify(r.query, real) !== null).map((r) => r.query);
    assert.deepStrictEqual(falseAlarms, []);
  });

  it('belirsiz işaretli satırların bir kısmı yakalanır (sözlük sessizce ölmesin)', () => {
    // Sınır kasıtlı düşük: sözlük altın satırlar görüldükten sonra yazıldı, gerçek oran daha düşük olabilir.
    // Yakalanmayan satırlar ("Instagram için reels videosu" gibi) LLM katmanına ya da hiç soruya kalır.
    const caught = golden.filter((r) => r.needsClarification && domainClarify(r.query, real) !== null);
    assert.ok(caught.length >= 3, `yakalanan: ${caught.length}`);
  });
});

describe('eksik bilgili sorgu: sözlük tutarlılığı', () => {
  it('yalnızca şemsiye+dolgu kelimelerinden oluşan görev anahtar kelimeleri BİLİNEN liste (değişirse Ferit karar versin)', () => {
    // Bu anahtar kelimeler tek başına geçerse artık görev önermek yerine alan sorusu çıkar.
    // Listeye yeni giriş eklenmesi = tasks.json'a bilerek yazılmış bir anahtar kelimeyi soruya çevirmek.
    const vague = new Set<string>();
    for (const t of real.tasksById.values()) {
      for (const k of [...t.keywords.tr, ...t.keywords.en]) if (domainClarify(k, real)) vague.add(k);
    }
    assert.deepStrictEqual([...vague].sort(), ['ai image', 'image', 'picture', 'programming', 'research', 'resim', 'ses lazım', 'video', 'görsel'].sort());
  });

  it('her alanın görevi gerçek katalogda var ve en az bir aktif ürünü var (ürün kapanınca bu test uyarır)', () => {
    const catalog = loadCatalog();
    const tooBroad = ['kod', 'code', 'program', 'yazılım', 'software'];
    for (const d of DOMAINS) {
      assert.ok(d.terms.length > 0, `${d.id}: ifade yok`);
      for (const term of d.terms) {
        assert.ok(!tooBroad.includes(term.replace(/\*$/, '')), `${d.id}: yalın "${term}" yasak (QR kod, diyet programı, muhasebe yazılımı…)`);
      }
      assert.ok(d.tasks.length >= 2, `${d.id}: en az 2 görev gerekir`);
      for (const id of d.tasks) {
        assert.ok(catalog.tasksById.has(id), `${d.id}: ${id} katalogda yok`);
        assert.ok((catalog.productsByTask.get(id) ?? []).length > 0, `${d.id}: ${id} görevinin aktif ürünü yok`);
      }
    }
  });

  it('görev katalogda yoksa ya da aktif ürünü yoksa sunulmaz; ikiden az seçenek kalırsa soru sorulmaz', () => {
    const t = (id: string) => task(id);
    const only1 = ctx({ tasks: [t('code.debug')], products: [product('a', { tasks: ['code.debug'] })] });
    assert.strictEqual(domainClarify('kodla ilgili yardım', only1), null);

    const noActive = ctx({
      tasks: [t('code.debug'), t('code.app-builder')],
      products: [product('a', { tasks: ['code.debug'] }), { ...product('b', { tasks: ['code.app-builder'] }), status: 'retired' as const }],
    });
    assert.strictEqual(domainClarify('kodla ilgili yardım', noActive), null);

    const two = ctx({
      tasks: [t('code.agent-cli'), t('code.debug')],
      products: [product('a', { tasks: ['code.debug'] }), product('b', { tasks: ['code.agent-cli'] })],
    });
    assert.deepStrictEqual(domainClarify('kodla ilgili yardım', two), ['code.debug', 'code.agent-cli'], 'DOMAINS sırası korunur');
  });
});

describe('eksik bilgili sorgu: recommendV3 akışı', () => {
  it('"kodla ilgili yardım almak istiyorum" tahmin yerine 4 kod görevini sorar (LLM kapalıyken de)', async () => {
    const r = await recommendV3('kodla ilgili yardım almak istiyorum', 'all', { ...noLLM, ctx: defaultSearchContext() });
    assert.strictEqual(r.kind, 'clarify');
    if (r.kind !== 'clarify') return;
    assert.deepStrictEqual(r.options.map((o) => o.taskId), CODE);
    for (const o of r.options) assert.ok(o.label.tr && o.label.en);
  });

  it('LLM açıkken de OpenAI\'ye inmeden sorar', async () => {
    const r = await recommendV3('I need help with coding', 'all', { ctx: defaultSearchContext() });
    assert.strictEqual(r.kind, 'clarify');
    if (r.kind !== 'clarify') return;
    assert.strictEqual(r.options.length, 4);
  });

  it('kural katmanının tek göreve bağladığı "görsel lazım" artık görevi tahmin etmez, alanı sorar', async () => {
    const r = await recommendV3('görsel lazım', 'all', { ...noLLM, ctx: defaultSearchContext() });
    assert.strictEqual(r.kind, 'clarify');
    if (r.kind !== 'clarify') return;
    assert.deepStrictEqual(r.options.map((o) => o.taskId), IMAGE);
  });

  it('"video": kural katmanı beraberlikte olsa da altı video görevini sorar', async () => {
    const r = await recommendV3('video', 'all', { ...noLLM, ctx: defaultSearchContext() });
    assert.strictEqual(r.kind, 'clarify');
    if (r.kind !== 'clarify') return;
    assert.deepStrictEqual(r.options.map((o) => o.taskId), VIDEO);
  });

  it('belirli iş söyleyen sorgu hâlâ doğrudan öneri döner (sorulmaz)', async () => {
    // ctx verilince editör seçimleri varsayılan olarak boştur; gerçek akıştaki gibi verilir.
    const opts = { ...noLLM, ctx: defaultSearchContext(), editorPicks: loadCatalog().editorPicks };
    const py = await recommendV3('python ile bir script yazmak istiyorum', 'all', opts);
    assert.strictEqual(py.kind, 'recommendation');
    if (py.kind === 'recommendation') assert.strictEqual(py.taskId, 'code.assistant-ide');

    const logo = await recommendV3('logo lazım', 'all', opts);
    assert.strictEqual(logo.kind, 'recommendation');
    if (logo.kind === 'recommendation') assert.strictEqual(logo.taskId, 'image.logo');

    const subs = await recommendV3('video altyazı ekle', 'all', opts);
    assert.notStrictEqual(subs.kind, 'clarify');
  });

  it('seçenek seçilince (taskId) aynı sorgu o görevle öneri döner (tekrar sorulmaz)', async () => {
    const opts = { ...noLLM, ctx: defaultSearchContext(), editorPicks: loadCatalog().editorPicks };
    for (const [query, taskId] of [['kodla ilgili yardım almak istiyorum', 'code.debug'], ['video', 'video.subtitles'], ['görsel lazım', 'image.upscale']] as const) {
      const r = await recommendV3(query, 'all', { ...opts, taskId });
      assert.notStrictEqual(r.kind, 'clarify', query);
      if (r.kind === 'recommendation') assert.strictEqual(r.taskId, taskId, query);
    }
  });

  it('iş akışı şablonu eşleşen proje isteği alan sorusuna düşmez', async () => {
    const r = await recommendV3('podcast oluşturmak istiyorum', 'all', { ...noLLM, ctx: defaultSearchContext() });
    assert.notStrictEqual(r.kind, 'clarify', 'podcast bir alan şemsiyesi değil, şablon konusudur');
  });
});
