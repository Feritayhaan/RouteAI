import assert from 'node:assert';
import { describe, it } from 'node:test';
import { createNdjsonParser } from '../chat/ndjson';
import { memoryStore } from '../chat/storage';
import { getSessionId } from '../chat/session';
import { dueOutcomePrompt, markOutcomeAsked, recordToolClick, MIN_AWAY_MS, MAX_AGE_MS, PENDING_KEY } from '../chat/outcomes';
import { toApiMessages } from '../chat/history';
import type { ChatEvent } from '../agent/cards';

describe('NDJSON ayrıştırıcı', () => {
  it('satır ortasında bölünen parçaları birleştirir, bozuk satırı hata olayına çevirir', () => {
    const events: ChatEvent[] = [];
    const p = createNdjsonParser((e) => events.push(e));
    p.push('{"type":"text","de');
    p.push('lta":"Mer"}\n{"type":"text","delta":"haba"}\nbozuk\n');
    p.push('{"type":"done","usage":{"promptTokens":1,"completionTokens":1,"totalTokens":2}}');
    p.flush();
    assert.deepStrictEqual(events.map((e) => e.type), ['text', 'text', 'error', 'done']);
    assert.strictEqual(events.slice(0, 2).map((e) => (e.type === 'text' ? e.delta : '')).join(''), 'Merhaba');
  });
});

describe('oturum kimliği', () => {
  it('bir kez üretilir ve saklanır', () => {
    const store = memoryStore();
    const a = getSessionId(store);
    assert.match(a, /^[A-Za-z0-9_-]{8,100}$/);
    assert.strictEqual(getSessionId(store), a);
  });
});

describe('iş sonucu soruları', () => {
  const click = (productId: string, taskId: string, clickedAt: number) => ({ productId, productName: productId.toUpperCase(), taskId, clickedAt });

  it('sekmeye dönüşte en az 2 dk gerekir; sonraki ziyarette gerekmez', () => {
    const local = memoryStore();
    const session = memoryStore();
    recordToolClick(local, click('a', 'image.logo', 1000));
    assert.strictEqual(dueOutcomePrompt(local, session, { now: 1000 + MIN_AWAY_MS - 1, requireAway: true }), null);
    assert.strictEqual(dueOutcomePrompt(local, session, { now: 1000 + MIN_AWAY_MS, requireAway: true })?.kind, 'outcome');
    assert.strictEqual(dueOutcomePrompt(local, session, { now: 1001, requireAway: false })?.kind, 'outcome');
  });

  it('aynı görevde iki farklı ürün açıldıysa karşılaştırma sorulur', () => {
    const local = memoryStore();
    recordToolClick(local, click('a', 'image.logo', 1000));
    recordToolClick(local, click('b', 'image.logo', 2000));
    const due = dueOutcomePrompt(local, memoryStore(), { now: 2000 + MIN_AWAY_MS, requireAway: true });
    assert.strictEqual(due?.kind, 'comparison');
    if (due?.kind === 'comparison') assert.deepStrictEqual([due.a.productId, due.b.productId], ['a', 'b']);
  });

  it('oturum başına en fazla 1 soru; 7 günden eski tıklama düşer', () => {
    const local = memoryStore();
    const session = memoryStore();
    recordToolClick(local, click('a', 'image.logo', 0));
    recordToolClick(local, click('c', 'slides.create', 10));
    const due = dueOutcomePrompt(local, session, { now: 20, requireAway: false })!;
    markOutcomeAsked(local, session, due);
    assert.strictEqual(dueOutcomePrompt(local, session, { now: 30, requireAway: false }), null);
    // Yeni oturumda kalan tıklama sorulur ama 7 gün sonra düşmüş olur
    assert.strictEqual(dueOutcomePrompt(local, memoryStore(), { now: 10 + MAX_AGE_MS + 1, requireAway: false }), null);
    assert.strictEqual(local.get(PENDING_KEY), '[]');
  });

  it('bozuk depolama verisi çökertmez', () => {
    const local = memoryStore();
    local.set(PENDING_KEY, '{bozuk');
    assert.strictEqual(dueOutcomePrompt(local, memoryStore(), { now: 1, requireAway: false }), null);
  });
});

describe('API geçmişi', () => {
  it('kartlar modele kısa özet olarak gider; soru kartı "question" türünde', () => {
    const out = toApiMessages([
      { id: '1', role: 'user', parts: [{ type: 'text', text: 'logo' }] },
      { id: '2', role: 'assistant', parts: [{ type: 'card', card: { type: 'question', question: 'Text?', options: [{ id: 'o1', label: 'Yes' }, { id: 'o2', label: 'No' }], allowFreeText: true } }] },
      { id: '3', role: 'user', parts: [{ type: 'text', text: 'Yes' }] },
      { id: '4', role: 'assistant', parts: [] },
    ]);
    assert.deepStrictEqual(out, [
      { role: 'user', content: 'logo' },
      { role: 'assistant', content: '[asked] Text? (Yes / No)', kind: 'question' },
      { role: 'user', content: 'Yes' },
    ]);
  });
});
