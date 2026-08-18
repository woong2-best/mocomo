import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { db } from "@/lib/db";
import { getMobileUserId } from "@/lib/api-mobile-auth";
import { getPostEngagementForUser } from "@/lib/post-engagement";
import { postMediaGallery } from "@/lib/post-media-select";
import { userPublicSelect } from "@/lib/user-public-select";
import { attachWebPaidMediaPlayback } from "@/lib/paid-media-playback";
import { getSubscriptionsForViewer } from "@/lib/content-access";
import { isSubscriptionActive } from "@/lib/creator-subscription";
import { isPaymentsConfigured } from "@/lib/payments";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = await rateLimitPublicApi(req, "mobile-post-detail", 90);
  if (limited) return limited;

  const { id } = await params;
  if (!id || id.length > 64) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const viewerId = await getMobileUserId(req);
  const post = await db.post.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      content: true,
      postType: true,
      createdAt: true,
      isNsfw: true,
      viewCount: true,
      visibility: true,
      instantPurchasePriceKrw: true,
      author: {
        select: {
          ...userPublicSelect,
          creatorSubscriptionPriceKrw: true,
        },
      },
      media: postMediaGallery,
      _count: { select: { likes: true, comments: true, votes: true, reposts: true } },
    },
  });

  if (!post) {
    return NextResponse.json({ error: "게시물을 찾을 수 없습니다." }, { status: 404 });
  }

  const engagement = viewerId
    ? await getPostEngagementForUser(viewerId, [post.id])
    : { likedIds: [] as string[], starredIds: [] as string[], repostedIds: [] as string[] };

  const [gated] = await attachWebPaidMediaPlayback(
    [{ ...post, authorId: post.author.id }],
    viewerId
  );

  const subscriptions = await getSubscriptionsForViewer(viewerId, [post.author.id]);
  const sub = subscriptions.get(post.author.id);

  return NextResponse.json({
    post: {
      ...(gated ?? post),
      createdAt: post.createdAt.toISOString(),
      liked: engagement.likedIds.includes(post.id),
      starred: engagement.starredIds.includes(post.id),
      subscribedToAuthor: sub ? isSubscriptionActive(sub) : false,
      paymentsEnabled: isPaymentsConfigured(),
    },
  });
}
