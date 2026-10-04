import { errorText } from "@/lib/i18n/error-text";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { rateLimitPublicApi } from "@/lib/api-security";
import { assertOverlayBroadcastAccess } from "@/lib/live-external/overlay-access";
import { toMocoDonationPayload } from "@/lib/moco-donation/payload";
import { completeMocoDonation, markMocoDonationPlaying } from "@/lib/moco-donation/service";
import { relayMocoDonationEvent } from "@/lib/moco-donation-socket-relay";
import { authorizeStudioOverlay } from "@/lib/live-external/studio-obs-url";

export const dynamic = "force-dynamic";

/** Live Studio OBS video and SFX tips. Follows the host's current broadcast. */
export async function GET(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "overlay-studio-moco", 90);
  if (limited) return limited;

  const token = req.nextUrl.searchParams.get("token") ?? "";
  const auth = await authorizeStudioOverlay(token, "donation");
  if (!auth.ok) {
    return NextResponse.json({ error: errorText(auth.error) }, { status: 401 });
  }
  if (!auth.channel) return NextResponse.json({ ok: true, donations: [], queue: [], playing: null });

  const access = await assertOverlayBroadcastAccess(auth.channel.id, auth.payload);
  if (!access.ok) return NextResponse.json({ ok: true, donations: [], queue: [], playing: null });

  const channelId = auth.channel.id;
  const rows = await db.mocoDonation.findMany({
    where: { channelId, status: { in: ["PENDING", "PLAYING"] } },
    orderBy: { createdAt: "asc" },
    take: 30,
    include: { user: { select: { username: true } } },
  });
  const playing = rows.find((row) => row.status === "PLAYING") ?? null;
  return NextResponse.json({
    ok: true,
    queue: rows.filter((row) => row.status === "PENDING").map(toMocoDonationPayload),
    playing: playing ? toMocoDonationPayload(playing) : null,
    donations: rows.map(toMocoDonationPayload),
  });
}

export async function POST(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "overlay-studio-moco-write", 120);
  if (limited) return limited;

  let body: { token?: string; donation_id?: string; action?: "playing" | "complete" };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const auth = await authorizeStudioOverlay(body.token?.trim() ?? "", "donation");
  if (!auth.ok) {
    return NextResponse.json({ error: errorText(auth.error) }, { status: 401 });
  }
  if (!auth.channel) return NextResponse.json({ error: "Not found." }, { status: 400 });

  const access = await assertOverlayBroadcastAccess(auth.channel.id, auth.payload);
  if (!access.ok) {
    return NextResponse.json({ error: errorText(access.error) }, { status: access.status });
  }

  const donationId = body.donation_id?.trim();
  if (!donationId) return NextResponse.json({ error: "Required field missing." }, { status: 400 });

  const channelId = auth.channel.id;
  if (body.action === "playing") {
    const updated = await markMocoDonationPlaying(donationId, channelId);
    if (!updated) return NextResponse.json({ error: "Not found." }, { status: 400 });
    const payload = toMocoDonationPayload(updated);
    void relayMocoDonationEvent(channelId, { event: "new_donation", donation: payload });
    return NextResponse.json({ ok: true, donation: payload });
  }
  if (body.action === "complete") {
    const updated = await completeMocoDonation(donationId, channelId);
    if (!updated) return NextResponse.json({ error: "Not found." }, { status: 400 });
    const payload = toMocoDonationPayload(updated);
    void relayMocoDonationEvent(channelId, { event: "donation_completed", donation: payload });
    return NextResponse.json({ ok: true, donation: payload });
  }
  return NextResponse.json({ error: "Required field missing." }, { status: 400 });
}
