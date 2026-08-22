"use client";

import { cn } from "@/lib/utils";
import { shouldProtectPaidMediaView } from "@/lib/paid-media-protection";
import { PaidMediaProtectionShell } from "@/components/media/paid-media-protection-shell";
import { FeedVideoPlayer } from "@/components/media/feed-video-player";
import { ForensicImageCanvas } from "@/components/media/forensic-image-canvas";
import { useForensicWatermarkSession } from "@/components/media/use-forensic-watermark-session";
import {
  forensicViewAutoMs,
  useForensicViewReady,
} from "@/components/media/use-forensic-view-ready";
import type { WatermarkContentKind } from "@/lib/paid-media-playback";

type Props = {
  type: string;
  src: string;
  className?: string;
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

export function ProtectedPaidMedia({
  type,
  src,
  className,
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
  const forensicEnabled = protect && !locked && Boolean(mediaId);
  const viewResetKey = `${mediaId ?? ""}:${src}`;
  const { viewReady, markViewReady } = useForensicViewReady(forensicEnabled, viewResetKey, {
    autoAfterMs: isVideo ? undefined : forensicViewAutoMs(),
  });
  const { config: forensicRenderConfig } = useForensicWatermarkSession(
    mediaId,
    forensicEnabled,
    contentKind,
    viewReady
  );

  if (locked || !src.trim()) {
    return (
      <div
        className={cn("bg-muted", className)}
        aria-hidden
      />
    );
  }

  if (isVideo) {
    const player = (
      <FeedVideoPlayer
        src={src}
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
        onForensicViewReady={forensicEnabled ? markViewReady : undefined}
      />
    );
    if (!protect) return player;
    return (
      <PaidMediaProtectionShell className={cn("overflow-hidden", className)}>
        {player}
      </PaidMediaProtectionShell>
    );
  }

  const imageNode =
    protect && forensicEnabled && viewReady ? (
      forensicRenderConfig ? (
        <ForensicImageCanvas
          src={src}
          alt={alt}
          className={cn(className, "pointer-events-none h-full w-full")}
          config={forensicRenderConfig}
          loading={loading}
        />
      ) : (
        <div className={cn(className, "relative bg-muted/40 animate-pulse")} aria-hidden />
      )
    ) : (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        className={cn(className, protect && "pointer-events-none")}
        loading={loading}
        draggable={false}
        onContextMenu={(e) => e.preventDefault()}
      />
    );

  const media = imageNode;

  if (!protect) return media;

  return (
    <PaidMediaProtectionShell className={cn("overflow-hidden", className)}>
      <div className="relative w-full h-full">
        {media}
        {/* 길게 눌러 저장·드래그 방지 */}
        <div
          className="absolute inset-0 z-[1]"
          aria-hidden
          onContextMenu={(e) => e.preventDefault()}
        />
      </div>
    </PaidMediaProtectionShell>
  );
}
