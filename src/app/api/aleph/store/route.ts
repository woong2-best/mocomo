import { NextRequest } from "next/server";
import { z } from "zod";
import {
  ALEPH_ANSWER_MAX,
  ALEPH_DUPLICATE_MIN_SIM,
  alephError,
  alephJson,
  authenticateAgent,
  containsPii,
  embedText,
  isOverDailyLimit,
  matchCache,
  normalizeAnswer,
  normalizeLang,
  normalizeQuery,
  readJsonBody,
  recordUsage,
} from "@/lib/aleph-cache";
import { rateLimitPublicApi } from "@/lib/api-security";
import { safeLogWarn } from "@/lib/safe-log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  query: z.string().min(1).max(8000),
  answer: z.string().min(1).max(ALEPH_ANSWER_MAX),
  lang: z.string().min(2).max(12).optional(),
  token_est: z.number().int().min(0).max(1_000_000).optional(),
});

export async function POST(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "aleph-store", 60);
  if (limited) return alephError("rate_limited");

  const auth = await authenticateAgent(req.headers.get("authorization"));
  if ("error" in auth) return auth.error;
  const { agent, supabase } = auth;

  if (await isOverDailyLimit(supabase, agent)) return alephError("rate_limited");

  const parsed = bodySchema.safeParse(await readJsonBody(req));
  if (!parsed.success) return alephError("bad_request");

  const query = normalizeQuery(parsed.data.query);
  const answer = normalizeAnswer(parsed.data.answer);
  if (!query || !answer) return alephError("bad_request");
  if (containsPii(query) || containsPii(answer)) return alephError("pii_rejected");

  const lang = normalizeLang(parsed.data.lang);
  const tokenEst = parsed.data.token_est ?? 0;

  const embedding = await embedText(query);
  if (!embedding) return alephError("embed_unavailable");

  const existing = await matchCache(supabase, embedding, lang, ALEPH_DUPLICATE_MIN_SIM);
  if (existing === "error") return alephError("cache_unavailable");
  if (existing) return alephJson({ stored: false, reason: "duplicate" });

  const { data, error } = await supabase
    .from("aleph_cache")
    .insert({
      agent_id: agent.id,
      lang,
      query,
      answer,
      embedding,
      token_est: tokenEst,
    })
    .select("id")
    .single();

  if (error || !data?.id) {
    safeLogWarn("aleph-cache", { step: "store", result: "db_error" });
    return alephError("cache_unavailable");
  }

  const id = data.id as string;
  await recordUsage(supabase, agent.id, "store", { cacheId: id });
  return alephJson({ stored: true, id });
}
