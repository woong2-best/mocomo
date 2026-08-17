import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { db } from "@/lib/db";
import { getMobileUserId } from "@/lib/api-mobile-auth";
import { postMediaPreview } from "@/lib/post-media-select";
import { userPublicSelect } from "@/lib/user-public-select";
import { isPaymentsConfigured } from "@/lib/payments";
import { isSubscriptionActive } from "@/lib/creator-subscription";
import { attachWebPaidMediaPlayback } from "@/lib/paid-media-playback";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const limited = await rateLimitPublicApi(req, "mobile-user-profile", 60);
  if (limited) return limited;

  const { username: raw } = await params;
  const username = decodeURIComponent(raw ?? "").trim();
  if (!username || username.length > 64) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const viewerId = await getMobileUserId(req);
  const user = await db.user.findFirst({
    where: { username: { equals: username, mode: "insensitive" } },
    select: {
      id: true,
      username: true,
      name: true,
      image: true,
      createdAt: true,
      countryCode: true,
      creatorSubscriptionPriceKrw: true,
      profile: { select: { bio: true, bannerUrl: true, bannerVideoUrl: true } },
      _count: { select: { posts: true, followers: true, following: true } },
    },
  });

  if (!user) {
    return NextResponse.json({ error: "사용자를 찾을 수 없습니다." }, { status: 404 });
  }

  let following = false;
  let subscribed = false;
  if (viewerId && viewerId !== user.id) {
    const [edge, sub] = await Promise.all([
      db.follow.findUnique({
        where: {
          followerId_followingId: { followerId: viewerId, followingId: user.id },
        },
        select: { id: true },
      }),
      db.subscription.findUnique({
        where: {
          subscriberId_creatorId: { subscriberId: viewerId, creatorId: user.id },
        },
        select: { status: true, currentPeriodEnd: true, subscribedSince: true },
      }),
    ]);
    following = !!edge;
    subscribed = sub ? isSubscriptionActive(sub) : false;
  }

  const posts = await db.post.findMany({
    where: { authorId: user.id },
    orderBy: { createdAt: "desc" },
    take: 40,
    select: {
      id: true,
      title: true,
      content: true,
      postType: true,
      createdAt: true,
      isNsfw: true,
      visibility: true,
      instantPurchasePriceKrw: true,
      media: postMediaPreview,
      _count: { select: { likes: true, comments: true } },
      author: { select: userPublicSelect },
    },
  });

  const gatedPosts = await attachWebPaidMediaPlayback(
    posts.map((p) => ({ ...p, authorId: p.author.id })),
    viewerId
  );

  return NextResponse.json({
    user: {
      id: user.id,
      username: user.username,
      name: user.name,
      image: user.image,
      bio: user.profile?.bio ?? null,
      bannerUrl: user.profile?.bannerUrl ?? null,
      bannerVideoUrl: user.profile?.bannerVideoUrl ?? null,
      countryCode: user.countryCode ?? null,
      createdAt: user.createdAt.toISOString(),
      counts: {
        posts: user._count.posts,
        followers: user._count.followers,
        following: user._count.following,
      },
      following,
      subscribed,
      isSelf: viewerId === user.id,
      paymentsEnabled: isPaymentsConfigured(),
      creatorSubscriptionPriceKrw: user.creatorSubscriptionPriceKrw,
    },
    posts: gatedPosts.map((p) => ({
      ...p,
      createdAt: p.createdAt.toISOString(),
    })),
  });
}
