import { NextRequest, NextResponse } from "next/server";
import { eventRequestSchema } from "@/lib/analytics/events";
import { recordEvent } from "@/lib/analytics/store";
import { checkRateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/getClientIp";

// Anonim analitik olayı -> KV sayaçları. IP sadece rate limit için, saklanmaz.
export const runtime = "edge";
export const preferredRegion = "fra1";

export async function POST(req: NextRequest) {
  const rate = await checkRateLimit(getClientIp(req), "events");
  if (!rate.success) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
  const parsed = eventRequestSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  try {
    await recordEvent(parsed.data);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }
}
