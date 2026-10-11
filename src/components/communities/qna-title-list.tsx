"use client";

import { PrefetchLink } from "@/components/ui/prefetch-link";
import type { FeedLayoutItem } from "@/components/feed/feed-dual-column-layout";
import { qnaListTitle } from "@/lib/qna-list-title";

export function QnaTitleList({ items }: { items: FeedLayoutItem[] }) {
  return (
    <ul className="divide-y divide-border/60 overflow-hidden rounded-2xl border border-border">
      {items.map((item) => {
        if (item.type !== "post") return null;
        const title = qnaListTitle(item.data);
        return (
          <li key={item.data.id}>
            <PrefetchLink
              href={`/post/${item.data.id}`}
              className="block px-4 py-3.5 transition-colors hover:bg-muted/40"
            >
              <p className="text-[15px] font-semibold leading-snug text-white">{title}</p>
            </PrefetchLink>
          </li>
        );
      })}
    </ul>
  );
}
