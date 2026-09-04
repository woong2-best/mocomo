"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ProtectedPaidMedia } from "@/components/media/protected-paid-media";
import type { ContentLockReason } from "@/lib/content-access";

export type PostMediaLightboxItem = {
  id?: string;
  url: string;
  type: string;
  priceKrw?: number;
  instantPurchasePriceKrw?: number;
  locked?: boolean;
  lockReason?: ContentLockReason;
};

type PostMediaLightboxProps = {
  open: boolean;
  onClose: () => void;
  media: PostMediaLightboxItem[];
  initialIndex: number;
  postId: string;
  /** @deprecated 호출 측에서 전체 media를 넘기므로 더 이상 사용하지 않음 */
  mediaTotal?: number;
  postInstantPurchasePriceKrw?: number;
  isOwner?: boolean;
};

export function PostMediaLightbox({
  open,
  onClose,
  media,
  initialIndex,
  postInstantPurchasePriceKrw,
  isOwner = false,
}: PostMediaLightboxProps) {
  const [items, setItems] = useState(media);
  const [index, setIndex] = useState(() =>
    Math.min(Math.max(0, initialIndex), Math.max(0, media.length - 1))
  );
  const desktopRailRef = useRef<HTMLDivElement>(null);
  const mobileRailRef = useRef<HTMLDivElement>(null);
  const desktopThumbRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const mobileThumbRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const dragStartX = useRef<number | null>(null);

  useEffect(() => {
    if (!open) return;
    setIndex(Math.min(Math.max(0, initialIndex), Math.max(0, media.length - 1)));
  }, [open, initialIndex, media.length]);

  useEffect(() => {
    if (!open) return;
    setItems(media);
    setIndex((prev) => Math.min(prev, Math.max(0, media.length - 1)));
  }, [open, media]);

  const goTo = useCallback(
    (next: number) => {
      if (items.length === 0) return;
      const clamped = ((next % items.length) + items.length) % items.length;
      setIndex(clamped);
    },
    [items.length]
  );

  const goPrev = useCallback(() => goTo(index - 1), [goTo, index]);
  const goNext = useCallback(() => goTo(index + 1), [goTo, index]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose, goPrev, goNext]);

  useEffect(() => {
    if (!open) return;

    const scrollVertical = (rail: HTMLDivElement | null, el: HTMLButtonElement | null) => {
      if (!rail || !el) return;
      const railRect = rail.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      const offset =
        elRect.top - railRect.top - railRect.height / 2 + elRect.height / 2 + rail.scrollTop;
      rail.scrollTo({ top: Math.max(0, offset), behavior: "smooth" });
    };

    const scrollHorizontal = (rail: HTMLDivElement | null, el: HTMLButtonElement | null) => {
      if (!rail || !el) return;
      const railRect = rail.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      const offset =
        elRect.left - railRect.left - railRect.width / 2 + elRect.width / 2 + rail.scrollLeft;
      rail.scrollTo({ left: Math.max(0, offset), behavior: "smooth" });
    };

    scrollVertical(desktopRailRef.current, desktopThumbRefs.current[index] ?? null);
    scrollHorizontal(mobileRailRef.current, mobileThumbRefs.current[index] ?? null);
  }, [index, open, items.length]);

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

  if (!open || typeof document === "undefined" || items.length === 0) return null;

  const current = items[index];
  const showNav = items.length > 1;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="사진 보기"
      className="fixed inset-0 z-[200] flex bg-black text-white"
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute top-3 left-3 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 hover:bg-black/70"
        aria-label="닫기"
      >
        <X className="h-5 w-5" />
      </button>

      <div className="relative flex min-w-0 flex-1 items-center justify-center">
        {showNav && (
          <button
            type="button"
            onClick={goPrev}
            className="absolute left-2 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-black/45 hover:bg-black/65 md:left-4"
            aria-label="이전 사진"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
        )}

        <div
          className="flex h-full w-full items-center justify-center px-12 pb-24 pt-16 sm:pb-16 md:px-16"
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onPointerCancel={() => {
            dragStartX.current = null;
          }}
        >
          {current ? (
            <ProtectedPaidMedia
              type={current.type}
              src={current.url}
              objectFit="contain"
              className={cn(
                "h-[calc(100dvh-8rem)] w-full max-h-[calc(100dvh-8rem)] max-w-full object-contain",
                current.type === "VIDEO" ? "w-full" : "select-none"
              )}
              mediaPriceKrw={current.priceKrw}
              postInstantPurchasePriceKrw={
                postInstantPurchasePriceKrw ?? current.instantPurchasePriceKrw
              }
              locked={current.locked}
              controls={current.type === "VIDEO" && !current.locked}
              muted
              autoPlayOnView={!current.locked}
              mediaId={current.id}
              loading="eager"
              alt=""
              skipForensic={isOwner}
              skipProtectionIntro
              blockUntilForensicReady={!isOwner && !current.locked}
            />
          ) : (
            <p className="text-sm text-white/70">사진을 표시할 수 없습니다.</p>
          )}
        </div>

        {showNav && (
          <button
            type="button"
            onClick={goNext}
            className="absolute right-2 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-black/45 hover:bg-black/65 md:right-4"
            aria-label="다음 사진"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        )}

        <p className="absolute bottom-20 left-1/2 -translate-x-1/2 rounded-full bg-black/55 px-3 py-1 text-xs tabular-nums text-white/90 sm:bottom-4">
          {index + 1} / {items.length}
        </p>
      </div>

      {items.length > 1 && (
        <>
          <aside className="hidden h-full w-[104px] shrink-0 border-l border-white/10 bg-black/80 sm:flex sm:flex-col md:w-[120px]">
            <div
              ref={desktopRailRef}
              className="flex-1 overflow-y-auto overscroll-contain px-2 py-3"
            >
              <div className="flex flex-col gap-2">
                {items.map((m, i) => (
                  <ThumbButton
                    key={m.id ?? `${m.url}-${i}`}
                    media={m}
                    index={i}
                    active={i === index}
                    onSelect={() => goTo(i)}
                    setRef={(el) => {
                      desktopThumbRefs.current[i] = el;
                    }}
                    vertical
                  />
                ))}
              </div>
            </div>
          </aside>

          <div className="absolute inset-x-0 bottom-0 z-20 border-t border-white/10 bg-black/75 py-2 sm:hidden">
            <div
              ref={mobileRailRef}
              className="flex gap-2 overflow-x-auto overscroll-contain px-3"
            >
              {items.map((m, i) => (
                <ThumbButton
                  key={m.id ?? `${m.url}-m-${i}`}
                  media={m}
                  index={i}
                  active={i === index}
                  onSelect={() => goTo(i)}
                  setRef={(el) => {
                    mobileThumbRefs.current[i] = el;
                  }}
                />
              ))}
            </div>
          </div>
        </>
      )}
    </div>,
    document.body
  );
}

function ThumbButton({
  media,
  index,
  active,
  onSelect,
  setRef,
  vertical = false,
}: {
  media: PostMediaLightboxItem;
  index: number;
  active: boolean;
  onSelect: () => void;
  setRef: (el: HTMLButtonElement | null) => void;
  vertical?: boolean;
}) {
  return (
    <button
      type="button"
      ref={setRef}
      onClick={onSelect}
      className={cn(
        "group flex shrink-0 flex-col items-center gap-1 rounded-md p-1 transition-colors",
        vertical ? "w-full" : "w-14",
        active ? "bg-white/20" : "hover:bg-white/10"
      )}
      aria-label={`${index + 1}번 사진`}
      aria-current={active ? "true" : undefined}
    >
      <div
        className={cn(
          "relative overflow-hidden rounded bg-white/10",
          vertical ? "aspect-[3/4] w-full" : "h-14 w-14",
          active && "ring-2 ring-white"
        )}
      >
        {media.type === "VIDEO" ? (
          <ProtectedPaidMedia
            type="VIDEO"
            src={media.url}
            className="h-full w-full object-cover"
            locked={media.locked}
            muted
            controls={false}
            preload="none"
            autoPlayOnView={false}
            mediaId={media.id}
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={media.url}
            alt=""
            className="h-full w-full object-cover"
            draggable={false}
          />
        )}
      </div>
      <span className="text-[11px] tabular-nums text-white/80">{index + 1}</span>
    </button>
  );
}
