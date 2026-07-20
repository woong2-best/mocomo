"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent } from "react";
import { LayoutTemplate } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  extractFirstHttpUrl,
  type LinkPreviewData,
} from "@/lib/link-preview-shared";
import {
  extractYoutubeVideoId,
  normalizeYoutubeUrl,
} from "@/lib/video-donation";

type PreviewResponse = {
  ok?: boolean;
  preview?: LinkPreviewData;
};

function youtubeFallback(url: string): LinkPreviewData | null {
  const normalized = normalizeYoutubeUrl(url);
  const videoId = normalized ? extractYoutubeVideoId(normalized) : null;
  if (!normalized || !videoId) return null;
  return {
    url: normalized,
    domain: "youtube.com",
    title: null,
    description: null,
    imageUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    siteName: "YouTube",
    provider: "youtube",
  };
}

export function LinkPreviewCard({
  text,
  className,
  stopPropagation = false,
  onReady,
}: {
  text: string;
  className?: string;
  stopPropagation?: boolean;
  onReady?: (ready: boolean) => void;
}) {
  const url = extractFirstHttpUrl(text);
  const [preview, setPreview] = useState<LinkPreviewData | null>(() =>
    url ? youtubeFallback(url) : null
  );
  const [failed, setFailed] = useState(false);
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;

  useEffect(() => {
    if (!url) {
      setPreview(null);
      setFailed(false);
      onReadyRef.current?.(false);
      return;
    }

    let cancelled = false;
    const ctrl = new AbortController();
    const yt = youtubeFallback(url);
    setPreview(yt);
    setFailed(false);
    onReadyRef.current?.(Boolean(yt));

    void (async () => {
      try {
        const res = await fetch(`/api/link-preview?url=${encodeURIComponent(url)}`, {
          signal: ctrl.signal,
        });
        const data = (await res.json()) as PreviewResponse;
        if (cancelled) return;
        if (!res.ok || !data.ok || !data.preview) {
          // Keep YouTube thumbnail fallback; only fail hard for other hosts.
          if (!yt) {
            setFailed(true);
            onReadyRef.current?.(false);
          }
          return;
        }
        setPreview(data.preview);
        onReadyRef.current?.(true);
      } catch {
        if (!cancelled && !yt) {
          setFailed(true);
          onReadyRef.current?.(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      ctrl.abort();
    };
  }, [url]);

  if (!url || failed || !preview) return null;

  const domain = preview.domain || "link";
  const title = preview.title?.trim() || domain;
  const description = preview.description?.trim() || null;

  const open = (e: MouseEvent | KeyboardEvent) => {
    if (stopPropagation) e.stopPropagation();
    e.preventDefault();
    window.open(preview.url, "_blank", "noopener,noreferrer");
  };

  return (
    <div
      role="link"
      tabIndex={0}
      className={cn(
        "mt-2 flex overflow-hidden rounded-2xl border border-border/80 bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer text-left",
        className
      )}
      onClick={open}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") open(e);
      }}
    >
      <div className="relative w-[112px] sm:w-[130px] shrink-0 self-stretch min-h-[88px] bg-muted flex items-center justify-center overflow-hidden border-r border-border/60">
        {preview.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview.imageUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        ) : (
          <LayoutTemplate className="h-8 w-8 text-muted-foreground/50" aria-hidden />
        )}
      </div>
      <div className="min-w-0 flex-1 px-3 py-2.5 flex flex-col justify-center gap-0.5">
        <p className="text-[11px] leading-tight text-muted-foreground truncate">{domain}</p>
        <p className="text-sm font-semibold leading-snug text-foreground line-clamp-2">{title}</p>
        {description && (
          <p className="text-xs leading-snug text-muted-foreground line-clamp-2">{description}</p>
        )}
      </div>
    </div>
  );
}
