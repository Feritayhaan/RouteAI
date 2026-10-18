// Oy kayıtları -> gizli puan sayaçları (saf fonksiyonlar; test edilir).
//
// Puan sistemi (lib/points) devreye girmeden önce verilmiş oylar KV'de oy kaydı
// olarak durur (sig:vote:*) ama `pts:<görev>` sayaçlarında yoktur. Bu dosya
// kayıtlardan sayaçların OLMASI GEREKEN değerini hesaplar; scripts/backfill-points.mjs
// farkı yazar. Mutlak değer yazıldığı için tekrar çalıştırmak güvenlidir.
//
// Geçerli çift: aktif ürün + ürünün görevleri arasında olan görev (POST /api/feedback
// ile aynı kural). Tanınmayan çiftlerin kayıtları sayılmaz.

const DIRECTIONS = ['up', 'down'];
const fieldOf = (productId, direction) => `${productId}|${direction}`;

// ---- KV giriş bilgisi (değerler ASLA yazdırılmaz; sadece değişken adı ve uzunluk) ----

/** Baştaki/sondaki boşluk ve sarmalayan tırnak (.env.local'da sık olur) atılır. */
export const cleanEnvValue = (value) => (typeof value === 'string' ? value.trim().replace(/^(["'])(.*)\1$/, '$2').trim() : '');

/** Upstash'in "token geçersiz" cevabı (WRONGPASS / 401). */
export function isAuthError(error) {
  return /WRONGPASS|unauthori[sz]ed|invalid or missing auth token|\b401\b/i.test(String(error?.message ?? error ?? ''));
}

/**
 * Denenecek token'lar, sırayla. Göstermek için önce salt okunur, o reddedilirse tam yetkili;
 * `--apply` için yalnızca tam yetkili. Aynı değer iki kez denenmez.
 */
export function tokenCandidates(env, apply) {
  const names = apply ? ['KV_REST_API_TOKEN'] : ['KV_REST_API_READ_ONLY_TOKEN', 'KV_REST_API_TOKEN'];
  const seen = new Set();
  const out = [];
  for (const name of names) {
    const value = cleanEnvValue(env[name]);
    if (value && !seen.has(value)) {
      seen.add(value);
      out.push({ name, value });
    }
  }
  return out;
}

/** Hangi KV değişkeni dolu, kaç karakter (değer yok): reddedilen giriş için teşhis satırları. */
export function describeEnv(env) {
  return ['KV_REST_API_URL', 'KV_REST_API_READ_ONLY_TOKEN', 'KV_REST_API_TOKEN'].map((name) => {
    const value = cleanEnvValue(env[name]);
    return `${name}: ${value ? `dolu (${value.length} karakter)` : 'YOK'}`;
  });
}

/**
 * records: [{ taskId, productId, vote }]  (aynı oturum+ürün+görev için KV'de zaten tek kayıt)
 * validPairs: Set<`${taskId}|${productId}`>
 * -> { counts: Map<taskId, Map<productId, {up, down}>>, skipped: number }
 */
export function countVotes(records, validPairs) {
  const counts = new Map();
  let skipped = 0;
  for (const r of records) {
    if (!r || !DIRECTIONS.includes(r.vote) || typeof r.taskId !== 'string' || typeof r.productId !== 'string' || !validPairs.has(`${r.taskId}|${r.productId}`)) {
      skipped++;
      continue;
    }
    const perTask = counts.get(r.taskId) ?? new Map();
    const entry = perTask.get(r.productId) ?? { up: 0, down: 0 };
    entry[r.vote]++;
    perTask.set(r.productId, entry);
    counts.set(r.taskId, perTask);
  }
  return { counts, skipped };
}

const asCount = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

/**
 * counts: countVotes çıktısı. current: Map<taskId, Record<field, value>> (şimdiki hash'ler).
 * Yalnızca değişecek alanları döndürür. Kayıtlarda karşılığı olmayan mevcut sayaç
 * alanları 0'a çekilir (silinmez).
 * -> [{ taskId, key, fields: {field: value}, changes: [{ field, from, to }] }]
 */
export function planWrites(counts, current) {
  const taskIds = [...new Set([...counts.keys(), ...current.keys()])].sort();
  const plan = [];
  for (const taskId of taskIds) {
    const desired = new Map();
    for (const [productId, c] of counts.get(taskId) ?? []) {
      desired.set(fieldOf(productId, 'up'), c.up);
      desired.set(fieldOf(productId, 'down'), c.down);
    }
    const existing = current.get(taskId) ?? {};
    for (const field of Object.keys(existing)) {
      if (!desired.has(field)) desired.set(field, 0);
    }
    const fields = {};
    const changes = [];
    for (const [field, to] of [...desired].sort(([a], [b]) => a.localeCompare(b))) {
      const from = asCount(existing[field]);
      if (from !== to) {
        fields[field] = to;
        changes.push({ field, from, to });
      }
    }
    if (changes.length > 0) plan.push({ taskId, key: `pts:${taskId}`, fields, changes });
  }
  return plan;
}
