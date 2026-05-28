import { NextRequest, NextResponse } from "next/server";
import { WebhookReceiver } from "livekit-server-sdk";
import { db } from "@/lib/db";
import { egressFileToPublicUrl } from "@/lib/livekit-egress";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  if (!apiKey || !apiSecret) {
    return NextResponse.json({ error: "LiveKit not configured" }, { status: 503 });
  }

  const body = await req.text();
  const authHeader = req.headers.get("authorization") ?? undefined;

  try {
    const receiver = new WebhookReceiver(apiKey, apiSecret);
    const skipAuth = process.env.NODE_ENV === "development" && process.env.LIVEKIT_WEBHOOK_SKIP_AUTH === "1";
    const event = await receiver.receive(body, authHeader, skipAuth);

    if (event.event === "egress_ended" && event.egressInfo) {
      const info = event.egressInfo;
      const roomName = info.roomName;
      if (roomName) {
        const fileResult = info.fileResults?.[0];
        const location = fileResult?.location || fileResult?.filename;
        if (location) {
          const vodUrl = egressFileToPublicUrl(location);
          await db.voiceChannel.updateMany({
            where: { id: roomName },
            data: { vodUrl, egressId: null },
          });
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[livekit/webhook]", e);
    return NextResponse.json({ error: "webhook rejected" }, { status: 400 });
  }
}
