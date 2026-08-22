"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
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
  /** Author/owner: skip forensic session and show media directly. */
  skipForensic?: boolean;
  /** Lightbox/detail: show image until watermark canvas is ready (no black flash). */
  progressiveWatermark?: boolean;
};

function inferObjectFit(className: string | undefined, explicit?: "cover" | "contain") {
  if (explicit) return explicit;
  if (className?.includes("object-contain")) return "contain";
  return "cover";
}

function isAuthorForensicExempt(sessionError: string | null): boolean {
  return /Author playback|does not require forensic/i.test(sessionError ?? "");
}

function ForensicGateOverlay({
  loading,
  blocked,
  message,
  dark = false,
}: {
  loading?: boolean;
  blocked?: boolean;
  message?: string;
  dark?: boolean;
}) {
  if (!loading && !blocked) return null;
  return (
    <div
      className={cn(
        "absolute inset-0 z-[3] flex items-center justify-center p-4 text-center",
        dark ? "bg-neutral-950" : "bg-black/40"
      )}
    >
      {loading ? (
        <Loader2 className="h-8 w-8 animate-spin text-white/70" aria-hidden />
      ) : (
        <p className="text-sm text-white/80">{message ?? "워터마크를 적용할 수 없습니다."}</p>
      )}
    </div>
  );
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
  skipForensic = false,
  progressiveWatermark = false,
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
  const forensicRequired = protect && !locked && Boolean(mediaId) && !skipForensic;
  const viewResetKey = `${mediaId ?? ""}:${resolvedSrc}`;
  const { config: forensicRenderConfig, error: sessionError, loading: sessionLoading } =
    useForensicWatermarkSession(mediaId, forensicRequired, contentKind);
  const authorForensicExempt = isAuthorForensicExempt(sessionError);
  const useForensicPipeline = forensicRequired && !authorForensicExempt;
  const [canvasFailed, setCanvasFailed] = useState(false);
  const [canvasReady, setCanvasReady] = useState(false);

  const handleCanvasMarked = useCallback(() => setCanvasReady(true), []);
  const handleCanvasFailed = useCallback(() => setCanvasFailed(true), []);

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
        protect={useForensicPipeline ? protect : false}
        mediaId={mediaId}
        autoPlayOnView={autoPlayOnView}
        onDoubleTapLike={onDoubleTapLike}
        onOpenImmersive={onOpenImmersive}
        poster={poster}
        forensicRenderConfig={useForensicPipeline ? forensicRenderConfig : null}
        forensicSessionFailed={useForensicPipeline ? Boolean(sessionError) : false}
      />
    );
    if (!protect) return player;
    return (
      <PaidMediaProtectionShell className={cn("overflow-hidden", className)}>
        {player}
      </PaidMediaProtectionShell>
    );
  }

  const forensicBlocked = useForensicPipeline && (Boolean(sessionError) || canvasFailed);
  const forensicReady =
    useForensicPipeline && Boolean(forensicRenderConfig) && canvasReady && !canvasFailed;
  const forensicLoading =
    useForensicPipeline &&
    !forensicBlocked &&
    !forensicReady &&
    (sessionLoading || !canvasReady);
  const showForensicCanvas =
    useForensicPipeline && Boolean(forensicRenderConfig) && !canvasFailed && !sessionError;

  const plainImage = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={resolvedSrc}
      alt={alt}
      className={className}
      loading={loading}
      draggable={false}
      onContextMenu={(e) => e.preventDefault()}
    />
  );

  const imageNode = (
    <div
      className={cn(
        "relative",
        fillsTile ? "size-full" : "inline-flex max-w-full max-h-full items-center justify-center"
      )}
    >
      {!useForensicPipeline ? (
        plainImage
      ) : (
        <>
          {progressiveWatermark ? plainImage : null}
          {showForensicCanvas && forensicRenderConfig ? (
            <div
              className={cn(
                "pointer-events-none z-[2] flex items-center justify-center",
                progressiveWatermark
                  ? "absolute inset-0"
                  : fillsTile
                    ? "absolute inset-0 size-full"
                    : "relative inline-flex max-h-full max-w-full"
              )}
            >
              <ForensicImageCanvas
                src={resolvedSrc}
                alt={alt}
                mediaId={mediaId}
                objectFit={objectFit}
                className={
                  progressiveWatermark ? undefined : cn(className, "max-h-full max-w-full")
                }
                config={forensicRenderConfig}
                onMarked={handleCanvasMarked}
                onFailed={handleCanvasFailed}
              />
            </div>
          ) : null}
          {forensicLoading ? (
            <div className="pointer-events-none absolute inset-0 z-[3] flex items-center justify-center bg-black/25">
              <Loader2 className="h-8 w-8 animate-spin text-white/80" aria-hidden />
            </div>
          ) : null}
          {forensicBlocked && !progressiveWatermark ? (
            <ForensicGateOverlay
              blocked
              dark={fillsTile}
              message={
                sessionError
                  ? "워터마크 세션을 불러올 수 없습니다. 새로고침 후 다시 시도해 주세요."
                  : "워터마크 적용에 실패했습니다. 새로고침 후 다시 시도해 주세요."
              }
            />
          ) : null}
          {forensicBlocked && progressiveWatermark ? (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[4] bg-black/60 px-3 py-2 text-center text-xs text-white/85">
              {sessionError
                ? "워터마크 세션을 불러올 수 없습니다."
                : "워터마크 적용에 실패했습니다."}
            </div>
          ) : null}
        </>
      )}
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
