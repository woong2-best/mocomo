import type { GridPost } from "@/components/feed/feed-post-card";
import { QuotePostPreviewCard } from "@/components/post/quote-post-preview-card";
import { toQuotedPostPreview } from "@/lib/quoted-post";

export function QuotedPostCard({
  post,
  isOwner = false,
  viewerShowNsfw = false,
}: {
  post: NonNullable<GridPost["quotedPost"]>;
  isOwner?: boolean;
  viewerShowNsfw?: boolean;
}) {
  const preview = toQuotedPostPreview({
    id: post.id,
    title: post.title ?? null,
    content: post.content,
    author: {
      ...post.author,
      name: post.author.name ?? null,
    },
    createdAt: post.createdAt,
    isNsfw: !!post.isNsfw,
    media: (post.media ?? []).map((m) => ({
      url: m.url,
      type: m.type,
      posterUrl: m.posterUrl ?? null,
      duration: "duration" in m && m.duration != null ? Number(m.duration) : null,
    })),
  });
  if (!preview) return null;

  return (
    <QuotePostPreviewCard
      post={preview}
      href={`/post/${preview.id}`}
      className="mt-3"
      isOwner={isOwner}
      viewerShowNsfw={viewerShowNsfw}
    />
  );
}
