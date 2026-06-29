import { NextResponse } from "next/server";
import { getCachedCurrentUser } from "@/lib/auth";
import { grantLiveWatchGold } from "@/lib/apt/economy/live-gold-service";
import { mirrorEconomyToGameState } from "@/actions/apt-economy";

export async function POST(req: Request) {
  const user = await getCachedCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  let body: { channelId?: string; minutes?: number };
  try {
    body = (await req.json()) as { channelId?: string; minutes?: number };
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const channelId = body.channelId?.trim();
  const minutes = Math.min(60, Math.max(1, Math.floor(Number(body.minutes) || 1)));
  if (!channelId) {
    return NextResponse.json({ error: "채널이 필요합니다." }, { status: 400 });
  }

  const res = await grantLiveWatchGold(user.id, minutes, channelId);
  if ("error" in res && res.error) {
    return NextResponse.json({ error: res.error }, { status: 400 });
  }
  if ("skipped" in res) {
    return NextResponse.json({ ok: true, granted: 0, skipped: true });
  }

  await mirrorEconomyToGameState(user.id);
  return NextResponse.json({ ok: true, granted: "granted" in res ? res.granted : 0 });
}
