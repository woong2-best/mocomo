import { AppPageChrome } from "@/components/layout/app-page-chrome";
import { PostCommentsSkeleton } from "@/components/post/post-comments-skeleton";

export default function PostLoading() {
  return (
    <AppPageChrome maxWidth="2xl">
      <div className="rounded-xl border border-border h-64 bg-muted/40 animate-pulse" />
      <PostCommentsSkeleton />
    </AppPageChrome>
  );
}
