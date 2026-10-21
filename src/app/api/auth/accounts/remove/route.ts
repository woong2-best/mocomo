import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { rateLimitPublicApi } from "@/lib/api-security";
import {
  resolveDeviceId,
  stampDeviceCookie,
  unparkUserOnDevice,
} from "@/lib/account-switch/device-sessions";

const bodySchema = z.object({
  userId: z.string().min(1).max(64),
});

/** Remove one parked account from this device. Does not end the current session unless it is that user. */
export async function POST(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "auth-accounts-remove", 30);
  if (limited) return limited;

  try {
    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "INVALID_INPUT" }, { status: 400 });
    }

    const deviceId = await resolveDeviceId(req);
    const session = await auth();
    if (session?.user?.id === parsed.data.userId) {
      return NextResponse.json({ ok: false, error: "CURRENT_ACCOUNT" }, { status: 400 });
    }

    await unparkUserOnDevice(deviceId, parsed.data.userId);
    const res = NextResponse.json({ ok: true });
    stampDeviceCookie(res, deviceId);
    return res;
  } catch (e) {
    console.error("[api/auth/accounts/remove]", e);
    return NextResponse.json({ ok: false, error: "SERVER_ERROR" }, { status: 500 });
  }
}
