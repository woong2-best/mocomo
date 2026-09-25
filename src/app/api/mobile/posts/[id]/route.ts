import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { rateLimitPublicApi } from "@/lib/api-security";
import { FEED_POSTS_CACHE_TAG } from "@/lib/cache-tags";
import { db } from "@/lib/db";
import { getMobileUserId, requireMobileApiUser } from "@/lib/api-mobile-auth";
import { COMMUNITY_FEED_PATH } from "@/lib/site-routes";
import { getPostEngagementForUser } from "@/lib/post-engagement";
import { postMediaGallery } from "@/lib/post-media-select";
import { userPublicSelect } from "@/lib/user-public-select";
import { attachWebPaidMediaPlayback } from "@/lib/paid-media-playback";
import { getSubscriptionsForViewer } from "@/lib/content-access";
import { isSubscriptionActive } from "@/lib/creator-subscription";
import { isPaymentsConfigured } from "@/lib/payments";
import { canViewNsfwResource } from "@/lib/nsfw-viewer-access";
import { redactQnaPublicPost } from "@/lib/anonymous-post";

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
      isAnonymous: true,
      viewCount: true,
      visibility: true,
      communityId: true,
      instantPurchasePriceKrw: true,
      author: {
        select: {
          ...userPublicSelect,
          creatorSubscriptionPriceKrw: true,
        },
      },
      community: { select: { slug: true, name: true } },
      media: postMediaGallery,
      _count: { select: { likes: true, comments: true, votes: true, reposts: true } },
    },
  });

  if (!post) {
    return NextResponse.json({ error: "게시물을 찾을 수 없습니다." }, { status: 404 });
  }

  if (
    post.isNsfw &&
    !(await canViewNsfwResource({
      viewerId,
      ownerId: post.author.id,
      isNsfw: true,
    }))
  ) {
    return NextResponse.json({ error: "성인 콘텐츠는 열람할 수 없습니다." }, { status: 403 });
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

  const payload = gated ?? post;
  const publicPost = redactQnaPublicPost(
    { ...payload, isAnonymous: post.isAnonymous, communityId: post.communityId },
    viewerId
  );

  return NextResponse.json({
    post: {
      ...publicPost,
      createdAt: post.createdAt.toISOString(),
      liked: engagement.likedIds.includes(post.id),
      starred: engagement.starredIds.includes(post.id),
      subscribedToAuthor: sub ? isSubscriptionActive(sub) : false,
      paymentsEnabled: isPaymentsConfigured(),
    },
  });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = await rateLimitPublicApi(req, "mobile-post-delete", 30);
  if (limited) return limited;

  const { id: postId } = await params;
  if (!postId || postId.length > 64) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const auth = await requireMobileApiUser(req, { writeKind: "default" });
  if ("error" in auth) return auth.error;

  const post = await db.post.findUnique({
    where: { id: postId },
    select: { id: true, authorId: true, author: { select: { username: true } } },
  });
  if (!post) {
    return NextResponse.json({ error: "게시물을 찾을 수 없습니다." }, { status: 404 });
  }
  if (post.authorId !== auth.user.id) {
    return NextResponse.json({ error: "본인 게시물만 삭제할 수 있습니다." }, { status: 403 });
  }

  await db.report.deleteMany({ where: { postId } });
  await db.post.delete({ where: { id: postId } });

  const username = post.author.username;
  revalidateTag(FEED_POSTS_CACHE_TAG);
  revalidatePath(`/u/${username}`);
  revalidatePath(`/post/${postId}`);
  revalidatePath(COMMUNITY_FEED_PATH);
  revalidatePath("/");

  return NextResponse.json({ ok: true, authorUsername: username });
}
