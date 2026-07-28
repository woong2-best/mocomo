import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";

export async function GET(req: NextRequest) {
  const authResult = await requireMobileApiUser(req);
  if ("error" in authResult) return authResult.error;

  const user = await db.user.findUnique({
    where: { id: authResult.user.id },
    select: {
      id: true,
      username: true,
      name: true,
      image: true,
      locale: true,
      profile: { select: { bio: true } },
      _count: { select: { posts: true, followers: true, following: true } },
    },
  });

  if (!user) {
    return NextResponse.json({ error: "사용자를 찾을 수 없습니다." }, { status: 404 });
  }

  return NextResponse.json({
    user: {
      id: user.id,
      username: user.username,
      name: user.name,
      image: user.image,
      locale: user.locale,
      bio: user.profile?.bio ?? null,
      counts: {
        posts: user._count.posts,
        followers: user._count.followers,
        following: user._count.following,
      },
    },
  });
}
