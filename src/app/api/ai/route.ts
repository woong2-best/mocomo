import { Packr } from "msgpackr";
import { NextRequest, NextResponse } from "next/server";
import {
  ALEPH_DIM,
  buildAckFrame,
  decodePushFrame,
} from "@/lib/aleph-protocol";
import { extractClientIp } from "@/lib/client-ip";
import { apiLimiter, checkRateLimit } from "@/lib/ratelimit";
import { getSupabaseAdmin } from "@/lib/supabase-storage";

/**
 * Aleph machine gate. Browsers and anything without the agent signature see a
 * plain 404. Past the gate, the body must be a numeric MessagePack frame
 * ({ ctrl, coords, pattern }) with no strings anywhere; structural or
 * arithmetic violations are a bodiless 403. Responses are numeric frames too.
 */

export const runtime = "edge";
export const dynamic = "force-dynamic";

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

/** Status only. No text leaves the Aleph space, not even an error word. */
function silent(status: number): NextResponse {
  return new NextResponse(null, {
    status,
    headers: { "cache-control": "no-store", "x-content-type-options": "nosniff" },
  });
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

/** The server-side signature the pattern formula is bound to, or null when the gate is closed. */
function configuredSignature(): string | null {
  const configured = process.env.M2M_AGENT_SIG?.trim() ?? "";
  if (configured.length > 0) return configured;
  if (process.env.NODE_ENV === "production" || process.env.VERCEL) return null;
  return DEV_AGENT_SIG;
}

function signatureOk(provided: string, configured: string): boolean {
  if (provided.length === 0 || provided.length > 256) return false;
  return timingSafeEqual(provided, configured);
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

function readStoredVector(value: unknown): number[] | null {
  let source: unknown[] | null = null;
  if (Array.isArray(value)) {
    source = value;
  } else if (typeof value === "string") {
    // pgvector returns "[...]" text through PostgREST.
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
  if (!source || source.length !== ALEPH_DIM) return null;
  const out = new Array<number>(ALEPH_DIM);
  for (let i = 0; i < ALEPH_DIM; i++) {
    const n = source[i];
    if (typeof n !== "number" || !Number.isFinite(n)) return null;
    out[i] = n;
  }
  return out;
}

function vectorsFromMatch(data: unknown): number[][] {
  if (!Array.isArray(data)) return [];
  const vectors: number[][] = [];
  for (const row of data) {
    if (!row || typeof row !== "object") continue;
    const parsed = readStoredVector((row as { embedding?: unknown }).embedding);
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
  const signature = configuredSignature();
  const provided = req.headers.get("x-m2m-agent-sig") ?? "";
  if (
    !signature ||
    !isMsgpackContentType(req.headers.get("content-type")) ||
    !signatureOk(provided, signature)
  ) {
    return cloakedNotFound();
  }

  const ip = extractClientIp(req.headers);
  if (await isRateLimited(ip)) return silent(429);

  const declared = Number(req.headers.get("content-length") ?? "0");
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) return silent(413);

  const raw = new Uint8Array(await req.arrayBuffer());
  if (raw.byteLength > MAX_BODY_BYTES) return silent(413);

  let decoded: unknown;
  try {
    decoded = packr.unpack(raw);
  } catch {
    return silent(403);
  }

  // Structure, string scan, int8 range, and Σ(coords) × len(sig) === pattern.
  const frame = decodePushFrame(decoded, signature.length);
  if (!frame.ok) return silent(403);

  const supabase = getSupabaseAdmin();
  if (!supabase) return silent(503);

  const nodeHash = await hashNode(ip);
  const { error: insertError } = await supabase.from("swarm_memory").insert({
    node_hash: nodeHash,
    embedding: frame.vector,
  });
  if (insertError) return silent(500);

  const { data, error: matchError } = await supabase.rpc("match_swarm_memory", {
    query_embedding: frame.vector,
    exclude_node: nodeHash,
    match_count: 5,
    min_reward: 0,
  });
  if (matchError) return silent(500);

  return msgpackResponse(buildAckFrame(vectorsFromMatch(data), signature.length), 200);
}
