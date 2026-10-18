// Yetenek denetimi (scripts/capabilities, scripts/check-capabilities.mjs).
// Ağ ve OpenAI sahtedir; sayfalar ve cevaplar elle kurulmuş senaryolardır, gerçek ürün verisi değildir.
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import {
  MIN_EVIDENCE_WORDS,
  THIN_TEXT_CHARS,
  askProduct,
  capabilityExitDecision,
  checkProducts,
  gatherPages,
  metaTexts,
  overlapsTask,
  pageToText,
  renderCapabilityReport,
  summarize,
  textChars,
  verifyProduct,
} from '../../scripts/capabilities/core.mjs';
import { loadCatalog } from '../catalog/index';

const read = (p: string) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

type T = { id: string; label: { en: string; tr: string }; description: { en: string; tr: string }; keywords: { en: string[]; tr: string[] } };
const T = (id: string, en: string, desc: string, kw: string[] = []): T => ({ id, label: { en, tr: en }, description: { en: desc, tr: desc }, keywords: { en: kw, tr: [] } });
const logo = T('image.logo', 'Logo design', 'Logos and brand marks.', ['logo', 'brand mark']);
const email = T('text.email', 'Email writing', 'Drafting and replying to emails.', ['write an email']);
const slides = T('slides.create', 'Presentation', 'Slide decks and pitch decks.', ['slide deck']);

type P = { id: string; name: string; url: string; pricingUrl?: string; status: 'active' | 'retired'; tasks: string[] };
const P = (id: string, tasks: string[], over: Partial<P> = {}): P => ({ id, name: id.toUpperCase(), url: `https://${id}.example.com`, status: 'active', tasks, ...over });

const FILLER = 'Our platform helps teams move faster every day with reliable tooling and friendly support. '.repeat(6);
const html = (title: string, desc: string, body: string) =>
  `<html><head><title>${title}</title><meta name="description" content="${desc}"></head><body><script>var secret=1;</script><p>${body} ${FILLER}</p></body></html>`;
const PAGE = html('Acme AI', 'Design logos and brand identities with AI.', 'Create professional logos and brand marks in seconds. Write and send emails faster with AI drafts.');

const tasksById = new Map([logo, email, slides].map((t) => [t.id, t]));
const fakeLlm = (data: unknown, tokens = 100) => {
  const calls: { user: string; system: string; name: string }[] = [];
  const llm = async (req: { user: string; system: string; name: string }) => { calls.push(req); return { data, tokens }; };
  return Object.assign(llm, { calls });
};
const answer = (liveness: string, livenessEvidence: string | null, tasks: { taskId: string; verdict: string; evidence: string | null }[]) => ({ liveness, livenessEvidence, tasks });

describe('yetenek denetimi: sayfa -> metin', () => {
  it('title ve açıklama etiketleri (öznitelik sırası ne olursa olsun) alınır, varlıklar çözülür, tekrarlar atılır', () => {
    const h = `<head><title>Acme &amp; Co</title>
      <meta content="Design logos &amp; brands" name="description">
      <meta property="og:description" content="Design logos &amp; brands">
      <meta property='twitter:title' content='Acme tweet'>
      <meta name="keywords" content="ignored"></head>`;
    assert.deepStrictEqual(metaTexts(h), ['Acme & Co', 'Design logos & brands', 'Acme tweet']);
  });

  it('pageToText meta + gövde metnidir; script içeriği girmez', () => {
    const text = pageToText(PAGE);
    assert.ok(text.startsWith('Acme AI Design logos and brand identities with AI.'));
    assert.ok(text.includes('Create professional logos and brand marks in seconds.'));
    assert.ok(!text.includes('secret'));
    assert.ok(!/<|>/.test(text));
  });

  it('gatherPages: url ve pricingUrl bir kez; aynı adres tekrarlanmaz; biri düşerse diğeri kullanılır; kısa sayfa sorun olur', async () => {
    const calls: string[] = [];
    const fetchHtml = async (url: string) => {
      calls.push(url);
      if (url.includes('down')) throw new Error('HTTP 403 (bot engeli ya da giriş isteniyor olabilir)');
      if (url.includes('tiny')) return '<html><body>boş</body></html>';
      return PAGE;
    };
    const same = await gatherPages({ product: P('a', [], { pricingUrl: 'https://a.example.com' }), fetchHtml });
    assert.strictEqual(same.pages.length, 1);
    assert.deepStrictEqual(calls, ['https://a.example.com']);

    const partial = await gatherPages({ product: P('b', [], { pricingUrl: 'https://down.example.com/pricing' }), fetchHtml });
    assert.deepStrictEqual(partial.pages.map((p: { source: string }) => p.source), ['url']);
    assert.match(partial.problems[0].reason, /HTTP 403/);
    assert.strictEqual(partial.problems[0].source, 'pricingUrl');

    const tiny = await gatherPages({ product: P('c', [], { url: 'https://tiny.example.com' }), fetchHtml });
    assert.strictEqual(tiny.pages.length, 0);
    assert.match(tiny.problems[0].reason, /çok kısa/);
  });

  it('toplam metin üst sınırı aşılmaz', async () => {
    const big = `<html><body>${'Logo creation tool for teams and brands. '.repeat(1000)}</body></html>`;
    const { pages } = await gatherPages({ product: P('d', [], { pricingUrl: 'https://d.example.com/pricing' }), fetchHtml: async () => big });
    assert.ok(pages.reduce((n: number, p: { text: string }) => n + p.text.length, 0) <= 18000);
  });
});

describe('yetenek denetimi: alıntı doğrulama', () => {
  const text = pageToText(PAGE);

  it('görev sözcüğü örtüşmesi: kök eşleşir ("write" ~ "writing"), genel sözcükler sayılmaz, bariz uyumsuzluk yakalanır', () => {
    assert.ok(overlapsTask('Create professional logos in seconds', logo));
    assert.ok(overlapsTask('We help you write emails faster', email), 'email ~ emails');
    assert.ok(!overlapsTask('Create and generate content with tools that help you work', logo), 'genel sözcükler örtüşme sayılmaz');
    assert.ok(!overlapsTask('Manage invoices and payroll for your company', slides));
  });

  it('kanıtlı: alıntı sayfada var ve görevle örtüşüyor', () => {
    const v = verifyProduct({ asked: answer('active', null, [{ taskId: 'image.logo', verdict: 'stated', evidence: 'Create professional logos and brand marks in seconds' }]), tasks: [logo], text });
    assert.deepStrictEqual(v.pairs, [{ taskId: 'image.logo', status: 'stated', evidence: 'Create professional logos and brand marks in seconds' }]);
    assert.deepStrictEqual(v.liveness, { status: 'active', evidence: null });
  });

  it('LLM alıntıyı uydurursa atılır (alıntı doğrulanamadı); kısa alıntı da atılır', () => {
    const v = verifyProduct({
      asked: answer('active', null, [
        { taskId: 'image.logo', verdict: 'stated', evidence: 'Create award-winning logos with one click' }, // sayfada yok
        { taskId: 'text.email', verdict: 'stated', evidence: 'Write emails' }, // 2 sözcük
      ]),
      tasks: [logo, email], text,
    });
    assert.strictEqual(v.pairs[0].status, 'unverified');
    assert.match(v.pairs[0].note ?? '', /sayfada bulunamadı/);
    assert.strictEqual(v.pairs[1].status, 'unverified');
    assert.match(v.pairs[1].note ?? '', new RegExp(`${MIN_EVIDENCE_WORDS} sözcükten kısa`));
  });

  it('"stated" ama alıntı görevle örtüşmüyorsa "implied" olur; "implied" doğrulanmış alıntıyla kalır', () => {
    const v = verifyProduct({
      asked: answer('active', null, [
        { taskId: 'slides.create', verdict: 'stated', evidence: 'Our platform helps teams move faster every day' },
        { taskId: 'text.email', verdict: 'implied', evidence: 'Write and send emails faster with AI drafts' },
      ]),
      tasks: [slides, email], text,
    });
    assert.strictEqual(v.pairs[0].status, 'implied');
    assert.match(v.pairs[0].note ?? '', /örtüşmüyor/);
    assert.deepStrictEqual(v.pairs[1], { taskId: 'text.email', status: 'implied', evidence: 'Write and send emails faster with AI drafts' });
  });

  it('not_found alıntısız kalır; modelin atladığı görev not_found + not; bilinmeyen görev ve yinelenen cevap yok sayılır', () => {
    const v = verifyProduct({
      asked: answer('active', null, [
        { taskId: 'image.logo', verdict: 'not_found', evidence: 'Create professional logos and brand marks' }, // not_found'da alıntı yok sayılır
        { taskId: 'olmayan.gorev', verdict: 'stated', evidence: 'Write and send emails faster with AI drafts' },
        { taskId: 'text.email', verdict: 'stated', evidence: 'Write and send emails faster with AI drafts' },
        { taskId: 'text.email', verdict: 'not_found', evidence: null }, // ikinci cevap: ilki geçerli
      ]),
      tasks: [logo, email, slides], text,
    });
    assert.deepStrictEqual(v.pairs.map((p: { taskId: string; status: string }) => `${p.taskId}:${p.status}`), ['image.logo:not_found', 'text.email:stated', 'slides.create:not_found']);
    assert.strictEqual(v.pairs[0].evidence, null);
    assert.strictEqual(v.pairs[2].note, 'model bu görevi yanıtlamadı');
  });

  it('kapanma / yeniden adlandırma yalnızca doğrulanmış alıntıyla kabul edilir', () => {
    const closing = html('Atlas', 'Browser', 'Atlas will stop working on August 9, 2026. Its features move to ChatGPT.');
    const t = pageToText(closing);
    const ok = verifyProduct({ asked: answer('discontinued', 'Atlas will stop working on August 9, 2026', []), tasks: [], text: t });
    assert.deepStrictEqual(ok.liveness, { status: 'discontinued', evidence: 'Atlas will stop working on August 9, 2026' });
    const renamed = verifyProduct({ asked: answer('renamed', 'Its features move to ChatGPT', []), tasks: [], text: t });
    assert.strictEqual(renamed.liveness.status, 'renamed');

    const fake = verifyProduct({ asked: answer('discontinued', 'This product has been shut down permanently', []), tasks: [], text: t });
    assert.strictEqual(fake.liveness.status, 'unclear');
    assert.match(fake.liveness.note ?? '', /discontinued dendi ama alıntı doğrulanamadı/);

    const none = verifyProduct({ asked: answer('discontinued', null, []), tasks: [], text: t });
    assert.strictEqual(none.liveness.status, 'unclear');

    assert.strictEqual(verifyProduct({ asked: answer('active', null, []), tasks: [], text: t }).liveness.status, 'active');
    assert.strictEqual(verifyProduct({ asked: { liveness: 'bozuk', tasks: [] }, tasks: [], text: t }).liveness.status, 'unclear');
    assert.strictEqual(verifyProduct({ asked: null, tasks: [logo], text: t }).pairs[0].status, 'not_found');
  });
});

describe('yetenek denetimi: LLM isteği', () => {
  it('görevleri kimlikleriyle gönderir, yalnızca sayfa metnini verir, sıfır sıcaklık, katı şema', async () => {
    const llm = fakeLlm(answer('active', null, []));
    await askProduct({ productName: 'Acme', tasks: [logo, email], pages: [{ source: 'url', url: 'https://secret.example.com/x', text: 'sayfa metni' }], llm });
    const req = llm.calls[0] as unknown as { user: string; system: string; name: string; temperature: number; schema: { required: string[]; additionalProperties: boolean; properties: { tasks: { items: { required: string[] } } } } };
    const user = JSON.parse(req.user);
    assert.deepStrictEqual(user.tasks, [
      { taskId: 'image.logo', name: 'Logo design', description: 'Logos and brand marks.' },
      { taskId: 'text.email', name: 'Email writing', description: 'Drafting and replying to emails.' },
    ]);
    assert.deepStrictEqual(user.pages, [{ source: 'url', text: 'sayfa metni' }], 'adres LLM\'e gitmez: kanıt yalnızca metinden gelir');
    assert.strictEqual(req.temperature, 0);
    assert.strictEqual(req.name, 'capability_check');
    assert.strictEqual(req.schema.additionalProperties, false);
    assert.deepStrictEqual(req.schema.required, ['liveness', 'livenessEvidence', 'tasks']);
    assert.deepStrictEqual(req.schema.properties.tasks.items.required, ['taskId', 'verdict', 'evidence']);
    assert.match(req.system, /never use prior knowledge/);
  });

  it('LLM yoksa açık bir hata verir', async () => {
    await assert.rejects(() => askProduct({ productName: 'A', tasks: [logo], pages: [], llm: null }), /LLM yok/);
  });
});

describe('yetenek denetimi: akış', () => {
  const llmOk = () => fakeLlm(answer('active', null, [
    { taskId: 'image.logo', verdict: 'stated', evidence: 'Create professional logos and brand marks in seconds' },
    { taskId: 'text.email', verdict: 'not_found', evidence: null },
  ]));

  it('ürün başına tek çağrı; sonuç satırı sayfaları, görevleri, doğrulanmış çiftleri ve token\'ı taşır', async () => {
    const llm = llmOk();
    const products = [P('acme', ['image.logo', 'text.email'], { pricingUrl: 'https://acme.example.com/pricing' })];
    const before = JSON.stringify(products);
    const seen: string[] = [];
    const rows = await checkProducts({ products, tasksById, fetchHtml: async () => PAGE, llm, onRow: (r: { p: { id: string } }) => seen.push(r.p.id) });
    assert.strictEqual(JSON.stringify(products), before, 'ürün verisi değişmez');
    assert.strictEqual(llm.calls.length, 1);
    assert.deepStrictEqual(seen, ['acme']);
    const r = rows[0];
    assert.strictEqual(r.status, 'ok');
    assert.strictEqual(r.tokens, 100);
    assert.deepStrictEqual(r.pages.map((p: { source: string }) => p.source), ['url', 'pricingUrl']);
    assert.deepStrictEqual(r.pairs.map((p: { taskId: string; status: string }) => `${p.taskId}:${p.status}`), ['image.logo:stated', 'text.email:not_found']);
  });

  it('sayfa okunamazsa LLM çağrılmaz; LLM hata verirse satır "error" olur ve akış sürer; pasif ürün ve --only', async () => {
    const llm = llmOk();
    const boom = async () => { throw new Error('HTTP 403 (bot engeli ya da giriş isteniyor olabilir)'); };
    const unreadable = await checkProducts({ products: [P('a', ['image.logo'])], tasksById, fetchHtml: boom, llm });
    assert.strictEqual(unreadable[0].status, 'unreadable');
    assert.match(String(unreadable[0].note), /HTTP 403/);
    const twoPages = await checkProducts({ products: [P('b', ['image.logo'], { pricingUrl: 'https://b.example.com/pricing' })], tasksById, fetchHtml: boom, llm });
    assert.strictEqual(String(twoPages[0].note).split('HTTP 403').length - 1, 1, 'iki sayfa aynı hatayı verince neden bir kez yazılır');
    assert.strictEqual(llm.calls.length, 0);

    const failing = async () => { throw new Error('rate limit'); };
    const rows = await checkProducts({ products: [P('x', ['image.logo']), P('y', ['image.logo'])], tasksById, fetchHtml: async () => PAGE, llm: failing as never });
    assert.deepStrictEqual(rows.map((r: { status: string }) => r.status), ['error', 'error']);
    assert.match(String(rows[0].note), /rate limit/);

    const some = await checkProducts({ products: [P('on', ['image.logo']), P('off', ['image.logo'], { status: 'retired' }), P('other', ['image.logo'])], tasksById, fetchHtml: async () => PAGE, llm: llmOk(), only: new Set(['on', 'off']) });
    assert.deepStrictEqual(some.map((r: { p: { id: string } }) => r.p.id), ['on'], 'pasif ürün ve seçilmeyen atlanır');
  });

  it('görevi olmayan ürün için LLM çağrılmaz', async () => {
    const llm = llmOk();
    const rows = await checkProducts({ products: [P('empty', [])], tasksById, fetchHtml: async () => PAGE, llm });
    assert.strictEqual(rows[0].status, 'ok');
    assert.deepStrictEqual(rows[0].pairs, []);
    assert.strictEqual(llm.calls.length, 0);
  });

  it('çıkış kararı: anahtar yoksa ve yarıdan fazlası okunamazsa kırmızı; aksi halde yeşil', () => {
    const ok = { status: 'ok' }; const bad = { status: 'unreadable' }; const err = { status: 'error' };
    assert.deepStrictEqual(capabilityExitDecision({ rows: [ok, ok, bad], hasLlm: true }), { code: 0, reasons: [] });
    assert.strictEqual(capabilityExitDecision({ rows: [ok], hasLlm: false }).code, 1);
    const half = capabilityExitDecision({ rows: [ok, bad], hasLlm: true });
    assert.strictEqual(half.code, 0, 'tam yarısı kırmızı değil');
    const majority = capabilityExitDecision({ rows: [ok, bad, err], hasLlm: true });
    assert.strictEqual(majority.code, 1);
    assert.match(majority.reasons[0], /2\/3/);
    assert.deepStrictEqual(capabilityExitDecision({ rows: [], hasLlm: true }), { code: 0, reasons: [] });
  });
});

describe('yetenek denetimi: rapor', () => {
  const closingPage = html('Atlas', 'Browser', 'Atlas will stop working on August 9, 2026. Its features move to ChatGPT.');
  async function sampleRows() {
    const llm = async (req: { user: string }) => {
      const name = JSON.parse(req.user).productName as string;
      if (name === 'ATLAS') return { data: answer('discontinued', 'Atlas will stop working on August 9, 2026', [{ taskId: 'text.email', verdict: 'not_found', evidence: null }]), tokens: 50 };
      return { data: answer('active', null, [
        { taskId: 'image.logo', verdict: 'stated', evidence: 'Create professional logos and brand marks in seconds' },
        { taskId: 'text.email', verdict: 'implied', evidence: 'Write and send emails faster with AI drafts | extra' }, // "|" içeren ama sayfada olmayan alıntı
      ]), tokens: 70 };
    };
    return checkProducts({
      products: [P('acme', ['image.logo', 'text.email']), P('atlas', ['text.email']), P('blocked', ['slides.create'])],
      tasksById,
      fetchHtml: async (url: string) => {
        if (url.includes('blocked')) throw new Error('HTTP 403 (bot engeli ya da giriş isteniyor olabilir)');
        return url.includes('atlas') ? closingPage : PAGE;
      },
      llm: llm as never,
    });
  }

  it('özet sayıları tutarlı', async () => {
    const s = summarize(await sampleRows());
    assert.strictEqual(s.checked, 3);
    assert.strictEqual(s.read, 2);
    assert.strictEqual(s.unreadable, 1);
    assert.strictEqual(s.pairs, 3);
    assert.deepStrictEqual(s.counts, { stated: 1, implied: 0, not_found: 1, unverified: 1 });
    assert.strictEqual(s.tokens, 120);
    assert.strictEqual(s.counts.stated + s.counts.implied + s.counts.not_found + s.counts.unverified, s.pairs);
  });

  it('rapor: uyarılar, kapanma tablosu, editör seçimi, okunamayanlar, sınırlar; NaN/undefined yok', async () => {
    const rows = await sampleRows();
    const labels = new Map([logo, email, slides].map((t) => [t.id, t.label.en]));
    const text = renderCapabilityReport({
      rows, today: '2026-10-16', labelOf: (id: string) => labels.get(id) ?? id,
      editorPicks: [{ taskId: 'text.email', productId: 'acme' }, { taskId: 'image.logo', productId: 'acme' }, { taskId: 'slides.create', productId: 'blocked' }],
      decision: { code: 0, reasons: [] },
    });
    assert.ok(!/NaN|undefined|\[object/.test(text));
    assert.match(text, /Salt rapor: data\/products\.json ve diğer veri dosyaları DEĞİŞMEDİ/);
    assert.match(text, /\*\*"Bulunamadı", ürünün o işi yapamadığı anlamına GELMEZ\*\*/);
    // 2. bölüm: kapanma işareti, alıntıyla
    assert.match(text, /\| ATLAS \| KAPANIYOR \/ KAPANDI \| Atlas will stop working on August 9, 2026 \| https:\/\/atlas\.example\.com \|/);
    // 3. bölüm: editör seçimi olup kanıtı olmayan (e-posta: alıntı doğrulanamadı) ve okunamayan; kanıtlı logo listelenmez
    const sec3 = text.slice(text.indexOf('## 3.'), text.indexOf('## 4.'));
    assert.match(sec3, /\| Email writing \| ACME \| alıntı doğrulanamadı \|/);
    assert.match(sec3, /\| Presentation \| BLOCKED \| sayfa okunamadı \|/);
    assert.ok(!sec3.includes('Logo design'), 'kanıtlı editör seçimi 3. bölümde yok');
    // 4. bölüm tablo satırı ve "|" kaçışı
    assert.match(text, /\| Logo design \| ACME \| kanıtlı \| Create professional logos and brand marks in seconds \|/);
    // 5. bölüm
    assert.match(text, /\| BLOCKED \| sayfa okunamadı \| HTTP 403/);
    assert.match(text, /## 6\. Sınırlar/);
  });

  it('doğrulanmış işaret yoksa 2. bölüm bunu söyler; kırmızı karar başlıkta görünür; "|" tablo hücresini bozmaz', async () => {
    const rows = await checkProducts({ products: [P('acme', ['image.logo'])], tasksById, fetchHtml: async () => PAGE, llm: fakeLlm(answer('active', null, [{ taskId: 'image.logo', verdict: 'stated', evidence: 'Create professional logos and brand marks in seconds' }])) as never });
    const text = renderCapabilityReport({ rows, today: '2026-10-16', decision: { code: 1, reasons: ['OPENAI_API_KEY yok: hiçbir ürün denetlenemedi.'] } });
    assert.match(text, /## Karar: BAŞARISIZ \(iş kırmızı biter\)\n\n- OPENAI_API_KEY yok/);
    assert.match(text, /Doğrulanmış işaret yok/);
    const piped = [{ p: P('p', ['image.logo']), tasks: [logo], pages: [], problems: [], liveness: { status: 'active', evidence: null }, status: 'ok', tokens: 0, pairs: [{ taskId: 'image.logo', status: 'stated', evidence: 'a | b | c' }] }];
    const t2 = renderCapabilityReport({ rows: piped, today: '2026-10-16' });
    assert.match(t2, /\| image\.logo \| P \| kanıtlı \| a ¦ b ¦ c \|/);
  });

  it('5b: okunan metin miktarı gösterilir; eşiğin altındaki sayfa "İNCE" işaretlenir, üstündekiler işaretlenmez', async () => {
    const thick = html('Big', 'Design logos with AI.', FILLER.repeat(5));
    const pages: Record<string, string> = { 'https://thin.example.com': PAGE, 'https://thick.example.com': thick };
    const llm = fakeLlm(answer('active', null, [{ taskId: 'image.logo', verdict: 'not_found', evidence: null }]));
    const rows = await checkProducts({ products: [P('thin', ['image.logo']), P('thick', ['image.logo'])], tasksById, fetchHtml: async (u: string) => pages[u], llm: llm as never });
    const [thinRow, thickRow] = rows;
    assert.ok(thinRow.pages[0].chars < THIN_TEXT_CHARS && thickRow.pages[0].chars >= THIN_TEXT_CHARS, 'senaryo: biri eşiğin altında, biri üstünde');
    assert.strictEqual(textChars(thinRow), thinRow.pages[0].chars);

    const text = renderCapabilityReport({ rows, today: '2026-10-16' });
    const sec = text.slice(text.indexOf('### 5b.'), text.indexOf('## 6.'));
    assert.match(sec, /İnce ürün: 1\/2\./);
    assert.match(sec, /\| THIN \| url: \d+ \| \d+ \| İNCE: "bulunamadı" güvenilmez \|/);
    assert.match(sec, /\| THICK \| url: \d+ \| \d+ \| — \|/);
    assert.ok(!/NaN|undefined|\[object/.test(text));

    // okunamayan ürün 5b'de yer almaz (zaten 5. bölümde)
    const boom = async () => { throw new Error('HTTP 403'); };
    const bad = await checkProducts({ products: [P('bad', ['image.logo'])], tasksById, fetchHtml: boom, llm: llm as never });
    const t2 = renderCapabilityReport({ rows: bad, today: '2026-10-16' });
    assert.match(t2.slice(t2.indexOf('### 5b.'), t2.indexOf('## 6.')), /İnce ürün: 0\/0\./);
    assert.ok(!t2.slice(t2.indexOf('### 5b.'), t2.indexOf('## 6.')).includes('| BAD |'));
  });

  it('uzun alıntı kısaltılır', () => {
    const long = 'word '.repeat(100).trim();
    const rows = [{ p: P('p', ['image.logo']), tasks: [logo], pages: [], problems: [], liveness: { status: 'active', evidence: null }, status: 'ok', tokens: 0, pairs: [{ taskId: 'image.logo', status: 'stated', evidence: long }] }];
    const line = renderCapabilityReport({ rows, today: '2026-10-16' }).split('\n').find((l) => l.startsWith('| image.logo | P |')) ?? '';
    assert.ok(line.length < 260 && line.includes('…'));
  });
});

describe('yetenek denetimi: gerçek katalogla ve kaynak yapısı', () => {
  it('gerçek katalogda her aktif ürünün görevi var, adresi var; sahte cevapla tüm hat NaN\'sız çalışır ve çift sayısı katalogla aynı', async () => {
    const catalog = loadCatalog();
    const active = catalog.products.filter((p) => p.status === 'active');
    assert.ok(active.every((p) => /^https?:\/\//.test(p.url)));
    assert.ok(active.every((p) => p.tasks.every((t) => catalog.tasksById.has(t))));
    const llm = async (req: { user: string }) => ({
      data: answer('active', null, JSON.parse(req.user).tasks.map((t: { taskId: string }) => ({ taskId: t.taskId, verdict: 'not_found', evidence: null }))),
      tokens: 1,
    });
    const rows = await checkProducts({ products: catalog.products, tasksById: catalog.tasksById, fetchHtml: async () => PAGE, llm: llm as never });
    assert.strictEqual(rows.length, active.length);
    const pairs = active.reduce((n, p) => n + p.tasks.length, 0);
    assert.strictEqual(summarize(rows).pairs, pairs);
    const text = renderCapabilityReport({ rows, today: '2026-10-16', labelOf: (id: string) => catalog.tasksById.get(id)?.label.tr ?? id, editorPicks: catalog.editorPicks });
    assert.ok(!/NaN|undefined|\[object/.test(text));
  });

  it('komut yalnızca data/capability-report.md yazar (dry-run dışında); katalog dosyalarına ve anahtara dokunmaz', () => {
    const src = read('scripts/check-capabilities.mjs');
    const writes = [...src.matchAll(/writeFileSync\(path\.join\(ROOT, '([^']+)'\)/g)].map((m) => m[1]);
    assert.deepStrictEqual(writes, ['data/capability-report.md']);
    assert.strictEqual([...src.matchAll(/writeFileSync\(/g)].length, 1);
    assert.ok(src.indexOf("args['dry-run']") < src.indexOf('writeFileSync(path.join'), 'yazma dry-run dalından sonra');
    const code = src.replace(/\/\/.*$/gm, '');
    assert.ok(!/products\.json|tasks\.json|models\.json/.test(code), 'katalog dosyalarını okumaz/yazmaz; loadCatalog kullanır');
    assert.ok(!/console\.(log|error)\([^)]*OPENAI_API_KEY\s*[\],)]/.test(code) && !/\$\{process\.env\.OPENAI/.test(code), 'anahtar değeri yazdırılmaz');
    assert.ok(!/writeFileSync|appendFileSync|unlink|rmSync/.test(read('scripts/capabilities/core.mjs')), 'çekirdek dosya yazmaz');
    assert.ok(read('package.json').includes('"check:capabilities": "node --no-warnings --loader ./lib/__tests__/ts-loader.mjs scripts/check-capabilities.mjs"'));
  });
});
