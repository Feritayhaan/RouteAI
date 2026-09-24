// Altın set metrikleri — saf fonksiyonlar (ağ, dosya, ortam yok).
// evals/run.mjs bunları çağırır; lib/__tests__/evals.test.ts sabitler.
//
// Tanımlar:
//  - top1Hit / top3Hit: ilk 1 / ilk 3 araçtan biri acceptableTools içinde mi.
//    acceptableTools boş olan satırlar (katalog boşluğu) ve skipped satırlar
//    paydaya girmez. Netleştirme sorusu soran ve araç döndürmeyen satır ıskadır.
//  - taskMatch: sadece görev döndüren adaptörlerde (v1 döndürmez).
//  - clarifyRate: netleştirme isteyen satır / değerlendirilen satır.

/**
 * @typedef {{ id: string, query: string, lang: 'tr' | 'en', expectedTask: string,
 *   acceptableTools: string[], needsClarification: boolean, notes?: string }} GoldenRow
 * @typedef {{ task?: string, tools?: string[], clarification?: boolean,
 *   skipped?: string, detail?: object }} RecommenderOutput
 */

/**
 * Golden satırının zorunlu alanlarını denetler; hatalı satırda fırlatır.
 * @param {any} row
 * @param {number} lineNo
 * @returns {GoldenRow}
 */
export function validateGoldenRow(row, lineNo) {
  const where = `golden.jsonl satır ${lineNo}`;
  if (typeof row.id !== 'string' || !row.id) throw new Error(`${where}: id eksik`);
  if (typeof row.query !== 'string' || !row.query.trim()) throw new Error(`${where} (${row.id}): query eksik`);
  if (row.lang !== 'tr' && row.lang !== 'en') throw new Error(`${where} (${row.id}): lang 'tr' ya da 'en' olmalı`);
  if (typeof row.expectedTask !== 'string' || !/^[a-z0-9]+\.[a-z0-9-]+$/.test(row.expectedTask)) {
    throw new Error(`${where} (${row.id}): expectedTask "grup.görev" biçiminde olmalı`);
  }
  if (!Array.isArray(row.acceptableTools) || row.acceptableTools.some((t) => typeof t !== 'string')) {
    throw new Error(`${where} (${row.id}): acceptableTools string dizisi olmalı`);
  }
  if (typeof row.needsClarification !== 'boolean') throw new Error(`${where} (${row.id}): needsClarification boolean olmalı`);
  return row;
}

/**
 * JSONL metnini satırlara ayırır ve doğrular. Boş satırlar atlanır.
 * @param {string} text
 * @returns {GoldenRow[]}
 */
export function parseGolden(text) {
  /** @type {GoldenRow[]} */
  const rows = [];
  text.split('\n').forEach((line, i) => {
    if (!line.trim()) return;
    rows.push(validateGoldenRow(JSON.parse(line), i + 1));
  });
  const ids = new Set();
  for (const row of rows) {
    if (ids.has(row.id)) throw new Error(`golden.jsonl: tekrar eden id ${row.id}`);
    ids.add(row.id);
  }
  return rows;
}

/**
 * Tek satırın sonucu. `output` adaptörün döndürdüğü nesne (bkz. evals/recommenders.mjs).
 * @param {GoldenRow} golden
 * @param {RecommenderOutput} output
 * @param {number | null} [latencyMs]
 */
export function evaluateRow(golden, output, latencyMs = null) {
  const skipped = output.skipped ?? null;
  // Skipped satırın araçları (varsa) üretimde dönecek cevap değildir; saklanmaz.
  const tools = !skipped && Array.isArray(output.tools) ? output.tools : [];
  const scorable = !skipped && golden.acceptableTools.length > 0;
  const acceptable = new Set(golden.acceptableTools);

  return {
    id: golden.id,
    lang: golden.lang,
    query: golden.query,
    expectedTask: golden.expectedTask,
    needsClarification: golden.needsClarification,
    task: output.task ?? null,
    tools,
    clarification: skipped ? null : Boolean(output.clarification),
    skipped,
    top1Hit: scorable ? acceptable.has(tools[0]) : null,
    top3Hit: scorable ? tools.slice(0, 3).some((t) => acceptable.has(t)) : null,
    taskMatch: !skipped && output.task ? output.task === golden.expectedTask : null,
    latencyMs: skipped ? null : latencyMs,
    detail: skipped ? null : output.detail ?? null,
  };
}

/**
 * @param {number} hits
 * @param {number} n
 */
function ratio(hits, n) {
  return { hits, n, rate: n > 0 ? Math.round((hits / n) * 1000) / 1000 : null };
}

/**
 * @param {EvaluatedRow[]} rows
 * @param {'top1Hit' | 'top3Hit' | 'taskMatch'} key
 */
function countWhere(rows, key) {
  const scored = rows.filter((r) => r[key] !== null);
  return ratio(scored.filter((r) => r[key]).length, scored.length);
}

/** @typedef {ReturnType<typeof evaluateRow>} EvaluatedRow */

/** @param {EvaluatedRow[]} rows */
export function summarize(rows) {
  const evaluated = rows.filter((r) => !r.skipped);
  const clarified = (/** @type {EvaluatedRow[]} */ list) => list.filter((r) => r.clarification).length;
  const needed = evaluated.filter((r) => r.needsClarification);
  const clear = evaluated.filter((r) => !r.needsClarification);
  const latencies = evaluated.map((r) => r.latencyMs).filter((ms) => typeof ms === 'number');

  return {
    total: rows.length,
    evaluated: evaluated.length,
    skipped: rows.length - evaluated.length,
    top1Hit: countWhere(rows, 'top1Hit'),
    top3Hit: countWhere(rows, 'top3Hit'),
    /** n = 0 ise adaptör görev döndürmüyor demektir. */
    taskMatch: countWhere(rows, 'taskMatch'),
    clarifyRate: ratio(clarified(evaluated), evaluated.length),
    /** Netleştirme gereken satırlarda soruldu mu / gerekmeyenlerde gereksiz soruldu mu. */
    clarifyOnNeeded: ratio(clarified(needed), needed.length),
    clarifyOnClear: ratio(clarified(clear), clear.length),
    avgLatencyMs: latencies.length > 0
      ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
      : null,
  };
}
