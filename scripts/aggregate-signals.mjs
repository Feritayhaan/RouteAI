// KV'deki iş sonuçları, karşılaştırmalar ve oylar -> data/signals.json
//
//   npm run aggregate:signals
//
// SADECE OKUR: KV'de hiçbir şeyi silmez ya da değiştirmez. Gerekenler:
// KV_REST_API_URL + (tercihen) KV_REST_API_READ_ONLY_TOKEN ya da KV_REST_API_TOKEN.
// Çıkış kodu (scripts/sync/core.mjs → syncExitDecision, gece senkronuyla aynı kural):
//  - KV bilgisi yoksa "atlandı": dosyalara dokunmadan 0 ile çıkar.
//  - KV bilgisi var ama okuma başarısızsa: dosyalara dokunmadan 1 ile çıkar.
// Anormallikler: data/signals-anomalies.md. Gece workflow'u (sync-models.yml)
// çalıştırır ve PR'a ekler.

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@vercel/kv';
import { aggregateSignals, renderAnomalies } from './signals/aggregate.mjs';
import { syncExitDecision } from './sync/core.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const url = process.env.KV_REST_API_URL;
const token = process.env.KV_REST_API_READ_ONLY_TOKEN || process.env.KV_REST_API_TOKEN;

function finish(gotData, errors) {
  const decision = syncExitDecision({
    sources: [{ name: 'KV sinyalleri', needsKey: true, hasKey: Boolean(url && token), gotData }],
    errors,
  });
  for (const e of errors) console.log(`[aggregate-signals] hata: ${e}`);
  for (const r of decision.reasons) console.log(`[aggregate-signals] ${r}`);
  process.exit(decision.code);
}

if (!url || !token) {
  console.log('[aggregate-signals] KV bilgisi yok (KV_REST_API_URL + token); dosyalar değiştirilmedi.');
  finish(false, []);
}
const kv = createClient({ url, token });

async function readIndex(indexKey) {
  const keys = (await kv.smembers(indexKey)) ?? [];
  const records = [];
  for (let i = 0; i < keys.length; i += 200) {
    const batch = keys.slice(i, i + 200);
    const values = await kv.mget(...batch);
    for (const v of values) if (v) records.push(v);
  }
  return { records, keys: keys.length };
}

let outcomes;
let comparisons;
let votes;
try {
  [outcomes, comparisons, votes] = await Promise.all([
    readIndex('sig:outcome:index'),
    readIndex('sig:comparison:index'),
    readIndex('sig:vote:index'),
  ]);
} catch (error) {
  console.log('[aggregate-signals] KV okunamadı; dosyalar değiştirilmedi.');
  finish(false, [`KV okuma: ${error?.message ?? error}`]);
}
const products = JSON.parse(readFileSync(path.join(ROOT, 'data/products.json'), 'utf8')).filter((p) => p.status === 'active');
const now = Date.now();
const { signals, anomalies } = aggregateSignals({ outcomes: outcomes.records, comparisons: comparisons.records, votes: votes.records, products, now });

writeFileSync(path.join(ROOT, 'data/signals.json'), `${JSON.stringify(signals, null, 2)}\n`);
writeFileSync(path.join(ROOT, 'data/signals-anomalies.md'), renderAnomalies(anomalies, new Date(now).toISOString().slice(0, 10)));
console.log(`[aggregate-signals] kayıt: ${outcomes.records.length}/${outcomes.keys} iş sonucu, ${comparisons.records.length}/${comparisons.keys} karşılaştırma, ${votes.records.length}/${votes.keys} oy -> ${signals.length} ürün+görev; ${anomalies.length} anormallik`);
finish(true, []);
