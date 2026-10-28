import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { rateLimitPublicApi } from "@/lib/api-security";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import {
  PROFILE_SOCIAL_CONNECT_PATH,
  getProfileSocialConnectAvailability,
} from "@/lib/profile-social";
import { mintProfileSocialTicket } from "@/lib/profile-social-ticket";

const bodySchema = z.object({
  provider: z.enum(["facebook", "instagram", "twitter", "naver"]),
});

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

  const available = getProfileSocialConnectAvailability();
  if (!available[parsed.data.provider]) {
    return NextResponse.json({ error: "This connection is not available." }, { status: 503 });
  }

  const ticket = mintProfileSocialTicket({
    userId: auth.user.id,
    provider: parsed.data.provider,
  });
  const origin = req.nextUrl.origin;
  const start = new URL(PROFILE_SOCIAL_CONNECT_PATH[parsed.data.provider], origin);
  start.searchParams.set("link", ticket);
  return NextResponse.json({ url: start.toString() });
}
