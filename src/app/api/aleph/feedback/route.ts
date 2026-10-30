import { NextRequest } from "next/server";
import { z } from "zod";
import {
  alephError,
  alephJson,
  authenticateAgent,
  isOverDailyLimit,
  readJsonBody,
  recordUsage,
} from "@/lib/aleph-cache";
import { rateLimitPublicApi } from "@/lib/api-security";
import { safeLogWarn } from "@/lib/safe-log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  id: z.string().uuid(),
  good: z.boolean(),
});

export async function POST(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "aleph-feedback", 120);
  if (limited) return alephError("rate_limited");

  const auth = await authenticateAgent(req.headers.get("authorization"));
  if ("error" in auth) return auth.error;
  const { agent, supabase } = auth;

  if (await isOverDailyLimit(supabase, agent)) return alephError("rate_limited");

  const parsed = bodySchema.safeParse(await readJsonBody(req));
  if (!parsed.success) return alephError("bad_request");

  // Counters, flag rule (bad >= 3 && bad > good * 2), and trust ±(0.01/0.02) applied atomically in SQL.
  const { data, error } = await supabase.rpc("aleph_apply_feedback", {
    cache_id: parsed.data.id,
    agent: agent.id,
    is_good: parsed.data.good,
  });
  if (error) {
    safeLogWarn("aleph-cache", { step: "feedback", result: "db_error" });
    return alephError("cache_unavailable");
  }

  const row = Array.isArray(data) ? (data[0] as Record<string, unknown> | undefined) : undefined;
  if (!row) return alephError("not_found");

  await recordUsage(supabase, agent.id, "feedback", { cacheId: parsed.data.id });

  return alephJson({
    ok: true,
    id: parsed.data.id,
    good: Number(row.good ?? 0),
    bad: Number(row.bad ?? 0),
    flagged: Boolean(row.flagged),
  });
}
