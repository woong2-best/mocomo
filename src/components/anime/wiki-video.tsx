"use client";

import { useState } from "react";
import { Play } from "lucide-react";
import type { WikiVideo } from "@/lib/wiki/media";
import { cn } from "@/lib/utils";

function EmbedFrame({ src, title }: { src: string; title: string }) {
  return (
    <iframe
      title={title}
      src={src}
      className="h-full w-full"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      allowFullScreen
    />
  );
}

export function WikiVideoPlayer({ video, className }: { video: WikiVideo; className?: string }) {
  const [playing, setPlaying] = useState(false);
  const frame = cn("my-3 overflow-hidden rounded-xl border border-border/60 bg-black", className);

  if (video.kind === "file") {
    return (
      <div className={frame}>
        <video src={video.url} className="aspect-video w-full" controls preload="metadata" playsInline />
      </div>
    );
  }

  const title = video.kind === "youtube" ? "YouTube" : "Vimeo";
  const embedSrc = playing
    ? `${video.embedSrc}${video.embedSrc.includes("?") ? "&" : "?"}autoplay=1`
    : video.embedSrc;

  if (playing) {
    return (
      <div className={cn(frame, "aspect-video")}>
        <EmbedFrame src={embedSrc} title={title} />
      </div>
    );
  }

  return (
    <div className={frame}>
      <button
        type="button"
        onClick={() => setPlaying(true)}
        className="group relative block aspect-video w-full"
        aria-label={`Play ${title} video`}
      >
        {video.kind === "youtube" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={video.thumbnail}
            alt=""
            className="h-full w-full object-cover opacity-90 transition-opacity group-hover:opacity-100"
          />
        ) : (
          <span className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-black" />
        )}
        <span className="absolute inset-0 bg-black/25 transition-colors group-hover:bg-black/10" />
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-black/70 text-white shadow-lg ring-2 ring-white/80 transition-transform group-hover:scale-105">
            <Play className="ml-0.5 h-6 w-6 fill-current" />
          </span>
        </span>
        <span className="absolute bottom-2 left-2 rounded-md bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
          {title}
        </span>
      </button>
    </div>
  );
}
