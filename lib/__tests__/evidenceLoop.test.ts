// P15 kanıt döngüsü uçtan uca (sahte KV): ana sayfada araç açılır → sonraki
// ziyarette "İşini gördü mü?" / "Hangisi daha iyiydi?" → /api/outcome kaydı →
// gece toplaması (scripts/signals/aggregate.mjs) → data/signals.json →
// RouteAI Skoru'nda kendi kanıtımız (ownN) → editör seçimi yerine kanıtlı öneri.

import assert from 'node:assert';
import { describe, it } from 'node:test';
import { aggregateSignals } from '../../scripts/signals/aggregate.mjs';
import { dueOutcomePrompt, markOutcomeAsked, recordToolClick } from '../chat/outcomes';
import { memoryStore } from '../chat/storage';
import { COMPARISON_INDEX, OUTCOME_INDEX, saveOutcome } from '../signals/store';
import { outcomeRequestSchema } from '../validations/outcome';
import { loadCatalog } from '../catalog/index';
import { signalsFileSchema, type Signal } from '../catalog/schema';
import { defaultSearchContext, searchCatalog } from '../catalog/search';
import { recommendV3 } from '../recommendV3';

const NOW = Date.parse('2026-09-28T12:00:00Z');
const MIN = 60 * 1000;
const TASK = 'slides.create';

/** Upstash'in kullandığımız alt kümesi: set/sadd (yazma) + smembers/get (toplama). */
function fakeKv() {
  const data = new Map<string, unknown>();
  const sets = new Map<string, Set<string>>();
  return {
    data,
    async set(k: string, v: unknown) { data.set(k, structuredClone(v)); return 'OK'; },
    async sadd(k: string, m: string) { (sets.get(k) ?? sets.set(k, new Set()).get(k)!).add(m); return 1; },
    /** scripts/aggregate-signals.mjs → readIndex ile aynı okuma. */
    readIndex(k: string) { return [...(sets.get(k) ?? [])].map((key) => data.get(key)).filter(Boolean); },
  };
}

/** Bir kullanıcının tarayıcısı: araç(lar)ı açar, sonraki ziyarette soru çıkar, cevap verir. */
async function visit(kv: ReturnType<typeof fakeKv>, sessionId: string, opened: string[], answer: (q: ReturnType<typeof dueOutcomePrompt>) => unknown, t: number) {
  const local = memoryStore();
  opened.forEach((productId, i) => recordToolClick(local, { productId, productName: productId, taskId: TASK, clickedAt: t + i * MIN }));
  // Aynı ziyaret, son tıklamadan 30 sn sonra sekmeye dönüş: henüz sorulmaz (≥ 2 dk kuralı).
  assert.strictEqual(dueOutcomePrompt(local, memoryStore(), { now: t + (opened.length - 1) * MIN + MIN / 2, requireAway: true }), null);
  // Sonraki ziyaret (yeni sekme oturumu): sorulur.
  const nextVisit = memoryStore();
  const due = dueOutcomePrompt(local, nextVisit, { now: t + 60 * MIN, requireAway: false });
  assert.ok(due);
  markOutcomeAsked(local, nextVisit, due);
  assert.strictEqual(dueOutcomePrompt(local, nextVisit, { now: t + 61 * MIN, requireAway: false }), null, 'ziyaret başına tek soru');
  // Kartın gönderdiği gövde, /api/outcome şemasından geçer, sonra KV'ye yazılır.
  const req = outcomeRequestSchema.parse({ sessionId, ...(answer(due) as object) });
  return saveOutcome(req, t + 60 * MIN, kv);
}

async function collect(kv: ReturnType<typeof fakeKv>): Promise<Signal[]> {
  const { products } = loadCatalog();
  const { signals } = aggregateSignals({
    now: NOW,
    products: products.map((p) => ({ id: p.id, tasks: p.tasks })),
    outcomes: kv.readIndex(OUTCOME_INDEX),
    comparisons: kv.readIndex(COMPARISON_INDEX),
    votes: [],
  });
  return signalsFileSchema.parse(signals);
}

describe('kanıt döngüsü (P15): tıklama → cevap → toplama → RouteAI Skoru', () => {
  it('gerçek cevaplar editör seçiminin yerini kanıtlı öneriye bırakır', async () => {
    const kv = fakeKv();
    const base = NOW - 3 * 24 * 60 * MIN;
    // 4 kullanıcı Gamma'yı açtı: 3 "evet", 1 "kısmen".
    for (const [i, answer] of (['yes', 'yes', 'yes', 'partial'] as const).entries()) {
      await visit(kv, `sess_gamma_${i}0000`, ['gamma-ai'], (due) => {
        assert.strictEqual(due?.kind, 'outcome');
        return { kind: 'outcome', taskId: TASK, productId: 'gamma-ai', answer, tags: [] };
      }, base + i * 60 * MIN);
    }
    // 2 kullanıcı aynı görevde iki aracı açtı: "hangisi daha iyiydi?" → Gamma.
    for (const i of [0, 1]) {
      await visit(kv, `sess_compare_${i}0000`, ['tome', 'gamma-ai'], (due) => {
        assert.strictEqual(due?.kind, 'comparison');
        assert.ok(due?.kind === 'comparison');
        return { kind: 'comparison', taskId: TASK, productA: due.a.productId, productB: due.b.productId, winner: 'gamma-ai' };
      }, base + (10 + i) * 60 * MIN);
    }

    // KV'de ham oturum kimliği yok, mesaj metni yok.
    for (const [key, value] of kv.data) {
      assert.ok(!key.includes('sess_'), key);
      assert.ok(!JSON.stringify(value).includes('sess_'), key);
    }

    const signals = await collect(kv);
    const gamma = signals.find((s) => s.productId === 'gamma-ai' && s.taskId === TASK);
    assert.deepStrictEqual(gamma?.outcomes, { yes: 3, partial: 1, no: 0 });
    assert.deepStrictEqual(gamma?.comparisons, { wins: 2, losses: 0 });
    assert.deepStrictEqual(signals.find((s) => s.productId === 'tome')?.comparisons, { wins: 0, losses: 2 });

    // Önce: slides.create'te kanıt yok → editör seçimi ("RouteAI tavsiyesi", az veri).
    const picks = loadCatalog().editorPicks;
    const before = { ...defaultSearchContext(NOW), signals: [] };
    const beforeSearch = searchCatalog({ taskId: TASK }, before);
    assert.strictEqual(beforeSearch.items.find((i) => i.product.id === 'gamma-ai')?.score.ownN ?? 0, 0);
    const r0 = await recommendV3('sunum', 'all', { allowLLM: false, ctx: before, editorPicks: picks, taskId: TASK, now: NOW });
    assert.ok(r0.kind === 'recommendation');
    assert.strictEqual(r0.items[0].basis, 'editor');

    // Sonra: aynı katalog + toplanan sinyaller → Gamma kendi kanıtıyla birinci.
    const after = { ...defaultSearchContext(NOW), signals };
    const item = searchCatalog({ taskId: TASK }, after).items.find((i) => i.product.id === 'gamma-ai');
    assert.ok(item && item.score.ownN > 0, 'ownN arttı');
    assert.ok(item.score.reasons.some((r) => r.code === 'outcome_success'));
    assert.ok(item.score.reasons.some((r) => r.code === 'comparison_wins'));
    const r1 = await recommendV3('sunum', 'all', { allowLLM: false, ctx: after, editorPicks: picks, taskId: TASK, now: NOW });
    assert.ok(r1.kind === 'recommendation');
    assert.strictEqual(r1.items[0].product.id, 'gamma-ai');
    assert.strictEqual(r1.items[0].basis, 'evidence');
    assert.ok(r1.items[0].reasons.some((r) => r.code === 'outcome_success'));
  });

  it('aynı oturum fikrini değiştirirse tek kayıt kalır (son cevap geçerli)', async () => {
    const kv = fakeKv();
    const ask = (answer: 'yes' | 'no') => () => ({ kind: 'outcome', taskId: TASK, productId: 'gamma-ai', answer, tags: [] });
    await visit(kv, 'sess_same_00000', ['gamma-ai'], ask('yes'), NOW - 5 * 60 * MIN);
    await visit(kv, 'sess_same_00000', ['gamma-ai'], ask('no'), NOW - 2 * 60 * MIN);
    const signals = await collect(kv);
    assert.deepStrictEqual(signals.find((s) => s.productId === 'gamma-ai')?.outcomes, { yes: 0, partial: 0, no: 1 });
  });
});
