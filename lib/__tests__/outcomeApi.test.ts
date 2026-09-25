import assert from 'node:assert';
import { describe, it } from 'node:test';
import { outcomeRequestSchema } from '../validations/outcome';
import { feedbackRequestSchema } from '../validations/feedback';
import { comparisonKey, outcomeKey, saveOutcome, sessionHash, OUTCOME_INDEX } from '../signals/store';

function fakeKv() {
  const data = new Map<string, unknown>();
  const sets = new Map<string, Set<string>>();
  return {
    data, sets,
    async set(k: string, v: unknown) { data.set(k, v); return 'OK'; },
    async sadd(k: string, m: string) { (sets.get(k) ?? sets.set(k, new Set()).get(k)!).add(m); return 1; },
  };
}

describe('/api/outcome doğrulaması ve kaydı', () => {
  const base = { kind: 'outcome', sessionId: 'sess_12345678', taskId: 'image.logo', productId: 'ideogram-20' };

  it('iş sonucu: sadece etiket, serbest metin alanı yok', () => {
    assert.ok(outcomeRequestSchema.safeParse({ ...base, answer: 'yes' }).success);
    assert.ok(!outcomeRequestSchema.safeParse({ ...base, answer: 'maybe' }).success);
    assert.ok(!outcomeRequestSchema.safeParse({ ...base, answer: 'no', tags: ['çok kötü'] }).success);
    const parsed = outcomeRequestSchema.parse({ ...base, answer: 'no', note: 'serbest metin' });
    assert.ok(!('note' in parsed));
  });

  it('karşılaştırma: kazanan iki üründen biri ya da tie', () => {
    const c = { kind: 'comparison', sessionId: 'sess_12345678', taskId: 'image.logo', productA: 'a', productB: 'b' };
    assert.ok(outcomeRequestSchema.safeParse({ ...c, winner: 'a' }).success);
    assert.ok(outcomeRequestSchema.safeParse({ ...c, winner: 'tie' }).success);
    assert.ok(!outcomeRequestSchema.safeParse({ ...c, winner: 'c' }).success);
    assert.ok(!outcomeRequestSchema.safeParse({ ...c, productB: 'a', winner: 'a' }).success);
  });

  it('oturum + ürün + görev başına tek kayıt (son cevap geçerli); ham oturum kimliği anahtarda yok', async () => {
    const kv = fakeKv();
    await saveOutcome(outcomeRequestSchema.parse({ ...base, answer: 'yes' }), 1, kv);
    await saveOutcome(outcomeRequestSchema.parse({ ...base, answer: 'no', tags: ['expensive'] }), 2, kv);
    assert.strictEqual(kv.data.size, 1);
    const [key, value] = [...kv.data][0];
    assert.strictEqual(key, outcomeKey('sess_12345678', 'image.logo', 'ideogram-20'));
    assert.ok(!key.includes('sess_12345678'));
    assert.ok(key.includes(sessionHash('sess_12345678')));
    assert.strictEqual((value as { answer: string }).answer, 'no');
    assert.strictEqual(kv.sets.get(OUTCOME_INDEX)?.size, 1);
  });

  it('karşılaştırma anahtarı çift sırasından bağımsız', () => {
    assert.strictEqual(comparisonKey('s1234567', 't.x', 'a', 'b'), comparisonKey('s1234567', 't.x', 'b', 'a'));
  });
});

describe('/api/feedback: eski ve yeni biçim', () => {
  it('v1 (query) ve v2 (sessionId + taskId + productId) kabul, ikisi de yoksa ret', () => {
    assert.ok(feedbackRequestSchema.safeParse({ query: 'logo', toolName: 'X', vote: 'up' }).success);
    assert.ok(feedbackRequestSchema.safeParse({ sessionId: 'sess_12345678', taskId: 'image.logo', productId: 'ideogram-20', toolName: 'X', vote: 'down' }).success);
    assert.ok(!feedbackRequestSchema.safeParse({ toolName: 'X', vote: 'up' }).success);
    assert.ok(!feedbackRequestSchema.safeParse({ sessionId: 'sess_12345678', toolName: 'X', vote: 'up' }).success);
  });
});
