// Anlama katmanı (lib/intent/understanding.ts) ve recommendV3'teki "tahmin yerine soru" kapısı.
// Ağ yok, KV yok (LLM'li uçtan uca senaryolar: understandingGate*.test.ts).
//
// Amaç: "kubernetes terraform" gibi katalogda KARŞILIĞI OLMAYAN bir konu, en yakın görevdeki alakasız araca
// (Replit Agent) yönlendirilmesin; sistem anlamazsa sorsun. Hiçbir test "unity" kelimesini koda yazmaz:
// karar kataloğun kendi sözcük dağarcığından çıkar, bu yüzden her yeni konuda aynı şekilde çalışır.

import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { defaultSearchContext } from '../catalog/search';
import { normalizeTr } from '../text';
import { recommendV3, type RecommendV3Result } from '../recommendV3';
import { apiResponseFromV3 } from '../types';
import { getDictionary } from '../i18n/index';
import { product } from './catalogFixtures';
import { parseLLMClassification } from '../intent/taskClassifier';
import {
  approximateEnabled,
  contentWords,
  editDistance,
  GENERIC_WORDS,
  isSupported,
  relatedTasks,
  STARTER_TASKS,
  suggestSpelling,
  taskSupport,
  understandingEnabled,
  unknownTerms,
  wordMatches,
} from '../intent/understanding';

const ctx = defaultSearchContext();
const noLLM = { allowLLM: false } as const;

/** UNDERSTANDING_GATE'i geçici ayarlar; testler birbirini etkilemesin. */
async function withGate<T>(value: string | undefined, fn: () => Promise<T> | T): Promise<T> {
  const before = process.env.UNDERSTANDING_GATE;
  if (value === undefined) delete process.env.UNDERSTANDING_GATE;
  else process.env.UNDERSTANDING_GATE = value;
  try {
    return await fn();
  } finally {
    if (before === undefined) delete process.env.UNDERSTANDING_GATE;
    else process.env.UNDERSTANDING_GATE = before;
  }
}

describe('understanding: kelime eşleşmesi ve anlam taşıyan kelimeler', () => {
  it('wordMatches: eşit ya da ek almış hâl eşleşir; kısa/rastlantısal önek eşleşmez', () => {
    assert.ok(wordMatches('logo', 'logo'));
    assert.ok(wordMatches('logolar', 'logo'), 'sorgu kelimesi katalog kelimesiyle başlıyor');
    assert.ok(wordMatches('gammayi', 'gamma'));
    assert.ok(!wordMatches('log', 'logo'), 'sorgu kelimesi kısa bir önek: eşleşmez');
    assert.ok(!wordMatches('app', 'apple'), '4 harften kısa sorgu öneki: eşleşmez');
    assert.ok(!wordMatches('abc', 'abcdef'));
    assert.ok(!wordMatches('car', 'cardboard'));
  });

  it('contentWords: dolgu, eylem fiili, soru kelimesi, kısa kelime ve rakamı atar; tekrarsız', () => {
    assert.deepStrictEqual(contentWords('bana unity ile bir oyun yap'), ['unity', 'oyun']);
    assert.deepStrictEqual(contentWords('How do I create a godot godot game?'), ['godot', 'game']);
    assert.deepStrictEqual(contentWords('asdkfjaslkdfj qwerty 12345'), ['asdkfjaslkdfj', 'qwerty']);
    assert.deepStrictEqual(contentWords('bir şeyler yapmak istiyorum'), []);
  });

  it('GENERIC_WORDS: normalizeTr biçiminde (karşılaştırma bu biçimde yapılır)', () => {
    for (const w of GENERIC_WORDS) assert.strictEqual(w, normalizeTr(w), `normalize edilmemiş: ${w}`);
  });

  it('editDistance: ekleme, silme, değiştirme ve komşu harf yer değiştirme 1 adım', () => {
    assert.strictEqual(editDistance('abc', 'abc'), 0);
    assert.strictEqual(editDistance('abc', 'abd'), 1);
    assert.strictEqual(editDistance('abc', 'abcd'), 1);
    assert.strictEqual(editDistance('abcd', 'acbd'), 1);
    assert.ok(editDistance('abc', 'xyzuv') > 2);
  });
});

describe('understanding: katalogda karşılığı olmayan konu (eski Unity vakası, artık kubernetes terraform)', () => {
  it('unknownTerms: katalogda hiçbir yerde geçmeyen kelimeler, özgün yazımla; bilinenler listelenmez', () => {
    assert.deepStrictEqual(unknownTerms('kubernetes terraform', ctx), ['kubernetes', 'terraform']);
    assert.ok(unknownTerms('arduino ile robot yap', ctx).includes('arduino'));
    assert.ok(unknownTerms('Blender plugin yaz', ctx).includes('Blender'), 'özgün yazım (büyük harf) korunur');
    assert.deepStrictEqual(unknownTerms('logo tasarla', ctx), []);
    assert.deepStrictEqual(unknownTerms('a1 b2 c3 d4 e5 f6 g7', ctx, 3).length <= 3, true);
  });

  it('relatedTasks: hiçbir kelime katalogla örtüşmüyorsa boş (tahmin üretilmez)', () => {
    assert.deepStrictEqual(relatedTasks('kubernetes terraform', ctx), []);
    assert.deepStrictEqual(relatedTasks('asdkfjaslkdfj qwerty', ctx), []);
  });

  it('relatedTasks: örtüşme varsa o görev başta; zayıf rastlantılar (başka görevin açıklamasında geçen kelime) elenir', () => {
    assert.strictEqual(relatedTasks('logo', ctx)[0]?.taskId, 'image.logo');
    const excel = relatedTasks('excel makrosu yazdır', ctx);
    assert.strictEqual(excel[0]?.taskId, 'data.spreadsheet-analysis');
    assert.strictEqual(excel.length, 1, `göreli eşik: ${excel.map((r) => r.taskId).join(', ')}`);
    assert.ok(relatedTasks('logo', ctx, 2).length <= 2, 'limit uygulanır');
  });

  it('taskSupport/isSupported: seçilen görev sorgunun hiçbir kelimesini açıklamıyorsa DESTEKSİZ', () => {
    const noCover = taskSupport('kubernetes terraform', 'code.app-builder', ctx);
    assert.strictEqual(isSupported(noCover), false);
    assert.deepStrictEqual(noCover.explained, []);
    assert.strictEqual(noCover.coverage, 0);

    const logo = taskSupport('logo tasarla', 'image.logo', ctx);
    assert.strictEqual(isSupported(logo), true);
    assert.ok(logo.explained.includes('logo'));
    assert.ok(logo.coverage > 0 && logo.coverage <= 1);

    assert.strictEqual(isSupported(taskSupport('logo tasarla', 'video.text-to-video', ctx)), false, 'başka görev: logo kelimesini açıklamaz');
  });

  it('taskSupport: bilinmeyen görev id\'si hata fırlatmaz, desteksiz sayılır', () => {
    assert.strictEqual(isSupported(taskSupport('logo', 'yok.boyle-gorev', ctx)), false);
  });

  it('STARTER_TASKS: hepsi katalogda, aktif ürünlü ve tekrarsız (en az 6: ekranda 2 satır)', () => {
    assert.strictEqual(new Set(STARTER_TASKS).size, STARTER_TASKS.length);
    assert.ok(STARTER_TASKS.length >= 6);
    for (const id of STARTER_TASKS) {
      assert.ok(ctx.tasksById.has(id), `katalogda yok: ${id}`);
      assert.ok(ctx.products.some((p) => p.status === 'active' && p.tasks.includes(id)), `aktif ürünü yok: ${id}`);
    }
  });
});

describe('understanding: yazım önerisi (yalnızca tek kelimelik ürün adı hatası)', () => {
  it('"midjorney", "chatgpd" -> ürün adı önerisi; yalnızca o kelime değişir', () => {
    const m = suggestSpelling('midjorney', ctx);
    assert.strictEqual(m?.to, 'Midjourney');
    assert.strictEqual(m?.from, 'midjorney');
    assert.strictEqual(m?.corrected, 'Midjourney');

    const c = suggestSpelling('chatgpd nedir', ctx);
    assert.strictEqual(c?.to, 'ChatGPT');
    assert.strictEqual(c?.corrected, 'ChatGPT nedir', 'diğer kelimeler aynen kalır');
  });

  it('öneri YOK: kelime zaten katalogda, çok kelimeli, kısa ya da bir ürüne yakın değil', () => {
    assert.strictEqual(suggestSpelling('midjourney', ctx), null, 'doğru yazılmış');
    assert.strictEqual(suggestSpelling('logo tasarla', ctx), null);
    assert.strictEqual(suggestSpelling('midjorney ile logo', ctx), null, 'iki anlamlı kelime: tahmin etme');
    assert.strictEqual(suggestSpelling('unity', ctx), null);
    assert.strictEqual(suggestSpelling('çevirmem', ctx), null, 'Türkçe ek almış sıradan kelime');
    assert.strictEqual(suggestSpelling('shoes', ctx), null);
    assert.strictEqual(suggestSpelling('', ctx), null);
  });
});

describe('understanding: kapatma anahtarı', () => {
  it('UNDERSTANDING_GATE=off kapatır; varsayılan açık', async () => {
    await withGate(undefined, () => assert.strictEqual(understandingEnabled(), true));
    await withGate('off', () => assert.strictEqual(understandingEnabled(), false));
    await withGate('on', () => assert.strictEqual(understandingEnabled(), true));
  });
});

describe('understanding: tahmini eşleşme kapatma anahtarı', () => {
  it('APPROXIMATE_RESULTS=off yalnızca tahmini eşleşmeyi kapatır; anlama kapısı açık kalır', async () => {
    const before = process.env.APPROXIMATE_RESULTS;
    try {
      delete process.env.APPROXIMATE_RESULTS;
      assert.strictEqual(approximateEnabled(), true);
      process.env.APPROXIMATE_RESULTS = 'off';
      assert.strictEqual(approximateEnabled(), false);
      assert.strictEqual(understandingEnabled(), true);
    } finally {
      if (before === undefined) delete process.env.APPROXIMATE_RESULTS;
      else process.env.APPROXIMATE_RESULTS = before;
    }
  });
});

describe('tahmini eşleşme notu: hata gibi görünmez', () => {
  it('tr ve en sözlükte tek satırlık not var ({task} yer tutucusu); eski uyarı metinleri kalmadı', () => {
    for (const locale of ['tr', 'en'] as const) {
      const v3 = getDictionary(locale).v3 as Record<string, string>;
      assert.ok(v3.approxNote.includes('{task}'), `${locale}: approxNote`);
      assert.ok(v3.approxNote.length < 80, `${locale}: tek satır kalmalı`);
      for (const old of ['approxTitle', 'approxBody', 'approxBodyNoTerms']) assert.strictEqual(v3[old], undefined, `${locale}: ${old} kaldırıldı`);
    }
  });

  it('kart: uyarı rengi/ikonu yok (amber, AlertTriangle yalnızca fiyat/kısıt gevşetme notlarında)', () => {
    const source = readFileSync(new URL('../../components/SimpleRecommendationDisplay.tsx', import.meta.url), 'utf8');
    const block = source.slice(source.indexOf('{approximate && ('), source.indexOf('{recommendation.searched && ('));
    assert.ok(block.includes('dict.v3.approxNote'));
    assert.ok(!/amber|AlertTriangle|destructive/.test(block), 'tahmini eşleşme notu uyarı gibi boyanmamalı');
  });
});

describe('apiResponseFromV3: yeni alanlar arayüze taşınır', () => {
  const dict = getDictionary('tr');
  const label = { en: 'Code assistant', tr: 'Kod asistanı' };

  it('clarify: reason, unknownTerms ve suggestion aktarılır; yoksa hiç eklenmez (eski biçim aynen)', () => {
    const base: RecommendV3Result = { kind: 'clarify', options: [{ taskId: 'code.debug', label }] };
    assert.deepStrictEqual(apiResponseFromV3(base, dict, 'tr'), { type: 'clarify', options: [{ taskId: 'code.debug', label: 'Kod asistanı' }] });

    const full = apiResponseFromV3({ ...base, reason: 'no_match', unknownTerms: ['unity'], suggestion: 'Midjourney' }, dict, 'tr');
    assert.deepStrictEqual(full, {
      type: 'clarify',
      options: [{ taskId: 'code.debug', label: 'Kod asistanı' }],
      reason: 'no_match',
      unknownTerms: ['unity'],
      suggestion: 'Midjourney',
    });
  });

  it('recommendation: approximate etiketi ve diğer işler aktarılır; yoksa alan hiç yok', () => {
    const item = { product: product('a'), confidence: 'low' as const, reasons: [], dataDate: null, sources: [], basis: 'evidence' as const };
    const plain: RecommendV3Result = { kind: 'recommendation', taskId: 'code.assistant-ide', taskLabel: label, taskConfidence: 0.7, taskSource: 'llm', items: [item] };
    const noApprox = apiResponseFromV3(plain, dict, 'tr');
    assert.ok(noApprox && noApprox.type === 'simple' && !('approximate' in noApprox));

    const r = apiResponseFromV3(
      { ...plain, approximate: { unknownTerms: ['kubernetes', 'terraform'], otherTasks: [{ taskId: 'code.app-builder', label: { en: 'App builder', tr: 'Uygulama oluşturucu' } }] } },
      dict,
      'tr'
    );
    assert.ok(r && r.type === 'simple');
    if (r && r.type === 'simple') {
      assert.deepStrictEqual(r.approximate, { unknownTerms: ['kubernetes', 'terraform'], otherTasks: [{ taskId: 'code.app-builder', label: 'Uygulama oluşturucu' }] });
    }
  });
});

describe('parseLLMClassification: fit ve closest', () => {
  const IDS = ['chat.general-assistant', 'code.app-builder', 'code.assistant-ide', '3d.generate', 'image.generate'];
  const ALL = new Set(IDS.filter((id) => id !== 'image.generate'));
  const json = (o: object) =>
    JSON.stringify({ taskId: 'code.app-builder', confidence: 0.8, pricing: 'unspecified', language: 'tr', needsClarification: false, candidates: [], fit: 'exact', ...o });

  it('fit exact/partial/none okunur; geçersiz ya da eksikse yok (eski önbellek kayıtlarıyla uyumlu)', () => {
    for (const fit of ['exact', 'partial', 'none'] as const) assert.strictEqual(parseLLMClassification(json({ fit }), IDS, ALL, true)?.fit, fit);
    assert.strictEqual(parseLLMClassification(json({ fit: 'belki' }), IDS, ALL, true)?.fit, undefined);
    const noFit = JSON.parse(json({}));
    delete noFit.fit;
    const r = parseLLMClassification(JSON.stringify(noFit), IDS, ALL, true);
    assert.ok(r);
    assert.strictEqual(r.fit, undefined);
    assert.strictEqual(r.taskId, 'code.app-builder', 'fit olmadan da sınıflandırma çalışır');
  });

  it('closest: needsClarification false olsa bile adaylar okunur; bilinmeyen id, ürünsüz görev ve tekrar süzülür', () => {
    const r = parseLLMClassification(
      json({ fit: 'partial', candidates: ['code.assistant-ide', 'yok.boyle', 'image.generate', '3d.generate', 'code.assistant-ide'] }),
      IDS,
      ALL,
      true
    );
    assert.deepStrictEqual(r?.closest, ['code.assistant-ide', '3d.generate']);
    assert.strictEqual(r?.clarifyCandidates, undefined, 'belirsizlik kararı değil');
  });

  it('closest: aday yoksa ya da tipi bozuksa alan hiç yok', () => {
    assert.strictEqual(parseLLMClassification(json({ candidates: [] }), IDS, ALL, true)?.closest, undefined);
    assert.strictEqual(parseLLMClassification(json({ candidates: 'code.debug' }), IDS, ALL, true)?.closest, undefined);
  });
});

describe('recommendV3: anlama kapısı (LLM anahtarı yokken kural yedeği)', () => {
  it('"kubernetes terraform" -> alakasız araç yerine soru: reason no_match, bilinmeyen kelimeler, başlangıç görevleri', async () => {
    const r = await recommendV3('kubernetes terraform', 'all', { ...noLLM, ctx });
    assert.strictEqual(r.kind, 'clarify');
    if (r.kind !== 'clarify') return;
    assert.strictEqual(r.reason, 'no_match');
    assert.deepStrictEqual(r.unknownTerms, ['kubernetes', 'terraform']);
    assert.deepStrictEqual(r.options.map((o) => o.taskId), STARTER_TASKS.slice(0, 6));
    assert.ok(!r.options.some((o) => o.taskId === 'code.app-builder'), 'Replit Agent\'ın görevi tahminle sunulmaz');
  });

  it('başka konular da aynı şekilde yakalanır (kodda konuya özel kural yok)', async () => {
    for (const q of ['arduino ile robot yap', 'blender plugin yaz', 'kubernetes cluster kur']) {
      const r = await recommendV3(q, 'all', { ...noLLM, ctx });
      assert.strictEqual(r.kind, 'clarify', q);
      if (r.kind === 'clarify') assert.strictEqual(r.reason, 'no_match', q);
    }
  });

  it('hiçbir ipucu ve bilinmeyen kelime yoksa reason unclear (unknownTerms yok)', async () => {
    const r = await recommendV3('bir şeyler yapmak istiyorum', 'all', { ...noLLM, ctx });
    assert.strictEqual(r.kind, 'clarify');
    if (r.kind !== 'clarify') return;
    assert.strictEqual(r.reason, 'unclear');
    assert.strictEqual(r.unknownTerms, undefined);
    assert.strictEqual(r.options.length, 6);
  });

  it('kural katmanı kesinse kapı hiç devreye girmez (görev ve kaynak aynı)', async () => {
    const r = await recommendV3('logo tasarla', 'all', { ...noLLM, ctx });
    assert.notStrictEqual(r.kind, 'clarify');
    assert.strictEqual((r as { taskId?: string }).taskId, 'image.logo');
    assert.strictEqual((r as { taskSource?: string }).taskSource, 'rules');
  });

  it('kullanıcı bir seçenek seçtiyse (taskId) sorgu desteksiz olsa da sorulmaz: kullanıcının kararıdır', async () => {
    const r = await recommendV3('kubernetes terraform', 'all', { ...noLLM, ctx, taskId: 'code.assistant-ide' });
    assert.notStrictEqual(r.kind, 'clarify');
    assert.strictEqual((r as { taskId?: string }).taskId, 'code.assistant-ide');
    // Kanıtlı ürün varsa kaynak 'user'; yoksa (no_evidence) sonuç kaynak taşımaz. İkisi de "soruldu" değildir.
    if (r.kind === 'recommendation') assert.strictEqual(r.taskSource, 'user');
  });

  it('alan sorusu (domainClarify) ve klasik belirsizlik etkilenmez: reason yok', async () => {
    const r = await recommendV3('kodla ilgili yardım', 'all', { ...noLLM, ctx });
    assert.strictEqual(r.kind, 'clarify');
    if (r.kind !== 'clarify') return;
    assert.strictEqual(r.reason, undefined);
    assert.strictEqual(r.suggestion, undefined);
  });

  it('UNDERSTANDING_GATE=off: eski davranış (reason yok, tasks.json sırasıyla 3 görev)', async () => {
    await withGate('off', async () => {
      const r = await recommendV3('kubernetes terraform', 'all', { ...noLLM, ctx });
      assert.strictEqual(r.kind, 'clarify');
      if (r.kind !== 'clarify') return;
      assert.strictEqual(r.reason, undefined);
      assert.strictEqual(r.unknownTerms, undefined);
      assert.strictEqual(r.options.length, 3);
    });
  });
});

describe('recommendV3: "… mi demek istedin?" yazım önerisi', () => {
  it('tek kelimelik ürün adı hatası -> reason spelling, düzeltilmiş sorgu, seçenek yok', async () => {
    const r = await recommendV3('midjorney', 'all', { ...noLLM, ctx });
    assert.strictEqual(r.kind, 'clarify');
    if (r.kind !== 'clarify') return;
    assert.strictEqual(r.reason, 'spelling');
    assert.strictEqual(r.suggestion, 'Midjourney');
    assert.deepStrictEqual(r.options, []);
  });

  it('düzeltilmiş sorgu gerçekten o ürüne çözülür (kullanıcı düğmeye basınca ürün gösterilir)', async () => {
    const r = await recommendV3('Midjourney', 'all', { ...noLLM, ctx });
    assert.notStrictEqual(r.kind, 'clarify');
    assert.strictEqual((r as { taskSource?: string }).taskSource, 'name');
  });

  it('öneri bir ürün adına ÇÖZÜLMÜYORSA sunulmaz ("slack" ~ "Black": Black tek başına ürün adı değil)', async () => {
    // Ön koşul: ham öneri var (yoksa bu test bir şey sınamaz; katalog değişirse benzer bir kelime seç).
    const raw = suggestSpelling('slack', ctx);
    assert.ok(raw, 'ön koşul: slack için ham öneri üretilmeli');
    const r = await recommendV3('slack', 'all', { ...noLLM, ctx });
    assert.ok(r.kind !== 'clarify' || r.reason !== 'spelling', 'yanlış yazım önerisi gösterilmemeli');
  });

  it('doğru yazılmış ürün adı öneri çıkarmaz', async () => {
    const r = await recommendV3('chatgpt', 'all', { ...noLLM, ctx });
    assert.ok(r.kind !== 'clarify' || r.reason !== 'spelling');
  });

  it('UNDERSTANDING_GATE=off: yazım önerisi yapılmaz', async () => {
    await withGate('off', async () => {
      const r = await recommendV3('midjorney', 'all', { ...noLLM, ctx });
      assert.ok(r.kind !== 'clarify' || r.reason !== 'spelling');
    });
  });
});
