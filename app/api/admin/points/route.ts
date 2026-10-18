import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { loadCatalog } from "@/lib/catalog/index";
import { listPoints } from "@/lib/points/store";
import { DEAD_ZONE, START_POINTS } from "@/lib/points/points";

// Gizli kullanıcı puanlarının TEK görüneceği yer (x-admin-key gerekir). Kullanıcıya
// giden hiçbir yanıtta puan yoktur. Sadece okur: KV'de hiçbir şeyi değiştirmez.
//   GET /api/admin/points              -> oy almış bütün (görev, ürün) çiftleri
//   GET /api/admin/points?task=<id>    -> tek görev
export const runtime = "edge";

export async function GET(request: NextRequest) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  const catalog = loadCatalog();
  const only = request.nextUrl.searchParams.get("task");
  if (only && !catalog.tasksById.has(only)) {
    return NextResponse.json({ error: "Bilinmeyen görev" }, { status: 400 });
  }

  try {
    const rows = await listPoints(only ? [only] : catalog.tasks.map((t) => t.id));
    return NextResponse.json({
      startPoints: START_POINTS,
      deadZone: DEAD_ZONE,
      count: rows.length,
      rows: rows.map((r) => ({
        ...r,
        productName: catalog.productsById.get(r.productId)?.name ?? null,
        /** false: ham puan ölü bölgede (500'e yakın), sıralamada 500 sayılıyor. rankingPoints sıralamada kullanılan puandır. */
        counted: r.rankingPoints !== START_POINTS,
      })),
    });
  } catch (error) {
    console.error("[admin/points] hata:", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ error: "Puanlar okunamadı" }, { status: 500 });
  }
}
