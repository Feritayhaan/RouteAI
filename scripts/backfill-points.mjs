// Oy kayıtları (sig:vote:*) -> gizli puan sayaçları (pts:<görev>).
//
//   npm run backfill:points             # SADECE gösterir (varsayılan), hiçbir şey yazmaz
//   npm run backfill:points -- --apply  # farkı sayaçlara yazar
//
// Ne zaman: puan sistemi canlıya çıktıktan hemen sonra bir kez (eski oylar
// sayaçlara girsin), sonra isteğe bağlı olarak sayaçları oy kayıtlarıyla
// eşitlemek için. Mutlak değer yazar (HSET), tekrar çalıştırmak güvenlidir.
// KV'den hiçbir anahtarı SİLMEZ; kayıtlarda karşılığı kalmamış sayaçları 0 yapar.
// Puanları görmek için: npm run points:show
//
// Gerekenler: KV_REST_API_URL + KV_REST_API_TOKEN (--apply için yazma yetkili;
// göstermek için KV_REST_API_READ_ONLY_TOKEN da yeter). Ortam değişkeni ya da .env.local. Çıkış kodu: 0 başarılı,
// 1 KV hatası, 2 KV bilgisi yok.

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { countVotes, planWrites } from './points/backfill.mjs';
import { connectKv, loadLocalEnv, reportKvError } from './points/connect.mjs';

const TAG = 'backfill-points';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const apply = process.argv.includes('--apply');

loadLocalEnv(ROOT);

try {
  const kv = await connectKv({ write: apply, tag: TAG });
  if (!kv) {
    console.log(`[${TAG}] KV bilgisi yok (KV_REST_API_URL + ${apply ? 'KV_REST_API_TOKEN' : 'token'}); hiçbir şey yapılmadı.`);
    process.exit(2);
  }
  const products = JSON.parse(readFileSync(path.join(ROOT, 'data/products.json'), 'utf8')).filter((p) => p.status === 'active');
  const tasks = JSON.parse(readFileSync(path.join(ROOT, 'data/tasks.json'), 'utf8'));
  const validPairs = new Set(products.flatMap((p) => p.tasks.map((t) => `${t}|${p.id}`)));

  const keys = (await kv.smembers('sig:vote:index')) ?? [];
  const records = [];
  for (let i = 0; i < keys.length; i += 200) {
    const values = await kv.mget(...keys.slice(i, i + 200));
    for (const v of values) if (v) records.push(v);
  }

  const { counts, skipped } = countVotes(records, validPairs);
  const current = new Map();
  await Promise.all(
    tasks.map(async (t) => {
      const hash = await kv.hgetall(`pts:${t.id}`);
      if (hash && Object.keys(hash).length > 0) current.set(t.id, hash);
    })
  );
  const plan = planWrites(counts, current);

  console.log(`[${TAG}] ${records.length}/${keys.length} oy kaydı okundu, ${skipped} tanesi sayılmadı (tanınmayan ürün/görev ya da bozuk kayıt).`);
  for (const p of plan) {
    console.log(`  ${p.key}`);
    for (const c of p.changes) console.log(`    ${c.field}: ${c.from} -> ${c.to}`);
  }
  if (plan.length === 0) {
    console.log(`[${TAG}] sayaçlar oy kayıtlarıyla zaten aynı; yazılacak bir şey yok.`);
  } else if (!apply) {
    console.log(`[${TAG}] ${plan.length} görevde fark var. Yazmak için: npm run backfill:points -- --apply`);
  } else {
    for (const p of plan) await kv.hset(p.key, p.fields);
    console.log(`[${TAG}] ${plan.length} görevin sayaçları güncellendi. Puanları görmek için: npm run points:show`);
  }
} catch (error) {
  reportKvError(error, TAG);
  process.exit(1);
}
