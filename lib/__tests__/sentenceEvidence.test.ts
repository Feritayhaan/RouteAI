// Cümle kanıtı (lib/intent/sentenceEvidence.ts): kural katmanı tek bir yan kelimeyle karar vermez.
//
// Bölümler: (1) ruleEvidence saf fonksiyonu, (2) kural katmanı gerçek katalogda (ağ yok, LLM yok),
// (3) iş akışı şablonu tetikleyici şartı, (4) kaynak kilitleri.

import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { loadCatalog } from '../catalog/index';
import { RULE_MAX_UNEXPLAINED, RULE_MIN_INDEPENDENT_HITS, ruleEvidence, sentenceGateEnabled } from '../intent/sentenceEvidence';
import { classifyTask } from '../intent/taskClassifier';
import { recommendV3 } from '../recommendV3';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (f: string) => readFileSync(path.join(ROOT, f), 'utf8');
const catalog = loadCatalog();
const taskById = (id: string) => catalog.tasks.find((t) => t.id === id)!;

/** SENTENCE_GATE'i geçici olarak ayarlar; bitince eski değerine döndürür. */
async function withGate<T>(value: string | undefined, fn: () => Promise<T> | T): Promise<T> {
  const before = process.env.SENTENCE_GATE;
  if (value === undefined) delete process.env.SENTENCE_GATE;
  else process.env.SENTENCE_GATE = value;
  try {
    return await fn();
  } finally {
    if (before === undefined) delete process.env.SENTENCE_GATE;
    else process.env.SENTENCE_GATE = before;
  }
}

describe('ruleEvidence: görev cümlenin özünü açıklıyor mu', () => {
  // Katalogda olmayan bir id: sözcük dağarcığı boş, yani açıklama YALNIZCA anahtar kelime ifadelerinden gelir.
  // Eşik sınırını katalog verisine bağlı olmadan sınar.
  const fake = (...tr: string[]) => ({ id: 'test.yok', keywords: { tr, en: [] } });

  it('kısa sorgu: anahtar kelime cümlenin tamamı -> açıklar', () => {
    const e = ruleEvidence('logo yap', taskById('image.logo'), catalog);
    assert.ok(e.hits.includes('logo yap'));
    assert.deepStrictEqual(e.independentHits, ['logo yap'], '"logo" ve "logo yap" aynı işaret: tek sayılır');
    assert.deepStrictEqual(e.unexplained, []);
    assert.strictEqual(e.explains, true);
  });

  it('sınır: açıklanamayan anlamlı kelime ≤ 3 açıklar, 4 açıklamaz', () => {
    assert.strictEqual(RULE_MAX_UNEXPLAINED, 3);
    const three = ruleEvidence('logo alfa beta gama', fake('logo'), catalog);
    assert.deepStrictEqual(three.unexplained, ['alfa', 'beta', 'gama']);
    assert.strictEqual(three.explains, true);
    const four = ruleEvidence('logo alfa beta gama delta', fake('logo'), catalog);
    assert.strictEqual(four.unexplained.length, 4);
    assert.strictEqual(four.explains, false);
  });

  it('iki ayrı anahtar kelime: cümle uzun da olsa açıklar (bağımsız işaretler)', () => {
    assert.strictEqual(RULE_MIN_INDEPENDENT_HITS, 2);
    const e = ruleEvidence('logo amblem alfa beta gama delta epsilon', fake('logo', 'amblem'), catalog);
    assert.strictEqual(e.independentHits.length, 2);
    assert.ok(e.unexplained.length > RULE_MAX_UNEXPLAINED);
    assert.strictEqual(e.explains, true);
  });

  it('tek yan kelime uzun cümlede AÇIKLAMAZ: "hikaye" -> Uzun metin yazımı, ama istenen müzik', () => {
    const e = ruleEvidence('arkadaşımın düğününde çalacak, sözleri bizim hikayemizi anlatan bir parça yaptırmak istiyorum', taskById('text.write-longform'), catalog);
    assert.deepStrictEqual(e.hits, ['hikaye']);
    assert.ok(e.unexplained.includes('dugununde'), `açıklanamayanlar: ${e.unexplained.join(', ')}`);
    assert.strictEqual(e.explains, false);
  });

  it('görevin kendi sözcük dağarcığı da açıklar: yan kelimeler o işin alanındaysa karar verilir', () => {
    // "b2b satış için potansiyel müşteri listesi çıkar": tek anahtar kelime ("potansiyel müşteri") ama "satış" ve "liste"
    // Müşteri adayı bulma görevinin dağarcığında var; sadece anahtar kelime kapsamı sayılsaydı 4 kelime açıklanamazdı.
    const e = ruleEvidence('b2b satış için potansiyel müşteri listesi çıkar', taskById('sales.prospecting'), catalog);
    assert.strictEqual(e.explains, true, `açıklanamayanlar: ${e.unexplained.join(', ')}`);
  });

  it('birbirini içeren eşleşmeler bağımsız kanıt değildir: "logo yap" + "logo" tek işaret, uzun cümleyi açıklamaz', () => {
    const e = ruleEvidence('logo yap alfa beta gama delta epsilon', fake('logo', 'logo yap'), catalog);
    assert.strictEqual(e.hits.length, 2);
    assert.strictEqual(e.independentHits.length, 1);
    assert.strictEqual(e.explains, false);
  });

  it('SENTENCE_GATE=off: kapı yok, tek anahtar kelime hep açıklar (geri dönüş anahtarı)', async () => {
    const q = 'arkadaşımın düğününde çalacak, sözleri bizim hikayemizi anlatan bir parça yaptırmak istiyorum';
    await withGate('off', () => {
      assert.strictEqual(sentenceGateEnabled(), false);
      assert.strictEqual(ruleEvidence(q, taskById('text.write-longform'), catalog).explains, true);
    });
    await withGate(undefined, () => assert.strictEqual(sentenceGateEnabled(), true));
  });
});

describe('classifyTask kural katmanı: yan kelime cümleyi çözemez (LLM yok, ağ yok)', () => {
  // Her biri gerçek bir yanlış: eskiden kuralla ve özgüvenle tek yan kelimenin görevine gidiyordu.
  const STRAY: { q: string; wasWrongTask: string }[] = [
    { q: 'arkadaşımın düğününde çalacak, sözleri bizim hikayemizi anlatan bir parça yaptırmak istiyorum', wasWrongTask: 'text.write-longform' },
    { q: 'ay sonunda kaç para harcadığımı faturalarımı toplayarak çıkarmak istiyorum', wasWrongTask: 'docs.create' },
    { q: "Excel'den çektiğim rakamları patronuma göstereceğim, grafikli canlı bir ekran yapmak istiyorum", wasWrongTask: 'data.spreadsheet-analysis' },
    { q: 'kendi anlattığım hikayeleri istediğim zaman benim sesimle okuyacak bir şey yapmak istiyorum', wasWrongTask: 'text.write-longform' },
    { q: 'yazdığım senaryoyu görüntülü bir filme dönüştürmek istiyorum', wasWrongTask: 'text.write-longform' },
    { q: 'yeni işe başvuracağım, özgeçmişim ilandaki şartlara uysun istiyorum', wasWrongTask: 'docs.create' },
  ];

  for (const { q, wasWrongTask } of STRAY) {
    it(`kuralla karar vermez, soruya/LLM'e bırakır: «${q.slice(0, 48)}…»`, async () => {
      const r = await classifyTask(q, { allowLLM: false, useCache: false });
      assert.ok('clarify' in r, `kural ${'taskId' in r ? r.taskId : ''} dedi`);
      // Yan kelimenin görevi (ya da başka bir görev) ilk sırada olabilir ama KARAR değildir; en çok 3 seçenek sorulur.
      if ('clarify' in r) assert.ok(r.clarify.length >= 1 && r.clarify.length <= 4);
      // Kapı kapalıyken (eski davranış) aynı cümle özgüvenle yanlış göreve giderdi: test kapının işe yaradığını da kanıtlar.
      const old = await withGate('off', () => classifyTask(q, { allowLLM: false, useCache: false }));
      assert.ok(!('clarify' in old) && old.source === 'rules' && old.taskId === wasWrongTask, `eski davranış: ${JSON.stringify(old)}`);
    });
  }

  it('kısa ve net sorgular eskisi gibi kuralla çözülür', async () => {
    for (const [q, task] of [['logo yap', 'image.logo'], ['sunum hazırla', 'slides.create'], ['python kodumda hata var', 'code.debug']] as const) {
      const r = await classifyTask(q, { allowLLM: false, useCache: false });
      assert.ok(!('clarify' in r), `${q} -> clarify`);
      if (!('clarify' in r)) {
        assert.strictEqual(r.taskId, task);
        assert.strictEqual(r.source, 'rules');
      }
    }
  });

  it('uzun ama iki bağımsız anahtar kelimeli cümle kuralla çözülür', async () => {
    const r = await classifyTask('terminalden çalışıp bütün kod tabanımı düzenleyebilen bir yapay zeka ajanı arıyorum', { allowLLM: false, useCache: false });
    assert.ok(!('clarify' in r));
    if (!('clarify' in r)) assert.strictEqual(r.taskId, 'code.agent-cli');
  });

  it('kapı kapalı yedek aday sıralaması: anahtar kelimesi tutan görev ilk, toplam tam 3 aday', async () => {
    const r = await classifyTask('arkadaşımın düğününde çalacak, sözleri bizim hikayemizi anlatan bir parça yaptırmak istiyorum', { allowLLM: false, useCache: false });
    assert.ok('clarify' in r);
    if (!('clarify' in r)) return;
    assert.strictEqual(r.clarify.length, 3);
    assert.strictEqual(r.clarify[0], 'text.write-longform');
    assert.strictEqual(new Set(r.clarify).size, 3, 'aday tekrarı yok');
  });

  it('yedek adaylar tasks.json sırasındaki ilk görevlerle doldurulmaz: cümleye uyan görevler gelir', async () => {
    const r = await classifyTask("Excel'den çektiğim rakamları patronuma göstereceğim, grafikli canlı bir ekran yapmak istiyorum", { allowLLM: false, useCache: false });
    assert.ok('clarify' in r);
    if (!('clarify' in r)) return;
    assert.strictEqual(r.clarify[0], 'data.spreadsheet-analysis', 'anahtar kelimesi tutan görev ilk');
    // Eskiden kalan yerler dosya sırasıyla dolardı: text.write-longform, text.marketing-copy (cümleyle ilgisiz).
    assert.ok(!r.clarify.includes('text.write-longform') && !r.clarify.includes('text.marketing-copy'), r.clarify.join(', '));
  });

  it('değerlendirme setindeki HİÇBİR cümlede kural katmanı özgüvenle yanlış göreve gitmez, belirsiz cümleye cevap vermez', async () => {
    const rows = read('evals/sentences.jsonl')
      .split('\n')
      .filter((l) => l.trim())
      .map((l) => JSON.parse(l) as { id: string; query: string; expectedTask: string | null; acceptableTasks: string[] });
    assert.ok(rows.length >= 120, `${rows.length} cümle`);
    const wrong: string[] = [];
    for (const row of rows) {
      const r = await classifyTask(row.query, { allowLLM: false, useCache: false });
      if ('clarify' in r) continue;
      const ok = row.expectedTask !== null && (r.taskId === row.expectedTask || row.acceptableTasks.includes(r.taskId));
      if (!ok) wrong.push(`${row.id}: beklenen=${row.expectedTask} bulunan=${r.taskId} («${row.query.slice(0, 50)}»)`);
    }
    assert.deepStrictEqual(wrong, []);
  });
});

describe('recommendV3: iş akışı şablonu yalnızca tetikleyici İFADESİ cümlede geçiyorsa', () => {
  const q = 'markamın etkinlik davetini bastırmak için güzel bir kart tasarlatmak istiyorum';

  it('tek kısmi kelime ("markamın" -> marka kimliği) iş akışına çevirmez', async () => {
    const r = await recommendV3(q, 'all', { allowLLM: false });
    assert.notStrictEqual(r.kind, 'workflow');
  });

  it('SENTENCE_GATE=off: eski davranış (kısmi kelime puanı şablonu seçer) geri gelir', async () => {
    const r = await withGate('off', () => recommendV3(q, 'all', { allowLLM: false }));
    assert.strictEqual(r.kind, 'workflow');
  });

  it('gerçek proje cümlesi hâlâ iş akışı olur ("podcast oluşturmak istiyorum")', async () => {
    const r = await recommendV3('podcast oluşturmak istiyorum', 'all', { allowLLM: false });
    assert.strictEqual(r.kind, 'workflow');
  });
});

describe('kaynak kilitleri: kapı yerinden çıkarılırsa test uyarır', () => {
  it('taskClassifier: kapı karar koşulunda, RULE_MARGIN ve kural puanlaması değişmedi', () => {
    const src = read('lib/intent/taskClassifier.ts');
    assert.match(src, /const RULE_MARGIN = 1;/);
    assert.match(src, /ruleConfident = best\.score > 0 && margin >= RULE_MARGIN && \(!bestTask \|\| ruleEvidence\(query, bestTask, catalog\)\.explains\)/);
  });

  it('taskClassifier: sistem istemi cümlenin TAMAMINI okumayı ve yan kelimeye bakmamayı söyler', () => {
    const src = read('lib/intent/taskClassifier.ts');
    assert.match(src, /Read the WHOLE message/);
    assert.match(src, /A word that only names the topic or the input does not choose the task/);
  });

  it('recommendV3: şablon seçimi tetikleyici ifade şartına bağlı', () => {
    const src = read('lib/recommendV3.ts');
    assert.match(src, /template\.triggers\.some\(\(t\) => hasTerm\(query, t\)\)/);
  });
});
