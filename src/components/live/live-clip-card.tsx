"use client";

import Link from "next/link";
import { Heart, Smartphone } from "lucide-react";
import { useTransition } from "react";
import { toggleStreamClipLike } from "@/actions/stream-clip";
import type { LiveHubClip } from "@/lib/live-hub-data";
import { FeedVideoPlayer } from "@/components/media/feed-video-player";

export function LiveClipCard({ clip }: { clip: LiveHubClip }) {
  const [pending, startTransition] = useTransition();

  return (
    <article className="live-card group shrink-0 w-[200px] sm:w-[220px]">
      <div className="relative live-card-thumb aspect-[9/16] sm:aspect-video overflow-hidden rounded-t-xl bg-black">
        <FeedVideoPlayer
          src={clip.videoUrl}
          poster={clip.thumbnailUrl ?? undefined}
          className="absolute inset-0 h-full w-full"
          mediaId={`clip-${clip.id}`}
          autoPlayOnView
          muted
          onDoubleTapLike={() => {
            if (pending) return;
            startTransition(() => void toggleStreamClipLike(clip.id));
          }}
        />
        {clip.isVertical && (
          <span className="pointer-events-none absolute top-2 left-2 z-[6] text-[10px] px-1.5 py-0.5 rounded bg-black/60 text-white flex items-center gap-0.5">
            <Smartphone className="h-3 w-3" /> 쇼츠
          </span>
        )}
        <p className="pointer-events-none absolute bottom-2 left-2 right-2 z-[6] text-xs font-semibold text-white line-clamp-2 drop-shadow">
          {clip.title}
        </p>
      </div>
      <div className="p-2 flex items-center justify-between gap-2">
        <Link href={`/u/${clip.author.username}`} className="text-xs text-muted-foreground truncate hover:text-primary">
          @{clip.author.username}
        </Link>
        <button
          type="button"
          disabled={pending}
          className="text-xs flex items-center gap-1 text-muted-foreground hover:text-folk-terracotta"
          onClick={() => startTransition(() => void toggleStreamClipLike(clip.id))}
        >
          <Heart className="h-3.5 w-3.5" />
          {clip.likeCount}
        </button>
      </div>
    </article>
  );
}
