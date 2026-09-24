// /api/prompt/* ortak akışı: rate limit, bütçe, zaman aşımı, kullanım kaydı.
// Kullanıcı metni (serbest talimat) loglanmaz.

import { NextResponse, type NextRequest } from "next/server";
import { checkRateLimit } from "../rateLimit";
import { getClientIp } from "../getClientIp";
import { isOverBudget, kvUsageStore, recordUsage } from "../agent/budget";
import { defaultPromptDeps, PROMPT_TIMEOUT_MS } from "./deps";
import type { PromptDeps, PromptResult } from "./service";

const STATUS: Record<string, number> = {
  expired: 404,
  unknown_product: 404,
  no_guide: 404,
  refine_limit: 409,
  no_pending_question: 409,
  unknown_refinement: 400,
  invalid: 400,
};

export async function handlePromptRequest<T>(
  req: NextRequest,
  schema: { safeParse: (d: unknown) => { success: true; data: T } | { success: false } },
  run: (input: T, deps: PromptDeps) => Promise<PromptResult>,
  label: string
): Promise<NextResponse> {
  const rate = await checkRateLimit(getClientIp(req), "prompt");
  if (!rate.success) return NextResponse.json({ error: "rate_limited", retryAfter: rate.reset }, { status: 429 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const usage = kvUsageStore();
  if (await isOverBudget(usage)) return NextResponse.json({ error: "budget" }, { status: 503 });

  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), PROMPT_TIMEOUT_MS);
  const started = Date.now();
  try {
    const result = await run(parsed.data, defaultPromptDeps(abort.signal));
    await recordUsage(usage, result.tokens);
    console.log(`[prompt/${label}] ${JSON.stringify({ latencyMs: Date.now() - started, tokens: result.tokens, error: "error" in result ? result.error : null })}`);
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: STATUS[result.error] ?? 400 });
    return NextResponse.json({ card: result.card });
  } catch (error) {
    console.error(`[prompt/${label}] üretim hatası: ${abort.signal.aborted ? "timeout" : error instanceof Error ? error.name : "unknown"}`);
    return NextResponse.json({ error: abort.signal.aborted ? "timeout" : "generation_failed" }, { status: 502 });
  } finally {
    clearTimeout(timer);
  }
}
