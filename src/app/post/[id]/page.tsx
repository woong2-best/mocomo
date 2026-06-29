import { Suspense } from "react";
import { notFound } from "next/navigation";
import { PostViewTracker } from "@/components/post/post-view-tracker";
import { PostDetailCard } from "@/components/post/post-detail-card";
import { PostDetailActions } from "@/components/post/post-detail-actions";
import { PostCommentsSection } from "@/components/post/post-comments-section";
import { PostCommentsSkeleton } from "@/components/post/post-comments-skeleton";
import { getPostDetail } from "@/lib/post-queries";
import { getRequestLocale } from "@/lib/i18n/server";
import { auth, isSiteOperator } from "@/lib/auth";
import { getPostEngagementForUser } from "@/lib/post-engagement";
import { ContentModerationBar } from "@/components/moderation/content-moderation-bar";
import { AppPageChrome } from "@/components/layout/app-page-chrome";

export const dynamic = "force-dynamic";

export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [locale, session] = await Promise.all([getRequestLocale(), auth()]);
  const post = await getPostDetail(id, session?.user?.id);

  if (!post) notFound();

  const engagement =
    session?.user?.id
      ? await getPostEngagementForUser(session.user.id, [post.id])
      : { likedIds: [], starredIds: [], repostedIds: [] };

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

  return (
    <AppPageChrome maxWidth="2xl">
      <PostViewTracker postId={post.id} />
      <ContentModerationBar
        targetType="POST"
        targetId={post.id}
        reportedUserId={post.author.id}
        postId={post.id}
        isStaff={isStaff}
        isLoggedIn={!!session?.user}
      />
      <PostDetailCard
        post={post}
        locale={locale}
        isOwner={session?.user?.id === post.author.id}
      />
      <PostDetailActions
        postId={post.id}
        authorUsername={post.author.username}
        title={post.title}
        content={post.content}
        hasVideo={post.media?.some((m) => m.type === "VIDEO")}
        likeCount={post._count.likes}
        commentCount={post._count.comments}
        repostCount={repostCount}
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
