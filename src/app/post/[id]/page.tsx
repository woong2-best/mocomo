import { Suspense } from "react";
import { notFound } from "next/navigation";
import { PostDetailCard } from "@/components/post/post-detail-card";
import { PostDetailActions } from "@/components/post/post-detail-actions";
import { PostFlashHighlight } from "@/components/post/post-flash-highlight";
import { PostCommentsSection } from "@/components/post/post-comments-section";
import { PostCommentsSkeleton } from "@/components/post/post-comments-skeleton";
import { getPostDetail, isPostDetailAudienceLocked } from "@/lib/post-queries";
import { getRequestLocale } from "@/lib/i18n/server";
import { auth, isSiteOperator } from "@/lib/auth";
import { getPostEngagementForUser } from "@/lib/post-engagement";
import { ContentModerationBar } from "@/components/moderation/content-moderation-bar";
import { AppPageChrome } from "@/components/layout/app-page-chrome";
import { isPaymentsConfigured } from "@/lib/payments";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function PostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [locale, session] = await Promise.all([getRequestLocale(), auth()]);
  const detail = await getPostDetail(id, session?.user?.id);

  if (!detail) notFound();

  if (isPostDetailAudienceLocked(detail)) {
    return (
      <AppPageChrome maxWidth="2xl">
        <div className="px-4 py-16 max-w-md mx-auto text-center space-y-3">
          <p className="text-lg font-bold">이 게시물은 잠겨 있습니다</p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            @{detail.author.username} 님이 계정을 잠갔습니다. 승인된 팔로워만 게시물을 볼 수 있습니다.
          </p>
          <a
            href={`/u/${detail.author.username}`}
            className="inline-block text-sm text-primary hover:underline"
          >
            프로필 보기
          </a>
        </div>
      </AppPageChrome>
    );
  }

  const post = detail;

  const [engagement, creator, viewerSub, viewerCollab] = await Promise.all([
    session?.user?.id
      ? getPostEngagementForUser(session.user.id, [post.id])
      : Promise.resolve({ likedIds: [] as string[], starredIds: [] as string[], repostedIds: [] as string[] }),
    db.user.findUnique({
      where: { id: post.author.id },
      select: { creatorSubscriptionPriceKrw: true },
    }),
    session?.user?.id && session.user.id !== post.author.id
      ? db.subscription.findFirst({
          where: {
            subscriberId: session.user.id,
            creatorId: post.author.id,
            status: "active",
          },
          select: { id: true },
        })
      : Promise.resolve(null),
    session?.user?.id
      ? db.postCollaborator.findUnique({
          where: {
            postId_userId: { postId: post.id, userId: session.user.id },
          },
          select: { status: true },
        })
      : Promise.resolve(null),
  ]);

  const isStaff =
    !!session?.user?.username &&
    !!session?.user?.role &&
    isSiteOperator({
      username: session.user.username,
      role: session.user.role,
      email: session.user.email,
    });

  const repostCount =
    "reposts" in (post._count ?? {})
      ? (post._count as { reposts?: number }).reposts ?? 0
      : 0;

  const viewerCollabStatus =
    viewerCollab?.status === "PENDING" || viewerCollab?.status === "ACCEPTED"
      ? viewerCollab.status
      : null;

  return (
    <AppPageChrome maxWidth="2xl">
      <ContentModerationBar
        targetType="POST"
        targetId={post.id}
        reportedUserId={post.author.id}
        postId={post.id}
        isStaff={isStaff}
        isLoggedIn={!!session?.user}
      />
      <PostFlashHighlight postId={post.id}>
        <PostDetailCard
          post={post}
          locale={locale}
          isOwner={session?.user?.id === post.author.id}
          paymentsEnabled={isPaymentsConfigured()}
          subscriptionPriceKrw={creator?.creatorSubscriptionPriceKrw ?? undefined}
          subscribed={!!viewerSub}
          viewerCollabStatus={viewerCollabStatus}
        />
      </PostFlashHighlight>
      <PostDetailActions
        postId={post.id}
        authorUsername={post.author.username}
        title={post.title}
        content={post.content}
        hasVideo={post.media?.some((m) => m.type === "VIDEO")}
        likeCount={post._count.likes}
        commentCount={post._count.comments}
        repostCount={repostCount}
        viewCount={post.viewCount}
        initialLiked={engagement.likedIds.includes(post.id)}
        initialStarred={engagement.starredIds.includes(post.id)}
        initialReposted={engagement.repostedIds.includes(post.id)}
      />
      <Suspense fallback={<PostCommentsSkeleton />}>
        <PostCommentsSection postId={post.id} />
      </Suspense>
    </AppPageChrome>
  );
}
