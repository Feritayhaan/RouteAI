import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { productSchema, taskSchema } from '../catalog/schema';
import { defaultSearchContext } from '../catalog/search';
import { loadCatalog } from '../catalog/index';
import { makePricing } from '../pricing';
import { recommendV3 } from '../recommendV3';
import { apiResponseFromV3 } from '../types';
import { getDictionary } from '../i18n/index';
import { hasTerm } from '../text';
import liveTasks from '../../data/tasks.json';
import liveProducts from '../../data/products.json';

// Katalog genişletme (2026-10-18): 15 yeni iş, 45 yeni ürün, 5 mevcut ürüne yeni iş eşlemesi, 30 golden satırı.
// Kaynak sayfa kanıtları data/yeni-isler-rapor.md içinde. Bu test birleştirmenin canlı kataloğu bozmadığını kilitler:
// şema, ürün başına kaynak/tarih, fiyat bütünlüğü, anahtar kelime çakışması ve mevcut golden setin (128 satır)
// kural katmanı sonuçlarının DEĞİŞMEMESİ.

const read = (rel: string) => readFileSync(new URL(`../../${rel}`, import.meta.url), 'utf8');
const report = read('data/yeni-isler-rapor.md');
const goldenAll = read('evals/golden.jsonl').split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l) as { id: string; query: string; expectedTask: string; acceptableTools: string[]; notes?: string; needsReview?: boolean });

const NEW_TASK_IDS = [
  'game.dev', 'game.asset-art', 'design.ui-prototype', 'sales.prospecting', 'support.chatbot', 'finance.bookkeeping', 'marketing.seo',
  'project.management', 'education.tutor', 'education.language-learning', 'agent.browser', 'productivity.inbox', 'productivity.planning',
  'productivity.notes', 'career.resume',
];
const NEW_PRODUCT_IDS = [
  'unity-ai', 'rosebud-ai', 'bezi', 'gdevelop', 'scenario', 'ludo-ai', 'pixellab', 'meshy', 'tripo', 'hyper3d-rodin', 'v0', 'uizard', 'figma-make',
  'apollo-io', 'clay', 'instantly', 'intercom-fin', 'tidio', 'chatbase', 'quickbooks', 'xero', 'zoho-books', 'surfer-seo', 'frase', 'asana',
  'monday-com', 'khanmigo', 'photomath', 'duolingo', 'speak', 'praktika', 'perplexity-comet', 'dia-browser', 'opera-neon', 'superhuman',
  'shortwave', 'fyxer', 'reclaim', 'motion', 'akiflow', 'notion-ai', 'mem', 'reflect', 'kickresume', 'rezi',
];
// Yeni işe bağlanan MEVCUT aktif ürünler (sayfaları okundu; kanıt raporda).
const MAPPINGS: Record<string, string> = {
  'clickup-brain-project-ai': 'project.management',
  'teal-resume-builder-ai': 'career.resume',
  'writesonic-seo-content': 'marketing.seo',
  'chatgpt-gpt-5': 'education.tutor',
  'gemini-25-pro': 'education.tutor',
};
// 3d.generate zaten vardı; ona üç yeni ürün bağlandı.
const THREE_D = ['meshy', 'tripo', 'hyper3d-rodin'];
const NEW = new Set(NEW_TASK_IDS);

type RawTask = { id: string; keywords: { tr: string[]; en: string[] } };
const allTasks = liveTasks as unknown as RawTask[];
const oldTasks = allTasks.filter((t) => !NEW.has(t.id));
const newTasks = allTasks.filter((t) => NEW.has(t.id));
const allProducts = liveProducts as unknown as { id: string; name: string; url: string; status: string; tasks: string[]; models: unknown[]; reviewStatus: string; pricing: ReturnType<typeof makePricing>; facts?: { source?: string; checkedAt?: string } }[];
const newProducts = allProducts.filter((p) => NEW_PRODUCT_IDS.includes(p.id));

// taskClassifier.ts'in kural katmanı (scoreTasks + RULE_MARGIN) ile birebir aynı mantık.
function ruleResult(query: string, list: RawTask[]) {
  const scores = list
    .map((t) => {
      let score = 0;
      for (const k of new Set([...t.keywords.tr, ...t.keywords.en])) if (hasTerm(query, k)) score++;
      return { id: t.id, score };
    })
    .sort((a, b) => b.score - a.score);
  const margin = scores[0].score - (scores[1]?.score ?? 0);
  return scores[0].score > 0 && margin >= 1 ? scores[0].id : 'unclear';
}

describe('yeni işler: canlı katalogda şema ve bütünlük', () => {
  it('15 yeni iş ve 45 yeni ürün canlı dosyalarda var; strict şemaya uyar; id’ler benzersiz', () => {
    assert.strictEqual(newTasks.length, 15);
    assert.strictEqual(newProducts.length, 45);
    for (const t of newTasks) taskSchema.strict().parse(t);
    for (const p of newProducts) productSchema.strict().parse(p);
    assert.strictEqual(new Set(allTasks.map((t) => t.id)).size, allTasks.length);
    assert.strictEqual(new Set(allProducts.map((p) => p.id)).size, allProducts.length);
  });

  it('taslak dosyaları silindi; kararla çıkarılan sözleşme incelemesi kataloğa girmedi', () => {
    for (const f of ['data/yeni-isler-taslak.json', 'data/yeni-isler-golden-taslak.jsonl']) {
      assert.throws(() => read(f), /ENOENT/, `${f} artık olmamalı`);
    }
    assert.ok(!allTasks.some((t) => t.id.startsWith('legal.')));
    for (const id of ['spellbook', 'juro', 'spotdraft']) assert.ok(!allProducts.some((p) => p.id === id), `${id} eklenmemeli`);
  });

  it('her yeni görev: benchmark boş (uydurma yok), slot kritik değil, en az 3 AKTİF ürüne bağlı', () => {
    const catalog = loadCatalog();
    for (const t of newTasks) {
      const parsed = taskSchema.parse(t);
      assert.deepStrictEqual(parsed.benchmark, [], `${t.id}: uydurma benchmark yok`);
      assert.ok(parsed.slots.every((s) => s.critical === false), `${t.id}: kritik slot ajanı yeni sorulara iter`);
      const active = catalog.productsByTask.get(t.id) ?? [];
      assert.ok(active.length >= 3, `${t.id}: ${active.length} aktif ürün`);
    }
  });

  it('yeni ürünler: aktif, unreviewed, modelsiz; mevcut ürün eşlemeleri ve 3d bağlantıları yerinde', () => {
    for (const p of newProducts) {
      assert.strictEqual(p.status, 'active', `${p.id}`);
      assert.strictEqual(p.reviewStatus, 'unreviewed', `${p.id}: incelenmemiş ürün "reviewed" olamaz`);
      assert.deepStrictEqual(p.models, []);
      assert.ok(p.tasks.length >= 1 && p.tasks.every((t) => allTasks.some((x) => x.id === t)), `${p.id}: bilinmeyen görev`);
    }
    for (const [productId, taskId] of Object.entries(MAPPINGS)) {
      const p = allProducts.find((x) => x.id === productId)!;
      assert.strictEqual(p.status, 'active');
      assert.ok(p.tasks.includes(taskId), `${productId} -> ${taskId}`);
      // Mevcut görevleri sırası bozulmadan kalmalı: yeni görev SONA eklenir (rehber seçimi ilk görevden).
      assert.strictEqual(p.tasks[p.tasks.length - 1], taskId, `${productId}: yeni görev sonda olmalı`);
    }
    for (const id of THREE_D) assert.ok(allProducts.find((p) => p.id === id)!.tasks.includes('3d.generate'));
  });

  it('fiyat: makePricing çıktısıyla birebir; tutar yalnızca tarihle; bilinmeyen -> null/unknown; kaynak ve tarih zorunlu', () => {
    for (const p of newProducts) {
      const expected = makePricing(p.pricing.model, p.pricing.startingPrice, p.pricing.priceCheckedAt ?? null);
      assert.deepStrictEqual(p.pricing, expected, `${p.id}: fiyat nesnesi makePricing ile uyuşmuyor`);
      if (p.pricing.startingPrice === null) assert.strictEqual(p.pricing.priceStatus, 'unknown');
      else {
        assert.ok(p.pricing.startingPrice > 0);
        assert.match(String(p.pricing.priceCheckedAt), /^\d{4}-\d{2}-\d{2}$/, `${p.id}: fiyatın doğrulama tarihi yok`);
        assert.ok(String(p.pricing.priceCheckedAt) >= '2026-10-18', `${p.id}: tarih eski`);
      }
      assert.ok(p.facts?.source && /^\d{4}-\d{2}-\d{2}$/.test(p.facts.checkedAt ?? ''), `${p.id}: kaynak ve tarih zorunlu`);
      assert.ok(String(p.facts?.checkedAt) >= '2026-10-18');
    }
  });

  it('rapor: her yeni ürünün adı ve kaynak sitesi raporda var; her görev başlığı var; fiyat doğrulama komutu yazılı', () => {
    for (const p of newProducts) {
      assert.ok(report.includes(`### ${p.name}`), `${p.name}: raporda bölümü yok`);
      assert.ok(report.includes(new URL(p.url).hostname), `${p.name}: raporda kaynak sitesi yok`);
    }
    for (const t of newTasks) assert.ok(report.includes(`\`${t.id}\``), `${t.id}: raporda yok`);
    assert.ok(report.includes('price:snap'), 'fiyatların elle yeniden doğrulanması raporda yazmalı');
  });
});

describe('yeni işler: anahtar kelime çakışması (mevcut golden set bozulmamalı)', () => {
  it('kural katmanı mantığı taskClassifier.ts ile aynı (sabitler değişirse bu test uyarır)', () => {
    const src = read('lib/intent/taskClassifier.ts');
    assert.match(src, /const RULE_MARGIN = 1;/);
    assert.match(src, /new Set\(\[\.\.\.t\.keywords\.tr, \.\.\.t\.keywords\.en\]\)/);
    assert.match(src, /if \(hasTerm\(query, k\)\) score\+\+/);
  });

  it('hiçbir yeni anahtar kelime başka bir görevle birebir aynı değil', () => {
    const seen = new Map<string, string>();
    for (const t of oldTasks) for (const k of new Set([...t.keywords.tr, ...t.keywords.en])) seen.set(k.toLowerCase(), t.id);
    const clashes: string[] = [];
    for (const t of newTasks) {
      for (const k of new Set([...t.keywords.tr, ...t.keywords.en])) {
        const owner = seen.get(k.toLowerCase());
        if (owner && owner !== t.id) clashes.push(`"${k}": ${t.id} / ${owner}`);
        seen.set(k.toLowerCase(), t.id);
      }
    }
    assert.deepStrictEqual(clashes, []);
  });

  it('eski 128 golden satırın hiçbirinin kural sonucu yeni işlerle değişmez (aynı görev ya da aynı belirsizlik)', () => {
    const old = goldenAll.filter((r) => !NEW.has(r.expectedTask));
    assert.strictEqual(old.length, 128);
    const changed = old
      .map((r) => ({ r, before: ruleResult(r.query, oldTasks), after: ruleResult(r.query, allTasks) }))
      .filter((x) => x.before !== x.after)
      .map((x) => `${x.r.id} "${x.r.query}": ${x.before} -> ${x.after}`);
    assert.deepStrictEqual(changed, []);
  });

  it('günlük cümleler: yeni işlerle ilgisiz sorgular eski sonucunu korur', () => {
    const unchanged = [
      'logo for my indie game', 'create a 3D model of a chair for my indie game', 'toplantı notu al', 'write an email to my customers',
      'summarize this contract', 'translate my contract to english', 'create an invoice template', 'translate this text to spanish',
      'write my resume', 'cv hazırla', 't-shirt mockup', 'kdv oranı nedir', 'I just want a chatbot to talk to about random things',
      'bana bir hikaye yaz', 'research competitors in my market', 'bu videoya altyazı ekle', 'python kodumda hata var',
      'make a presentation about project management', 'dashboard for my sales data', 'podcast transcript', 'blog yazısı yaz',
      'analyze my spreadsheet', 'generate music for my game', 'video for my game trailer', 'research the top project management tools for startups and cite your sources',
      'ürün fotoğrafı arka plan kaldır', 'instagram için reels videosu', 'build a prototype of my idea in 3d',
    ];
    const changed = unchanged
      .map((q) => ({ q, before: ruleResult(q, oldTasks), after: ruleResult(q, allTasks) }))
      .filter((x) => x.before !== x.after)
      .map((x) => `"${x.q}": ${x.before} -> ${x.after}`);
    assert.deepStrictEqual(changed, []);
  });

  it('yeni işlere ait sorgular: kural katmanı ASLA yanlış görevde kesin karar vermez; kesin oran yüksek', () => {
    const probes: [string, string][] = [
      ['unity', 'game.dev'], ['godot ile 2d oyun', 'game.dev'], ['roblox için script', 'game.dev'],
      ['pixel art karakter çiz', 'game.asset-art'], ['sprite sheet oluştur', 'game.asset-art'],
      ['figma ile ekran tasarımı', 'design.ui-prototype'], ['app wireframe', 'design.ui-prototype'], ['uygulama arayüzü tasarla', 'design.ui-prototype'],
      ['lead generation tool', 'sales.prospecting'], ['soğuk e-posta kampanyası', 'sales.prospecting'], ['potansiyel müşteri bul', 'sales.prospecting'],
      ['chatbot for my website', 'support.chatbot'], ['müşteri hizmetleri için yapay zeka', 'support.chatbot'], ['customer support bot', 'support.chatbot'],
      ['ön muhasebe programı', 'finance.bookkeeping'], ['track expenses for my freelance business', 'finance.bookkeeping'],
      ['seo keyword research', 'marketing.seo'], ['organik trafik artırmak istiyorum', 'marketing.seo'],
      ['kanban board for my team', 'project.management'], ['task management app', 'project.management'], ['proje yönetimi aracı', 'project.management'],
      ['homework help', 'education.tutor'], ['sınava hazırlanmama yardım et', 'education.tutor'],
      ['learn german', 'education.language-learning'], ['almanca öğrenmek istiyorum', 'education.language-learning'],
      ['ai browser', 'agent.browser'], ['yapay zeka tarayıcı öner', 'agent.browser'],
      ['inbox zero', 'productivity.inbox'], ['e-posta asistanı', 'productivity.inbox'],
      ['time blocking', 'productivity.planning'], ['günlük plan yapayım', 'productivity.planning'],
      ['second brain app', 'productivity.notes'], ['not uygulaması öner', 'productivity.notes'],
      ['ats uyumlu özgeçmiş', 'career.resume'], ['tailor my resume', 'career.resume'],
    ];
    const rows = [...probes, ...goldenAll.filter((g) => NEW.has(g.expectedTask)).map((g) => [g.query, g.expectedTask] as [string, string])];
    const wrong: string[] = [];
    let confident = 0;
    for (const [q, expected] of rows) {
      const got = ruleResult(q, allTasks);
      if (got === 'unclear') continue;
      if (got === expected) confident++;
      else wrong.push(`"${q}": beklenen ${expected}, bulunan ${got}`);
    }
    assert.deepStrictEqual(wrong, []);
    assert.ok(confident / rows.length >= 0.8, `kesin oran düşük: ${confident}/${rows.length}`);
  });
});

describe('yeni işler: golden satırları (Ferit onayı bekliyor) ve uçtan uca duman testi', () => {
  const rows = goldenAll.filter((g) => NEW.has(g.expectedTask));

  it('15 görevin her biri için en az 2 satır; hepsi needsReview, boş acceptableTools "katalog boşluğu" notuyla', () => {
    assert.strictEqual(rows.length, 30);
    const counts = new Map<string, number>();
    for (const g of rows) counts.set(g.expectedTask, (counts.get(g.expectedTask) ?? 0) + 1);
    for (const id of NEW_TASK_IDS) assert.ok((counts.get(id) ?? 0) >= 2, `${id}: en az 2 golden satırı`);
    for (const g of rows) {
      assert.deepStrictEqual(g.acceptableTools, []);
      assert.ok(String(g.notes).includes('katalog boşluğu'), g.id);
      assert.strictEqual(g.needsReview, true, `${g.id}: Ferit onaylayana kadar needsReview:true kalır`);
    }
  });

  it('her yeni işin taslak editör seçimi var: ekranda "güvenilir veri yok" paneli değil, eski işlerle (sunum hazırla) aynı normal panel çıkar', async () => {
    const catalog = loadCatalog();
    const byTask = new Map(catalog.editorPicks.map((p) => [p.taskId, p]));
    for (const id of NEW_TASK_IDS) {
      const pick = byTask.get(id);
      assert.ok(pick, `${id}: editör seçimi yok (kullanıcı "kanıt yok" ekranı görür)`);
      assert.ok(pick.by.includes('Ferit onayı bekliyor'), `${id}: taslak seçim Ferit onayı olmadan kalıcı sayılmaz`);
      // Seçim yalnızca işlev tanımıdır: üstünlük ve fiyat iddiası yok (schema yorumu), rakam yok.
      for (const text of [pick.reason.tr, pick.reason.en]) {
        assert.ok(!/\d/.test(text.replace(/\b3D\b/g, '')), `${id}: gerekçede rakam: ${text}`); // "3D" bir kavram adıdır, iddia değil
        assert.ok(!/\b(en iyi|en güçlü|lider|mükemmel|best|top|leading|superior|powerful)\b/i.test(text), `${id}: üstünlük iddiası: ${text}`);
      }
    }
  });

  it('kural yolu (LLM kapalı): her satır beklenen işe düşer ve NORMAL öneri paneli (ana araç + diğerleri) çıkar; kanıt/güven iddiası yok; çökmez', async () => {
    const catalog = loadCatalog();
    const dict = getDictionary('tr');
    const activeNames = new Set(catalog.products.filter((p) => p.status === 'active').map((p) => p.name));
    for (const g of rows) {
      const r = await recommendV3(g.query, 'all', { allowLLM: false, ctx: defaultSearchContext(), editorPicks: catalog.editorPicks });
      assert.strictEqual(r.kind, 'recommendation', `${g.id} "${g.query}": ${r.kind} (no_evidence ekranı çıkmamalı)`);
      if (r.kind !== 'recommendation') continue;
      assert.strictEqual(r.taskId, g.expectedTask, `${g.id} "${g.query}"`);
      assert.strictEqual(r.items[0].basis, 'editor', `${g.id}: ana araç editör seçimi olmalı`);
      const shown = [...r.items.map((i) => i.product.name), ...(r.unverified ?? []).map((p) => p.name)];
      assert.ok(shown.length >= 3, `${g.id}: en az 3 araç gösterilmeli (${shown.length})`);
      for (const name of shown) assert.ok(activeNames.has(name), `${g.id}: katalogda olmayan araç ${name}`);
      // Kanıtsız işte sıralama/güven iddiası yok: hiçbir araç "evidence" tabanlı değil, güven rozeti verilmez.
      assert.ok(r.items.every((i) => i.basis !== 'evidence'), `${g.id}: kanıtsız görevde kanıt iddiası`);
      // Ekran tipi: eski işlerle aynı "simple" panel (no_evidence paneli değil).
      const api = apiResponseFromV3(r, dict, 'tr');
      assert.strictEqual(api?.type, 'simple', `${g.id}: ekran tipi`);
    }
  });
});
