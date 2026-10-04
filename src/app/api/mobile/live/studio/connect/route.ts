import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import {
  existingPlatformAccountWarning,
  findActivePlatformSlot,
  startOAuthConnect,
} from "@/lib/streaming-accounts/service";
import { isConnectablePlatform } from "@/lib/streaming-accounts/types";

export async function POST(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-live-studio-connect", 10);
  if (limited) return limited;

  const auth = await requireMobileApiUser(req, { writeKind: "default" });
  if ("error" in auth) return auth.error;

  let body: { platform?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const platform = body.platform?.trim().toUpperCase() ?? "";
  if (!isConnectablePlatform(platform)) {
    return NextResponse.json({ error: "Unsupported platform." }, { status: 400 });
  }

  const slot = await findActivePlatformSlot(auth.user.id, platform);
  if (slot) {
    return NextResponse.json(
      { error: existingPlatformAccountWarning(platform) },
      { status: 409 }
    );
  }

  const result = startOAuthConnect(auth.user.id, platform);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ url: result.url });
}
