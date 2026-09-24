// /api/admin/stats hesabı — saf: veri kaynağı dışarıdan verilir (KV ya da
// yerel örnek veri). Son N günün özeti + ROADMAP metrikleri + rehber bazında.

import type { SearchContext } from '../catalog/search';
import { searchCatalog } from '../catalog/search';
import type { EventName } from './events';
import { eventKeys } from './store';
import type { OutcomeRecord, VoteRecord } from '../signals/store';

export interface StatsSource {
  hgetall(key: string): Promise<Record<string, number | string> | null>;
  smembers(key: string): Promise<string[]>;
  mget(keys: string[]): Promise<unknown[]>;
  get(key: string): Promise<number | string | null>;
}

const DAY = 24 * 60 * 60 * 1000;
const dayStr = (t: number) => new Date(t).toISOString().slice(0, 10);
const ratio = (num: number, den: number) => ({ num, den, rate: den > 0 ? Math.round((num / den) * 1000) / 1000 : null });

async function readRecords<T>(source: StatsSource, index: string): Promise<T[]> {
  const keys = await source.smembers(index);
  const out: T[] = [];
  for (let i = 0; i < keys.length; i += 200) {
    for (const v of await source.mget(keys.slice(i, i + 200))) if (v) out.push(v as T);
  }
  return out;
}

export async function computeStats({ source, now, days = 30, search }: { source: StatsSource; now: number; days?: number; search: SearchContext }) {
  const dayList = Array.from({ length: days }, (_, i) => dayStr(now - (days - 1 - i) * DAY));
  const since = now - days * DAY;

  // Olay sayaçları
  const totals: Partial<Record<EventName, number>> = {};
  const byTask = new Map<string, Record<string, number>>();
  const byGuide = new Map<string, Record<string, number>>();
  const refineButtons = new Map<string, Record<string, number>>();
  const add = (obj: Record<string, number>, k: string, v: number) => { obj[k] = (obj[k] ?? 0) + v; };
  for (const day of dayList) {
    const keys = eventKeys(day);
    for (const [name, n] of Object.entries((await source.hgetall(keys.total)) ?? {})) add(totals as Record<string, number>, name, Number(n));
    for (const [field, n] of Object.entries((await source.hgetall(keys.task)) ?? {})) {
      const [name, taskId] = field.split('|');
      if (!byTask.has(taskId)) byTask.set(taskId, {});
      add(byTask.get(taskId)!, name, Number(n));
    }
    for (const [field, n] of Object.entries((await source.hgetall(keys.guide)) ?? {})) {
      const [name, guideId] = field.split('|');
      if (!byGuide.has(guideId)) byGuide.set(guideId, {});
      add(byGuide.get(guideId)!, name, Number(n));
    }
    for (const [field, n] of Object.entries((await source.hgetall(keys.refine)) ?? {})) {
      const [guideId, refinementId] = field.split('|');
      if (!refineButtons.has(guideId)) refineButtons.set(guideId, {});
      add(refineButtons.get(guideId)!, refinementId, Number(n));
    }
  }
  const t = (name: EventName) => totals[name] ?? 0;

  // Kendi gözlem kayıtları (pencere içinde)
  const outcomes = (await readRecords<OutcomeRecord>(source, 'sig:outcome:index')).filter((o) => Date.parse(o.at) >= since);
  const votes = (await readRecords<VoteRecord>(source, 'sig:vote:index')).filter((v) => Date.parse(v.at) >= since);

  const didTheJobByTask: Record<string, { yes: number; partial: number; no: number; rate: number | null }> = {};
  for (const o of outcomes) {
    const row = (didTheJobByTask[o.taskId] ??= { yes: 0, partial: 0, no: 0, rate: null });
    row[o.answer]++;
  }
  for (const row of Object.values(didTheJobByTask)) row.rate = ratio(row.yes, row.yes + row.partial + row.no).rate;

  const didTheJobByGuideVersion: Record<string, { yes: number; total: number; rate: number | null }> = {};
  for (const o of outcomes) {
    if (!o.guideId) continue;
    const k = `${o.guideId}@v${o.guideVersion ?? 0}`;
    const row = (didTheJobByGuideVersion[k] ??= { yes: 0, total: 0, rate: null });
    row.total++;
    if (o.answer === 'yes') row.yes++;
  }
  for (const row of Object.values(didTheJobByGuideVersion)) row.rate = ratio(row.yes, row.total).rate;

  // Benchmark payı %50'nin altına düşmüş görevler (en iyi ürüne göre)
  let tasksWithItems = 0;
  let belowHalf = 0;
  for (const taskId of search.tasksById.keys()) {
    const top = searchCatalog({ taskId, limit: 1 }, search).items[0];
    if (!top) continue;
    tasksWithItems++;
    if (top.score.benchmarkShare < 0.5) belowHalf++;
  }

  // 7 gün geri dönüş: D günündeki oturumlardan D+1..D+7'de tekrar görülenler
  const retSets = new Map<string, Set<string>>();
  for (const day of dayList) retSets.set(day, new Set(await source.smembers(eventKeys(day).returning)));
  let cohort = 0;
  let returned = 0;
  for (let i = 0; i + 7 < dayList.length; i++) {
    const base = retSets.get(dayList[i])!;
    const later = new Set(dayList.slice(i + 1, i + 8).flatMap((d) => [...retSets.get(d)!]));
    cohort += base.size;
    returned += [...base].filter((s) => later.has(s)).length;
  }

  const tokensDaily: Record<string, number> = {};
  for (const day of dayList) tokensDaily[day] = Number((await source.get(`usage:day:${day}`)) ?? 0);

  const guides: Record<string, unknown> = {};
  for (const [guideId, counts] of byGuide) {
    const top = Object.entries(refineButtons.get(guideId) ?? {}).sort((a, b) => b[1] - a[1]).slice(0, 5);
    guides[guideId] = {
      generated: counts.prompt_generated ?? 0,
      copied: counts.prompt_copied ?? 0,
      copyRate: ratio(counts.prompt_copied ?? 0, counts.prompt_generated ?? 0).rate,
      avgRefinements: ratio(counts.prompt_refined ?? 0, counts.prompt_generated ?? 0).rate,
      topRefinements: top.map(([id, n]) => ({ id, n })),
    };
  }

  return {
    window: { from: dayList[0], to: dayList.at(-1), days },
    events: totals,
    metrics: {
      outcomeResponseRate: ratio(t('outcome_answered'), t('outcome_shown')),
      didTheJobRate: ratio(outcomes.filter((o) => o.answer === 'yes').length, outcomes.length),
      didTheJobByTask,
      tasksBenchmarkShareBelowHalf: { count: belowHalf, of: tasksWithItems },
      likeRate: ratio(votes.filter((v) => v.vote === 'up').length, votes.length),
      toolClickRate: ratio(t('tool_click'), t('recommendation_shown')),
      promptCopyRate: ratio(t('prompt_copied'), t('prompt_generated')),
      clarifyRate: ratio(t('clarify_shown'), t('chat_start')),
      return7d: ratio(returned, cohort),
      tokensDaily,
    },
    byTask: Object.fromEntries(byTask),
    guides,
    didTheJobByGuideVersion,
    targets: {
      outcomeResponseRate: '>= 0.20', didTheJobRate: '>= 0.65', likeRate: '>= 0.70', toolClickRate: '>= 0.40',
      promptCopyRate: '>= 0.30', clarifyRate: '0.15 - 0.35',
    },
  };
}
