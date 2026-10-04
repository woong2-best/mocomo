import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import { searchUsersForStreamerStudio } from "@/lib/live-broadcast/streamer-studio";

export async function GET(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-live-studio-search", 30);
  if (limited) return limited;

  const auth = await requireMobileApiUser(req);
  if ("error" in auth) return auth.error;

  const q = req.nextUrl.searchParams.get("q") ?? "";
  const users = await searchUsersForStreamerStudio(auth.user.id, auth.user.id, q);
  return NextResponse.json({
    users: users.map((user) => ({
      id: user.id,
      username: user.username,
      name: user.name,
      image: user.image,
      currentRole: user.currentRole,
      isBanned: user.isBanned,
    })),
  });
}
