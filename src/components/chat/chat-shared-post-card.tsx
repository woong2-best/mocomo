"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatDistanceToNowStrict } from "date-fns";
import { ko } from "date-fns/locale";
import { ImageIcon, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { PostShareCardPayload } from "@/app/api/posts/[id]/share-card/route";
import { cn } from "@/lib/utils";

type Props = {
  postId: string;
  isMine?: boolean;
  className?: string;
};

export function ChatSharedPostCard({ postId, isMine = false, className }: Props) {
  const [post, setPost] = useState<PostShareCardPayload | null>(null);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const ac = new AbortController();
    setLoading(true);
    setFailed(false);
    void (async () => {
      try {
        const res = await fetch(`/api/posts/${encodeURIComponent(postId)}/share-card`, {
          signal: ac.signal,
        });
        const body = await res.json();
        if (cancelled) return;
        if (!res.ok || !body.ok || !body.post) {
          setFailed(true);
          setPost(null);
          return;
        }
        setPost(body.post as PostShareCardPayload);
      } catch {
        if (!cancelled) {
          setFailed(true);
          setPost(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      ac.abort();
    };
  }, [postId]);

  if (loading) {
    return (
      <div
        className={cn(
          "flex w-[min(100%,20rem)] items-center justify-center gap-2 rounded-2xl border border-border/60 bg-background/90 px-4 py-8 text-muted-foreground",
          className
        )}
      >
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-xs">게시물 불러오는 중…</span>
      </div>
    );
  }

  if (failed || !post) {
    return (
      <Link
        href={`/post/${postId}`}
        className={cn(
          "block w-[min(100%,20rem)] rounded-2xl border border-border/60 bg-background/90 px-3.5 py-3 text-sm hover:bg-muted/50 transition-colors",
          isMine && "border-primary/25",
          className
        )}
      >
        <p className="font-medium">게시물 보기</p>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">mocomo.net/post/…</p>
      </Link>
    );
  }

  const preview =
    post.title?.trim() ||
    post.content.trim().replace(/\s+/g, " ").slice(0, 220) ||
    "게시물";
  const timeLabel = formatDistanceToNowStrict(new Date(post.createdAt), {
    addSuffix: false,
    locale: ko,
  });
  const mediaIsImage =
    post.media &&
    (post.media.type === "IMAGE" || post.media.type === "GIF" || post.media.type === "VIDEO");

  return (
    <Link
      href={post.href}
      className={cn(
        "block w-[min(100%,20rem)] overflow-hidden rounded-2xl border border-border/70 bg-background text-left shadow-sm transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-folk-cobalt/40",
        isMine && "border-primary/30",
        className
      )}
    >
      <div className="flex items-center gap-2 px-3 pt-2.5 pb-1.5">
        <Avatar className="h-7 w-7 shrink-0 ring-1 ring-border/50">
          <AvatarImage src={post.author.image ?? undefined} />
          <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
            {post.author.displayName[0]?.toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold leading-tight">
            {post.author.displayName}
            <span className="font-normal text-muted-foreground">
              {" "}
              · {timeLabel}
            </span>
          </p>
          <p className="truncate text-[11px] text-muted-foreground">@{post.author.username}</p>
        </div>
      </div>

      <div className="px-3 pb-2.5 space-y-2">
        <p className="text-[14px] leading-snug whitespace-pre-wrap break-words line-clamp-6">
          {preview}
        </p>
        {mediaIsImage && post.media ? (
          <div className="relative mt-1 overflow-hidden rounded-xl border border-border/50 bg-muted aspect-[16/10]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={post.media.url}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
              loading="lazy"
            />
            {post.media.type === "VIDEO" ? (
              <span className="absolute bottom-1.5 left-1.5 rounded-md bg-black/65 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                동영상
              </span>
            ) : null}
          </div>
        ) : null}
        {!mediaIsImage ? (
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <ImageIcon className="h-3.5 w-3.5" />
            mocomo.net/post
          </div>
        ) : null}
      </div>
    </Link>
  );
}
