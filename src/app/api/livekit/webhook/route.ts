import { NextRequest, NextResponse } from "next/server";
import { WebhookReceiver } from "livekit-server-sdk";
import { onLivekitObsJoined, onLivekitObsLeft } from "@/lib/livekit-ingest-coordinator";

export const runtime = "nodejs";

/** LiveKit 웹훅 — OBS 입장/퇴장 시 LIVE 동기화 */
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
    const skipAuth =
      process.env.NODE_ENV === "development" && process.env.LIVEKIT_WEBHOOK_SKIP_AUTH === "1";
    const event = await receiver.receive(body, authHeader, skipAuth);

    const room = event.room?.name ?? "";
    const identity = event.participant?.identity ?? "";

    if (room && identity) {
      if (event.event === "participant_joined") {
        void onLivekitObsJoined(room, identity).catch((e) =>
          console.error("[livekit/webhook] join", e)
        );
      }
      if (event.event === "participant_left") {
        void onLivekitObsLeft(room, identity).catch((e) =>
          console.error("[livekit/webhook] left", e)
        );
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[livekit/webhook]", e);
    return NextResponse.json({ error: "webhook rejected" }, { status: 400 });
  }
}
