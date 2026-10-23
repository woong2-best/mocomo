"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { isCommentGifPlaybackUrl } from "@/lib/comment-media";
import { cn } from "@/lib/utils";
import { useLocale } from "@/components/providers/locale-provider";

export type CommentMediaViewProps = {
  mediaType?: "NONE" | "PHOTO" | "GIF" | null;
  mediaUrl?: string | null;
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
  const fit = contain ? "object-contain" : "object-cover";
  const common = cn("block h-full w-full", fit);

  if (gif && isCommentGifPlaybackUrl(url)) {
    return (
      <video
        src={url}
        className={cn(common, className)}
        autoPlay
        loop
        muted
        playsInline
        onLoadedData={() => setReady(true)}
        onClick={onClick}
      />
    );
  }
  return (
    <>
      {!ready ? (
        <div className="absolute inset-0 animate-pulse rounded-[inherit] bg-muted" />
      ) : null}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt=""
        className={cn(common, className, !ready && "opacity-0")}
        onLoad={() => setReady(true)}
        onClick={onClick}
      />
    </>
  );
}

export function CommentMediaThumb({ mediaType, mediaUrl, className }: CommentMediaViewProps) {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  if ((mediaType !== "PHOTO" && mediaType !== "GIF") || !mediaUrl) return null;
  const gif = mediaType === "GIF";

  return (
    <>
      <button
        type="button"
        className={cn(
          "relative mt-2 block max-h-[280px] w-full max-w-[280px] overflow-hidden rounded-xl bg-muted",
          "aspect-square cursor-zoom-in",
          className,
        )}
        onClick={() => setOpen(true)}
        aria-label={t("comments.openMedia")}
      >
        <MediaFrame url={mediaUrl} gif={gif} />
      </button>
      <CommentMediaLightbox
        open={open}
        mediaType={mediaType}
        mediaUrl={mediaUrl}
        onClose={() => setOpen(false)}
      />
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
        <div className="relative max-h-[90vh] max-w-[90vw]">
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
    <div className="relative mt-1 inline-block max-w-[160px]">
      <div className="relative overflow-hidden rounded-xl bg-muted">
        <div className="relative aspect-square w-36">
          <MediaFrame url={url} gif={gif} />
        </div>
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
