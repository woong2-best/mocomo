import { NextRequest, NextResponse } from "next/server";
import { WebhookReceiver } from "livekit-server-sdk";

export const runtime = "nodejs";

/** LiveKit 웹훅 (다시보기 미사용 — 서명 검증·확장용) */
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
    await receiver.receive(body, authHeader, skipAuth);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[livekit/webhook]", e);
    return NextResponse.json({ error: "webhook rejected" }, { status: 400 });
  }
}
