import { Suspense } from "react";
import { notFound } from "next/navigation";
import { PostViewTracker } from "@/components/post/post-view-tracker";
import { PostDetailCard } from "@/components/post/post-detail-card";
import { PostCommentsSection } from "@/components/post/post-comments-section";
import { PostCommentsSkeleton } from "@/components/post/post-comments-skeleton";
import { getPostDetail } from "@/lib/post-queries";
import { getRequestLocale } from "@/lib/i18n/server";

export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [post, locale] = await Promise.all([getPostDetail(id), getRequestLocale()]);

  if (!post) notFound();

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      <PostViewTracker postId={post.id} />
      <PostDetailCard post={post} locale={locale} />
      <Suspense fallback={<PostCommentsSkeleton />}>
        <PostCommentsSection postId={post.id} />
      </Suspense>
    </div>
  );
}
