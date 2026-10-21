import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth, signOut } from "@/lib/auth";
import { rateLimitPublicApi } from "@/lib/api-security";
import {
  activateParkedUser,
  clearDeviceCookie,
  nextParkedUserId,
  resolveDeviceId,
  stampDeviceCookie,
  unparkAllOnDevice,
  unparkUserOnDevice,
} from "@/lib/account-switch/device-sessions";
import { clearSessionCookiesOnResponse } from "@/lib/account-switch/session-cookies";
import { setSessionCookieOnResponse } from "@/lib/account-switch/server";
import {
  ADD_ACCOUNT_COOKIE,
  ADD_ACCOUNT_SOURCE_USER_COOKIE,
} from "@/lib/account-switch/constants";

const bodySchema = z.object({
  scope: z.enum(["this", "device"]).default("this"),
  autoSwitch: z.boolean().optional(),
});

const useSecureCookies = process.env.NODE_ENV === "production";

function clearAddAccountCookies(res: NextResponse) {
  res.cookies.set(ADD_ACCOUNT_COOKIE, "", {
    path: "/",
    maxAge: 0,
    sameSite: "lax",
    secure: useSecureCookies,
  });
  res.cookies.set(ADD_ACCOUNT_SOURCE_USER_COOKIE, "", {
    path: "/",
    maxAge: 0,
    sameSite: "lax",
    secure: useSecureCookies,
  });
}

/** Log out this account (optionally switch to another parked session) or wipe the device. */
export async function POST(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "auth-accounts-logout", 20);
  if (limited) return limited;

  try {
    const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
    const scope = parsed.success ? parsed.data.scope : "this";
    const autoSwitch = parsed.success ? parsed.data.autoSwitch !== false : true;

    const session = await auth();
    const userId = session?.user?.id ?? null;
    const deviceId = await resolveDeviceId(req);

    if (scope === "this" && autoSwitch && userId) {
      await unparkUserOnDevice(deviceId, userId);
      const nextId = await nextParkedUserId(deviceId, userId);
      if (nextId) {
        const activated = await activateParkedUser(deviceId, nextId);
        if (activated.ok) {
          const res = NextResponse.json({
            ok: true,
            switched: true,
            user: activated.user,
          });
          setSessionCookieOnResponse(res, activated.token);
          stampDeviceCookie(res, deviceId);
          clearAddAccountCookies(res);
          return res;
        }
      }
    }

    try {
      await signOut({ redirect: false });
    } catch (e) {
      console.error("[api/auth/accounts/logout] signOut", e);
    }

    if (scope === "device") {
      await unparkAllOnDevice(deviceId);
      const res = NextResponse.json({ ok: true, switched: false });
      clearSessionCookiesOnResponse(res);
      clearDeviceCookie(res);
      clearAddAccountCookies(res);
      return res;
    }

    if (userId) {
      await unparkUserOnDevice(deviceId, userId);
    }

    const res = NextResponse.json({ ok: true, switched: false });
    clearSessionCookiesOnResponse(res);
    stampDeviceCookie(res, deviceId);
    clearAddAccountCookies(res);
    return res;
  } catch (e) {
    console.error("[api/auth/accounts/logout]", e);
    return NextResponse.json({ ok: false, error: "SERVER_ERROR" }, { status: 500 });
  }
}
