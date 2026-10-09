"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { isSalePricedMedia } from "@/lib/paid-media-protection";
import {
  PAID_PREVIEW_SECONDS,
  paidMediaPreviewPath,
  resolveClientPaidMediaSrc,
} from "@/lib/paid-media-playback";
import { ProtectedPaidMedia } from "@/components/media/protected-paid-media";
import { FeedVideoPlayer } from "@/components/media/feed-video-player";
import { PaidMediaCheckoutDialog } from "@/components/media/paid-media-checkout-dialog";
import { PaidMediaProtectionShell } from "@/components/media/paid-media-protection-shell";
import { useForensicWatermarkSession } from "@/components/media/use-forensic-watermark-session";
import type { ContentLockReason } from "@/lib/content-access";

type Phase = "idle" | "preview" | "pay" | "full";

type Props = {
  type: string;
  src: string;
  className?: string;
  mediaId?: string | null;
  mediaPriceKrw?: number | null;
  postInstantPurchasePriceKrw?: number | null;
  locked?: boolean;
  lockReason?: ContentLockReason | string;
  poster?: string;
  postId: string;
  authorUsername: string;
  authorId?: string;
  subscriptionPriceKrw?: number;
  subscribed?: boolean;
  paymentsEnabled?: boolean;
  onPurchaseSuccess?: (mediaId?: string) => void | Promise<void>;
  onOpenFull?: () => void;
  fullHref?: string;
  isOwner?: boolean;
  feedPreview?: boolean;
};

export function PaidFeedMediaSurface({
  type,
  src,
  className,
  mediaId,
  mediaPriceKrw,
  postInstantPurchasePriceKrw,
  locked = false,
  lockReason,
  poster,
  postId,
  authorUsername,
  authorId,
  subscriptionPriceKrw,
  subscribed = false,
  paymentsEnabled = false,
  onPurchaseSuccess,
  onOpenFull,
  fullHref,
  isOwner = false,
  feedPreview = true,
}: Props) {
  const isVideo = type === "VIDEO";
  const sale = isSalePricedMedia(mediaPriceKrw, postInstantPurchasePriceKrw);
  const purchased = sale && !locked;
  const priceKrw =
    mediaPriceKrw ?? postInstantPurchasePriceKrw ?? 0;
  const resolvedSrc = resolveClientPaidMediaSrc({
    url: src,
    mediaId,
    locked,
    priceKrw,
  });
  const [phase, setPhase] = useState<Phase>("idle");
  const [payOpen, setPayOpen] = useState(false);
  const suppressTileClickRef = useRef(false);

  useEffect(() => {
    setPhase("idle");
    setPayOpen(false);
    suppressTileClickRef.current = false;
  }, [mediaId, locked, src]);

  const handlePayOpenChange = useCallback((open: boolean) => {
    setPayOpen(open);
    if (!open) {
      if (isVideo) {
        setPhase((p) => (p === "pay" ? "idle" : p));
      }
      // Radix 닫기 클릭이 아래 타일로 관통해 결제창이 즉시 다시 열리는 것 방지
      suppressTileClickRef.current = true;
      window.setTimeout(() => {
        suppressTileClickRef.current = false;
      }, 400);
    }
  }, [isVideo]);

  const { config: forensicRenderConfig, error: sessionError } =
    useForensicWatermarkSession(
      mediaId,
      purchased && isVideo && phase === "full" && !isOwner
    );

  const skipForensic =
    isOwner || /Author playback|does not require forensic/i.test(sessionError ?? "");

  const photoTileSrc =
    mediaId && sale ? paidMediaPreviewPath(mediaId) : resolvedSrc;

  const startPreview = useCallback(() => {
    if (!isVideo || phase !== "idle") return;
    setPhase("preview");
  }, [isVideo, phase]);

  const onPreviewEnded = useCallback(() => {
    if (purchased) {
      setPhase("full");
      return;
    }
    setPhase("pay");
    setPayOpen(true);
  }, [purchased]);

  const openPay = useCallback(() => {
    if (suppressTileClickRef.current) return;
    setPayOpen(true);
    setPhase((p) => (p === "idle" || p === "preview" ? "pay" : p));
  }, []);

  const openPurchasedPhoto = useCallback(() => {
    if (onOpenFull) {
      onOpenFull();
      return;
    }
    if (fullHref) {
      window.location.assign(fullHref);
    }
  }, [fullHref, onOpenFull]);

  if (!sale) {
    return (
      <ProtectedPaidMedia
        type={type}
        src={src}
        className={className}
        mediaPriceKrw={mediaPriceKrw}
        postInstantPurchasePriceKrw={postInstantPurchasePriceKrw}
        locked={locked}
        mediaId={mediaId}
        poster={poster}
        autoPlayOnView
        keepMediaLoaded={!feedPreview}
      />
    );
  }

  if (isVideo) {
    const previewing = phase === "preview";
    const full = phase === "full";
    return (
      <div
        className={cn("relative size-full cursor-pointer overflow-hidden bg-black", className)}
        onMouseEnter={startPreview}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (phase === "idle") startPreview();
        }}
      >
        {previewing || full ? (
          <PaidMediaProtectionShell className="size-full">
            <FeedVideoPlayer
              key={full ? "paid-full" : "paid-preview"}
              src={resolvedSrc}
              className="h-full w-full object-cover"
              muted
              playsInline
              preload="auto"
              protect={full && !skipForensic}
              mediaId={mediaId}
              autoPlayOnView
              poster={poster}
              previewMaxSeconds={full ? null : PAID_PREVIEW_SECONDS}
              onPreviewEnded={previewing ? onPreviewEnded : undefined}
              forensicRenderConfig={full && !skipForensic ? forensicRenderConfig : null}
              forensicSessionFailed={full && !skipForensic ? Boolean(sessionError) : false}
              keepMediaLoaded={!feedPreview}
            />
          </PaidMediaProtectionShell>
        ) : (
          <>
            {poster ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={poster}
                alt=""
                className="h-full w-full scale-[1.2] object-cover blur-[28px] brightness-[0.7]"
                loading="lazy"
                draggable={false}
              />
            ) : (
              <div className="size-full bg-neutral-950" />
            )}
            <div className="pointer-events-none absolute inset-0 z-[6] flex items-center justify-center bg-black/40">
              <Lock
                className="h-9 w-9 text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.85)]"
                strokeWidth={2.25}
              />
            </div>
          </>
        )}

        <PaidMediaCheckoutDialog
          open={payOpen}
          onOpenChange={handlePayOpenChange}
          mediaId={mediaId}
          priceKrw={priceKrw}
          paymentsEnabled={paymentsEnabled}
          username={authorUsername}
          postId={postId}
          lockReason={lockReason}
          authorId={authorId}
          subscriptionPriceKrw={subscriptionPriceKrw}
          subscribed={subscribed}
          variant="preview-ended"
          onPurchaseSuccess={() => onPurchaseSuccess?.(mediaId ?? undefined)}
        />
      </div>
    );
  }

  return (
    <div
      className={cn("relative size-full cursor-pointer overflow-hidden bg-muted", className)}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (suppressTileClickRef.current || payOpen) return;
        if (purchased) {
          openPurchasedPhoto();
          return;
        }
        openPay();
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photoTileSrc}
        alt=""
        className="h-full w-full object-cover"
        loading="lazy"
        draggable={false}
        onContextMenu={(e) => e.preventDefault()}
      />
      <PaidMediaCheckoutDialog
        open={payOpen}
        onOpenChange={handlePayOpenChange}
        mediaId={mediaId}
        priceKrw={priceKrw}
        paymentsEnabled={paymentsEnabled}
        username={authorUsername}
        postId={postId}
        lockReason={lockReason}
        authorId={authorId}
        subscriptionPriceKrw={subscriptionPriceKrw}
        subscribed={subscribed}
        variant="photo"
        onPurchaseSuccess={() => onPurchaseSuccess?.(mediaId ?? undefined)}
      />
    </div>
  );
}
