"use client";

import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type SyntheticEvent,
} from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { ProtectedPaidMedia } from "@/components/media/protected-paid-media";
import type { ReelItem } from "@/lib/reels/types";

/** Largest box that keeps the real ratio inside the viewport. A full-width box crops portrait video. */
function expandStageStyle(aspect: number): CSSProperties {
  const safe = Number.isFinite(aspect) && aspect > 0.05 && aspect < 20 ? aspect : 9 / 16;
  return {
    aspectRatio: String(safe),
    width: `min(calc(100vw - 1.5rem), calc((100dvh - 4.75rem) * ${safe}))`,
    height: `min(calc(100dvh - 4.75rem), calc((100vw - 1.5rem) / ${safe}))`,
  };
}

function storedAspect(media: ReelItem["media"]): number | null {
  if (!media.width || !media.height || media.width <= 0 || media.height <= 0) return null;
  return media.width / media.height;
}

type Props = {
  open: boolean;
  videos: ReelItem[];
  initialIndex: number;
  onClose: () => void;
  /** Sync horizontal index back to the Instagram-style viewer. */
  onIndexChange?: (index: number) => void;
};

/**
 * Lightbox-style expand (screenshot 2): centered video + controls + X,
 * horizontal swipe between videos of the same post.
 */
export function FeedVideoExpandLightbox({
  open,
  videos,
  initialIndex,
  onClose,
  onIndexChange,
}: Props) {
  const [index, setIndex] = useState(() =>
    Math.min(Math.max(0, initialIndex), Math.max(0, videos.length - 1))
  );
  const dragStartX = useRef<number | null>(null);
  const [measuredAspect, setMeasuredAspect] = useState<number | null>(null);

  useEffect(() => {
    if (!open) return;
    setIndex(Math.min(Math.max(0, initialIndex), Math.max(0, videos.length - 1)));
    setMeasuredAspect(null);
  }, [open, initialIndex, videos.length]);

  const onIntrinsic = useCallback((event: SyntheticEvent) => {
    const el = event.target;
    if (!(el instanceof HTMLVideoElement)) return;
    if (el.videoWidth <= 0 || el.videoHeight <= 0) return;
    const next = el.videoWidth / el.videoHeight;
    setMeasuredAspect((prev) => (prev && Math.abs(prev - next) < 0.01 ? prev : next));
  }, []);

  const goTo = useCallback(
    (next: number) => {
      if (videos.length === 0) return;
      const clamped = Math.max(0, Math.min(videos.length - 1, next));
      setIndex(clamped);
      onIndexChange?.(clamped);
    },
    [onIndexChange, videos.length]
  );

  const goPrev = useCallback(() => goTo(index - 1), [goTo, index]);
  const goNext = useCallback(() => goTo(index + 1), [goTo, index]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        goNext();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open, onClose, goPrev, goNext]);

  function onPointerDown(e: ReactPointerEvent) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    dragStartX.current = e.clientX;
  }

  function onPointerUp(e: ReactPointerEvent) {
    if (dragStartX.current == null) return;
    const dx = e.clientX - dragStartX.current;
    dragStartX.current = null;
    if (Math.abs(dx) < 48) return;
    if (dx < 0) goNext();
    else goPrev();
  }

  if (!open || typeof document === "undefined" || videos.length === 0) return null;

  const current = videos[index];
  const showNav = videos.length > 1;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("feed.sh6wqkr")}
      className="fixed inset-0 z-[220] flex bg-black text-white"
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute top-3 left-3 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 hover:bg-black/70"
        aria-label={t("feed.s89ie8q")}
      >
        <X className="h-5 w-5" />
      </button>

      <div className="relative flex min-w-0 flex-1 items-center justify-center">
        {showNav && (
          <button
            type="button"
            onClick={goPrev}
            disabled={index <= 0}
            className="absolute left-2 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-black/45 hover:bg-black/65 disabled:opacity-30 md:left-4"
            aria-label={t("feed.snrsq28")}
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
        )}

        <div
          className="flex h-full min-h-0 w-full items-center justify-center px-3 pb-4 pt-14"
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onPointerCancel={() => {
            dragStartX.current = null;
          }}
        >
          {current ? (
            <div
              className="relative bg-black"
              style={expandStageStyle(measuredAspect ?? storedAspect(current.media) ?? 9 / 16)}
              onLoadedMetadataCapture={onIntrinsic}
            >
              <ProtectedPaidMedia
                type="VIDEO"
                src={current.media.url}
                objectFit="contain"
                className="absolute inset-0 h-full w-full object-contain"
                mediaId={current.media.id}
                mediaPriceKrw={current.media.priceKrw}
                muted
                controls
                autoPlayOnView
                poster={current.media.posterUrl ?? undefined}
              />
            </div>
          ) : null}
        </div>

        {showNav && (
          <button
            type="button"
            onClick={goNext}
            disabled={index >= videos.length - 1}
            className="absolute right-2 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-black/45 hover:bg-black/65 disabled:opacity-30 md:right-4"
            aria-label={t("feed.sebaazc")}
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        )}

        <p className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2 rounded-full bg-black/55 px-3 py-1 text-xs tabular-nums text-white/90">
          {index + 1} / {videos.length}
        </p>
      </div>
    </div>,
    document.body
  );
}
