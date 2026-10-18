// Gizli kullanıcı puanlarını gösterir (SADECE okur, KV'de hiçbir şeyi değiştirmez).
//
//   npm run points:show                          # oy almış bütün araçlar, görev görev
//   npm run points:show -- --task=image.generate # tek görev
//
// Puan kullanıcıya hiçbir yerde gösterilmez; bu komut yalnızca senin bilgisayarında çalışır.
// Gerekenler: KV_REST_API_URL + token (KV_REST_API_READ_ONLY_TOKEN ya da KV_REST_API_TOKEN),
// ortam değişkeni ya da .env.local. Çıkış kodu: 0 başarılı, 1 KV hatası, 2 KV bilgisi ya da görev yok.

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEAD_ZONE, START_POINTS } from '../lib/points/points';
import { listPoints } from '../lib/points/store';
import { connectKv, loadLocalEnv, reportKvError } from './points/connect.mjs';
import { countVotes, planWrites } from './points/backfill.mjs';
import { formatMismatchWarning, formatPointsReport } from './points/show.mjs';

const TAG = 'points-show';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const only = process.argv.find((a) => a.startsWith('--task='))?.slice('--task='.length);

loadLocalEnv(ROOT);

try {
  const tasks = JSON.parse(readFileSync(path.join(ROOT, 'data/tasks.json'), 'utf8'));
  const products = JSON.parse(readFileSync(path.join(ROOT, 'data/products.json'), 'utf8'));
  if (only && !tasks.some((t) => t.id === only)) {
    console.log(`[${TAG}] Bilinmeyen görev: ${only}. Görevler data/tasks.json içinde (örnek: image.generate).`);
    process.exit(2);
  }

  const kv = await connectKv({ write: false, tag: TAG });
  if (!kv) {
    console.log(`[${TAG}] KV bilgisi yok (KV_REST_API_URL + token); .env.local dosyasını kontrol et.`);
    process.exit(2);
  }

  const rows = await listPoints(only ? [only] : tasks.map((t) => t.id), kv);
  const lines = formatPointsReport(rows, {
    taskLabels: Object.fromEntries(tasks.map((t) => [t.id, t.label.tr])),
    productNames: Object.fromEntries(products.map((p) => [p.id, p.name])),
    deadZone: DEAD_ZONE,
    startPoints: START_POINTS,
  });
  for (const line of lines) console.log(line);

  // Sayaçlar oy kayıtlarıyla uyuşuyor mu? (tek görev istenmişse yalnızca o görev karşılaştırılır)
  const activePairs = new Set(products.filter((p) => p.status === 'active').flatMap((p) => p.tasks.map((t) => `${t}|${p.id}`)));
  const indexKeys = (await kv.smembers('sig:vote:index')) ?? [];
  const records = [];
  for (let i = 0; i < indexKeys.length; i += 200) {
    for (const record of await kv.mget(...indexKeys.slice(i, i + 200))) if (record) records.push(record);
  }
  const { counts } = countVotes(only ? records.filter((r) => r.taskId === only) : records, activePairs);
  const current = new Map();
  await Promise.all(
    tasks.filter((t) => !only || t.id === only).map(async (t) => {
      const hash = await kv.hgetall(`pts:${t.id}`);
      if (hash && Object.keys(hash).length > 0) current.set(t.id, hash);
    })
  );
  for (const line of formatMismatchWarning(planWrites(counts, current))) console.log(line);
} catch (error) {
  reportKvError(error, TAG);
  process.exit(1);
}
