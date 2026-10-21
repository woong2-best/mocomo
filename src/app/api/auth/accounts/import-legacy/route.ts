import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { rateLimitPublicApi } from "@/lib/api-security";
import { validateSwitchToken } from "@/lib/account-switch/server";
import {
  parkUserOnDevice,
  resolveDeviceId,
  stampDeviceCookie,
} from "@/lib/account-switch/device-sessions";

const bodySchema = z.object({
  accounts: z
    .array(
      z.object({
        userId: z.string().min(1).max(64),
        switchToken: z.string().min(1).max(8000),
      })
    )
    .max(10),
});

/** One-time import of JWTs that used to live in localStorage. Tokens are discarded after park. */
export async function POST(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "auth-accounts-import", 10);
  if (limited) return limited;

  try {
    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "INVALID_INPUT" }, { status: 400 });
    }

    const deviceId = await resolveDeviceId(req);
    let imported = 0;
    for (const account of parsed.data.accounts) {
      const validated = await validateSwitchToken(account.userId, account.switchToken);
      if (!validated.ok) continue;
      const parked = await parkUserOnDevice(deviceId, validated.user.id);
      if (parked.ok) imported += 1;
    }

    const res = NextResponse.json({ ok: true, imported });
    stampDeviceCookie(res, deviceId);
    return res;
  } catch (e) {
    console.error("[api/auth/accounts/import-legacy]", e);
    return NextResponse.json({ ok: false, error: "SERVER_ERROR" }, { status: 500 });
  }
}
