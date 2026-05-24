import { FeedPostCard, type GridPost } from "@/components/feed/feed-post-card";
import { FeedAdCard } from "@/components/feed/feed-ad-card";
import type { FeedItem } from "@/lib/feed-mixer";

type Ad = {
  id: string;
  title: string;
  imageUrl: string;
  linkUrl: string;
  sponsorName?: string | null;
  ctaLabel?: string | null;
  adCategory?: string | null;
};

export function FeedGrid({ items }: { items: FeedItem<GridPost, Ad>[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {items.map((item, i) =>
        item.type === "ad" ? (
          <FeedAdCard key={`ad-${item.data.id}-${i}`} ad={item.data} />
        ) : (
          <FeedPostCard key={item.data.id} post={item.data} />
        )
      )}
    </div>
  );
}
