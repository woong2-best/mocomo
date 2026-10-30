import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { safeLogWarn } from "@/lib/safe-log";
import { getSupabaseAdmin } from "@/lib/supabase-storage";

/**
 * Shared plumbing for the Aleph semantic cache (/api/aleph/*).
 * Agents authenticate with a Bearer key whose sha256 is stored in aleph_agents.
 * Embeddings come from Cloudflare Workers AI (@cf/baai/bge-m3, 1024-dim).
 * Error bodies carry a short code only — never stacks, queries, or keys.
 */

export const ALEPH_CACHE_DIM = 1024;
export const ALEPH_QUERY_MAX = 1000;
export const ALEPH_ANSWER_MAX = 4000;
export const ALEPH_DEFAULT_MIN_SIM = 0.92;
export const ALEPH_DUPLICATE_MIN_SIM = 0.97;
export const ALEPH_LANG_DEFAULT = "en";

const EMBED_MODEL = "@cf/baai/bge-m3";
const EMBED_TIMEOUT_MS = 15_000;

export type AlephUsageKind = "lookup_hit" | "lookup_miss" | "store" | "feedback";

export type AlephAgent = {
  id: string;
  trust: number;
  dailyLimit: number;
};

export type AlephErrorCode =
  | "unauthorized"
  | "rate_limited"
  | "bad_request"
  | "pii_rejected"
  | "embed_unavailable"
  | "cache_unavailable"
  | "not_found"
  | "internal";

const STATUS: Record<AlephErrorCode, number> = {
  unauthorized: 401,
  rate_limited: 429,
  bad_request: 400,
  pii_rejected: 400,
  embed_unavailable: 503,
  cache_unavailable: 503,
  not_found: 404,
  internal: 500,
};

export function alephError(code: AlephErrorCode): NextResponse {
  return NextResponse.json(
    { error: code },
    { status: STATUS[code], headers: { "cache-control": "no-store" } }
  );
}

export function alephJson(payload: Record<string, unknown>, status = 200): NextResponse {
  return NextResponse.json(payload, { status, headers: { "cache-control": "no-store" } });
}

/* ---------------------------------------------------------------- auth */

export function hashAgentKey(key: string): string {
  return createHash("sha256").update(key, "utf8").digest("hex");
}

function readBearer(header: string | null): string | null {
  if (!header) return null;
  const match = /^Bearer\s+([A-Za-z0-9._~+/=-]{16,512})$/.exec(header.trim());
  return match?.[1] ?? null;
}

export type AuthResult = { agent: AlephAgent; supabase: SupabaseClient } | { error: NextResponse };

/** Resolves the Bearer key to an active agent. 401 on anything else. */
export async function authenticateAgent(authorization: string | null): Promise<AuthResult> {
  const key = readBearer(authorization);
  if (!key) return { error: alephError("unauthorized") };

  const supabase = getSupabaseAdmin();
  if (!supabase) return { error: alephError("cache_unavailable") };

  const { data, error } = await supabase
    .from("aleph_agents")
    .select("id, trust, daily_limit, banned")
    .eq("key_hash", hashAgentKey(key))
    .maybeSingle();

  if (error) {
    safeLogWarn("aleph-cache", { step: "auth", result: "db_error" });
    return { error: alephError("cache_unavailable") };
  }
  if (!data || data.banned) return { error: alephError("unauthorized") };

  return {
    supabase,
    agent: {
      id: data.id as string,
      trust: Number(data.trust ?? 0),
      dailyLimit: Number(data.daily_limit ?? 0),
    },
  };
}

/* --------------------------------------------------------- daily limit */

function utcDayStart(now = new Date()): string {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
}

/** True when today's (UTC) usage rows for the agent have reached daily_limit. */
export async function isOverDailyLimit(supabase: SupabaseClient, agent: AlephAgent): Promise<boolean> {
  const { count, error } = await supabase
    .from("aleph_usage")
    .select("id", { count: "exact", head: true })
    .eq("agent_id", agent.id)
    .gte("created_at", utcDayStart());
  if (error) {
    safeLogWarn("aleph-cache", { step: "daily_limit", result: "db_error" });
    return true; // fail closed
  }
  return (count ?? 0) >= agent.dailyLimit;
}

/* --------------------------------------------------------- normalization */

/** trim → collapse whitespace → lowercase. Null when empty or over the limit. */
export function normalizeQuery(raw: string): string | null {
  const text = raw.trim().replace(/\s+/g, " ").toLowerCase();
  if (text.length === 0 || text.length > ALEPH_QUERY_MAX) return null;
  return text;
}

export function normalizeAnswer(raw: string): string | null {
  const text = raw.trim();
  if (text.length === 0 || text.length > ALEPH_ANSWER_MAX) return null;
  return text;
}

export function normalizeLang(raw: string | undefined): string {
  const lang = (raw ?? ALEPH_LANG_DEFAULT).trim().toLowerCase();
  return /^[a-z]{2,3}(-[a-z0-9]{2,8})?$/.test(lang) ? lang : ALEPH_LANG_DEFAULT;
}

/* ------------------------------------------------------------ PII filter */

const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;
// 9–15 digits with optional separators, optional leading +. Covers phones and card PANs (13–19).
const PHONE_OR_CARD_RE = /\+?\d(?:[\s().-]*\d){8,18}/;
const SSN_RE = /\b\d{3}-\d{2}-\d{4}\b/;
// Korean resident registration number: YYMMDD-GNNNNNN.
const KR_RRN_RE = /\b\d{6}-?[1-4]\d{6}\b/;

/** Email, phone/card digit runs, SSN, or Korean RRN anywhere in the text. */
export function containsPii(text: string): boolean {
  return EMAIL_RE.test(text) || SSN_RE.test(text) || KR_RRN_RE.test(text) || PHONE_OR_CARD_RE.test(text);
}

/* ------------------------------------------------------------- embedding */

function cfAccountId(): string {
  return process.env.CF_ACCOUNT_ID?.trim() || process.env.CLOUDFLARE_ACCOUNT_ID?.trim() || "";
}

function cfApiToken(): string {
  return process.env.CF_API_TOKEN?.trim() || "";
}

/** bge-m3 embedding via Workers AI. Null on any failure — callers answer 503 embed_unavailable. */
export async function embedText(text: string): Promise<number[] | null> {
  const account = cfAccountId();
  const token = cfApiToken();
  if (!account || !token) return null;

  try {
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${account}/ai/run/${EMBED_MODEL}`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        signal: AbortSignal.timeout(EMBED_TIMEOUT_MS),
        body: JSON.stringify({ text: [text] }),
      }
    );
    if (!res.ok) {
      safeLogWarn("aleph-cache", { step: "embed", result: "fail", status: res.status });
      return null;
    }
    const json = (await res.json()) as {
      success?: boolean;
      result?: { data?: unknown; embeddings?: unknown };
    };
    const rows = json.result?.data ?? json.result?.embeddings;
    const vector = Array.isArray(rows) ? (rows[0] as unknown) : null;
    if (!Array.isArray(vector) || vector.length !== ALEPH_CACHE_DIM) return null;
    for (const n of vector) if (typeof n !== "number" || !Number.isFinite(n)) return null;
    return vector as number[];
  } catch {
    safeLogWarn("aleph-cache", { step: "embed", result: "throw" });
    return null;
  }
}

/* ----------------------------------------------------------------- match */

export type AlephMatch = {
  id: string;
  query: string;
  answer: string;
  tokenEst: number;
  similarity: number;
};

export async function matchCache(
  supabase: SupabaseClient,
  embedding: number[],
  lang: string,
  minSim: number
): Promise<AlephMatch | null | "error"> {
  const { data, error } = await supabase.rpc("aleph_match", {
    query_embedding: embedding,
    match_lang: lang,
    min_sim: minSim,
    match_count: 1,
  });
  if (error) {
    safeLogWarn("aleph-cache", { step: "match", result: "db_error" });
    return "error";
  }
  const row = Array.isArray(data) ? (data[0] as Record<string, unknown> | undefined) : undefined;
  if (!row || typeof row.id !== "string") return null;
  return {
    id: row.id,
    query: String(row.query ?? ""),
    answer: String(row.answer ?? ""),
    tokenEst: Number(row.token_est ?? 0),
    similarity: Number(row.similarity ?? 0),
  };
}

/* ----------------------------------------------------------------- usage */

export async function recordUsage(
  supabase: SupabaseClient,
  agentId: string,
  kind: AlephUsageKind,
  extra: { cacheId?: string; similarity?: number; tokensSaved?: number } = {}
): Promise<void> {
  const { error } = await supabase.from("aleph_usage").insert({
    agent_id: agentId,
    kind,
    cache_id: extra.cacheId ?? null,
    similarity: extra.similarity ?? null,
    tokens_saved: Math.max(0, Math.trunc(extra.tokensSaved ?? 0)),
  });
  if (error) safeLogWarn("aleph-cache", { step: "usage", kind, result: "db_error" });
}

/* ------------------------------------------------------------------ body */

/** Parses JSON with a hard size cap. Null on any failure. */
export async function readJsonBody(req: Request, maxBytes = 64 * 1024): Promise<unknown | null> {
  const declared = Number(req.headers.get("content-length") ?? "0");
  if (Number.isFinite(declared) && declared > maxBytes) return null;
  try {
    const text = await req.text();
    if (text.length > maxBytes) return null;
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}
