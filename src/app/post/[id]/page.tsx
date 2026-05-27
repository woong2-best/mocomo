import { Suspense } from "react";
import { notFound } from "next/navigation";
import { PostViewTracker } from "@/components/post/post-view-tracker";
import { PostDetailCard } from "@/components/post/post-detail-card";
import { PostCommentsSection } from "@/components/post/post-comments-section";
import { PostCommentsSkeleton } from "@/components/post/post-comments-skeleton";
import { getPostDetail } from "@/lib/post-queries";
import { getRequestLocale } from "@/lib/i18n/server";
import { auth, isSiteOperator } from "@/lib/auth";
import { ContentModerationBar } from "@/components/moderation/content-moderation-bar";

export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [post, locale, session] = await Promise.all([
    getPostDetail(id),
    getRequestLocale(),
    auth(),
  ]);

  if (!post) notFound();

  const isStaff =
    !!session?.user?.username &&
    !!session?.user?.role &&
    isSiteOperator({ username: session.user.username, role: session.user.role });

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      <PostViewTracker postId={post.id} />
      <ContentModerationBar
        targetType="POST"
        targetId={post.id}
        reportedUserId={post.author.id}
        postId={post.id}
        isStaff={isStaff}
        isLoggedIn={!!session?.user}
      />
      <PostDetailCard post={post} locale={locale} />
      <Suspense fallback={<PostCommentsSkeleton />}>
        <PostCommentsSection postId={post.id} />
      </Suspense>
    </div>
  );
}
