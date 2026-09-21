import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import { db } from "@/lib/db";

const TAKE = 80;

/** GET /api/mobile/follow/following — users the viewer follows (for DM compose). */
export async function GET(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-following-list", 60);
  if (limited) return limited;

  const authResult = await requireMobileApiUser(req);
  if ("error" in authResult) return authResult.error;

  const q = (req.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 64);
  const qLower = q.toLowerCase();

  const rows = await db.follow.findMany({
    where: { followerId: authResult.user.id },
    take: TAKE,
    orderBy: { createdAt: "desc" },
    include: {
      following: {
        select: {
          id: true,
          username: true,
          name: true,
          image: true,
          deletedAt: true,
        },
      },
    },
  });

  let users = rows
    .map((r) => r.following)
    .filter((u) => u && !u.deletedAt)
    .map((u) => ({
      id: u.id,
      username: u.username,
      name: u.name ?? null,
      image: u.image,
    }));

  if (qLower) {
    users = users
      .map((u) => {
        const username = u.username.toLowerCase();
        const name = (u.name ?? "").toLowerCase();
        let score = 0;
        if (username === qLower || name === qLower) score = 3;
        else if (username.startsWith(qLower) || name.startsWith(qLower)) score = 2;
        else if (username.includes(qLower) || name.includes(qLower)) score = 1;
        return { u, score };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score || a.u.username.localeCompare(b.u.username))
      .map((x) => x.u);
  }

  return NextResponse.json({ users });
}
