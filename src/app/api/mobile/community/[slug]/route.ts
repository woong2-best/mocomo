import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { getMobileUserId } from "@/lib/api-mobile-auth";
import {
  getCommunityBrandingPermissions,
  updateCommunityBrandingForUser,
} from "@/lib/community-mobile-mutate";
import { normalizeCommunitySlugParam } from "@/lib/community-slug";
import { db } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const limited = await rateLimitPublicApi(req, "mobile-community-detail", 60);
  if (limited) return limited;

  const viewerId = await getMobileUserId(req);
  const { slug: raw } = await params;
  const slug = normalizeCommunitySlugParam(raw);
  if (!slug || slug.length > 80) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const community = await db.community.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      iconUrl: true,
      bannerUrl: true,
      category: true,
      isNsfw: true,
      memberCount: true,
      joinMode: true,
      creatorId: true,
      createdAt: true,
    },
  });

  if (!community) {
    return NextResponse.json({ error: "커뮤니티를 찾을 수 없습니다." }, { status: 404 });
  }

  let membership: { role: string } | null = null;
  if (viewerId) {
    membership = await db.communityMember.findUnique({
      where: { communityId_userId: { communityId: community.id, userId: viewerId } },
      select: { role: true },
    });
  }

  const branding = await getCommunityBrandingPermissions(
    community.id,
    viewerId,
    community.creatorId
  );

  const posts = await db.post.findMany({
    where: { communityId: community.id },
    take: 20,
    orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      title: true,
      content: true,
      createdAt: true,
      isNsfw: true,
      author: { select: { id: true, username: true, image: true } },
      _count: { select: { likes: true, comments: true } },
    },
  });

  return NextResponse.json({
    item: {
      id: community.id,
      slug: community.slug,
      name: community.name,
      description: community.description,
      iconUrl: community.iconUrl,
      bannerUrl: community.bannerUrl,
      category: community.category,
      isNsfw: community.isNsfw,
      memberCount: community.memberCount,
      joinMode: community.joinMode,
      createdAt: community.createdAt.toISOString(),
      isMember: !!membership,
      role: membership?.role ?? null,
      isOwner: branding.isOwner,
      canEditIcon: branding.canEditIcon,
      canEditBanner: branding.canEditBanner,
      posts: posts.map((p) => ({
        id: p.id,
        title: p.title,
        content: p.content.slice(0, 280),
        createdAt: p.createdAt.toISOString(),
        isNsfw: p.isNsfw,
        author: p.author,
        likeCount: p._count.likes,
        commentCount: p._count.comments,
      })),
    },
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const limited = await rateLimitPublicApi(req, "mobile-community-patch", 20);
  if (limited) return limited;

  const userId = await getMobileUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { slug: raw } = await params;
  const slug = normalizeCommunitySlugParam(raw);
  if (!slug || slug.length > 80) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  let body: { iconUrl?: string | null; bannerUrl?: string | null };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const result = await updateCommunityBrandingForUser(userId, slug, {
    iconUrl: body.iconUrl,
    bannerUrl: body.bannerUrl,
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status ?? 400 });
  }

  return NextResponse.json({
    success: true,
    iconUrl: result.iconUrl,
    bannerUrl: result.bannerUrl,
  });
}
