import { Packr } from "msgpackr";
import { NextRequest, NextResponse } from "next/server";
import { extractClientIp } from "@/lib/client-ip";
import { apiLimiter, checkRateLimit } from "@/lib/ratelimit";
import { getSupabaseAdmin } from "@/lib/supabase-storage";

export const runtime = "edge";
export const dynamic = "force-dynamic";

const DIM = 1536;
const MAX_BODY_BYTES = 128 * 1024;
const DEV_AGENT_SIG = "test-agent-v1";
const HEX = "0123456789abcdef";

const packr = new Packr({
  useRecords: false,
  structuredClone: false,
  moreTypes: false,
  mapsAsObjects: true,
});

const memoryRate = new Map<string, { count: number; resetAt: number }>();

function cloakedNotFound(): NextResponse {
  return new NextResponse("404 Not Found", { status: 404 });
}

function isMsgpackContentType(header: string | null): boolean {
  if (!header) return false;
  const media = header.split(";")[0]?.trim().toLowerCase();
  return media === "application/x-msgpack";
}

function timingSafeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const left = enc.encode(a);
  const right = enc.encode(b);
  const len = Math.max(left.length, right.length);
  let diff = left.length ^ right.length;
  for (let i = 0; i < len; i++) {
    diff |= (left[i] ?? 0) ^ (right[i] ?? 0);
  }
  return diff === 0;
}

function signatureOk(provided: string): boolean {
  if (provided.length === 0 || provided.length > 256) return false;
  const configured = process.env.M2M_AGENT_SIG?.trim() ?? "";
  if (configured.length > 0) return timingSafeEqual(provided, configured);
  if (process.env.NODE_ENV === "production" || process.env.VERCEL) return false;
  return timingSafeEqual(provided, DEV_AGENT_SIG);
}

function hex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    out += HEX[bytes[i]! >> 4]! + HEX[bytes[i]! & 0x0f]!;
  }
  return out;
}

async function hashNode(ip: string): Promise<string> {
  const pepper = process.env.M2M_NODE_PEPPER?.trim();
  const material = pepper ? `${pepper}\n${ip}` : ip;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(material));
  return hex(digest);
}

function msgpackResponse(payload: unknown, status: number): NextResponse {
  const packed = packr.pack(payload);
  const bytes = packed.slice();
  return new NextResponse(bytes, {
    status,
    headers: {
      "content-type": "application/x-msgpack",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });
}

function failure(error: string, status: number, detail?: string): NextResponse {
  const body: { error: string; detail?: string } = { error };
  if (detail && process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
    body.detail = detail.slice(0, 300);
  }
  return msgpackResponse(body, status);
}

function readFiniteVector(value: unknown, rejectZero: boolean): number[] | null {
  let source: unknown[] | null = null;
  if (Array.isArray(value)) {
    source = value;
  } else if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed.startsWith("[")) return null;
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (!Array.isArray(parsed)) return null;
      source = parsed;
    } catch {
      return null;
    }
  }
  if (!source || source.length !== DIM) return null;

  const out = new Array<number>(DIM);
  let sumSq = 0;
  for (let i = 0; i < DIM; i++) {
    const n = source[i];
    if (typeof n !== "number" || !Number.isFinite(n) || Math.abs(n) > 1e6) return null;
    out[i] = n;
    sumSq += n * n;
  }
  if (rejectZero && sumSq === 0) return null;
  return out;
}

function readLatent(decoded: unknown): number[] | null {
  if (!decoded || typeof decoded !== "object" || Array.isArray(decoded)) return null;
  const raw = (decoded as { latent_vector?: unknown }).latent_vector;
  return readFiniteVector(raw, true);
}

function vectorsFromMatch(data: unknown): number[][] {
  if (!Array.isArray(data)) return [];
  const vectors: number[][] = [];
  for (const row of data) {
    if (!row || typeof row !== "object") continue;
    const parsed = readFiniteVector((row as { embedding?: unknown }).embedding, false);
    if (parsed) vectors.push(parsed);
  }
  return vectors;
}

async function isRateLimited(ip: string): Promise<boolean> {
  const key = `m2m-swarm:${ip}`;
  if (apiLimiter) {
    const { success } = await checkRateLimit(apiLimiter, key);
    return !success;
  }
  const now = Date.now();
  const row = memoryRate.get(key);
  if (!row || row.resetAt <= now) {
    if (memoryRate.size > 20_000) memoryRate.clear();
    memoryRate.set(key, { count: 1, resetAt: now + 60_000 });
    return false;
  }
  if (row.count >= 30) return true;
  row.count += 1;
  return false;
}

export function GET() {
  return cloakedNotFound();
}

export function HEAD() {
  return cloakedNotFound();
}

export function PUT() {
  return cloakedNotFound();
}

export function PATCH() {
  return cloakedNotFound();
}

export function DELETE() {
  return cloakedNotFound();
}

export function OPTIONS() {
  return cloakedNotFound();
}

export async function POST(req: NextRequest) {
  const contentTypeOk = isMsgpackContentType(req.headers.get("content-type"));
  const signature = req.headers.get("x-m2m-agent-sig") ?? "";
  if (!contentTypeOk || !signatureOk(signature)) {
    return cloakedNotFound();
  }

  const ip = extractClientIp(req.headers);
  if (await isRateLimited(ip)) {
    return failure("rate_limited", 429);
  }

  const declared = Number(req.headers.get("content-length") ?? "0");
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) {
    return failure("payload_too_large", 413);
  }

  const raw = new Uint8Array(await req.arrayBuffer());
  if (raw.byteLength > MAX_BODY_BYTES) {
    return failure("payload_too_large", 413);
  }

  let decoded: unknown;
  try {
    decoded = packr.unpack(raw);
  } catch {
    return failure("bad_payload", 400);
  }

  const vector = readLatent(decoded);
  if (!vector) return failure("invalid_latent_vector", 400);

  const supabase = getSupabaseAdmin();
  if (!supabase) return failure("swarm_unavailable", 503);

  const nodeHash = await hashNode(ip);
  const { error: insertError } = await supabase.from("swarm_memory").insert({
    node_hash: nodeHash,
    embedding: vector,
  });
  if (insertError) return failure("store_failed", 500, insertError.message);

  const { data, error: matchError } = await supabase.rpc("match_swarm_memory", {
    query_embedding: vector,
    exclude_node: nodeHash,
    match_count: 5,
    min_reward: 0,
  });
  if (matchError) return failure("match_failed", 500, matchError.message);

  return msgpackResponse({ vectors: vectorsFromMatch(data) }, 200);
}
