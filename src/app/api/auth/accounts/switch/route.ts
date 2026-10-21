import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { errorText } from "@/lib/i18n/error-text";
import { rateLimitPublicApi } from "@/lib/api-security";
import { setSessionCookieOnResponse } from "@/lib/account-switch/server";
import {
  activateParkedUser,
  parkUserOnDevice,
  resolveDeviceId,
  stampDeviceCookie,
} from "@/lib/account-switch/device-sessions";

const bodySchema = z.object({
  userId: z.string().min(1).max(64),
});

export async function POST(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "auth-accounts-switch", 30);
  if (limited) return limited;

  try {
    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "INVALID_INPUT" }, { status: 400 });
    }

    const deviceId = await resolveDeviceId(req);
    const session = await auth();
    if (session?.user?.id && session.user.id !== parsed.data.userId) {
      await parkUserOnDevice(deviceId, session.user.id);
    }

    const activated = await activateParkedUser(deviceId, parsed.data.userId);
    if (!activated.ok) {
      const status =
        activated.error === "BANNED"
          ? 403
          : activated.error === "USER_NOT_FOUND"
            ? 404
            : 401;
      const res = NextResponse.json(
        { ok: false, error: errorText(activated.error) },
        { status }
      );
      stampDeviceCookie(res, deviceId);
      return res;
    }

    const res = NextResponse.json({
      ok: true,
      user: activated.user,
    });
    setSessionCookieOnResponse(res, activated.token);
    stampDeviceCookie(res, deviceId);
    return res;
  } catch (e) {
    console.error("[api/auth/accounts/switch]", e);
    return NextResponse.json({ ok: false, error: "SERVER_ERROR" }, { status: 500 });
  }
}
