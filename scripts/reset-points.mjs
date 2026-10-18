// Gizli kullanıcı puanlarını sıfırlar (puan 500'e döner). VARSAYILAN: SADECE GÖSTERİR, hiçbir şey değiştirmez.
//
//   npm run reset:points                                   # neyin sıfırlanacağını gösterir
//   npm run reset:points -- --task=image.generate          # tek görev (göster)
//   npm run reset:points -- --task=image.generate --product=ideogram-20   # tek araç (göster)
//
//   --apply        gerçekten sıfırlar: sayaçlar 0 olur (anahtarlar silinmez) VE kapsamdaki oy kayıtları (sig:vote:*) silinir.
//                  Oy kayıtları da gider, çünkü sayaçlar sıfırlanıp kayıtlar kalırsa aynı oturumun aynı oyu "zaten verilmiş"
//                  sayılır ve yeniden verilen oy puana girmez. Silinen oylar RouteAI Skoru'na da girmez
//                  (gece toplaması kayıtlardan hesaplar). GERİ ALINAMAZ.
//   --all          --task/--product vermeden HEPSİNİ sıfırlamak için zorunlu onay bayrağı
//   (--votes eski sürümden kalma bayrak: artık her zaman açık, verilmesi gerekmez)
//
// Örnek (test sonrası tam temizlik):  npm run reset:points -- --apply --all
// Sıralamayı veri silmeden devre dışı bırakmak için Vercel'de POINTS_RANKING=off kullan.
//
// Yazmak için KV_REST_API_URL + KV_REST_API_TOKEN (yazma yetkili) gerekir; göstermek için salt okunur token da yeter.
// Çıkış kodu: 0 başarılı, 1 KV hatası, 2 KV bilgisi yok ya da hatalı kullanım.

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { connectKv, loadLocalEnv, reportKvError } from './points/connect.mjs';
import { planCounterReset, selectVoteKeys } from './points/reset.mjs';

const TAG = 'reset-points';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const flag = (name) => process.argv.includes(name);
const option = (name) => process.argv.find((a) => a.startsWith(`${name}=`))?.slice(name.length + 1);
const apply = flag('--apply');
const all = flag('--all');
const taskId = option('--task');
const productId = option('--product');
const scope = { ...(taskId ? { taskId } : {}), ...(productId ? { productId } : {}) };
const scopeText = taskId || productId ? [taskId && `görev=${taskId}`, productId && `araç=${productId}`].filter(Boolean).join(', ') : 'HEPSİ';

loadLocalEnv(ROOT);

const tasks = JSON.parse(readFileSync(path.join(ROOT, 'data/tasks.json'), 'utf8'));
const products = JSON.parse(readFileSync(path.join(ROOT, 'data/products.json'), 'utf8'));
if (taskId && !tasks.some((t) => t.id === taskId)) {
  console.log(`[${TAG}] Bilinmeyen görev: ${taskId}. Görevler data/tasks.json içinde (örnek: image.generate).`);
  process.exit(2);
}
if (productId && !products.some((p) => p.id === productId)) {
  console.log(`[${TAG}] Bilinmeyen araç: ${productId}. Araçlar data/products.json içinde (örnek: ideogram-20).`);
  process.exit(2);
}
if (apply && !taskId && !productId && !all) {
  console.log(`[${TAG}] Hiçbir şey değiştirilmedi. Bütün puanları sıfırlamak için --all ekle, ya da --task=<görev> / --product=<araç> ile daralt.`);
  process.exit(2);
}

const chunks = (list, size) => Array.from({ length: Math.ceil(list.length / size) }, (_, i) => list.slice(i * size, (i + 1) * size));

try {
  const kv = await connectKv({ write: apply, tag: TAG });
  if (!kv) {
    console.log(`[${TAG}] KV bilgisi yok (KV_REST_API_URL + ${apply ? 'KV_REST_API_TOKEN' : 'token'}); hiçbir şey yapılmadı.`);
    process.exit(2);
  }

  // Sayaçlar
  const current = new Map();
  await Promise.all(
    tasks.filter((t) => !taskId || t.id === taskId).map(async (t) => {
      const hash = await kv.hgetall(`pts:${t.id}`);
      if (hash && Object.keys(hash).length > 0) current.set(t.id, hash);
    })
  );
  const plan = planCounterReset(current, scope);

  // Oy kayıtları (kapsamdakiler)
  const indexKeys = (await kv.smembers('sig:vote:index')) ?? [];
  const entries = [];
  for (const batch of chunks(indexKeys, 200)) {
    const records = await kv.mget(...batch);
    batch.forEach((key, i) => entries.push({ key, record: records[i] }));
  }
  const voteKeys = selectVoteKeys(entries, scope);

  console.log(`[${TAG}] Kapsam: ${scopeText}`);
  console.log(`[${TAG}] Sıfırlanacak sayaç: ${plan.reduce((n, p) => n + p.changes.length, 0)} (${plan.length} görevde). Silinecek oy kaydı: ${voteKeys.length}.`);
  for (const p of plan) {
    console.log(`  ${p.key}`);
    for (const c of p.changes) console.log(`    ${c.field}: ${c.from} -> 0`);
  }

  if (!apply) {
    if (plan.length === 0 && voteKeys.length === 0) {
      console.log(`[${TAG}] Sıfırlanacak bir şey yok.`);
    } else {
      const scopeArgs = [taskId && `--task=${taskId}`, productId && `--product=${productId}`, !taskId && !productId && '--all'].filter(Boolean).join(' ');
      console.log(`[${TAG}] Hiçbir şey değiştirilmedi. Gerçekten sıfırlamak için: npm run reset:points -- --apply ${scopeArgs}`);
    }
    process.exit(0);
  }

  for (const p of plan) await kv.hset(p.key, p.fields);
  for (const batch of chunks(voteKeys, 200)) {
    await kv.del(...batch);
    await kv.srem('sig:vote:index', ...batch);
  }
  console.log(`[${TAG}] Tamam: ${plan.length} görevin sayaçları sıfırlandı, ${voteKeys.length} oy kaydı silindi. Kontrol için: npm run points:show`);
  console.log(`[${TAG}] Açık bir sayfa varsa yenile (butonlar önceki oyu hatırlar).`);
} catch (error) {
  reportKvError(error, TAG);
  process.exit(1);
}
