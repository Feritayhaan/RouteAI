import { NextRequest, NextResponse } from "next/server";
import { kv } from "@/lib/kv";
import { hashString } from "@/lib/hash";
import { normalizeQuery } from "@/lib/intent/cache";
import { feedbackRequestSchema, type FeedbackRecord } from "@/lib/validations/feedback";
import { checkRateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/getClientIp";
import { sessionHash } from "@/lib/signals/store";

export const runtime = 'edge';
export const preferredRegion = 'fra1';

// Admin route "son 100"u sirayla okuyabilsin diye anahtarlari ayri bir listede
// indeksliyoruz. Alternatifi kv.keys('fb:*') taramasi olurdu: prod'da pahali ve sirasiz.
const RECENT_KEY = 'fb:recent';
const RECENT_MAX = 500;

export async function POST(req: NextRequest) {
  try {
    // Rate limiting - check BEFORE any expensive operations
    const ip = getClientIp(req);
    const rateLimitResult = await checkRateLimit(ip, "feedback");

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: "Too many requests", retryAfter: rateLimitResult.reset },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": rateLimitResult.limit.toString(),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": rateLimitResult.reset.toString(),
          },
        }
      );
    }

    const body = await req.json();

    const validationResult = feedbackRequestSchema.safeParse(body);

    if (!validationResult.success) {
      const details: Record<string, string> = {};
      validationResult.error.errors.forEach((err) => {
        const field = err.path.join(".");
        details[field] = err.message;
      });

      return NextResponse.json(
        { error: "Validation failed", details },
        { status: 400 }
      );
    }

    const { query, toolName, vote, sessionId, taskId, productId } = validationResult.data;

    // ts soneki her oyu ayri kayit yapar: ayni gun ayni sorguya gelen ikinci oy
    // birincisinin uzerine yazmaz. Faz 1'in tek isi veri toplamak.
    const ts = Date.now();
    const day = new Date(ts).toISOString().slice(0, 10);
    let key: string;
    let record: FeedbackRecord;
    if (query) {
      key = `fb:${day}:${hashString(normalizeQuery(query))}:${ts}`;
      record = { query, toolName, vote, ts };
    } else {
      // v2 (sohbet): mesaj metni yok; oturum sadece hash olarak.
      const sid = sessionHash(sessionId!);
      key = `fb:${day}:${hashString(`${sid}:${taskId}:${productId}`)}:${ts}`;
      record = { toolName, vote, ts, taskId, productId, sessionHash: sid };
    }

    await kv.set(key, record);
    await kv.lpush(RECENT_KEY, key);
    await kv.ltrim(RECENT_KEY, 0, RECENT_MAX - 1);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Feedback kaydetme hatası:', error);
    return NextResponse.json(
      { error: "Feedback kaydedilemedi" },
      { status: 500 }
    );
  }
}
