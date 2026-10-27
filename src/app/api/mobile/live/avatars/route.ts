import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { getAvatarPublicProfiles } from "@/lib/ai-live/avatar-profiles";

export const dynamic = "force-dynamic";

/** Public faces for the four always-on live accounts — same users as /u/zelie and friends. */
export async function GET(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-live-avatars", 60);
  if (limited) return limited;

  const hosts = await getAvatarPublicProfiles().catch(() => null);
  return NextResponse.json({ hosts });
}
