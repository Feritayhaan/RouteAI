import { NextRequest, NextResponse } from "next/server";
import { kv } from "@/lib/kv";
import { requireAdmin } from "@/lib/adminAuth";
import { computeStats, type StatsSource } from "@/lib/analytics/stats";
import { sampleStatsSource } from "@/lib/analytics/sample";
import { defaultSearchContext } from "@/lib/catalog/search";

// Son 30 günün özeti ve ROADMAP metrikleri (x-admin-key). Yerelde
// ?sample=1 ile sentetik örnek veri (üretimde kapalı).
export const runtime = "edge";

function kvSource(): StatsSource {
  return {
    hgetall: (key) => kv.hgetall<Record<string, number | string>>(key),
    smembers: (key) => kv.smembers(key),
    mget: async (keys) => (keys.length ? kv.mget(...keys) : []),
    get: (key) => kv.get<number | string>(key),
  };
}

export async function GET(request: NextRequest) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  const now = Date.now();
  const sample = request.nextUrl.searchParams.get("sample") === "1" && process.env.NODE_ENV !== "production";
  try {
    const source = sample ? await sampleStatsSource(now) : kvSource();
    const stats = await computeStats({ source, now, days: 30, search: defaultSearchContext(now) });
    return NextResponse.json({ sample, ...stats });
  } catch (error) {
    console.error("[admin/stats] hata:", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ error: "Stats hesaplanamadı" }, { status: 500 });
  }
}
