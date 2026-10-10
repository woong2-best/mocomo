import { NextRequest, NextResponse } from "next/server";
import { getCachedAuthUserMinimal } from "@/lib/auth";
import { rateLimitPublicApi } from "@/lib/api-security";
import { db } from "@/lib/db";
import { listCallSignals, pushCallSignal } from "@/lib/peer-call/signal-mailbox";
import type { CallSignalPayload } from "@/lib/peer-call/types";

function isPayload(value: unknown): value is CallSignalPayload {
  if (!value || typeof value !== "object" || !("type" in value)) return false;
  const type = (value as { type?: unknown }).type;
  return type === "offer" || type === "answer" || type === "ice" || type === "hangup";
}

async function requireCallParticipant(userId: string, callId: string) {
  const call = await db.voiceCall.findUnique({
    where: { id: callId },
    select: { callerId: true, calleeId: true, status: true },
  });
  if (!call) return { error: NextResponse.json({ error: "Call not found." }, { status: 404 }) };
  if (call.callerId !== userId && call.calleeId !== userId) {
    return { error: NextResponse.json({ error: "Permission denied." }, { status: 403 }) };
  }
  if (call.status !== "RINGING" && call.status !== "ACTIVE") {
    return { error: NextResponse.json({ error: "Call is not active." }, { status: 409 }) };
  }
  return { call };
}

/** SDP/ICE mailbox so video can connect when Socket.IO is rate-limited. */
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ callId: string }> }
) {
  const user = await getCachedAuthUserMinimal();
  if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limited = await rateLimitPublicApi(req, `call-signal-get:${user.id}`, 180);
  if (limited) return limited;

  const { callId } = await ctx.params;
  const allowed = await requireCallParticipant(user.id, callId);
  if (allowed.error) return allowed.error;

  const after = req.nextUrl.searchParams.get("after");
  const signals = (await listCallSignals(callId, after)).filter((item) => item.fromUserId !== user.id);
  return NextResponse.json({ signals });
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ callId: string }> }
) {
  const user = await getCachedAuthUserMinimal();
  if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limited = await rateLimitPublicApi(req, `call-signal-post:${user.id}`, 180);
  if (limited) return limited;

  const { callId } = await ctx.params;
  const allowed = await requireCallParticipant(user.id, callId);
  if (allowed.error) return allowed.error;

  const body = (await req.json().catch(() => null)) as { payload?: unknown } | null;
  if (!isPayload(body?.payload)) {
    return NextResponse.json({ error: "Invalid signal." }, { status: 400 });
  }

  await pushCallSignal(callId, user.id, body.payload);
  return NextResponse.json({ ok: true });
}
