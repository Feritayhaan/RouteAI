import { NextRequest, NextResponse } from "next/server";
import { getTools } from "@/lib/toolsService";
import { requireAdmin } from "@/lib/adminAuth";

/**
 * Araç keşfi (yeni araç bulup kataloğa ekleme).
 *
 * Eskiden burada bir simülasyon vardı: sahte "New AI Tool Example" kaydını
 * canlı KV'ye ve vektör indeksine yazıyordu, yani kataloğa uydurma veri
 * sokuyordu. Gerçek keşif akışı (aday ürünler, PR ile onay) Prompt 8'de
 * gelecek; o zamana kadar uç 501 döner.
 */
export async function POST(req: NextRequest) {
    const denied = await requireAdmin(req);
    if (denied) return denied;

    return NextResponse.json(
        { error: "Not implemented", message: "Prompt 8'de keşif akışıyla gelecek" },
        { status: 501 }
    );
}

// GET endpoint for checking current tool status
export async function GET(req: NextRequest) {
    const denied = await requireAdmin(req);
    if (denied) return denied;

    try {
        const tools = await getTools();
        const categories = [...new Set(tools.map(t => t.category))];

        return NextResponse.json({
            totalTools: tools.length,
            categories: categories,
            toolsByCategory: categories.map(cat => ({
                category: cat,
                count: tools.filter(t => t.category === cat).length
            })),
            lastUpdate: new Date().toISOString()
        });

    } catch (error) {
        console.error("Get tools error:", error);
        return NextResponse.json(
            { error: "Tool bilgisi alinamadi" },
            { status: 500 }
        );
    }
}
