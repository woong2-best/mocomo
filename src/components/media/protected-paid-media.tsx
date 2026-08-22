"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { shouldProtectPaidMediaView } from "@/lib/paid-media-protection";
import { PaidMediaProtectionShell } from "@/components/media/paid-media-protection-shell";
import { FeedVideoPlayer } from "@/components/media/feed-video-player";
import { ForensicImageCanvas } from "@/components/media/forensic-image-canvas";
import { useForensicWatermarkSession } from "@/components/media/use-forensic-watermark-session";
import {
  PAID_PREVIEW_SECONDS,
  resolveClientPaidMediaSrc,
  type WatermarkContentKind,
} from "@/lib/paid-media-playback";

type Props = {
  type: string;
  src: string;
  className?: string;
  /** Feed tiles: cover. Lightbox / detail: contain. */
  objectFit?: "cover" | "contain";
  mediaPriceKrw?: number | null;
  postInstantPurchasePriceKrw?: number | null;
  locked?: boolean;
  muted?: boolean;
  playsInline?: boolean;
  preload?: "none" | "metadata" | "auto";
  loading?: "lazy" | "eager";
  alt?: string;
  controls?: boolean;
  mediaId?: string | null;
  autoPlayOnView?: boolean;
  onDoubleTapLike?: () => void;
  onOpenImmersive?: () => void;
  poster?: string;
  contentKind?: WatermarkContentKind;
};

function inferObjectFit(className: string | undefined, explicit?: "cover" | "contain") {
  if (explicit) return explicit;
  if (className?.includes("object-contain")) return "contain";
  return "cover";
}

export function ProtectedPaidMedia({
  type,
  src,
  className,
  objectFit: objectFitProp,
  mediaPriceKrw,
  postInstantPurchasePriceKrw,
  locked,
  muted = true,
  playsInline = true,
  preload = "metadata",
  loading = "lazy",
  alt = "",
  controls = false,
  mediaId,
  autoPlayOnView = true,
  onDoubleTapLike,
  onOpenImmersive,
  poster,
  contentKind = "POST_MEDIA",
}: Props) {
  const protect = shouldProtectPaidMediaView({
    mediaPriceKrw,
    postInstantPurchasePriceKrw,
    locked,
  });

  const isVideo = type === "VIDEO";
  const objectFit = inferObjectFit(className, objectFitProp);
  const fillsTile = Boolean(className?.includes("h-full"));
  const resolvedSrc = resolveClientPaidMediaSrc({
    url: src,
    mediaId,
    locked,
    priceKrw: mediaPriceKrw ?? postInstantPurchasePriceKrw,
  });
  const forensicEnabled = protect && !locked && Boolean(mediaId);
  const viewResetKey = `${mediaId ?? ""}:${resolvedSrc}`;
  const { config: forensicRenderConfig, error: sessionError } = useForensicWatermarkSession(
    mediaId,
    forensicEnabled,
    contentKind
  );
  const [canvasFailed, setCanvasFailed] = useState(false);
  const [canvasReady, setCanvasReady] = useState(false);

  useEffect(() => {
    setCanvasFailed(false);
    setCanvasReady(false);
  }, [viewResetKey, forensicRenderConfig?.sessionId]);

  if (!resolvedSrc) {
    return (
      <div
        className={cn("bg-muted", className)}
        aria-hidden
      />
    );
  }

  if (locked) {
    if (isVideo) {
      return (
        <FeedVideoPlayer
          src={resolvedSrc}
          className={className}
          muted
          playsInline={playsInline}
          preload="auto"
          controls={false}
          protect={false}
          mediaId={mediaId}
          autoPlayOnView={autoPlayOnView}
          poster={poster}
          previewMaxSeconds={PAID_PREVIEW_SECONDS}
        />
      );
    }
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={resolvedSrc}
        alt={alt}
        className={cn(className, "pointer-events-none")}
        loading={loading}
        draggable={false}
        onContextMenu={(e) => e.preventDefault()}
      />
    );
  }

  if (isVideo) {
    const player = (
      <FeedVideoPlayer
        src={resolvedSrc}
        className={className}
        muted={muted}
        playsInline={playsInline}
        preload={preload}
        controls={controls}
        protect={protect}
        mediaId={mediaId}
        autoPlayOnView={autoPlayOnView}
        onDoubleTapLike={onDoubleTapLike}
        onOpenImmersive={onOpenImmersive}
        poster={poster}
        forensicRenderConfig={forensicRenderConfig}
        forensicSessionFailed={Boolean(sessionError)}
      />
    );
    if (!protect) return player;
    return (
      <PaidMediaProtectionShell className={cn("overflow-hidden", className)}>
        {player}
      </PaidMediaProtectionShell>
    );
  }

  const useForensicCanvas =
    forensicEnabled && forensicRenderConfig && !sessionError && !canvasFailed;

  const imageNode = (
    <div
      className={cn(
        "relative",
        fillsTile ? "size-full" : "inline-flex max-w-full max-h-full"
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={resolvedSrc}
        alt={alt}
        className={cn(
          className,
          protect && "pointer-events-none",
          useForensicCanvas && canvasReady && "sr-only"
        )}
        loading={loading}
        draggable={false}
        onContextMenu={(e) => e.preventDefault()}
      />
      {useForensicCanvas ? (
        <ForensicImageCanvas
          src={resolvedSrc}
          alt={alt}
          mediaId={mediaId}
          objectFit={objectFit}
          className="pointer-events-none absolute inset-0"
          config={forensicRenderConfig}
          onMarked={() => setCanvasReady(true)}
          onFailed={() => setCanvasFailed(true)}
        />
      ) : null}
    </div>
  );

  if (!protect) return imageNode;

  return (
    <PaidMediaProtectionShell
      className={cn(
        "overflow-hidden",
        fillsTile ? "size-full" : "inline-flex max-w-full max-h-full"
      )}
    >
      <div className={cn("relative", fillsTile ? "size-full" : "inline-flex max-w-full max-h-full")}>
        {imageNode}
        <div
          className="absolute inset-0 z-[1]"
          aria-hidden
          onContextMenu={(e) => e.preventDefault()}
        />
      </div>
    </PaidMediaProtectionShell>
  );
}
