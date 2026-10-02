"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Heart, MessageSquare, Smartphone, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { COMMUNITY_FEED_PATH } from "@/lib/site-routes";

type FeedItem = {
  id: string;
  title: string | null;
  content: string;
  author: { username: string; displayName: string | null; image: string | null };
  likeCount: number;
  commentCount: number;
};

type Props = {
  open: boolean;
  onClose: () => void;
};

export function AptSmartphonePanel({ open, onClose }: Props) {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    void fetch("/api/feed?limit=8")
      .then((r) => r.json())
      .then((data: { items?: { type: string; data: Record<string, unknown> }[] }) => {
        const posts = (data.items ?? [])
          .filter((i) => i.type === "post")
          .map((i) => {
            const d = i.data as {
              id: string;
              title: string | null;
              content: string;
              author: { username: string; image: string | null };
              _count: { likes: number; comments: number };
            };
            return {
              id: d.id,
              title: d.title,
              content: d.content,
              author: { username: d.author.username, displayName: null, image: d.author.image },
              likeCount: d._count.likes,
              commentCount: d._count.comments,
            };
          });
        setItems(posts);
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [open]);

  if (!open) return null;

  return (
    <div className="pointer-events-auto absolute inset-x-0 top-0 bottom-0 z-30 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} aria-hidden />

      <div className="relative w-full max-w-[300px] rounded-[2rem] border-[8px] border-neutral-800 bg-neutral-950 shadow-2xl overflow-hidden">
        <div className="absolute top-0 inset-x-0 h-6 bg-neutral-900 flex items-center justify-center">
          <div className="h-1 w-16 rounded-full bg-neutral-700" />
        </div>

        <div className="pt-8 pb-4 px-3 max-h-[min(72dvh,520px)] flex flex-col">
          <div className="flex items-center justify-between mb-3 px-1">
            <div className="flex items-center gap-1.5">
              <Smartphone className="h-4 w-4 text-pink-300" />
              <span className="text-xs font-bold text-white">MoCoMo SNS</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1 text-white/60 hover:bg-white/10"
              aria-label="닫기"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-0.5">
            {loading && <p className="text-center text-xs text-white/50 py-8">불러오는 중…</p>}
            {!loading && items.length === 0 && (
              <p className="text-center text-xs text-white/50 py-8">피드가 비어 있습니다</p>
            )}
            {items.map((post) => (
              <Link
                key={post.id}
                href={`${COMMUNITY_FEED_PATH}/${post.id}`}
                className="block rounded-xl border border-white/10 bg-white/5 p-3 hover:bg-white/10 transition-colors"
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="h-7 w-7 rounded-full bg-pink-500/30 flex items-center justify-center text-[10px] font-bold text-pink-200">
                    {(post.author.displayName ?? post.author.username).slice(0, 1)}
                  </div>
                  <span className="text-[11px] font-bold text-white/90 truncate">
                    {post.author.displayName ?? post.author.username}
                  </span>
                </div>
                {post.title && (
                  <p className="text-[11px] font-semibold text-white/80 line-clamp-1">{post.title}</p>
                )}
                <p className="text-[10px] text-white/55 line-clamp-2 mt-0.5">{post.content}</p>
                <div className="flex gap-3 mt-2 text-[9px] text-white/40">
                  <span className="flex items-center gap-0.5">
                    <Heart className="h-3 w-3" /> {post.likeCount}
                  </span>
                  <span className="flex items-center gap-0.5">
                    <MessageSquare className="h-3 w-3" /> {post.commentCount}
                  </span>
                </div>
              </Link>
            ))}
          </div>

          <Link
            href={COMMUNITY_FEED_PATH}
            className={cn(
              "mt-3 block rounded-xl bg-pink-500/90 py-2.5 text-center text-xs font-bold text-white",
              "hover:bg-pink-500 transition-colors"
            )}
          >
            MoCoMo 피드 열기
          </Link>
        </div>

        <div className="h-1 w-24 mx-auto mb-2 rounded-full bg-neutral-700" />
      </div>
    </div>
  );
}
