"use client";

import Link from "next/link";
import { Heart, Play, Smartphone } from "lucide-react";
import { useTransition } from "react";
import { toggleStreamClipLike } from "@/actions/stream-clip";
import type { LiveHubClip } from "@/lib/live-hub-data";

export function LiveClipCard({ clip }: { clip: LiveHubClip }) {
  const [pending, startTransition] = useTransition();

  return (
    <article className="live-card group shrink-0 w-[200px] sm:w-[220px]">
      <a href={clip.videoUrl} target="_blank" rel="noopener noreferrer" className="block live-card-thumb aspect-[9/16] sm:aspect-video">
        {clip.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={clip.thumbnailUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-muted">
            <Play className="h-10 w-10 text-muted-foreground/50" />
          </div>
        )}
        <div className="live-card-scrim" />
        {clip.isVertical && (
          <span className="absolute top-2 left-2 text-[10px] px-1.5 py-0.5 rounded bg-black/60 text-white flex items-center gap-0.5">
            <Smartphone className="h-3 w-3" /> 쇼츠
          </span>
        )}
        <p className="absolute bottom-2 left-2 right-2 text-xs font-semibold text-white line-clamp-2">{clip.title}</p>
      </a>
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
