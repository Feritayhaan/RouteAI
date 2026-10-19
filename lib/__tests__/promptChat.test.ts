import assert from 'node:assert';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import type { PromptCard } from '../agent/cards';
import { chatPrompt } from '../chat/promptApi';
import { chatText, isRevertCommand, previousVersionOf } from '../promptBuilder/chat';
import { generatePrompt } from '../promptBuilder/generate';
import { loadGuides } from '../promptBuilder/guides';
import type { JsonRequest } from '../promptBuilder/llm';
import { refinePromptSession, startPromptSession, type PromptDeps, type PromptResult } from '../promptBuilder/service';
import { memoryPromptStore } from '../promptBuilder/store';
import { EDIT_HISTORY_MAX, EDIT_REQUEST_MAX, MAX_CHAT_TURNS, MAX_REFINEMENTS, MAX_VERSIONS, type PromptSession } from '../promptBuilder/types';
import { loadCatalog } from '../catalog/index';
import { promptRefineSchema } from '../validations/prompt';

// ------------------------------------------------------------------
// Sahte LLM: slot çıkarımı, niyet sınıflandırması ve üretim
// ------------------------------------------------------------------
type Intent = { intent: 'edit' | 'revert' | 'reply'; revertTo: number | null; reply: string };
const EDIT: Intent = { intent: 'edit', revertTo: null, reply: '' };

const fullSlots = { subject: 'a bakery logo', style: 'illustration', aspect: '1:1', mood: null, detail: null };

function chatLLM(opts: { intent?: (message: string) => Intent; extracted?: Record<string, string | null> } = {}) {
  const calls: JsonRequest[] = [];
  const llm = async (req: JsonRequest) => {
    calls.push(req);
    const input = JSON.parse(req.user);
    if (req.name === 'slot_extraction') {
      const slots = Object.entries(opts.extracted ?? fullSlots).map(([id, value]) => ({ id, value, source: 'user', confidence: value ? 0.9 : 0 }));
      return { data: { slots, goalSummary: 'summary' }, tokens: 10 };
    }
    if (req.name === 'prompt_chat_intent') return { data: (opts.intent ?? (() => EDIT))(input.message), tokens: 5 };
    // Üretim: önceki versiyon varsa onun üstüne "+ talimat" ekler (nelerin korunduğu görülsün)
    const slotValue = (id: string) => input.slots.find((s: { id: string }) => s.id === id)?.value ?? 'auto';
    const make = (id: 'safe' | 'creative') => {
      const prev = input.previousVersion?.variants.find((v: { id: string }) => v.id === id)?.prompt as string | undefined;
      const body = prev ? prev.replace(/ --ar .*$/, '') : `${id}: ${slotValue('subject')}, ${slotValue('style')}, mood=${slotValue('mood')}`;
      return `${body}${input.refinementInstruction ? ` + ${input.refinementInstruction}` : ''} --ar 1:1`;
    };
    return {
      data: {
        variants: [
          { id: 'safe', prompt: make('safe'), negativePrompt: null, settings: [] },
          { id: 'creative', prompt: make('creative'), negativePrompt: null, settings: [] },
        ],
        assumptions: [{ slotId: 'mood', value: slotValue('mood'), why: 'chosen' }],
        suggestedRefinements: [],
        howToUse: ['1', '2', '3'],
        changeSummary: input.refinementInstruction ? `changed: ${input.refinementInstruction}` : '',
      },
      tokens: 20,
    };
  };
  return { llm, calls };
}

function deps(llm: PromptDeps['llm'], store = memoryPromptStore()): PromptDeps {
  let n = 0;
  return { llm, store, guides: loadGuides(), products: loadCatalog().products, now: () => Date.parse('2026-10-18T00:00:00Z'), newId: () => `p_chat${++n}xx` };
}

type Ok = { card: PromptCard; chat: NonNullable<Extract<PromptResult, { card: unknown }>['chat']>; tokens: number };
function ok(r: PromptResult): Ok {
  assert.ok(!('error' in r), JSON.stringify(r));
  assert.strictEqual(r.card.type, 'prompt');
  assert.ok(r.chat, 'sohbet cevabı yok');
  return { card: r.card as PromptCard, chat: r.chat, tokens: r.tokens };
}

async function begin(opts: Parameters<typeof chatLLM>[0] = {}, locale: 'en' | 'tr' = 'tr') {
  const fake = chatLLM(opts);
  const d = deps(fake.llm);
  const r = await startPromptSession({ productId: 'midjourney-v7', goal: 'bakery logo', conversation: [{ role: 'user', content: 'logo for my bakery' }], locale }, d);
  assert.ok(!('error' in r) && r.card.type === 'prompt', JSON.stringify(r));
  if ('error' in r || r.card.type !== 'prompt') throw new Error('kart yok');
  const id = r.card.promptSessionId;
  const say = (message: string, baseVersion?: number) => refinePromptSession({ promptSessionId: id, message, ...(baseVersion ? { baseVersion } : {}) }, d);
  const stored = async () => (await d.store.get(id))!;
  return { ...fake, d, id, first: r.card, say, stored };
}

const generationCalls = (calls: JsonRequest[]) => calls.filter((c) => c.name === 'prompt_generation');
const lastGeneration = (calls: JsonRequest[]) => JSON.parse(generationCalls(calls).at(-1)!.user);

describe('sohbet: "geri al" komutu LLM çağrısı olmadan anlaşılır', () => {
  it('kısa komutlar geri alma sayılır', () => {
    for (const m of [
      'geri al', 'Geri al.', 'GERİ AL', 'geri dön', 'lütfen geri al', 'önceki', 'bir önceki', 'önceki sürüme dön', 'bir önceki haline dön',
      'önceki adıma git', 'son değişikliği geri al', 'eski haline dön', 'iptal', 'iptal et',
      'undo', 'Undo that', 'UNDO', 'go back', 'PREVIOUS VERSION', 'undo the last change', 'go back one step', 'revert',
    ]) assert.strictEqual(isRevertCommand(m), true, m);
  });

  it('içinde başka istek olan mesaj komut değil, düzenlemedir', () => {
    for (const m of [
      'sonuna uyarı ekle', 'geri al ve sonuna uyarı ekle', 'önceki paragrafı kısalt', 'geri dönüşüm temalı olsun', 'eski kameralar gibi yap',
      'go back to school theme', 'make it shorter', 'önceki sürümdeki gibi yap', '', '   ', 'tamam',
    ]) assert.strictEqual(isRevertCommand(m), false, m);
  });

  it('bir sürümün dönüş noktası: türetildiği sürüm, yoksa bir önceki, ilkinde 0', () => {
    const v = (n: number, parent?: number) => ({ n, ...(parent ? { parent } : {}) }) as Parameters<typeof previousVersionOf>[0];
    assert.strictEqual(previousVersionOf(v(4, 1)), 1);
    assert.strictEqual(previousVersionOf(v(4)), 3);
    assert.strictEqual(previousVersionOf(v(1)), 0);
  });
});

describe('sohbet: düzenleme', () => {
  it('niyet sınıflandırılır, gösterilen sürümün üstüne yeni sürüm gelir, cevap "ne değiştirdim" cümlesidir', async () => {
    const t = await begin();
    const r = ok(await t.say('sonuna kısa bir uyarı ekle'));
    assert.strictEqual(r.chat.action, 'edit');
    assert.strictEqual(r.chat.reply, 'changed: sonuna kısa bir uyarı ekle');
    assert.strictEqual(r.card.versionN, 2);
    assert.match(r.card.variants[0].prompt, /\+ sonuna kısa bir uyarı ekle/);
    assert.match(r.card.variants[1].prompt, /\+ sonuna kısa bir uyarı ekle/, 'iki varyant da değişir');
    assert.strictEqual(r.card.refinementsLeft, MAX_REFINEMENTS - 1);
    assert.strictEqual(r.tokens, 25, 'niyet (5) + üretim (20)');
    assert.deepStrictEqual(t.calls.map((c) => c.name), ['slot_extraction', 'prompt_generation', 'prompt_chat_intent', 'prompt_generation']);

    const gen = lastGeneration(t.calls);
    assert.strictEqual(gen.refinementInstruction, 'sonuna kısa bir uyarı ekle');
    assert.ok(gen.previousVersion);
    assert.strictEqual(gen.earlierRequests, undefined, 'ilk istekte geçmiş yok');

    const s = await t.stored();
    assert.deepStrictEqual(s.versions.map((v) => [v.n, v.parent ?? null]), [[1, null], [2, 1]]);
    assert.strictEqual(s.versions[1].summary, 'changed: sonuna kısa bir uyarı ekle');
    assert.deepStrictEqual(s.versions[1].edits, ['sonuna kısa bir uyarı ekle']);
    assert.strictEqual(s.chatTurns, 1);
  });

  it('önceki istekler üreticiye geçmiş olarak gider ("az önce eklediğini çıkar" çalışsın)', async () => {
    const t = await begin();
    ok(await t.say('a ekle'));
    ok(await t.say('b ekle'));
    ok(await t.say('az önce eklediğini çıkar'));
    assert.deepStrictEqual(lastGeneration(t.calls).earlierRequests, ['a ekle', 'b ekle']);
    const s = await t.stored();
    assert.deepStrictEqual(s.versions[3].edits, ['a ekle', 'b ekle', 'az önce eklediğini çıkar']);
  });

  it(`geçmişte her istek en fazla ${EDIT_REQUEST_MAX} karakter saklanır; üreticiye giden talimat tam kalır`, async () => {
    const t = await begin();
    const long = 'u'.repeat(900);
    ok(await t.say(long));
    assert.strictEqual(lastGeneration(t.calls).refinementInstruction, long);
    const s = await t.stored();
    assert.strictEqual(s.versions[1].edits![0].length, EDIT_REQUEST_MAX);
  });

  it(`geçmiş en fazla ${EDIT_HISTORY_MAX} istek tutar`, async () => {
    const t = await begin();
    for (let i = 1; i <= EDIT_HISTORY_MAX + 2; i++) ok(await t.say(`istek ${i}`));
    const s = await t.stored();
    assert.strictEqual(s.versions.at(-1)!.edits!.length, EDIT_HISTORY_MAX);
    assert.strictEqual(s.versions.at(-1)!.edits!.at(-1), `istek ${EDIT_HISTORY_MAX + 2}`);
  });

  it('eski bir sürümü gösterirken yazılan istek O sürümün üstüne gelir (dallanma); gerisi korunur', async () => {
    const t = await begin();
    const v2 = ok(await t.say('ikinci ekleme'));
    ok(await t.say('üçüncü ekleme'));
    const v1Prompt = t.first.variants[0].prompt;

    const branch = ok(await t.say('dördüncü, birinciden', 1));
    assert.strictEqual(branch.card.versionN, 4);
    assert.match(branch.card.variants[0].prompt, /\+ dördüncü, birinciden/);
    assert.doesNotMatch(branch.card.variants[0].prompt, /ikinci ekleme|üçüncü ekleme/, 'sürüm 2 ve 3 değişiklikleri bu dala girmez');
    assert.strictEqual(lastGeneration(t.calls).previousVersion.variants[0].prompt, v1Prompt);
    assert.strictEqual(lastGeneration(t.calls).earlierRequests, undefined);

    const s = await t.stored();
    assert.strictEqual(s.versions[3].parent, 1);
    assert.deepStrictEqual(s.versions[3].edits, ['dördüncü, birinciden']);

    // Sürüm 2'den devam: sürüm 2'nin isteği geçmişte, 3'ünki yok
    ok(await t.say('beşinci, ikinciden', 2));
    assert.deepStrictEqual(lastGeneration(t.calls).earlierRequests, ['ikinci ekleme']);
    assert.ok(v2.card.variants[0].prompt.includes('ikinci ekleme'));
  });

  it('düzenleme, gösterilen sürümün slot değerleriyle yapılır (sonradan değişen varsayım sızmaz)', async () => {
    const t = await begin();
    const changed = await refinePromptSession({ promptSessionId: t.id, slotId: 'mood', value: 'soft pastel' }, t.d);
    assert.ok(!('error' in changed));
    assert.strictEqual((await t.stored()).slots.mood.value, 'soft pastel');

    ok(await t.say('daha kısa olsun', 1));
    const slots = lastGeneration(t.calls).slots as { id: string; value: string | null; source: string }[];
    const mood = slots.find((s) => s.id === 'mood')!;
    assert.notStrictEqual(mood.value, 'soft pastel');
    assert.notStrictEqual(mood.source, 'user');
    assert.notStrictEqual((await t.stored()).slots.mood.value, 'soft pastel');
  });

  it('düzenleme hakkı bitince hata; ama geri al ve cevap hâlâ çalışır', async () => {
    const t = await begin({ intent: (m) => (m === 'selam' ? { intent: 'reply', revertTo: null, reply: 'Merhaba!' } : EDIT) });
    for (let i = 0; i < MAX_REFINEMENTS; i++) ok(await t.say(`istek ${i}`));
    assert.deepStrictEqual(await t.say('bir tane daha'), { error: 'refine_limit', tokens: 5 });

    const back = ok(await t.say('geri al'));
    assert.strictEqual(back.chat.action, 'revert');
    assert.strictEqual(back.card.versionN, MAX_REFINEMENTS);
    assert.strictEqual(back.card.refinementsLeft, 0);
    assert.strictEqual(ok(await t.say('selam')).chat.action, 'reply');
  });

  it(`oturum başına en fazla ${MAX_CHAT_TURNS} sohbet mesajı`, async () => {
    const t = await begin();
    const s = await t.stored();
    s.chatTurns = MAX_CHAT_TURNS;
    await t.d.store.set(s);
    assert.deepStrictEqual(await t.say('geri al'), { error: 'refine_limit', tokens: 0 });
    assert.strictEqual(t.calls.filter((c) => c.name === 'prompt_chat_intent').length, 0, 'sınır aşılınca LLM çağrılmaz');
  });

  it(`oturumda en fazla ${MAX_VERSIONS} versiyon`, async () => {
    const t = await begin();
    const s = await t.stored();
    s.versions = Array.from({ length: MAX_VERSIONS }, (_, i) => ({ ...s.versions[0], n: i + 1 }));
    await t.d.store.set(s);
    assert.deepStrictEqual(await t.say('bir tane daha'), { error: 'refine_limit', tokens: 5 });
  });
});

describe('sohbet: geri al', () => {
  it('"geri al" LLM çağırmaz, sunucuda yeni sürüm üretmez, hak harcamaz; türetildiği sürüme döner', async () => {
    const t = await begin();
    const v2 = ok(await t.say('a ekle'));
    const v3 = ok(await t.say('b ekle'));
    const before = t.calls.length;

    const back = ok(await t.say('geri al', 3));
    assert.strictEqual(back.chat.action, 'revert');
    assert.strictEqual(back.chat.reply, 'Sürüm 2 haline döndüm.');
    assert.strictEqual(back.card.versionN, 2);
    assert.deepStrictEqual(back.card.variants, v2.card.variants, 'sürüm 2 aynen geri gelir');
    assert.strictEqual(back.card.refinementsLeft, MAX_REFINEMENTS - 2, 'hak harcanmadı');
    assert.strictEqual(back.tokens, 0);
    assert.strictEqual(t.calls.length, before, 'LLM çağrısı yok');
    assert.strictEqual((await t.stored()).versions.length, 3, 'yeni sürüm üretilmedi');
    assert.notDeepStrictEqual(back.card.variants, v3.card.variants);

    const again = ok(await t.say('geri al', 2));
    assert.strictEqual(again.card.versionN, 1);
    assert.deepStrictEqual(again.card.variants, t.first.variants);
    assert.match(again.chat.reply, /Sürüm 1/);
  });

  it('dalda "geri al" türetildiği sürüme gider', async () => {
    const t = await begin();
    ok(await t.say('a ekle'));
    ok(await t.say('b ekle'));
    ok(await t.say('c ekle, birinciden', 1)); // sürüm 4, ebeveyni 1
    assert.strictEqual(ok(await t.say('geri al', 4)).card.versionN, 1);
  });

  it('ilk sürümde geri gidecek yer yoksa söyler; sürüm değişmez', async () => {
    const t = await begin();
    const r = ok(await t.say('geri al'));
    assert.strictEqual(r.chat.action, 'reply');
    assert.strictEqual(r.chat.reply, chatText('tr', 'noPrevious'));
    assert.strictEqual(r.card.versionN, 1);
  });

  it('İngilizce oturumda İngilizce cevap', async () => {
    const t = await begin({}, 'en');
    ok(await t.say('add a warning'));
    const r = ok(await t.say('undo'));
    assert.strictEqual(r.chat.reply, 'I went back to version 1.');
  });

  it('eski oturum (parent/edits/slots yok): bir önceki sürüme döner, düzenleme yine çalışır', async () => {
    const t = await begin();
    ok(await t.say('a ekle'));
    const s = await t.stored();
    for (const v of s.versions) {
      delete v.parent;
      delete v.edits;
      delete v.slots;
      delete v.summary;
    }
    await t.d.store.set(s);
    assert.strictEqual(ok(await t.say('geri al', 2)).card.versionN, 1);
    const edit = ok(await t.say('b ekle', 2));
    assert.strictEqual(edit.card.versionN, 3);
    assert.strictEqual(edit.chat.reply, 'changed: b ekle');
  });
});

describe('sohbet: LLM niyet sınıflandırması', () => {
  const intents: Record<string, Intent> = {
    'ilk sürüm daha iyiydi': { intent: 'revert', revertTo: 1, reply: '' },
    'dokuzuncu sürüme dön': { intent: 'revert', revertTo: 9, reply: '' },
    'hangisi iyiydi': { intent: 'revert', revertTo: null, reply: '' },
    'başa dön': { intent: 'revert', revertTo: 0, reply: '' },
    'teşekkürler': { intent: 'reply', revertTo: null, reply: '  Rica ederim!  ' },
    'hmm': { intent: 'reply', revertTo: null, reply: '' },
    'bu parametre ne işe yarar?': { intent: 'reply', revertTo: null, reply: 'x'.repeat(900) },
  };
  const intent = (m: string) => intents[m] ?? EDIT;

  it('isteğe bağlı numaralı sürüme dönme; geçersiz ya da belirsiz numara cevaba dönüşür', async () => {
    const t = await begin({ intent });
    ok(await t.say('a ekle'));
    ok(await t.say('b ekle'));

    const back = ok(await t.say('ilk sürüm daha iyiydi'));
    assert.strictEqual(back.chat.action, 'revert');
    assert.strictEqual(back.card.versionN, 1);

    for (const [message, expected] of [
      ['dokuzuncu sürüme dön', chatText('tr', 'unclearVersion')],
      ['hangisi iyiydi', chatText('tr', 'unclearVersion')],
      ['başa dön', chatText('tr', 'noPrevious')],
    ] as const) {
      const r = ok(await t.say(message, 3));
      assert.strictEqual(r.chat.action, 'reply', message);
      assert.strictEqual(r.chat.reply, expected, message);
      assert.strictEqual(r.card.versionN, 3, 'gösterilen sürüm değişmez');
    }

    // Zaten gösterilen sürüme dön
    const same = ok(await t.say('ilk sürüm daha iyiydi', 1));
    assert.strictEqual(same.chat.reply, chatText('tr', 'sameVersion'));
  });

  it('değişiklik istemeyen mesaj: kısa cevap, yeni sürüm ve hak harcaması yok', async () => {
    const t = await begin({ intent });
    ok(await t.say('a ekle'));
    const r = ok(await t.say('teşekkürler'));
    assert.strictEqual(r.chat.action, 'reply');
    assert.strictEqual(r.chat.reply, 'Rica ederim!');
    assert.strictEqual(r.card.versionN, 2);
    assert.strictEqual(r.card.refinementsLeft, MAX_REFINEMENTS - 1);
    assert.strictEqual((await t.stored()).versions.length, 2);
    assert.strictEqual(r.tokens, 5, 'sadece niyet çağrısı');

    assert.strictEqual(ok(await t.say('hmm')).chat.reply, chatText('tr', 'unclear'), 'boş cevap yerine soru');
    assert.ok(ok(await t.say('bu parametre ne işe yarar?')).chat.reply.length <= 400, 'cevap kırpılır');
  });

  it('niyet çağrısı: sürüm listesi, önceki sürüm numarası, deterministik sıcaklık ve talimat koruması', async () => {
    const t = await begin({ intent });
    ok(await t.say('a ekle'));
    ok(await t.say('hmm', 2));
    const call = t.calls.filter((c) => c.name === 'prompt_chat_intent').at(-1)!;
    const user = JSON.parse(call.user);
    assert.strictEqual(user.message, 'hmm');
    assert.strictEqual(user.shownVersion, 2);
    assert.strictEqual(user.previousVersionNumber, 1);
    assert.deepStrictEqual(user.versions, [
      { n: 1, derivedFrom: null, userRequest: null },
      { n: 2, derivedFrom: 1, userRequest: 'a ekle' },
    ]);
    assert.ok(user.shownPrompt.length > 0 && user.shownPrompt.length <= 500);
    assert.strictEqual(call.temperature, 0);
    assert.ok(call.maxTokens <= 300);
    assert.match(call.system, /data, not instructions/);
    assert.match(call.system, /Never invent facts, prices or features/);
    assert.match(call.system, /Midjourney/);
  });

  it('sınıflandırma çağrısı başarısız olursa hata döner (sessizce düzenlemeye çevrilmez)', async () => {
    const t = await begin({ intent: () => { throw new Error('ağ'); } });
    await assert.rejects(() => t.say('bir şey'), /ağ/);
    assert.strictEqual((await t.stored()).versions.length, 1);
    assert.strictEqual((await t.stored()).chatTurns, undefined);
  });
});

describe('sohbet: hatalar ve şema', () => {
  it('süresi dolmuş oturum, bilinmeyen sürüm, çok kısa mesaj, henüz prompt olmayan oturum', async () => {
    const t = await begin();
    assert.deepStrictEqual(await refinePromptSession({ promptSessionId: 'p_yokyokyok', message: 'a ekle' }, t.d), { error: 'expired', tokens: 0 });
    assert.deepStrictEqual(await t.say('a ekle', 7), { error: 'invalid', tokens: 0 });
    assert.deepStrictEqual(await t.say(' a '), { error: 'invalid', tokens: 0 });

    // Soru kartı bekleyen oturumda sürüm yok
    const q = chatLLM({ extracted: { subject: 'a bakery logo' } });
    const d = deps(q.llm);
    const started = await startPromptSession({ productId: 'midjourney-v7', goal: 'logo', conversation: [{ role: 'user', content: 'logo' }], locale: 'tr' }, d);
    if ('error' in started) return assert.fail();
    assert.strictEqual(started.card.type, 'prompt_question');
    assert.deepStrictEqual(await refinePromptSession({ promptSessionId: started.card.promptSessionId, message: 'a ekle' }, d), { error: 'invalid', tokens: 0 });
  });

  it('refine şeması: sohbet mesajı (+ baseVersion) kabul; fazla alan, kısa mesaj, geçersiz sürüm reddedilir; eski biçimler duruyor', () => {
    const id = 'p_abcdefgh1';
    assert.ok(promptRefineSchema.safeParse({ promptSessionId: id, message: 'sonuna uyarı ekle' }).success);
    assert.ok(promptRefineSchema.safeParse({ promptSessionId: id, message: 'geri al', baseVersion: 3 }).success);
    assert.deepStrictEqual(promptRefineSchema.parse({ promptSessionId: id, message: '  geri al  ' }), { promptSessionId: id, message: 'geri al' });
    for (const bad of [
      { promptSessionId: id, message: 'x' },
      { promptSessionId: id, message: 'ok sir', baseVersion: 0 },
      { promptSessionId: id, message: 'ok sir', baseVersion: 1.5 },
      { promptSessionId: id, message: 'ok sir', instruction: 'zz' },
      { promptSessionId: id, message: 'ok sir', extra: 1 },
      { promptSessionId: id, message: 'x'.repeat(1001) },
    ]) assert.ok(!promptRefineSchema.safeParse(bad).success, JSON.stringify(bad));
    assert.ok(promptRefineSchema.safeParse({ promptSessionId: id, refinementId: 'vertical' }).success);
    assert.ok(promptRefineSchema.safeParse({ promptSessionId: id, slotId: 'mood', value: 'pastel' }).success);
    assert.ok(promptRefineSchema.safeParse({ promptSessionId: id, instruction: 'daha kısa' }).success);
  });
});

describe('sohbet: istemci (chatPrompt)', () => {
  const card = { type: 'prompt', versionN: 2 };
  const withFetch = async (impl: typeof fetch, run: () => Promise<void>) => {
    const real = globalThis.fetch;
    globalThis.fetch = impl;
    try {
      await run();
    } finally {
      globalThis.fetch = real;
    }
  };

  it('mesajı ve gösterilen sürümü gönderir; sonucu çözer', async () => {
    let seen: { url: string; body: unknown } | null = null;
    const impl = (async (url: string, init: RequestInit) => {
      seen = { url, body: JSON.parse(String(init.body)) };
      return new Response(JSON.stringify({ card, chat: { action: 'edit', reply: 'Tamam.' } }), { status: 200 });
    }) as unknown as typeof fetch;
    await withFetch(impl, async () => {
      const r = await chatPrompt('p_abcdefgh1', 'sonuna uyarı ekle', 3);
      assert.deepStrictEqual(r, { card, action: 'edit', reply: 'Tamam.' });
    });
    assert.deepStrictEqual(seen, { url: '/api/prompt/refine', body: { promptSessionId: 'p_abcdefgh1', message: 'sonuna uyarı ekle', baseVersion: 3 } });
  });

  it('hata kodları ve bozuk yanıt', async () => {
    await withFetch((async () => new Response(JSON.stringify({ error: 'refine_limit' }), { status: 409 })) as unknown as typeof fetch, async () => {
      assert.deepStrictEqual(await chatPrompt('p_abcdefgh1', 'x y', 1), { error: 'refine_limit' });
    });
    await withFetch((async () => new Response(JSON.stringify({ card }), { status: 200 })) as unknown as typeof fetch, async () => {
      assert.deepStrictEqual(await chatPrompt('p_abcdefgh1', 'x y', 1), { error: 'http_200' }, 'chat alanı yoksa kabul edilmez');
    });
    await withFetch((async () => { throw new Error('offline'); }) as unknown as typeof fetch, async () => {
      assert.deepStrictEqual(await chatPrompt('p_abcdefgh1', 'x y', 1), { error: 'network' });
    });
  });
});

describe('sohbet: üretici kuralları', () => {
  const guide = loadGuides().find((g) => g.id === 'midjourney')!;
  const session = (locale: 'en' | 'tr'): PromptSession => ({
    id: 's', productId: 'midjourney-v7', guideId: guide.id, guideVersion: 1, goal: 'logo', locale, slots: {}, questionAsked: false, pendingQuestions: [], versions: [], refinementCount: 0,
  });

  it('sistem talimatı: son mesaj öncekini ezer, geçmiş korunur, değişiklik cümlesi istenir, öneri düğmesi istenmez', async () => {
    const fake = chatLLM();
    const out = await generatePrompt({ session: session('tr'), guide, productName: 'Midjourney', llm: fake.llm, instruction: 'x', earlierRequests: ['y'] });
    const system = fake.calls[0].system;
    assert.match(system, /refinementInstruction overrides the previous version, the slots and the template/);
    assert.match(system, /when it asks to remove something, remove it completely/);
    assert.match(system, /earlierRequests/);
    assert.match(system, /suggestedRefinements: always an empty array/);
    assert.match(system, /changeSummary/);
    assert.match(system, /Sonuna iletişim bilgisi ekledim\./, 'Türkçe oturumda Türkçe örnek');
    assert.deepStrictEqual(JSON.parse(fake.calls[0].user).earlierRequests, ['y']);
    assert.strictEqual(out.output.changeSummary, 'changed: x');

    const en = chatLLM();
    await generatePrompt({ session: session('en'), guide, productName: 'Midjourney', llm: en.llm, instruction: 'x' });
    assert.match(en.calls[0].system, /I added contact details at the end\./);
    assert.strictEqual(JSON.parse(en.calls[0].user).earlierRequests, undefined);
  });

  it('ilk versiyonda (talimat yok) değişiklik cümlesi boş kalır; şema alanı zorunlu', async () => {
    const llm = async (req: JsonRequest) => {
      assert.ok((req.schema as { required: string[] }).required.includes('changeSummary'));
      return {
        data: {
          variants: [{ id: 'safe', prompt: 'a --ar 1:1', negativePrompt: null, settings: [] }, { id: 'creative', prompt: 'b --ar 1:1', negativePrompt: null, settings: [] }],
          assumptions: [], suggestedRefinements: [], howToUse: [], changeSummary: 'Bir şey değiştirdim.',
        },
        tokens: 1,
      };
    };
    assert.strictEqual((await generatePrompt({ session: session('tr'), guide, productName: 'Midjourney', llm })).output.changeSummary, '');
  });
});

describe('sohbet: arayüz', () => {
  const src = readFileSync('components/chat/PromptCard.tsx', 'utf8');

  it('hazır iyileştirme düğmeleri yok; sohbet kutusu sunucudaki sohbet ucunu kullanır', () => {
    assert.doesNotMatch(src, /card\.refinements\b/, 'öneri/iyileştirme düğmeleri kalktı');
    assert.doesNotMatch(src, /kind === "suggested"/);
    assert.match(src, /chatPrompt\(card\.promptSessionId, text, card\.versionN\)/, 'gösterilen sürümle birlikte gider');
    assert.match(src, /role="log"/, 'ekran okuyucu için sohbet günlüğü');
  });

  it('"Sohbetle düzenle" prompt kartının altında KOPUK ayrı bir kart (içinde bir bölüm değil)', () => {
    // Kendi çerçevesi, gölgesi ve boşluğu var; prompt kartının içindeki eski ayırıcı çizgi (border-t) yok.
    assert.match(src, /<section aria-labelledby=\{chatTitleId\} className="[^"]*rounded-2xl border border-border bg-card[^"]*shadow-sm[^"]*"/);
    assert.doesNotMatch(src, /<section[^>]*border-t/);
    // İki kardeş kart: prompt kartı (aria-busy) kapanır, hemen ardından sohbet kartı gelir; ikisini bir sarmalayıcı boşlukla ayırır.
    assert.match(src, /return \(\n    <div className="space-y-3">\n      <div className="[^"]*rounded-2xl border border-border bg-card[^"]*" aria-busy=\{loading\}>/);
    assert.match(src, /\n      <\/div>\n\n      <section aria-labelledby=\{chatTitleId\}/, 'prompt kartı sohbetten ÖNCE kapanır');
  });

  it('prompt üretimi bölümünde kaydırma çubuğu yok: prompt kutusu, sohbet listesi ve yan panel içeriği kadar uzar', () => {
    assert.doesNotMatch(src, /overflow-(y-|x-)?(auto|scroll)|max-h-/, 'PromptCard içinde iç kaydırma kutusu yok');
    assert.doesNotMatch(src, /scrollTop|logRef/, 'sohbet listesini kaydıran kod da kalktı');
    const layout = readFileSync('components/layout.ts', 'utf8');
    const side = /export const sidePanel = "([^"]*)"/.exec(layout)?.[1] ?? '';
    assert.ok(side.length > 0);
    assert.doesNotMatch(side, /overflow|max-h|sticky|overscroll/, 'yan panel kaydırmaz ve yapışmaz (yapışkan panel ekrandan uzunsa alt kısmı görünmez olurdu)');
    assert.match(side, /min-w-0/, 'ızgara öğesi uzun içerikle sütunu genişletmesin');
  });

  it('sohbet metinleri iki dilde dolu', async () => {
    const { tr } = await import('../i18n/tr');
    const { en } = await import('../i18n/en');
    for (const dict of [tr, en]) {
      for (const k of ['refine', 'chatHint', 'chatLog', 'chatVersionTag', 'chatAssumptionDone', 'freeText', 'freeTextPlaceholder', 'apply', 'limit', 'refinementsLeft'] as const) {
        assert.ok(dict.prompt[k].length > 0, k);
      }
      assert.match(dict.prompt.chatVersionTag, /\{n\}/);
      assert.match(dict.prompt.refinementsLeft, /\{n\}/);
    }
    assert.match(tr.prompt.chatHint, /Geri al/);
    assert.match(en.prompt.chatHint, /undo/);
  });
});
