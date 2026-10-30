import { NextResponse } from "next/server";
import { getCachedSession } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  enableStreamingOnProfile,
  type ProfileStreamingSocialId,
} from "@/lib/profile-social";
import { revalidateProfileStreamingForUser } from "@/lib/revalidate-profile-streaming";
import {
  existingPlatformAccountWarning,
  findActivePlatformSlot,
  startOAuthConnect,
} from "@/lib/streaming-accounts/service";
import { isConnectablePlatform } from "@/lib/streaming-accounts/types";
import { safeStreamingReturnTo } from "@/lib/streaming-accounts/oauth-state";

function asStreamingSocialId(platform: string): ProfileStreamingSocialId | null {
  if (platform === "YOUTUBE") return "youtube";
  if (platform === "TWITCH") return "twitch";
  return null;
}

export async function GET(
  req: Request,
  ctx: { params: Promise<{ platform: string }> }
) {
  const returnTo = safeStreamingReturnTo(new URL(req.url).searchParams.get("returnTo"));
  const session = await getCachedSession();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL(`/auth/signin?callbackUrl=${encodeURIComponent(returnTo)}`, req.url));
  }

  const { platform: raw } = await ctx.params;
  const platform = raw.toUpperCase();
  if (!isConnectablePlatform(platform)) {
    const dest = new URL(returnTo, req.url);
    dest.searchParams.set("error", "unsupported");
    return NextResponse.redirect(dest);
  }
  const socialId = asStreamingSocialId(platform);
  if (!socialId) {
    const dest = new URL(returnTo, req.url);
    dest.searchParams.set("error", "unsupported");
    return NextResponse.redirect(dest);
  }

  const slot = await findActivePlatformSlot(session.user.id, platform);
  if (slot) {
    const verified = await db.connectedStreamingAccount.findFirst({
      where: { id: slot.id, verified: true, revokedAt: null },
      select: { id: true },
    });
    if (verified) {
      await enableStreamingOnProfile(session.user.id, socialId);
      await revalidateProfileStreamingForUser(session.user.id);
      return NextResponse.redirect(new URL(returnTo, req.url));
    }
    const dest = new URL(returnTo, req.url);
    dest.searchParams.set("error", encodeURIComponent(existingPlatformAccountWarning(platform)));
    return NextResponse.redirect(dest);
  }

  const result = startOAuthConnect(session.user.id, platform, {
    returnTo,
    showOnProfile: true,
  });
  if ("error" in result) {
    const dest = new URL(returnTo, req.url);
    dest.searchParams.set("error", encodeURIComponent(result.error ?? "Something went wrong."));
    return NextResponse.redirect(dest);
  }

  return NextResponse.redirect(result.url);
}
