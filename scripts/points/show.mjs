// Gizli puanları okunaklı tabloya çevirir (saf fonksiyon; test edilir).
// Puan kullanıcıya gösterilmez; bu çıktı yalnızca yöneticinin kendi bilgisayarında görünür.

const tr = (n) => String(n).replace('.', ',');
const pad = (text, width) => String(text).padEnd(width, ' ');
const padLeft = (text, width) => String(text).padStart(width, ' ');

/**
 * rows: lib/points/store.ts → listPoints çıktısı
 *   [{ taskId, productId, up, down, votes, points, rankingPoints }]  (görev sırasıyla, puana göre azalan)
 * -> satırlar (string[])
 */
export function formatPointsReport(rows, { taskLabels = {}, productNames = {}, deadZone, startPoints }) {
  if (rows.length === 0) {
    return [`Henüz oy yok; bütün araçlar ${startPoints} puanda.`];
  }
  const lines = [];
  const byTask = new Map();
  for (const r of rows) byTask.set(r.taskId, [...(byTask.get(r.taskId) ?? []), r]);

  for (const [taskId, list] of byTask) {
    const label = taskLabels[taskId];
    lines.push('', label ? `${label}  (${taskId})` : taskId);
    const nameWidth = Math.max(5, ...list.map((r) => (productNames[r.productId] ?? r.productId).length));
    lines.push(`  ${pad('Araç', nameWidth)}  ${padLeft('Beğeni', 6)}  ${padLeft('Beğenmeme', 9)}  ${padLeft('Oy', 4)}  ${padLeft('Puan', 8)}  ${padLeft('Sıralamada', 10)}`);
    for (const r of list) {
      const effective = r.rankingPoints !== startPoints;
      lines.push(
        `  ${pad(productNames[r.productId] ?? r.productId, nameWidth)}  ${padLeft(r.up, 6)}  ${padLeft(r.down, 9)}  ${padLeft(r.votes, 4)}  ${padLeft(tr(r.points.toFixed(2)), 8)}  ${padLeft(tr(r.rankingPoints.toFixed(2)), 10)}${effective ? '' : '  (etkisiz)'}`
      );
    }
  }
  const pairs = rows.length;
  lines.push(
    '',
    `${byTask.size} görevde ${pairs} araç oy almış. Listede olmayan araçlar ${startPoints} puandadır.`,
    `"Sıralamada" sütunu sıralamada kullanılan puandır: ham puan ${startPoints}'den ${deadZone} puandan az uzaktaysa ${startPoints} sayılır (etkisiz), fazlası sayılır. Puan kullanıcıya gösterilmez.`
  );
  return lines;
}

/**
 * Sayaçlar ile oy kayıtları uyuşmuyorsa (planWrites çıktısı boş değilse) uyarı satırları.
 * Tipik neden: sayaçlar oy kayıtları silinmeden sıfırlandı; aynı oturumun aynı oyu bu yüzden puana girmez.
 */
export function formatMismatchWarning(plan) {
  if (plan.length === 0) return [];
  const fields = plan.reduce((n, p) => n + p.changes.length, 0);
  return [
    '',
    `UYARI: ${plan.length} görevde ${fields} sayaç oy kayıtlarıyla uyuşmuyor (puanlar eksik ya da fazla görünüyor olabilir).`,
    '  Kayıtlara göre düzeltmek için:  npm run backfill:points            (önce gösterir)',
    '                                  npm run backfill:points -- --apply (yazar)',
    '  Bunun yerine baştan başlamak için:  npm run reset:points -- --apply --all',
  ];
}
