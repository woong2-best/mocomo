import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import { db } from "@/lib/db";

const PAGE = 30;

type Tab = "followers" | "following";

function parseTab(raw: string | null): Tab | null {
  if (raw === "followers" || raw === "following") return raw;
  return null;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const limited = await rateLimitPublicApi(req, "mobile-user-connections", 60);
  if (limited) return limited;

  const authResult = await requireMobileApiUser(req);
  if ("error" in authResult) return authResult.error;

  const { username: raw } = await params;
  const username = decodeURIComponent(raw ?? "").trim();
  if (!username || username.length > 64) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const tab = parseTab(req.nextUrl.searchParams.get("type"));
  if (!tab) {
    return NextResponse.json({ error: "type=followers|following 이 필요합니다." }, { status: 400 });
  }

  const cursor = (req.nextUrl.searchParams.get("cursor") ?? "").trim() || undefined;

  const profileUser = await db.user.findFirst({
    where: { username: { equals: username, mode: "insensitive" }, deletedAt: null },
    select: { id: true, username: true },
  });
  if (!profileUser) {
    return NextResponse.json({ error: "사용자를 찾을 수 없습니다." }, { status: 404 });
  }

  const where =
    tab === "followers"
      ? { followingId: profileUser.id }
      : { followerId: profileUser.id };

  const rows = await db.follow.findMany({
    where,
    take: PAGE,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    orderBy: { createdAt: "desc" },
    include: {
      follower: {
        select: { id: true, username: true, name: true, image: true, deletedAt: true },
      },
      following: {
        select: { id: true, username: true, name: true, image: true, deletedAt: true },
      },
    },
  });

  const picked = rows
    .map((r) => (tab === "followers" ? r.follower : r.following))
    .filter((u) => u && !u.deletedAt);

  const userIds = picked.map((u) => u!.id);
  const viewerId = authResult.user.id;

  const viewerFollowRows =
    userIds.length === 0
      ? []
      : await db.follow.findMany({
          where: { followerId: viewerId, followingId: { in: userIds } },
          select: { followingId: true },
        });
  const viewerFollowsSet = new Set(viewerFollowRows.map((r) => r.followingId));

  const users = picked.map((u) => ({
    id: u!.id,
    username: u!.username,
    name: u!.name ?? null,
    image: u!.image,
    viewerFollows: viewerFollowsSet.has(u!.id),
  }));

  const nextCursor = rows.length === PAGE ? rows[rows.length - 1]?.id : null;

  return NextResponse.json({
    users,
    nextCursor,
    profileUsername: profileUser.username,
  });
}
