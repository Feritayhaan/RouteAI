// Gizli puanları sıfırlama planı (saf fonksiyonlar; test edilir). KV'ye dokunmaz.
//
// "Sıfırlamak": sayaçlar 0 olur, yani puan 500'e döner. Sayaç anahtarları SİLİNMEZ
// (alanlar 0 yazılır; backfill:points ile aynı davranış). Oy kayıtları (sig:vote:*)
// ancak scripts/reset-points.mjs'e `--votes` verilirse silinir; plan burada çıkar.

/** "ideogram-20|up" -> { productId, direction }; bozuk alan null. */
function parseField(field) {
  const i = field.lastIndexOf('|');
  if (i <= 0) return null;
  const direction = field.slice(i + 1);
  return direction === 'up' || direction === 'down' ? { productId: field.slice(0, i), direction } : null;
}

/**
 * current: Map<taskId, Record<field, value>> (şimdiki pts:<görev> hash'leri)
 * scope: { taskId?, productId? } (boş = hepsi)
 * -> [{ taskId, key, fields: {field: 0}, changes: [{ field, from }] }]  yalnızca sıfırdan farklı sayaçlar
 */
export function planCounterReset(current, scope = {}) {
  const plan = [];
  for (const taskId of [...current.keys()].sort()) {
    if (scope.taskId && scope.taskId !== taskId) continue;
    const fields = {};
    const changes = [];
    for (const [field, value] of Object.entries(current.get(taskId) ?? {})) {
      const parsed = parseField(field);
      if (!parsed || (scope.productId && scope.productId !== parsed.productId)) continue;
      const from = Number(value);
      if (Number.isFinite(from) && from !== 0) {
        fields[field] = 0;
        changes.push({ field, from });
      }
    }
    if (changes.length > 0) plan.push({ taskId, key: `pts:${taskId}`, fields, changes });
  }
  return plan;
}

/**
 * entries: [{ key, record }] (sig:vote:index'teki anahtar + KV'deki kayıt; süresi dolmuş kayıt null)
 * scope: { taskId?, productId? }
 * -> kapsamdaki oy kaydı anahtarları. Kaydı okunamayan (null/bozuk) anahtarlara dokunulmaz.
 */
export function selectVoteKeys(entries, scope = {}) {
  return entries
    .filter(({ record }) => {
      if (!record || typeof record !== 'object') return false;
      if (typeof record.taskId !== 'string' || typeof record.productId !== 'string') return false;
      if (scope.taskId && record.taskId !== scope.taskId) return false;
      if (scope.productId && record.productId !== scope.productId) return false;
      return true;
    })
    .map(({ key }) => key);
}
