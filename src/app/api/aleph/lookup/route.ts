import { NextRequest } from "next/server";
import { z } from "zod";
import {
  ALEPH_DEFAULT_MIN_SIM,
  alephError,
  alephJson,
  authenticateAgent,
  containsPii,
  embedText,
  isOverDailyLimit,
  matchCache,
  normalizeLang,
  normalizeQuery,
  readJsonBody,
  recordUsage,
} from "@/lib/aleph-cache";
import { rateLimitPublicApi } from "@/lib/api-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  query: z.string().min(1).max(8000),
  lang: z.string().min(2).max(12).optional(),
  min_sim: z.number().min(0.85).max(0.99).optional(),
});

export async function POST(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "aleph-lookup", 120);
  if (limited) return alephError("rate_limited");

  const auth = await authenticateAgent(req.headers.get("authorization"));
  if ("error" in auth) return auth.error;
  const { agent, supabase } = auth;

  if (await isOverDailyLimit(supabase, agent)) return alephError("rate_limited");

  const parsed = bodySchema.safeParse(await readJsonBody(req));
  if (!parsed.success) return alephError("bad_request");

  const query = normalizeQuery(parsed.data.query);
  if (!query) return alephError("bad_request");
  if (containsPii(query)) return alephError("pii_rejected");

  const lang = normalizeLang(parsed.data.lang);
  const minSim = parsed.data.min_sim ?? ALEPH_DEFAULT_MIN_SIM;

  const embedding = await embedText(query);
  if (!embedding) return alephError("embed_unavailable");

  const match = await matchCache(supabase, embedding, lang, minSim);
  if (match === "error") return alephError("cache_unavailable");

  if (!match) {
    await recordUsage(supabase, agent.id, "lookup_miss");
    return alephJson({ hit: false });
  }

  await Promise.all([
    supabase.rpc("aleph_record_hit", { cache_id: match.id }),
    recordUsage(supabase, agent.id, "lookup_hit", {
      cacheId: match.id,
      similarity: match.similarity,
      tokensSaved: match.tokenEst,
    }),
  ]);

  return alephJson({
    hit: true,
    id: match.id,
    answer: match.answer,
    similarity: match.similarity,
    untrusted: true,
  });
}
