import { NextRequest, NextResponse } from "next/server";
import { outcomeRequestSchema } from "@/lib/validations/outcome";
import { checkRateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/getClientIp";
import { saveOutcome } from "@/lib/signals/store";

// İş sonucu ("işini gördü mü?") ve karşılaştırma cevapları. IP sadece rate
// limit için kullanılır, saklanmaz; mesaj metni hiç gelmez.
export const runtime = "edge";
export const preferredRegion = "fra1";

export async function POST(req: NextRequest) {
  const rate = await checkRateLimit(getClientIp(req), "outcome");
  if (!rate.success) {
    return NextResponse.json({ error: "Too many requests", retryAfter: rate.reset }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = outcomeRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }

  try {
    await saveOutcome(parsed.data);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[outcome] kaydedilemedi:", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ error: "Could not save" }, { status: 500 });
  }
}
