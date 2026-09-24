// KV kayıtları -> data/signals.json satırları (saf fonksiyonlar; test edilir).
//
// Bir oturumun bir ürün+görevdeki etkisi 1 gözlemle sınırlı: kayıtlar zaten
// oturum+ürün+görev başına tek (son cevap geçerli), burada ayrıca her kayıt
// tek kez sayılır. Anormal artış: bir ürün+görevde son 24 saatteki olumlu
// iş sonucu, önceki 30 günün günlük ortalamasının 5 katını aşarsa (ve en az
// 5 ise) o 24 saatin olumlu kayıtları dahil EDİLMEZ, rapora yazılır.

export const ANOMALY_FACTOR = 5;
export const ANOMALY_MIN = 5;
const DAY = 24 * 60 * 60 * 1000;

const pairKey = (productId, taskId) => `${productId}|${taskId}`;

function empty(productId, taskId) {
  return { productId, taskId, outcomes: { yes: 0, partial: 0, no: 0 }, comparisons: { wins: 0, losses: 0 }, votes: { up: 0, down: 0 }, lastAt: null };
}

/** Son 24 saatteki olumlu iş sonuçları anormal olan ürün+görev çiftleri. */
export function findAnomalies(outcomes, now) {
  const recent = new Map();
  const baseline = new Map();
  for (const o of outcomes) {
    if (o.answer !== 'yes') continue;
    const t = Date.parse(o.at);
    const k = pairKey(o.productId, o.taskId);
    if (now - t <= DAY) recent.set(k, (recent.get(k) ?? 0) + 1);
    else if (now - t <= 31 * DAY) baseline.set(k, (baseline.get(k) ?? 0) + 1);
  }
  const anomalies = [];
  for (const [k, count] of recent) {
    const dailyAvg = (baseline.get(k) ?? 0) / 30;
    if (count >= ANOMALY_MIN && count > ANOMALY_FACTOR * Math.max(dailyAvg, 1 / 30)) {
      const [productId, taskId] = k.split('|');
      anomalies.push({ productId, taskId, last24h: count, dailyAvg: Math.round(dailyAvg * 100) / 100 });
    }
  }
  return anomalies.sort((a, b) => b.last24h - a.last24h);
}

/**
 * @param {{ outcomes: any[], comparisons: any[], votes: any[], products: {id: string, tasks: string[]}[], now: number }} input
 */
export function aggregateSignals({ outcomes, comparisons, votes, products, now }) {
  const valid = new Set(products.flatMap((p) => p.tasks.map((t) => pairKey(p.id, t))));
  const anomalies = findAnomalies(outcomes, now);
  const flagged = new Set(anomalies.map((a) => pairKey(a.productId, a.taskId)));
  const rows = new Map();
  const get = (productId, taskId) => {
    const k = pairKey(productId, taskId);
    if (!valid.has(k)) return null;
    if (!rows.has(k)) rows.set(k, empty(productId, taskId));
    return rows.get(k);
  };
  const touch = (row, at) => {
    if (at && (!row.lastAt || at > row.lastAt)) row.lastAt = at;
  };

  for (const o of outcomes) {
    const k = pairKey(o.productId, o.taskId);
    if (flagged.has(k) && o.answer === 'yes' && now - Date.parse(o.at) <= DAY) continue;
    const row = get(o.productId, o.taskId);
    if (!row || !(o.answer in row.outcomes)) continue;
    row.outcomes[o.answer]++;
    touch(row, o.at);
  }
  for (const c of comparisons) {
    if (c.winner === 'tie') continue;
    const loser = c.winner === c.a ? c.b : c.a;
    const w = get(c.winner, c.taskId);
    const l = get(loser, c.taskId);
    if (w) { w.comparisons.wins++; touch(w, c.at); }
    if (l) { l.comparisons.losses++; touch(l, c.at); }
  }
  for (const v of votes) {
    const row = get(v.productId, v.taskId);
    if (!row || (v.vote !== 'up' && v.vote !== 'down')) continue;
    row.votes[v.vote]++;
    touch(row, v.at);
  }

  const signals = [...rows.values()]
    .filter((r) => r.lastAt)
    .map((r) => ({ ...r, lastAt: r.lastAt.slice(0, 10) }))
    .sort((a, b) => a.productId.localeCompare(b.productId) || a.taskId.localeCompare(b.taskId));
  return { signals, anomalies };
}

export function renderAnomalies(anomalies, date) {
  const lines = ['# Sinyal anormallikleri', '', `Son koşu: ${date}. Kural: bir ürün+görevde son 24 saatteki olumlu iş sonucu, önceki 30 günün günlük ortalamasının ${ANOMALY_FACTOR} katını aşarsa (ve en az ${ANOMALY_MIN} ise) o 24 saatin olumlu kayıtları data/signals.json'a DAHİL EDİLMEZ. İnceleyip gerçekse bir sonraki koşuda kendiliğinden girer (24 saat geçince).`, ''];
  if (anomalies.length === 0) lines.push('- yok');
  for (const a of anomalies) lines.push(`- ${a.productId} / ${a.taskId}: son 24 saatte ${a.last24h} olumlu, önceki günlük ortalama ${a.dailyAvg}`);
  return `${lines.join('\n')}\n`;
}
