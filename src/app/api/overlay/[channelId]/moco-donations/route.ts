import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyOverlayToken } from "@/lib/live-external/overlay-token";
import { rateLimitPublicApi } from "@/lib/api-security";
import { assertOverlayBroadcastAccess } from "@/lib/live-external/overlay-access";
import { toMocoDonationPayload } from "@/lib/moco-donation/payload";
import {
  completeMocoDonation,
  markMocoDonationPlaying,
} from "@/lib/moco-donation/service";
import { relayMocoDonationEvent } from "@/lib/moco-donation-socket-relay";

/** OBS MOCO 도네이션 큐 — 폴링 폴백 + 재생 상태 갱신 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ channelId: string }> }
) {
  const limited = await rateLimitPublicApi(req, "overlay-moco-donations", 90);
  if (limited) return limited;

  const { channelId } = await params;
  const token = req.nextUrl.searchParams.get("token") ?? "";

  const verified = verifyOverlayToken(token, { channelId, kind: "donation" });
  if (!verified.ok) {
    return NextResponse.json({ error: verified.error }, { status: 401 });
  }

  const broadcastAccess = await assertOverlayBroadcastAccess(channelId, verified.payload);
  if (!broadcastAccess.ok) {
    return NextResponse.json({ error: broadcastAccess.error }, { status: broadcastAccess.status });
  }

  const sinceMs = Number(req.nextUrl.searchParams.get("since") ?? "0");
  const since = Number.isFinite(sinceMs) && sinceMs > 0 ? new Date(sinceMs) : undefined;

  const rows = await db.mocoDonation.findMany({
    where: {
      channelId,
      status: { in: ["PENDING", "PLAYING"] },
      ...(since ? { createdAt: { gt: since } } : {}),
    },
    orderBy: { createdAt: "asc" },
    take: 30,
    include: { user: { select: { username: true } } },
  });

  const playing = await db.mocoDonation.findFirst({
    where: { channelId, status: "PLAYING" },
    include: { user: { select: { username: true } } },
  });

  return NextResponse.json({
    ok: true,
    queue: rows.filter((r) => r.status === "PENDING").map(toMocoDonationPayload),
    playing: playing ? toMocoDonationPayload(playing) : null,
    donations: rows.map(toMocoDonationPayload),
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ channelId: string }> }
) {
  const limited = await rateLimitPublicApi(req, "overlay-moco-donations-write", 120);
  if (limited) return limited;

  const { channelId } = await params;
  let body: { token?: string; donation_id?: string; action?: "playing" | "complete" };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const token = body.token?.trim() ?? "";
  const verified = verifyOverlayToken(token, { channelId, kind: "donation" });
  if (!verified.ok) {
    return NextResponse.json({ error: verified.error }, { status: 401 });
  }

  const broadcastAccess = await assertOverlayBroadcastAccess(channelId, verified.payload);
  if (!broadcastAccess.ok) {
    return NextResponse.json({ error: broadcastAccess.error }, { status: broadcastAccess.status });
  }

  const donationId = body.donation_id?.trim();
  if (!donationId) {
    return NextResponse.json({ error: "donation_id가 필요합니다." }, { status: 400 });
  }

  if (body.action === "playing") {
    const updated = await markMocoDonationPlaying(donationId, channelId);
    if (!updated) {
      return NextResponse.json({ error: "재생 시작할 수 없습니다." }, { status: 400 });
    }
    const payload = toMocoDonationPayload(updated);
    void relayMocoDonationEvent(channelId, { event: "new_donation", donation: payload });
    return NextResponse.json({ ok: true, donation: payload });
  }

  if (body.action === "complete") {
    const updated = await completeMocoDonation(donationId, channelId);
    if (!updated) {
      return NextResponse.json({ error: "완료 처리할 수 없습니다." }, { status: 400 });
    }
    const payload = toMocoDonationPayload(updated);
    void relayMocoDonationEvent(channelId, { event: "donation_completed", donation: payload });
    return NextResponse.json({ ok: true, donation: payload });
  }

  return NextResponse.json({ error: "action이 필요합니다." }, { status: 400 });
}
