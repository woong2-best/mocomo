import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  listHostBroadcastSessions,
  prepareHostForNewBroadcast,
  releaseAllHostBroadcastSessions,
} from "@/lib/live-broadcast/session-manager";

/** GET — 내 방송 세션 상태 (디버그·스튜디오) */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const sessions = await listHostBroadcastSessions(session.user.id);
  const live = sessions.filter((s) => s.phase === "LIVE");

  return NextResponse.json({
    ok: true,
    canStartNew: live.length === 0,
    liveCount: live.length,
    sessions,
  });
}

/** POST — 슬롯 정리 (body: { action: "prepare" | "release-all" }) */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  let action = "prepare";
  try {
    const body = await req.json();
    if (body?.action === "release-all") action = "release-all";
  } catch {
    /* default prepare */
  }

  if (action === "release-all") {
    const released = await releaseAllHostBroadcastSessions(session.user.id, "ADMIN_FORCE");
    return NextResponse.json({ ok: true, released });
  }

  const result = await prepareHostForNewBroadcast(session.user.id);
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error, blockingChannelId: result.blockingChannelId },
      { status: 409 }
    );
  }
  return NextResponse.json({ ok: true, released: result.released });
}
