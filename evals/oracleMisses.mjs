// v2-oracle'da ilk 3'te kabul edilebilir araç çıkmayan sorguların nedeni.
// Nedenler P4 KABUL'deki sınıflar: model bağlanmamış, uzman değerlendirmesi
// yok, görev eşlemesi yanlış (+ katalog boşluğu, kendi sinyal yok).

/**
 * @param {Array<{ id: string, query: string, expectedTask: string, top3Hit: boolean | null, tools: string[] }>} rows
 * @param {Array<{ id: string, acceptableTools: string[] }>} golden
 * @param {{ products: any[], models: any[], reviews: any[], signals: any[] }} catalog
 * @param {{ date: string, rate: number | null, target: number }} meta
 */
export function explainOracleMisses(rows, golden, catalog, { date, rate, target }) {
  const acceptableById = new Map(golden.map((g) => [g.id, g.acceptableTools]));
  const byName = new Map(catalog.products.map((p) => [p.name, p]));
  const lines = [
    '# v2-oracle: kaçan sorgular',
    '',
    `Koşu: ${date}. top3Hit: ${rate === null ? 'n/a' : `%${(rate * 100).toFixed(1)}`} (hedef ≥ %${target * 100}). Görev golden'dan doğru kabul edildi; ölçülen sadece RouteAI Skoru sıralaması.`,
    '',
    `Katalog durumu: ${catalog.models.length} model, ${catalog.reviews.length} uzman değerlendirmesi, ${catalog.signals.length} sinyal kaydı, ${catalog.products.filter((p) => p.models.length > 0).length} ürüne model bağlı.`,
    '',
    '| id | görev | ilk 3 | neden |',
    '| --- | --- | --- | --- |',
  ];
  const counts = new Map();
  for (const row of rows) {
    if (row.top3Hit !== false) continue;
    const reasons = [];
    const acceptable = (acceptableById.get(row.id) ?? []).map((n) => byName.get(n)).filter(Boolean);
    const mapped = acceptable.filter((p) => p.tasks.includes(row.expectedTask));
    if (mapped.length === 0) reasons.push('görev eşlemesi yanlış (kabul edilen hiçbir ürün bu göreve bağlı değil)');
    const target = mapped.length > 0 ? mapped : acceptable;
    if (target.every((p) => p.models.length === 0)) reasons.push('model bağlanmamış');
    if (!target.some((p) => catalog.reviews.some((r) => r.productId === p.id && r.taskId === row.expectedTask))) reasons.push('uzman değerlendirmesi yok');
    if (!target.some((p) => catalog.signals.some((s) => s.productId === p.id && s.taskId === row.expectedTask))) reasons.push('kendi sinyal yok');
    for (const r of reasons) counts.set(r, (counts.get(r) ?? 0) + 1);
    lines.push(`| ${row.id} | \`${row.expectedTask}\` | ${row.tools.slice(0, 3).join(', ') || '(boş)'} | ${reasons.join('; ') || 'sıralama: kabul edilenler ilk 3 dışında'} |`);
  }
  lines.push('', '## Neden sayıları', '');
  for (const [r, n] of [...counts].sort((a, b) => b[1] - a[1])) lines.push(`- ${r}: ${n}`);
  lines.push(
    '',
    '## Öneri (ağırlıklar değiştirilmedi)',
    '',
    'Sorun ağırlıklar değil, veri: RouteAI Skoru kanıtsız ürünü önermiyor. Soğuk başlangıç için sırayla:',
    '1. Gece senkronunu çalıştır (AA_API_KEY + workflow) ve `data/link-review.md` ile ürünlere model bağla — B gelir.',
    '2. Öncelikli 10 görevde `data/briefs.json` brifleriyle uzman değerlendirmesi yaz — E gelir, benchmark\'ı olmayan görevler (sunum, müzik, otomasyon…) ancak böyle önerilebilir.',
    '3. Lansmandan sonra iş sonuçları (P6 OutcomeCard + P8 aggregate) kendi kanıtı getirir.',
  );
  return `${lines.join('\n')}\n`;
}
