import { NextResponse } from "next/server";
import { getCachedSession } from "@/lib/auth";
import { isConnectablePlatform } from "@/lib/streaming-accounts/types";
import { startOAuthConnect } from "@/lib/streaming-accounts/service";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ platform: string }> }
) {
  const session = await getCachedSession();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/auth/signin?callbackUrl=/settings/streaming-accounts", _req.url));
  }

  const { platform: raw } = await ctx.params;
  const platform = raw.toUpperCase();
  if (!isConnectablePlatform(platform)) {
    return NextResponse.redirect(
      new URL("/settings/streaming-accounts?error=unsupported", _req.url)
    );
  }

  const result = startOAuthConnect(session.user.id, platform);
  if ("error" in result) {
    return NextResponse.redirect(
      new URL(
        `/settings/streaming-accounts?error=${encodeURIComponent(result.error)}`,
        _req.url
      )
    );
  }

  return NextResponse.redirect(result.url);
}
