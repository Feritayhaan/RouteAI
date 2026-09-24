import { NextRequest, NextResponse } from "next/server";
import { chatRequestSchema } from "@/lib/validations/chat";
import { checkRateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/getClientIp";
import { loadCatalog } from "@/lib/catalog";
import { handleChat } from "@/lib/agent/handler";
import { openAIChatClient } from "@/lib/agent/client";
import { AGENT_TIMEOUT_MS, agentModel } from "@/lib/agent/config";
import { kvUsageStore } from "@/lib/agent/budget";
import type { ChatEvent } from "@/lib/agent/cards";

// Sohbet ajanı: NDJSON akışı. Olaylar: text | card | done | error.
// Akış mantığı lib/agent/handler.ts'te (OpenAI hatası / zaman aşımı / bütçe
// dolunca v1 anahtar kelime yolu). Kullanıcı mesajı ASLA loglanmaz.
export const runtime = "edge";
export const preferredRegion = "fra1";

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rate = await checkRateLimit(ip, "chat");
  if (!rate.success) {
    return NextResponse.json(
      { error: "Too many requests", retryAfter: rate.reset },
      { status: 429, headers: { "Retry-After": String(rate.reset), "X-RateLimit-Limit": String(rate.limit), "X-RateLimit-Remaining": "0" } }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = chatRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`) },
      { status: 400 }
    );
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const emit = (e: ChatEvent) => controller.enqueue(encoder.encode(JSON.stringify(e) + "\n"));
      await handleChat(
        { messages: parsed.data.messages, locale: parsed.data.locale ?? "en" },
        {
          client: openAIChatClient(),
          model: agentModel(),
          tasks: loadCatalog().tasks,
          store: kvUsageStore(),
          timeoutMs: AGENT_TIMEOUT_MS,
        },
        emit
      );
      controller.close();
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson", "Cache-Control": "no-cache" },
  });
}
