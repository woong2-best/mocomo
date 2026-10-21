import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { rateLimitPublicApi } from "@/lib/api-security";
import {
  parkUserOnDevice,
  resolveDeviceId,
  stampDeviceCookie,
} from "@/lib/account-switch/device-sessions";
import { db } from "@/lib/db";
import { displayableImageUrl } from "@/lib/displayable-image-url";

/** Park the current session on this device. Returns public profile only — no JWT. */
export async function GET(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "auth-accounts-export", 40);
  if (limited) return limited;

  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
    }

    const deviceId = await resolveDeviceId(req);
    const parked = await parkUserOnDevice(deviceId, session.user.id);
    if (!parked.ok && parked.error === "NOT_PARKABLE") {
      const res = NextResponse.json({ ok: false, error: "NOT_PARKABLE" }, { status: 403 });
      stampDeviceCookie(res, deviceId);
      return res;
    }
    if (!parked.ok) {
      return NextResponse.json({ ok: false, error: parked.error }, { status: 400 });
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, username: true, name: true, image: true },
    });
    if (!user) {
      return NextResponse.json({ ok: false, error: "USER_NOT_FOUND" }, { status: 404 });
    }

    const res = NextResponse.json({
      ok: true,
      userId: user.id,
      username: user.username,
      name: user.name,
      image: displayableImageUrl(user.image),
    });
    stampDeviceCookie(res, deviceId);
    return res;
  } catch (e) {
    console.error("[api/auth/accounts/export]", e);
    return NextResponse.json({ ok: false, error: "SERVER_ERROR" }, { status: 500 });
  }
}
