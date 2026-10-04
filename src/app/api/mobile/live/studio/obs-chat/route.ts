import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import { mintStudioObsChatForUser } from "@/lib/live-external/studio-obs-url";

export async function GET(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-live-studio-obs", 20);
  if (limited) return limited;

  const auth = await requireMobileApiUser(req);
  if ("error" in auth) return auth.error;

  const res = await mintStudioObsChatForUser(auth.user.id);
  if ("error" in res && res.error) {
    return NextResponse.json({ error: res.error }, { status: 400 });
  }
  if (!("chatUrl" in res) || !res.chatUrl) {
    return NextResponse.json({ chatUrl: null, empty: true });
  }
  return NextResponse.json({ chatUrl: res.chatUrl, empty: false });
}
