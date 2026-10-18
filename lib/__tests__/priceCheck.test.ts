// Fiyat kontrolü (scripts/prices/core.mjs): sayfa -> metin, LLM çıktısının
// sayfaya karşı doğrulanması, büyük değişiklik koruması, toplu kontrol ve
// çıkış kararı. Ağ ve OpenAI yok; hepsi sahte.
import assert from 'node:assert';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import {
  amountInText,
  billingConcern,
  checkProducts,
  comparePrice,
  embeddedPriceSnippets,
  evidenceInText,
  fetchPageText,
  freshnessSummary,
  hasAmountSignal,
  pricingText,
  priceExitDecision,
  renderPriceReport,
  resolveCurrency,
  verifyExtraction,
} from '../../scripts/prices/core.mjs';
import { findSnapshot, formatSnapshot, parseSnapshot, snapshotAgeDays, writeSnapshot } from '../../scripts/prices/snapshots.mjs';
import { looksLikeProductPage, nameWords, runGuided } from '../../scripts/prices/guided.mjs';
import { makePricing } from '../pricing';

const TODAY = '2026-10-14';

function product(id: string, pricing = makePricing('freemium', 20, '2026-08-01'), extra: Record<string, unknown> = {}) {
  return { id, name: id.toUpperCase(), status: 'active', pricingUrl: `https://${id}.example/pricing`, pricing, ...extra };
}

const PAGE = '<html><body><nav>' + 'Menü '.repeat(100) + '</nav><h1>Pricing</h1><div>Free $0 forever</div><div>Pro $20 per month</div></body></html>';

type Extracted = Record<string, unknown>;
const llmReturning = (data: Extracted) => async () => ({ data, tokens: 10 });
const good: Extracted = { model: 'freemium', startingPrice: 20, currency: 'USD', billing: 'monthly', evidence: 'Pro $20 per month', freeTierEvidence: 'Free $0 forever' };

describe('fiyat sayfası -> metin', () => {
  it('HTML varlıklarını çözer; $ işareti kaybolmaz', () => {
    const { text, hasAmount } = pricingText('<p>Pro &#36;20&nbsp;/mo &mdash; billed monthly</p>');
    assert.match(text, /Pro \$20 \/mo — billed monthly/);
    assert.strictEqual(hasAmount, true);
  });

  it('tutarsız (JS ile çizilen) sayfada hasAmount=false', () => {
    const { hasAmount } = pricingText('<html><body><div>Plus</div><div>/ month</div></body></html>');
    assert.strictEqual(hasAmount, false);
    assert.strictEqual(hasAmountSignal('Go / month'), false);
    assert.strictEqual(hasAmountSignal('Plus $8/month'), true);
  });

  it('script içindeki gömülü JSON fiyatı kaybolmaz (JSON-LD, __NEXT_DATA__)', () => {
    const html = '<script type="application/ld+json">{"@type":"Offer","name":"Pro","price":"20.00","priceCurrency":"USD"}</script><script>var x = "$99 tracking"</script>';
    const snippets = embeddedPriceSnippets(html);
    assert.match(snippets, /"price":"20\.00"/);
    assert.doesNotMatch(snippets, /tracking/);
    assert.match(pricingText(html).text, /"price":"20\.00"/);
  });

  it('uzun sayfada başlıktan sonra gelen fiyat bölümü kesilmez', () => {
    const filler = '<p>' + 'lorem ipsum dolor sit amet '.repeat(1200) + '</p>';
    const html = `<body><h1>Acme</h1>${filler}<div>Team plan costs $42 per user per month</div>${filler}</body>`;
    const { text, hasAmount } = pricingText(html, 12000);
    assert.ok(text.length <= 12000);
    assert.strictEqual(hasAmount, true);
    assert.match(text, /\$42 per user per month/);
  });
});

describe('fetchPageText', () => {
  const res = (status: number, body = '') => ({ ok: status >= 200 && status < 300, status, text: async () => body });

  it('5xx\'te bir kez yeniden dener, 4xx\'te denemez', async () => {
    let calls = 0;
    const flaky = async () => (++calls === 1 ? res(503) : res(200, 'ok'));
    assert.strictEqual(await fetchPageText('https://x.example', { fetchImpl: flaky as never, retryDelayMs: 1 }), 'ok');
    assert.strictEqual(calls, 2);

    calls = 0;
    const blocked = async () => (calls++, res(403));
    await assert.rejects(fetchPageText('https://x.example', { fetchImpl: blocked as never, retryDelayMs: 1 }), /HTTP 403 \(bot engeli/);
    assert.strictEqual(calls, 1);
  });
});

describe('LLM çıktısının sayfaya karşı doğrulanması', () => {
  const text = 'Free $0 forever Pro $20 per month Max $200 per month';

  it('kanıt sayfada geçiyorsa kabul, uydurmaysa reddedilir', () => {
    assert.strictEqual(evidenceInText('Pro $20 per month', text), true);
    assert.strictEqual(evidenceInText('pro   $20  PER month', text), true, 'boşluk ve büyük/küçük harf duyarsız');
    assert.strictEqual(evidenceInText('Pro $20 per month ... Max $200 per month', text), true, '"..." ile bölünmüş alıntı');
    assert.strictEqual(evidenceInText('Pro $25 per month', text), false);
    assert.strictEqual(evidenceInText('', text), false);
    assert.strictEqual(evidenceInText('$20', text), false, 'çok kısa alıntı kanıt sayılmaz');
  });

  it('tutar kanıtta ayrı bir sayı olarak geçmeli', () => {
    assert.strictEqual(amountInText(20, 'Pro $20 per month'), true);
    assert.strictEqual(amountInText(20, 'Max $200 per month'), false);
    assert.strictEqual(amountInText(20, 'Pro $20.5 per month'), false);
    assert.strictEqual(amountInText(9.99, 'Plus $9.99/mo'), true);
    assert.strictEqual(amountInText(10, 'Plus $10.00/mo'), true);
    assert.strictEqual(amountInText(5, 'Pro $15/mo'), false);
  });

  it('verifyExtraction: uydurma kanıt, eksik tutar ve eksik ücretsiz plan kanıtı reddedilir', () => {
    assert.deepStrictEqual(verifyExtraction(good, text), { ok: true });
    assert.strictEqual(verifyExtraction({ ...good, evidence: 'Pro $20 per month, cancel anytime' }, text).ok, false);
    assert.strictEqual(verifyExtraction({ ...good, startingPrice: 25 }, text).ok, false, 'tutar kanıtta yok');
    assert.strictEqual(verifyExtraction({ ...good, startingPrice: null }, text).ok, false);
    assert.strictEqual(verifyExtraction({ ...good, freeTierEvidence: null }, text).ok, false, 'freemium için ücretsiz plan kanıtı şart');
    assert.strictEqual(verifyExtraction({ ...good, freeTierEvidence: 'Free for everyone forever' }, text).ok, false);
    assert.strictEqual(verifyExtraction({ model: 'paid', startingPrice: 20, currency: 'USD', billing: 'monthly', evidence: 'Pro $20 per month', freeTierEvidence: null }, text).ok, true);
    assert.strictEqual(verifyExtraction({ model: 'unknown', startingPrice: null, currency: null, billing: 'unknown', evidence: '', freeTierEvidence: null }, text).ok, true);
  });
});

describe('comparePrice: büyük değişiklik koruması', () => {
  const p = { pricing: makePricing('freemium', 20, '2026-08-01') };

  it('küçük değişiklik yazılır, büyük değişiklik inceleme bekler', () => {
    assert.strictEqual(comparePrice(p, { model: 'freemium', startingPrice: 25, currency: 'USD' }).status, 'changed');
    const big = comparePrice(p, { model: 'freemium', startingPrice: 8, currency: 'USD' });
    assert.strictEqual(big.status, 'review');
    assert.match(String(big.note), /20 → 8/);
    const flip = comparePrice(p, { model: 'paid', startingPrice: 20, currency: 'USD' });
    assert.strictEqual(flip.status, 'review');
    assert.match(String(flip.note), /freemium → paid/);
    assert.strictEqual(comparePrice(p, { model: 'freemium', startingPrice: 17, currency: 'USD', billing: 'annual_only' }).status, 'review');
  });

  it('tutarsız sonuç bilinen fiyatı null ile ezmez', () => {
    const r = comparePrice(p, { model: 'freemium', startingPrice: null, currency: null });
    assert.strictEqual(r.status, 'unknown');
  });

  it('fiyatı hiç olmayan ürün (null) için ilk tutar "changed" olur, "review" değil', () => {
    const blank = { pricing: makePricing('freemium', null, null) };
    assert.strictEqual(comparePrice(blank, { model: 'freemium', startingPrice: 12, currency: 'USD' }).status, 'changed');
  });
});

describe('checkProducts', () => {
  it('doğrulanmış çıkarım: teyit ve değişiklik, products değişmez, update döner', async () => {
    const products = [product('acme'), product('beta', makePricing('freemium', 18, '2026-08-01'))];
    const fetchText = async () => PAGE;
    const rows = await checkProducts({ products, fetchText, llm: llmReturning(good) as never, today: TODAY });
    const [a, b] = rows;
    assert.strictEqual(a.status, 'same');
    assert.strictEqual(a.update.priceCheckedAt, TODAY);
    assert.strictEqual(a.update.priceStatus, 'verified');
    assert.strictEqual(b.status, 'changed');
    assert.strictEqual(b.update.startingPrice, 20);
    assert.strictEqual(products[1].pricing.startingPrice, 18, 'giriş dizisi değiştirilmemeli');
  });

  it('LLM\'in uydurduğu fiyat reddedilir: sayfada olmayan kanıt = unknown, update yok', async () => {
    const invented = { ...good, startingPrice: 99, evidence: 'Pro $99 per month' };
    const [row] = await checkProducts({ products: [product('acme')], fetchText: async () => PAGE, llm: llmReturning(invented) as never, today: TODAY });
    assert.strictEqual(row.status, 'unknown');
    assert.match(String(row.note), /kanıt/);
    assert.strictEqual(row.update, undefined);
  });

  it('tutarı olmayan (JS ile çizilen) sayfada LLM çağrılmaz', async () => {
    let called = 0;
    const llm = async () => (called++, { data: good, tokens: 1 });
    const html = '<body>' + '<div>Plus / month</div>'.repeat(40) + '</body>';
    const [row] = await checkProducts({ products: [product('acme')], fetchText: async () => html, llm: llm as never, today: TODAY });
    assert.strictEqual(row.status, 'unknown');
    assert.match(String(row.note), /sayfada tutar yok/);
    assert.strictEqual(called, 0);
  });

  it('büyük değişiklik products\'a yazılmaz; --accept ile yazılır', async () => {
    const cheap = { ...good, startingPrice: 8, evidence: 'Plus $8 per month' };
    const html = PAGE.replace('Pro $20 per month', 'Plus $8 per month');
    const run = (accept: Set<string> | null) =>
      checkProducts({ products: [product('acme')], fetchText: async () => html, llm: llmReturning(cheap) as never, today: TODAY, accept });
    const [held] = await run(null);
    assert.strictEqual(held.status, 'review');
    assert.strictEqual(held.update, undefined);
    const [accepted] = await run(new Set(['acme']));
    assert.strictEqual(accepted.status, 'changed');
    assert.strictEqual(accepted.update.startingPrice, 8);
  });

  it('yeterince yeni doğrulanmış ürüne bakılmaz; --only yaş sınırını yok sayar', async () => {
    const fresh = product('fresh', makePricing('freemium', 20, '2026-10-10'));
    const old = product('old', makePricing('freemium', 20, '2026-08-01'));
    const none = product('none', makePricing('freemium', null, null));
    const fetchText = async () => PAGE;
    const rows = await checkProducts({ products: [fresh, old, none], fetchText, llm: llmReturning(good) as never, today: TODAY });
    assert.deepStrictEqual(rows.map((r) => [r.p.id, r.status]), [['fresh', 'fresh'], ['old', 'same'], ['none', 'changed']]);

    const onlyFresh = await checkProducts({ products: [fresh, old], fetchText, llm: llmReturning(good) as never, today: TODAY, only: new Set(['fresh']) });
    assert.deepStrictEqual(onlyFresh.map((r) => r.status), ['same']);
    const all = await checkProducts({ products: [fresh], fetchText, llm: llmReturning(good) as never, today: TODAY, maxAgeDays: 0 });
    assert.strictEqual(all[0].status, 'same');
  });

  it('aynı fiyat sayfasını paylaşan ürünler için sayfa bir kez çekilir', async () => {
    let fetched = 0;
    const shared = 'https://shared.example/pricing';
    const rows = await checkProducts({
      products: [product('a', undefined, { pricingUrl: shared }), product('b', undefined, { pricingUrl: shared })],
      fetchText: async () => (fetched++, PAGE),
      llm: llmReturning(good) as never,
      today: TODAY,
    });
    assert.strictEqual(fetched, 1);
    assert.deepStrictEqual(rows.map((r) => r.status), ['same', 'same']);
  });

  it('her ürün bitince onRow çağrılır; LLM çağrısına zaman aşımı sinyali verilir', async () => {
    const seen: string[] = [];
    let gotSignal = false;
    const llm = async (req: { signal?: AbortSignal }) => {
      gotSignal = req.signal instanceof AbortSignal;
      return { data: good, tokens: 1 };
    };
    await checkProducts({
      products: [product('acme'), product('nourl', undefined, { pricingUrl: undefined })],
      fetchText: async () => PAGE,
      llm: llm as never,
      today: TODAY,
      onRow: (r) => seen.push(`${r.p.id}:${r.status}`),
    });
    assert.deepStrictEqual(seen, ['acme:same', 'nourl:no_url']);
    assert.strictEqual(gotSignal, true);
  });

  it('sayfa hatası, anahtar yok, pricingUrl yok ve emekli ürün', async () => {
    const products = [product('a'), product('nourl', undefined, { pricingUrl: undefined }), { ...product('old'), status: 'retired' }];
    const failing = await checkProducts({ products, fetchText: async () => { throw new Error('HTTP 403'); }, llm: llmReturning(good) as never, today: TODAY });
    assert.deepStrictEqual(failing.map((r) => [r.p.id, r.status]), [['a', 'error'], ['nourl', 'no_url']]);
    const noKey = await checkProducts({ products, fetchText: async () => PAGE, llm: null, today: TODAY });
    assert.match(String(noKey[0].note), /OPENAI_API_KEY/);
  });
});

describe('çıkış kararı ve rapor', () => {
  const row = (status: string) => ({ p: product(status), status });

  it('anahtar yoksa kırmızı; sistemik hata kırmızı; birkaç hata yeşil', () => {
    assert.strictEqual(priceExitDecision({ rows: [row('error')], hasLlm: false }).code, 1);
    assert.strictEqual(priceExitDecision({ rows: [row('fresh'), row('no_url')], hasLlm: false }).code, 0, 'bakılacak ürün yoksa anahtar gerekmez');
    const bad = [row('error'), row('error'), row('error'), row('unknown'), row('same'), row('same')];
    assert.strictEqual(priceExitDecision({ rows: bad, hasLlm: true }).code, 1);
    const mostlyOk = [row('same'), row('same'), row('same'), row('changed'), row('unknown'), row('error')];
    const ok = priceExitDecision({ rows: mostlyOk, hasLlm: true });
    assert.strictEqual(ok.code, 0);
    assert.match(ok.reasons.join(' '), /price:review/);
  });

  it('freshnessSummary: güncellemeden sonra doğrulanmış sayı ve sona erecekler', () => {
    const products = [product('a', makePricing('freemium', 20, '2026-08-01')), product('b', makePricing('freemium', 20, '2026-08-25')), product('c', makePricing('freemium', 20, '2026-10-01'))];
    const rows = [{ p: products[0], status: 'same', update: makePricing('freemium', 20, TODAY) }];
    const s = freshnessSummary(products, rows, TODAY);
    assert.strictEqual(s.active, 3);
    assert.strictEqual(s.verified, 3);
    assert.deepStrictEqual(s.expiring.map((e: { p: { id: string }; daysLeft: number }) => [e.p.id, e.daysLeft]), [['b', 10]]);
  });

  it('rapor: bölümler, kanıt ve doğrulanmış sayısı', () => {
    const p = product('acme');
    const rows = [
      { p, status: 'changed', model: 'freemium', startingPrice: 25, evidence: 'Pro $25 per month' },
      { p: product('big'), status: 'review', model: 'freemium', startingPrice: 8, note: 'tutar çok değişti: 20 → 8 USD', evidence: 'Plus $8 per month' },
      { p: product('err'), status: 'error', note: 'HTTP 403' },
    ];
    const summary = { active: 3, verified: 1, expiring: [] };
    const md = renderPriceReport({ rows, today: TODAY, summary, decision: { code: 0, reasons: [] } });
    assert.match(md, /\*\*1\/3\*\* aktif ürün/);
    assert.match(md, /ACME: freemium 20 USD → freemium 25 USD/);
    assert.match(md, /kanıt: "Pro \$25 per month"/);
    assert.match(md, /--accept=big/);
    assert.match(md, /## Hata \(1\)/);
  });
});

describe('para birimi: LLM "$" ya da "null" yazsa da USD tanınır', () => {
  it('sembol, kod ve "null" yazısı', () => {
    assert.strictEqual(resolveCurrency({ currency: 'USD', evidence: 'Pro $20' }), 'USD');
    assert.strictEqual(resolveCurrency({ currency: '$', evidence: 'Pro $20 per month' }), 'USD');
    assert.strictEqual(resolveCurrency({ currency: 'US$', evidence: 'Pro US$20' }), 'USD');
    assert.strictEqual(resolveCurrency({ currency: 'null', evidence: 'Plus $ 49 /month' }), 'USD');
    assert.strictEqual(resolveCurrency({ currency: null, evidence: 'Plus $20' }), 'USD');
  });

  it('USD dışı işaret USD sayılmaz; belirsizse null', () => {
    assert.strictEqual(resolveCurrency({ currency: 'TRY', evidence: '₺849,99' }), 'TRY');
    assert.strictEqual(resolveCurrency({ currency: '$', evidence: 'CA$20 / month' }), 'CA$');
    assert.strictEqual(resolveCurrency({ currency: null, evidence: '€9 per month' }), '€');
    assert.strictEqual(resolveCurrency({ currency: null, evidence: 'Pro 20 per month' }), null);
    assert.strictEqual(resolveCurrency({ currency: 'EUR', evidence: 'Pro $20' }), 'EUR');
  });

  it('comparePrice: "$" ve "null" yazan çıkarım artık "emin değil" olmaz; gerçek TRY olur', () => {
    const p = { pricing: makePricing('freemium', 20, '2026-08-01') };
    assert.strictEqual(comparePrice(p, { model: 'freemium', startingPrice: 25, currency: '$', evidence: 'Pro $25 per month' }).status, 'changed');
    assert.strictEqual(comparePrice(p, { model: 'freemium', startingPrice: 25, currency: 'null', evidence: 'Pro $25 per month' }).status, 'changed');
    const lira = comparePrice(p, { model: 'freemium', startingPrice: 849, currency: 'TRY', evidence: '₺849 / ay' });
    assert.strictEqual(lira.status, 'unknown');
    assert.match(String(lira.note), /para birimi TRY/);
    assert.match(String(comparePrice(p, { model: 'freemium', startingPrice: 25, currency: null, evidence: 'Pro 25 per month' }).note), /belirsiz/);
  });
});

describe('billingConcern: yıllık ya da promosyon fiyat otomatik yazılmaz', () => {
  const ev = (evidence: string, extra: Record<string, unknown> = {}) => ({ model: 'freemium', startingPrice: 11, currency: 'USD', billing: 'monthly', evidence, ...extra });

  it('kanıtın kendisi yıllık faturalamayı ya da indirimi söylüyorsa', () => {
    assert.match(String(billingConcern(ev('$11 Save 42% Per user/month, billed as $132 annually'))), /yıllık/);
    assert.match(String(billingConcern(ev('Pro $8 per month, billed yearly'))), /yıllık/);
    assert.match(String(billingConcern(ev('Starter $1 first month, then $6'))), /promosyon/);
    assert.match(String(billingConcern(ev('Core $9 Regular price $12'))), /promosyon/);
    assert.match(String(billingConcern(ev('Pro $14.50', { billing: 'annual_only' }))), /yalnızca yıllık/);
  });

  it('sayfada yıllık düğmesi var, kanıt "aylık" demiyorsa; açıkça aylıksa geçer', () => {
    const page = 'Monthly Yearly Save 20% Core $20 Free $0';
    assert.match(String(billingConcern(ev('Core $20'), page)), /düğmesi/);
    assert.strictEqual(billingConcern(ev('$29/mo Billed monthly'), page), null);
    assert.strictEqual(billingConcern(ev('Core $20'), 'Core $20 Free $0'), null);
    assert.strictEqual(billingConcern({ model: 'free', evidence: 'Free $0 yearly' }, page), null);
  });

  it('comparePrice: değişiklik inceleme olur, --accept ile yazılır; aynı fiyat teyit olur', () => {
    const p = { pricing: makePricing('freemium', 20, '2026-08-01') };
    const page = 'Monthly Yearly Save 20% Core $22';
    const r = comparePrice(p, ev('Core $22', { startingPrice: 22 }), page);
    assert.strictEqual(r.status, 'review');
    assert.match(String(r.note), /düğmesi/);
    assert.strictEqual(comparePrice(p, ev('Core $20', { startingPrice: 20 }), page).status, 'same');
    assert.strictEqual(comparePrice(p, ev('Core $22', { startingPrice: 22 }), 'Core $22').status, 'changed');
  });

  it('checkProducts: yıllık düğmeli sayfadaki değişiklik products.json\'a önerilmez', async () => {
    const page = `<html><body>${'<div>Menu item</div>'.repeat(40)}<div>Monthly</div><div>Yearly</div><div>Free $0</div><div>Pro $22 per month</div></body></html>`;
    const llm = llmReturning({ model: 'freemium', startingPrice: 22, currency: '$', billing: 'monthly', evidence: 'Pro $22 per month', freeTierEvidence: 'Free $0' });
    const rows = await checkProducts({ products: [product('yearly')], fetchText: async () => page, llm, today: TODAY, maxAgeDays: 0 });
    assert.strictEqual(rows[0].status, 'review');
    assert.strictEqual(rows[0].update, undefined);
    const accepted = await checkProducts({ products: [product('yearly')], fetchText: async () => page, llm, today: TODAY, maxAgeDays: 0, accept: new Set(['yearly']) });
    assert.strictEqual(accepted[0].status, 'changed');
    assert.strictEqual(accepted[0].update.startingPrice, 22);
  });
});

describe('elle alınan sayfa (price:snap)', () => {
  const withDir = (fn: (root: string) => void) => {
    const root = mkdtempSync(path.join(tmpdir(), 'snap-'));
    try {
      fn(root);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  };

  it('yaz-oku gidiş dönüş; CRLF ve BOM temizlenir', () => {
    const file = formatSnapshot({ date: TODAY, source: 'https://acme.example/pricing', text: 'Pro $20 per month\r\nFree $0' });
    assert.deepStrictEqual(parseSnapshot(`﻿${file.replace(/\n/g, '\r\n')}`), { date: TODAY, source: 'https://acme.example/pricing', text: 'Pro $20 per month\nFree $0' });
    assert.strictEqual(parseSnapshot('sadece metin').date, null);
  });

  it('yaş hesabı: gelecek ve tarihsiz geçersiz', () => {
    assert.strictEqual(snapshotAgeDays('2026-10-10', TODAY), 4);
    assert.strictEqual(snapshotAgeDays('2026-10-20', TODAY), Infinity);
    assert.strictEqual(snapshotAgeDays(null, TODAY), Infinity);
  });

  it('findSnapshot: taze olanı seçer, eskiyi stale işaretler, paylaşılan sayfada kardeş ürünün dosyasını bulur', () => {
    withDir((root) => {
      assert.strictEqual(findSnapshot({ root, ids: ['a'], today: TODAY }), null);
      writeSnapshot({ root, id: 'a', date: '2026-10-01', source: 'u', text: 'Pro $20' });
      const old = findSnapshot({ root, ids: ['a'], today: TODAY });
      assert.strictEqual(old?.stale, true);
      writeSnapshot({ root, id: 'b', date: '2026-10-12', source: 'u', text: 'Pro $21' });
      const shared = findSnapshot({ root, ids: ['a', 'b'], today: TODAY });
      assert.strictEqual(shared?.id, 'b');
      assert.strictEqual(shared?.stale, false);
      mkdirSync(path.join(root, 'data/page-snapshots'), { recursive: true });
      writeFileSync(path.join(root, 'data/page-snapshots/c.txt'), 'başlıksız yapıştırma');
      assert.strictEqual(findSnapshot({ root, ids: ['c'], today: TODAY })?.stale, true);
    });
  });
});

describe('kanıt eşleştirme: biçim farkına toleranslı, sayı sınırına katı', () => {
  it('noktalama ve boşluk farkı sorun olmaz', () => {
    assert.strictEqual(evidenceInText('Free $0/month forever', 'Plans: Free $0 / month forever. Pro $20'), true);
    assert.strictEqual(evidenceInText('Pro: $20 per-month', 'x Pro $20 per month y'), true);
  });

  it('daha büyük bir sayının parçası olan alıntı eşleşmez', () => {
    assert.strictEqual(evidenceInText('Pro $20 per month', 'Pro $200 per month'), false);
    assert.strictEqual(evidenceInText('Pro costs $20', 'Pro costs $20.50 a month'), false);
    assert.strictEqual(evidenceInText('Pro costs $20', 'Pro costs $20 a month'), true);
    assert.strictEqual(evidenceInText('costs $20 a month', 'Pro costs $20 a month'), true);
    assert.strictEqual(evidenceInText('costs 20 a month', 'Pro costs 120 a month'), false);
  });

  it('tamamen farklı metin yine eşleşmez; çok kısa alıntı fallback ile eşleşmez', () => {
    assert.strictEqual(evidenceInText('Business $34 per month', 'Business $43 per month'), false);
    assert.strictEqual(evidenceInText('a-b-c d', 'abcd efgh'), false);
  });
});

describe('--verbose için çıkarım özeti', () => {
  it('checkProducts satırlarında extracted bulunur', async () => {
    const rows = await checkProducts({ products: [product('x')], fetchText: async () => PAGE, llm: llmReturning(good), today: TODAY, maxAgeDays: 0 });
    assert.strictEqual(rows[0].extracted.evidence, 'Pro $20 per month');
    assert.strictEqual(rows[0].extracted.freeTierEvidence, 'Free $0 forever');
    const bad = await checkProducts({ products: [product('y')], fetchText: async () => PAGE, llm: llmReturning({ ...good, evidence: 'Pro $99 per month' }), today: TODAY, maxAgeDays: 0 });
    assert.strictEqual(bad[0].status, 'unknown');
    assert.strictEqual(bad[0].extracted.evidence, 'Pro $99 per month');
  });

  it('rapor: yıllık nedenli incelemede Aylık seçip price:snap ipucu çıkar', () => {
    const p = product('annual');
    const md = renderPriceReport({
      rows: [{ p, status: 'review', model: 'freemium', startingPrice: 11, note: 'kanıt yıllık faturalamayı gösteriyor', evidence: '$11 billed annually' }],
      today: TODAY,
      summary: { active: 1, verified: 0, expiring: [] },
      decision: { code: 0, reasons: [] },
    });
    assert.match(md, /price:snap -- annual/);
  });
});

describe('rehberli tur (price:snap --guided)', () => {
  const products = [
    { id: 'ideogram-20', name: 'Ideogram', status: 'active', pricingUrl: 'https://ideogram.example/pricing' },
    { id: 'chatgpt-a', name: 'ChatGPT', status: 'active', pricingUrl: 'https://chatgpt.example/pricing' },
    { id: 'chatgpt-b', name: 'ChatGPT (görsel)', status: 'active', pricingUrl: 'https://chatgpt.example/pricing' },
    { id: 'nourl', name: 'NoUrl', status: 'active' },
  ];
  const pageFor = (brand: string) => `${brand} Pricing ${'menu '.repeat(60)} Free $0 forever Pro $20 per month`;

  function harness(answers: string[], clipboards: Array<string | null>) {
    const log: string[] = [];
    const opened: string[] = [];
    const asked: string[] = [];
    let a = 0;
    let c = 0;
    return {
      log,
      opened,
      asked,
      args: {
        products,
        today: TODAY,
        readClipboard: () => (c < clipboards.length ? clipboards[c++] : clipboards[clipboards.length - 1]),
        openUrl: (url: string) => (opened.push(url), true),
        ask: async (q: string) => (asked.push(q), a < answers.length ? answers[a++] : 'q'),
        log: (m: string) => log.push(m),
      },
    };
  }
  const withRoot = async (fn: (root: string) => Promise<void>) => {
    const root = mkdtempSync(path.join(tmpdir(), 'guided-'));
    try {
      await fn(root);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  };

  it('ad kelimeleri ve sayfa benzerliği', () => {
    assert.deepStrictEqual(nameWords('Canva AI (Magic Studio)'), ['canva', 'magic', 'studio']);
    assert.strictEqual(looksLikeProductPage('Ideogram', 'Welcome to IDEOGRAM pricing'), true);
    assert.strictEqual(looksLikeProductPage('Ideogram', 'Some other site'), false);
  });

  it('her sayfayı açar, panoyu kaydeder; aynı adresi paylaşan ürün tek kez sorulur; pricingUrl olmayan atlanır', async () => {
    await withRoot(async (root) => {
      const h = harness(['', ''], [pageFor('Ideogram'), pageFor('ChatGPT')]);
      const r = await runGuided({ ...h.args, ids: ['ideogram-20', 'chatgpt-a', 'chatgpt-b', 'nourl'], root });
      assert.deepStrictEqual(h.opened, ['https://ideogram.example/pricing', 'https://chatgpt.example/pricing']);
      assert.deepStrictEqual(r.saved.map((s: { id: string }) => s.id), ['ideogram-20', 'chatgpt-a']);
      assert.strictEqual(r.quit, false);
      assert.match(h.log.join('\n'), /ChatGPT \(görsel\) için de kullanılır/);
      const snap = findSnapshot({ root, ids: ['chatgpt-a'], today: TODAY });
      assert.strictEqual(snap?.stale, false);
      assert.match(String(snap?.text), /Pro \$20 per month/);
    });
  });

  it('boş/kısa pano, öncekiyle aynı pano ve yanlış sayfa uyarılır; e ile zorla kaydedilir; s atlar; q çıkar', async () => {
    await withRoot(async (root) => {
      // 1. ürün: önce kısa pano, sonra doğru. 2. ürün: aynı metin (uyarı), sonra yanlış sayfa (uyarı), sonra e ile zorla.
      const h = harness(['', '', '', '', 'e', 'q'], ['kısa', pageFor('Ideogram'), pageFor('Ideogram'), pageFor('Başka site'), pageFor('Başka site')]);
      const r = await runGuided({ ...h.args, ids: ['ideogram-20', 'chatgpt-a'], root });
      const out = h.log.join('\n');
      assert.match(out, /çok kısa/);
      assert.match(out, /bir öncekiyle aynı/);
      assert.match(out, /doğru sayfayı mı kopyaladın/);
      assert.deepStrictEqual(r.saved.map((s: { id: string }) => s.id), ['ideogram-20', 'chatgpt-a']);
      assert.strictEqual(r.quit, false);
    });
    await withRoot(async (root) => {
      const h = harness(['s', 'q'], [pageFor('ChatGPT')]);
      const r = await runGuided({ ...h.args, ids: ['ideogram-20', 'chatgpt-a'], root });
      assert.deepStrictEqual(r.skipped, ['ideogram-20']);
      assert.strictEqual(r.saved.length, 0);
      assert.strictEqual(r.quit, true);
    });
  });

  it('pano okunamazsa tur durur ve hata döner', async () => {
    await withRoot(async (root) => {
      const h = harness([''], [null]);
      const r = await runGuided({ ...h.args, ids: ['ideogram-20'], root });
      assert.strictEqual(r.error, 'pano');
      assert.strictEqual(r.quit, true);
    });
  });
});
