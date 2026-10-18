// LLM belirsizlik kararının saf doğrulaması (parseLLMClassification): ağ yok, KV yok.
// Ağlı uçtan uca testler: taskClassifierLlmAmbiguous.test.ts / ...AmbiguousOff.test.ts.
import assert from 'node:assert';
import { describe, it } from 'node:test';
import { parseLLMClassification } from '../intent/taskClassifier';

const IDS = ['chat.general-assistant', 'text.write-longform', 'text.marketing-copy', 'research.web', 'image.generate', 'video.text-to-video', 'code.debug'];
const ALL = new Set(IDS);
const json = (o: object) => JSON.stringify({ taskId: 'chat.general-assistant', confidence: 0.4, pricing: 'unspecified', language: 'tr', needsClarification: false, candidates: [], ...o });

describe('parseLLMClassification: belirsizlik', () => {
  it('needsClarification:true + geçerli adaylar -> clarifyCandidates (en iyi tahmin başta, tekrarsız)', () => {
    const r = parseLLMClassification(json({ needsClarification: true, candidates: ['text.write-longform', 'chat.general-assistant', 'research.web'] }), IDS, ALL, true);
    assert.ok(r);
    assert.deepStrictEqual(r.clarifyCandidates, ['chat.general-assistant', 'text.write-longform', 'research.web']);
    assert.strictEqual(r.taskId, 'chat.general-assistant', 'en iyi tahmin yine döner');
  });

  it('needsClarification:false -> aday listesi dolu olsa bile sorulmaz', () => {
    const r = parseLLMClassification(json({ needsClarification: false, candidates: ['text.write-longform', 'research.web'] }), IDS, ALL, true);
    assert.ok(r);
    assert.strictEqual(r.clarifyCandidates, undefined);
  });

  it('en iyi tahmin aday listesinde yoksa başa eklenir', () => {
    const r = parseLLMClassification(json({ taskId: 'code.debug', needsClarification: true, candidates: ['image.generate', 'video.text-to-video'] }), IDS, ALL, true);
    assert.deepStrictEqual(r?.clarifyCandidates, ['code.debug', 'image.generate', 'video.text-to-video']);
  });

  it('en fazla 4 seçenek', () => {
    const r = parseLLMClassification(json({ needsClarification: true, candidates: IDS.slice(1) }), IDS, ALL, true);
    assert.strictEqual(r?.clarifyCandidates?.length, 4);
  });

  it('bilinmeyen id ve ürünü olmayan görev süzülür; geriye 2\'den az kalırsa sorulmaz', () => {
    const offerable = new Set(['chat.general-assistant', 'research.web']);
    const ok = parseLLMClassification(json({ needsClarification: true, candidates: ['uydurma.gorev', 'image.generate', 'research.web'] }), IDS, offerable, true);
    assert.deepStrictEqual(ok?.clarifyCandidates, ['chat.general-assistant', 'research.web']);

    const tooFew = parseLLMClassification(json({ needsClarification: true, candidates: ['uydurma.gorev', 'image.generate'] }), IDS, offerable, true);
    assert.ok(tooFew);
    assert.strictEqual(tooFew.clarifyCandidates, undefined, 'tek geçerli seçenek soru değildir; normal sınıflandırmaya döner');
  });

  it('aday dizisi eksik ya da tipi bozuksa sorulmaz, sınıflandırma bozulmaz', () => {
    for (const bad of [{ candidates: 'research.web' }, { candidates: [1, 2, 3] }, { candidates: null }]) {
      const r = parseLLMClassification(JSON.stringify({ taskId: 'research.web', confidence: 0.9, pricing: 'free', language: 'en', needsClarification: true, ...bad }), IDS, ALL, true);
      assert.ok(r, JSON.stringify(bad));
      assert.strictEqual(r.clarifyCandidates, undefined);
      assert.strictEqual(r.taskId, 'research.web');
      assert.deepStrictEqual(r.constraints, { pricing: 'free', language: 'en' });
    }
    const missing = parseLLMClassification(JSON.stringify({ taskId: 'research.web', confidence: 0.9, pricing: 'unspecified', language: 'en' }), IDS, ALL, true);
    assert.ok(missing);
    assert.strictEqual(missing.clarifyCandidates, undefined, 'eski biçimli cevap (alanlar yok) çalışmaya devam eder');
  });

  it('kapatma anahtarı (ambiguity:false): LLM belirsiz dese de tek görev döner', () => {
    const r = parseLLMClassification(json({ needsClarification: true, candidates: ['text.write-longform', 'research.web'] }), IDS, ALL, false);
    assert.ok(r);
    assert.strictEqual(r.clarifyCandidates, undefined);
    assert.strictEqual(r.taskId, 'chat.general-assistant');
  });

  it('AMBIGUITY_CLARIFY=off ortam değişkeni varsayılanı kapatır', () => {
    const before = process.env.AMBIGUITY_CLARIFY;
    try {
      const body = json({ needsClarification: true, candidates: ['text.write-longform', 'research.web'] });
      delete process.env.AMBIGUITY_CLARIFY;
      assert.ok(parseLLMClassification(body, IDS, ALL)?.clarifyCandidates, 'varsayılan: açık');
      process.env.AMBIGUITY_CLARIFY = 'off';
      assert.strictEqual(parseLLMClassification(body, IDS, ALL)?.clarifyCandidates, undefined, 'off: kapalı');
      process.env.AMBIGUITY_CLARIFY = 'on';
      assert.ok(parseLLMClassification(body, IDS, ALL)?.clarifyCandidates, 'off dışındaki değer: açık');
    } finally {
      if (before === undefined) delete process.env.AMBIGUITY_CLARIFY;
      else process.env.AMBIGUITY_CLARIFY = before;
    }
  });

  it('geçersiz JSON ya da bilinmeyen taskId -> null (kural yedeği devreye girer)', () => {
    assert.strictEqual(parseLLMClassification('{kırık', IDS, ALL, true), null);
    assert.strictEqual(parseLLMClassification('null', IDS, ALL, true), null);
    assert.strictEqual(parseLLMClassification(json({ taskId: 'uydurma.gorev' }), IDS, ALL, true), null);
  });
});
