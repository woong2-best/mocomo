import { PostCommentsSkeleton } from "@/components/post/post-comments-skeleton";

export default function PostLoading() {
  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6 animate-pulse">
      <div className="rounded-xl border border-border h-64 bg-muted/40" />
      <PostCommentsSkeleton />
    </div>
  );
}
