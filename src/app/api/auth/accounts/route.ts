import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import {
  listParkedAccounts,
  resolveDeviceId,
  stampDeviceCookie,
} from "@/lib/account-switch/device-sessions";

/** Public profiles of accounts parked on this device. */
export async function GET(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "auth-accounts-list", 60);
  if (limited) return limited;

  try {
    const deviceId = await resolveDeviceId(req);
    const accounts = await listParkedAccounts(deviceId);
    const res = NextResponse.json({ ok: true, accounts });
    stampDeviceCookie(res, deviceId);
    return res;
  } catch (e) {
    console.error("[api/auth/accounts]", e);
    return NextResponse.json({ ok: false, error: "SERVER_ERROR" }, { status: 500 });
  }
}
