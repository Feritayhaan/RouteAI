// Eval koşucularının ortak ortamı. Bu modül lib modüllerinden ÖNCE import
// edilmeli: bazı lib modülleri değişkenleri yüklenirken okur.
//
//  - .env.local varsa yüklenir (OPENAI_API_KEY için); yoksa çökmeden devam edilir.
//  - KV ve vektör değişkenleri bu süreçte SİLİNİR: katalog git'teki JSON'dan
//    okunur, canlı KV'ye hiçbir şey yazılmaz, ölçüm tekrarlanabilir.
//  - OPENAI_API_KEY yoksa OpenAI'a giden her istek ağa çıkmadan yakalanır ve
//    reddedilir; çağıran onu 'skipped' işaretler. Anahtar varsa istekler gider ve sayılır.

import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

try {
  process.loadEnvFile(path.join(ROOT, '.env.local'));
  console.log('[eval] .env.local yüklendi');
} catch (error) {
  if (error?.code === 'ENOENT') {
    console.log('[eval] .env.local yok; mevcut ortam değişkenleriyle devam');
  } else {
    console.log(`[eval] .env.local okunamadı (${error?.message ?? error}); mevcut ortam değişkenleriyle devam`);
  }
}

for (const key of Object.keys(process.env)) {
  if (/^(KV_|UPSTASH_)/.test(key) || key === 'REDIS_URL' || key === 'VECTOR_SEARCH_ENABLED') {
    delete process.env[key];
  }
}

export const hasOpenAIKey = Boolean(process.env.OPENAI_API_KEY?.trim());
if (!hasOpenAIKey) {
  // Sahte anahtar sadece istemcinin kurulup isteği denemesi için: istek aşağıdaki
  // fetch sarmalayıcısında ağa çıkmadan reddedilir ve sayılır.
  process.env.OPENAI_API_KEY = 'sk-eval-no-key';
}

let openaiCalls = 0;
export const openaiCallCount = () => openaiCalls;
// Anahtar varken başarısız OpenAI çağrıları (ağ hatası ya da HTTP >= 400).
// Böyle bir satır yedek yoldan cevaplanır; ölçüme karışmasın diye 'skipped' sayılır.
let openaiFailures = 0;
export const openaiFailureCount = () => openaiFailures;
const realFetch = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  const url = input instanceof Request ? input.url : String(input);
  let host = '';
  try {
    host = new URL(url).hostname;
  } catch {
    // göreli URL: OpenAI değil
  }
  if (host === 'openai.com' || host.endsWith('.openai.com')) {
    openaiCalls++;
    if (!hasOpenAIKey) {
      return new Response(JSON.stringify({ error: { message: 'eval: OPENAI_API_KEY yok' } }), {
        status: 401,
        headers: { 'content-type': 'application/json' },
      });
    }
    try {
      const res = await realFetch(input, init);
      if (res.status >= 400) openaiFailures++;
      return res;
    } catch (error) {
      openaiFailures++;
      throw error;
    }
  }
  return realFetch(input, init);
};

// lib modülleri konsola bol log basıyor; tablo okunur kalsın diye çağrılar
// sırasında susturulur (--verbose ile açılır).
export const out = console.log.bind(console);
const CONSOLE_METHODS = ['log', 'info', 'warn', 'error', 'debug'];
let verbose = false;
export function setVerbose(v) {
  verbose = v;
}
export async function quietly(fn) {
  if (verbose) return fn();
  const saved = CONSOLE_METHODS.map((m) => console[m]);
  for (const m of CONSOLE_METHODS) console[m] = () => {};
  try {
    return await fn();
  } finally {
    CONSOLE_METHODS.forEach((m, i) => { console[m] = saved[i]; });
  }
}
