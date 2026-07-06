import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  decodeSessionToken,
  encodeSessionFromPayload,
  readSessionTokenFromCookies,
} from "@/lib/account-switch/server";
import { db } from "@/lib/db";

/** 현재 세션을 기기에 저장해 계정 전환에 사용 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
    }

    let switchToken = await readSessionTokenFromCookies();
    if (!switchToken) {
      return NextResponse.json({ ok: false, error: "NO_SESSION" }, { status: 401 });
    }

    const payload = await decodeSessionToken(switchToken);
    if (!payload || (payload.id as string | undefined) !== session.user.id) {
      return NextResponse.json({ ok: false, error: "INVALID_SESSION" }, { status: 401 });
    }

    const refreshed = await encodeSessionFromPayload(payload as Record<string, unknown>);
    if (refreshed) switchToken = refreshed;

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, username: true, name: true, image: true, isBanned: true },
    });
    if (!user || user.isBanned) {
      return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
    }

    return NextResponse.json({
      ok: true,
      userId: user.id,
      username: user.username,
      name: user.name,
      image: user.image,
      switchToken,
    });
  } catch (e) {
    console.error("[api/auth/accounts/export]", e);
    return NextResponse.json({ ok: false, error: "SERVER_ERROR" }, { status: 500 });
  }
}
