// KV'ye bağlanma: backfill-points ve show-points ortak kullanır.
// Değerler (URL, token) hiçbir yere yazdırılmaz; sadece değişken adı ve uzunluk.

import path from 'node:path';
import { createClient } from '@vercel/kv';
import { cleanEnvValue, describeEnv, isAuthError, tokenCandidates } from './backfill.mjs';

/** Yerelde çalışırken KV bilgisi .env.local'dan okunur (check-prices ile aynı yol). Dosya yoksa sessizce geçer. */
export function loadLocalEnv(root) {
  if (!process.env.KV_REST_API_URL?.trim() && typeof process.loadEnvFile === 'function') {
    try {
      process.loadEnvFile(path.join(root, '.env.local'));
    } catch {
      // .env.local yok: sorun değil, KV bilgisi yoksa çağıran net bir mesaj verir.
    }
  }
}

/**
 * KV istemcisi ya da null (KV bilgisi yok). write=true: yalnızca tam yetkili token denenir.
 * Token'ları sırayla okuma komutuyla yoklar; yalnızca kimlik hatasında sıradakine geçer.
 * Hepsi reddedilirse authFailed işaretli Error fırlatır.
 */
export async function connectKv({ write, tag }) {
  const url = cleanEnvValue(process.env.KV_REST_API_URL);
  const candidates = tokenCandidates(process.env, write);
  if (!url || candidates.length === 0) return null;

  for (const [i, { name, value }] of candidates.entries()) {
    const client = createClient({ url, token: value });
    try {
      await client.scard('sig:vote:index');
      if (i > 0) console.log(`[${tag}] ${candidates[0].name} reddedildi; ${name} ile devam ediliyor.`);
      return client;
    } catch (error) {
      if (!isAuthError(error)) throw error;
      console.log(`[${tag}] ${name} reddedildi (WRONGPASS).`);
    }
  }
  const rejected = new Error('KV kimlik doğrulaması reddedildi');
  rejected.authFailed = true;
  throw rejected;
}

/** KV hatasını kullanıcıya anlatır (kimlik hatasında teşhis satırlarıyla). */
export function reportKvError(error, tag) {
  if (error?.authFailed) {
    console.log(`[${tag}] KV giriş bilgisi reddedildi: token geçersiz ya da bu adrese (KV_REST_API_URL) ait değil. Hiçbir şey değiştirilmedi.`);
    for (const line of describeEnv(process.env)) console.log(`  ${line}`);
    console.log('  Olası nedenler: token yenilendi ama .env.local eski kaldı; URL ile token farklı veritabanlarından; değerde fazladan karakter var.');
    console.log('  Çözüm: Upstash panelinden (ya da Vercel > Settings > Environment Variables) KV_REST_API_URL ve KV_REST_API_TOKEN değerlerini AYNI veritabanından kopyalayıp .env.local dosyasına yaz.');
  } else {
    console.log(`[${tag}] KV hatası: ${error?.message ?? error}`);
  }
}
