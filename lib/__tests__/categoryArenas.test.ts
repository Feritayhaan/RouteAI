import assert from 'node:assert';
import { describe, it } from 'node:test';
import { BENCHMARK_ARENAS, MIN_ARENA_MODELS, categoryArenaCoverage, findArena, isCategoryArena, parentArenaKey, type BenchmarkArena } from '../catalog/benchmarkKeys';
import { loadCatalog } from '../catalog/index';
import { searchCatalog } from '../catalog/search';
import type { Task } from '../catalog/schema';

// 2026-10-16 gerçek senkron raporundan/denetim tablosundan görülen LMArena kategori adları.
// Yeni bir alt kategori arenası eklenecekse önce kaynakta gerçekten var olduğu görülmeli (uydurma yok).
const VERIFIED_CATEGORIES: Record<string, string[]> = {
  text: ['creative_writing', 'longer_query', 'instruction_following', 'non_english', 'multi_turn', 'coding'],
  text_to_image: ['3d_modeling', 'art', 'cartoon', 'chinese', 'commercial_design', 'english', 'overall', 'photorealistic', 'portraits', 'russian', 'text_rendering'],
  webdev: ['image_to_webdev', 'overall', 'webdev', 'webdev-html', 'webdev-react'],
  image_edit: ['multi_image_edit', 'overall'],
};

describe('alt kategori arenaları: kayıt tutarlılığı', () => {
  const allArenas: readonly BenchmarkArena[] = BENCHMARK_ARENAS;
  const categoryArenas = allArenas.filter(isCategoryArena);

  it('anahtar "<config>/<kategori>", üst arena kayıtlı genel arena, kategori adı kaynakta görülmüş', () => {
    assert.ok(categoryArenas.length > 0);
    for (const a of categoryArenas) {
      assert.strictEqual(a.source, 'lmarena', `${a.key}: alt kategori şimdilik yalnız LMArena`);
      assert.strictEqual(a.key, `${a.sourceField}/${a.category}`);
      assert.strictEqual(parentArenaKey(a.key), a.sourceField);
      const parent = findArena(a.source, a.sourceField);
      assert.ok(parent && !isCategoryArena(parent), `${a.key}: üst arena ${a.sourceField} kayıtlı genel arena olmalı`);
      assert.ok(VERIFIED_CATEGORIES[a.sourceField]?.includes(a.category as string), `${a.key}: '${a.category}' kaynakta görülmüş kategori değil`);
    }
  });

  it('anahtarlar tekrar etmez; genel arena anahtarında "/" yok', () => {
    const keys = allArenas.map((a) => `${a.source}:${a.key}`);
    assert.strictEqual(new Set(keys).size, keys.length);
    for (const a of allArenas.filter((x) => !isCategoryArena(x))) assert.strictEqual(parentArenaKey(a.key), null, a.key);
  });

  it('parentArenaKey: alt kategori -> üst arena; genel arena ve kenar durumlar -> null', () => {
    assert.strictEqual(parentArenaKey('text/creative_writing'), 'text');
    assert.strictEqual(parentArenaKey('text_to_image/text_rendering'), 'text_to_image');
    assert.strictEqual(parentArenaKey('text'), null);
    assert.strictEqual(parentArenaKey('/baslar-slash'), null);
    assert.strictEqual(parentArenaKey(''), null);
  });

  it('tasks.json: tanımlı her alt kategori arenası en az bir görevde kullanılıyor (ölü kayıt dosyayı büyütür)', () => {
    const used = new Set(loadCatalog().tasks.flatMap((t) => t.benchmark.map((b) => `${b.source}:${b.key}`)));
    for (const a of categoryArenas) assert.ok(used.has(`${a.source}:${a.key}`), `${a.key} hiçbir görevde kullanılmıyor`);
  });
});

describe('alt kategori arenaları: veri durumu (categoryArenaCoverage)', () => {
  const t = (id: string, ...keys: string[]) => ({ id, benchmark: keys.map((key) => ({ source: 'lmarena', key })) });
  const m = (...keys: string[]) => ({ scores: keys.map((key) => ({ source: 'lmarena', key })) });

  it('MIN_ARENA_MODELS: 2', () => {
    assert.strictEqual(MIN_ARENA_MODELS, 2);
  });

  it('dolu kategori usable, boş/tek modelli olan üst arenaya düşer; genel arenalar ve bilinmeyen anahtarlar sayılmaz', () => {
    const tasks = [t('a', 'text/creative_writing', 'text'), t('b', 'text/creative_writing', 'text/multi_turn'), t('c', 'text/non_english', 'bilinmeyen/x')];
    const models = [m('text', 'text/creative_writing', 'text/multi_turn'), m('text', 'text/creative_writing'), m('text')];
    const cov = categoryArenaCoverage(tasks, models);
    assert.deepStrictEqual(cov.map((c) => c.key), ['text/creative_writing', 'text/multi_turn', 'text/non_english']);
    const byKey = Object.fromEntries(cov.map((c) => [c.key, c]));
    assert.deepStrictEqual(byKey['text/creative_writing'], { source: 'lmarena', key: 'text/creative_writing', models: 2, usable: true, fallsBackTo: null, tasks: ['a', 'b'] });
    assert.deepStrictEqual(byKey['text/multi_turn'], { source: 'lmarena', key: 'text/multi_turn', models: 1, usable: false, fallsBackTo: 'text', tasks: ['b'] });
    assert.deepStrictEqual(byKey['text/non_english'], { source: 'lmarena', key: 'text/non_english', models: 0, usable: false, fallsBackTo: 'text', tasks: ['c'] });
  });

  it('kategori kullanan görev yoksa liste boş', () => {
    assert.deepStrictEqual(categoryArenaCoverage([t('a', 'text')], [m('text')]), []);
  });
});

describe('alt kategori eşlemeleri: veri gelmeden sıralama DEĞİŞMEZ', () => {
  const catalog = loadCatalog();
  const categoryTasks = catalog.tasks.filter((x) => x.benchmark.some((b) => b.key.includes('/')));

  it('tasks.json en az 10 göreve alt kategori eşlemesi koyuyor', () => {
    assert.ok(categoryTasks.length >= 10, `eşlenen görev: ${categoryTasks.length}`);
  });

  it('alt kategori skorları olmayan modellerle her görevin sonucu, kategori girdilerinin üst arenayla değiştirildiği hâlle birebir aynı', () => {
    // models.json'da (gece senkronundan sonra) kategori skoru olabilir; burada bilerek ayıklıyoruz: "veri henüz yok" durumu.
    const models = catalog.models.map((mod) => ({ ...mod, scores: mod.scores.filter((s) => !s.key.includes('/')) }));
    const base = { tasksById: catalog.tasksById, products: catalog.products, models, reviews: catalog.reviews, signals: catalog.signals, now: Date.parse('2026-10-18T12:00:00Z') };
    for (const task of categoryTasks) {
      const parentBenchmark: Task['benchmark'] = [];
      for (const b of task.benchmark) {
        const key = parentArenaKey(b.key) ?? b.key;
        if (!parentBenchmark.some((x) => x.source === b.source && x.key === key)) parentBenchmark.push({ source: b.source, key });
      }
      const parentTask: Task = { ...task, benchmark: parentBenchmark };
      const run = (tk: Task) => searchCatalog({ taskId: task.id, limit: 100 }, { ...base, tasksById: new Map([...catalog.tasksById, [task.id, tk]]) });
      assert.deepStrictEqual(run(task), run(parentTask), `${task.id}: kategori verisi yokken sıra/skor değişmemeli`);
    }
  });
});
