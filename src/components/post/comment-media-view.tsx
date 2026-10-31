"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { commentGifDisplayUrl, isCommentGifPlaybackUrl } from "@/lib/comment-media";
import type { CommentGifMeta } from "@/lib/giphy-meta";
import { useLongPress } from "@/hooks/use-long-press";
import { GiphyCreatorSheet } from "@/components/post/giphy-creator-sheet";
import { cn } from "@/lib/utils";
import { useLocale } from "@/components/providers/locale-provider";

export type CommentMediaViewProps = {
  mediaType?: "NONE" | "PHOTO" | "GIF" | null;
  mediaUrl?: string | null;
  mediaMeta?: CommentGifMeta | null;
  className?: string;
};

function MediaFrame({
  url,
  gif,
  className,
  contain,
  onClick,
}: {
  url: string;
  gif: boolean;
  className?: string;
  contain?: boolean;
  onClick?: () => void;
}) {
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const source = gif ? commentGifDisplayUrl(url) : url;
  const fit = contain ? "object-contain" : "object-cover";
  const common = contain
    ? cn("block max-h-[90vh] max-w-[90vw]", fit)
    : cn("absolute inset-0 h-full w-full", fit);
  const useVideo = gif && isCommentGifPlaybackUrl(source) && !failed;

  if (useVideo) {
    return (
      <>
        {!ready ? (
          <div className="absolute inset-0 animate-pulse rounded-[inherit] bg-muted" />
        ) : null}
        <video
          src={source}
          className={cn(common, className, !ready && "opacity-0")}
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          onLoadedData={() => setReady(true)}
          onError={() => setFailed(true)}
          onClick={onClick}
        />
      </>
    );
  }

  return (
    <>
      {!ready ? (
        <div className="absolute inset-0 animate-pulse rounded-[inherit] bg-muted" />
      ) : null}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={source}
        alt=""
        className={cn(common, className, !ready && "opacity-0")}
        onLoad={() => setReady(true)}
        onClick={onClick}
      />
    </>
  );
}

export function CommentMediaThumb({ mediaType, mediaUrl, mediaMeta, className }: CommentMediaViewProps) {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const [creatorOpen, setCreatorOpen] = useState(false);
  const gif = mediaType === "GIF";
  const longPress = useLongPress(() => {
    if (gif) setCreatorOpen(true);
  }, { disabled: !gif });

  if ((mediaType !== "PHOTO" && mediaType !== "GIF") || !mediaUrl) return null;

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        className={cn(
          "relative mt-2 mb-1 block h-[140px] w-[220px] max-w-full shrink-0",
          "cursor-zoom-in overflow-hidden rounded-[12px] bg-neutral-800",
          "select-none [-webkit-touch-callout:none] [-webkit-user-drag:none]",
          className,
        )}
        {...longPress.handlers}
        onClick={() => {
          if (longPress.consumeLongPress()) return;
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen(true);
          }
        }}
        aria-label={t("comments.openMedia")}
      >
        <MediaFrame url={mediaUrl} gif={gif} />
      </div>
      <CommentMediaLightbox
        open={open}
        mediaType={mediaType}
        mediaUrl={mediaUrl}
        mediaMeta={mediaMeta}
        onClose={() => setOpen(false)}
      />
      {gif ? (
        <GiphyCreatorSheet
          open={creatorOpen}
          meta={mediaMeta}
          onClose={() => setCreatorOpen(false)}
        />
      ) : null}
    </>
  );
}

export function CommentMediaLightbox({
  open,
  mediaType,
  mediaUrl,
  onClose,
}: CommentMediaViewProps & { open: boolean; onClose: () => void }) {
  const { t } = useLocale();
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open || (mediaType !== "PHOTO" && mediaType !== "GIF") || !mediaUrl) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/85 animate-in fade-in-0 duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={t("comments.openMedia")}
    >
      <button
        type="button"
        className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70"
        onClick={onClose}
        aria-label={t("comments.closeMedia")}
      >
        <X className="h-5 w-5" />
      </button>
      <div
        className="max-h-[90vh] max-w-[90vw]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative max-h-[90vh] max-w-[90vw] overflow-hidden rounded-[12px]">
          <MediaFrame
            url={mediaUrl}
            gif={mediaType === "GIF"}
            contain
            className="max-h-[90vh] max-w-[90vw]"
          />
        </div>
      </div>
    </div>
  );
}

export function CommentAttachPreview({
  url,
  gif,
  onClear,
}: {
  url: string;
  gif: boolean;
  onClear: () => void;
}) {
  const { t } = useLocale();
  return (
    <div className="relative mt-1 inline-block max-w-full">
      <div className="relative h-20 w-[120px] overflow-hidden rounded-[12px] bg-neutral-800">
        <MediaFrame url={url} gif={gif} />
      </div>
      <button
        type="button"
        onClick={onClear}
        className="absolute -right-2 -top-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-black text-white shadow"
        aria-label={t("comments.removeAttachment")}
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
