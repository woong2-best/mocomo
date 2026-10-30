import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { rateLimitPublicApi } from "@/lib/api-security";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import {
  PROFILE_SOCIAL_CONNECT_PATH,
  enableStreamingOnProfile,
  getProfileConnectAvailability,
} from "@/lib/profile-social";
import { mintProfileSocialTicket } from "@/lib/profile-social-ticket";
import { MOBILE_SOCIAL_RETURN_TO } from "@/lib/profile-social-ticket";
import { db } from "@/lib/db";
import { revalidateProfileStreamingForUser } from "@/lib/revalidate-profile-streaming";
import {
  findActivePlatformSlot,
  startOAuthConnect,
} from "@/lib/streaming-accounts/service";

const bodySchema = z.object({
  provider: z.enum([
    "youtube",
    "twitch",
    "facebook",
    "instagram",
    "twitter",
    "discord",
    "naver",
    "tiktok",
  ]),
});

function appOrigin() {
  return (
    process.env.AUTH_URL?.trim() ||
    process.env.NEXTAUTH_URL?.trim() ||
    "https://mocomo.net"
  ).replace(/\/$/, "");
}

export async function POST(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-profile-social-connect", 20);
  if (limited) return limited;

  const auth = await requireMobileApiUser(req);
  if ("error" in auth) return auth.error;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const origin = appOrigin();
  const provider = parsed.data.provider;

  if (provider === "youtube" || provider === "twitch") {
    const platform = provider === "youtube" ? "YOUTUBE" : "TWITCH";
    const slot = await findActivePlatformSlot(auth.user.id, platform);
    if (slot) {
      const verified = await db.connectedStreamingAccount.findFirst({
        where: { id: slot.id, verified: true, revokedAt: null },
        select: { id: true },
      });
      if (verified) {
        await enableStreamingOnProfile(auth.user.id, provider);
        await revalidateProfileStreamingForUser(auth.user.id);
        return NextResponse.json({ url: `${origin}${MOBILE_SOCIAL_RETURN_TO}` });
      }
    }
    const result = startOAuthConnect(auth.user.id, platform, {
      returnTo: MOBILE_SOCIAL_RETURN_TO,
      showOnProfile: true,
    });
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ url: result.url });
  }

  const available = getProfileConnectAvailability();
  if (!available[provider]) {
    return NextResponse.json({ error: "This connection is not available." }, { status: 503 });
  }

  const ticket = mintProfileSocialTicket({
    userId: auth.user.id,
    provider,
  });
  const start = new URL(PROFILE_SOCIAL_CONNECT_PATH[provider], origin);
  start.searchParams.set("link", ticket);
  return NextResponse.json({ url: start.toString() });
}
