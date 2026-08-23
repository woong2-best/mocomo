"use client";

import { useEffect, useRef, useState } from "react";
import type { ForensicRenderConfig } from "@/lib/watermark/types";
import {
  alignPaintSizeToDisplay,
  drawSourceFit,
  resolveForensicPaintSize,
} from "@/components/media/forensic-canvas-fit";
import {
  embedCaptureResilientWatermark,
  verifyForensicCaptureFrame,
} from "@/lib/watermark/encoder/spread-spectrum";
import {
  emitForensicCanvasEvent,
  registerForensicDebug,
} from "@/lib/watermark/client/forensic-diagnostics";
import { cn } from "@/lib/utils";

type Props = {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  active: boolean;
  config: ForensicRenderConfig | null;
  className?: string;
  objectFit?: "cover" | "contain";
  mediaId?: string | null;
  onMarked?: () => void;
  onFailed?: (message: string) => void;
};

type FrameCallbackVideo = HTMLVideoElement & {
  requestVideoFrameCallback?: (cb: () => void) => number;
  cancelVideoFrameCallback?: (handle: number) => void;
};

function renderMarkedFrame2d(
  canvas: HTMLCanvasElement,
  wrap: HTMLElement,
  video: HTMLVideoElement,
  config: ForensicRenderConfig,
  frameIndex: number,
  size: NonNullable<ReturnType<typeof resolveForensicPaintSize>>,
  fit: "cover" | "contain",
  wrapMode: "fixed" | "fill" = "fixed"
): boolean {
  const aligned = alignPaintSizeToDisplay(wrap, canvas, size, wrapMode);
  if (!aligned) return false;

  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return false;

  drawSourceFit(
    ctx,
    video,
    video.videoWidth,
    video.videoHeight,
    aligned.width,
    aligned.height,
    fit
  );

  const imageData = ctx.getImageData(0, 0, aligned.width, aligned.height);
  embedCaptureResilientWatermark(
    { width: aligned.width, height: aligned.height, data: imageData.data },
    config,
    frameIndex
  );
  if (
    !verifyForensicCaptureFrame(
      { width: aligned.width, height: aligned.height, data: imageData.data },
      config,
      frameIndex
    )
  ) {
    return false;
  }
  ctx.putImageData(imageData, 0, 0);
  return true;
}

/** Draws playback at display resolution so screenshots match embed coordinates. */
export function ForensicVideoCanvas({
  videoRef,
  active,
  config,
  className,
  objectFit = "cover",
  mediaId = null,
  onMarked,
  onFailed,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef(0);
  const markedRef = useRef(false);
  const failedRef = useRef(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    registerForensicDebug();
  }, []);

  useEffect(() => {
    if (!active || !config) return;

    let running = true;
    let rafHandle = 0;
    let frameHandle = 0;
    let ro: ResizeObserver | null = null;
    let failTimer = 0;

    markedRef.current = false;
    failedRef.current = false;
    setReady(false);
    frameRef.current = 0;

    emitForensicCanvasEvent({
      phase: "CREATED",
      mediaId,
      sessionId: config.sessionId,
    });

    const fail = (message: string) => {
      if (!running || failedRef.current) return;
      failedRef.current = true;
      emitForensicCanvasEvent({
        phase: "FALLBACK",
        mediaId,
        sessionId: config.sessionId,
        message,
      });
      onFailed?.(message);
    };

    const paint = () => {
      if (!running || failedRef.current) return;
      const source = videoRef.current;
      const wrap = wrapRef.current;
      const canvas = canvasRef.current;
      if (!source || !wrap || !canvas || source.readyState < 2) return;

      const vw = source.videoWidth;
      const vh = source.videoHeight;
      if (!vw || !vh) return;

      const size = resolveForensicPaintSize(wrap, vw, vh, objectFit, {
        fillParent: objectFit === "cover",
      });
      if (!size) return;

      const ok = renderMarkedFrame2d(
        canvas,
        wrap,
        source,
        config,
        frameRef.current,
        size,
        objectFit,
        objectFit === "cover" ? "fill" : "fixed"
      );
      if (!ok) {
        if (markedRef.current) return;
        fail(
          canvas.width >= 8
            ? "Watermark capture verification failed"
            : "Canvas 2D unavailable"
        );
        return;
      }

      setReady(true);
      if (!markedRef.current) {
        markedRef.current = true;
        onMarked?.();
      }
      const rect = canvas.getBoundingClientRect();
      emitForensicCanvasEvent({
        phase: "RENDERED",
        mediaId,
        sessionId: config.sessionId,
        width: canvas.width,
        height: canvas.height,
        cssWidth: Math.round(rect.width),
        cssHeight: Math.round(rect.height),
        devicePixelRatio: 1,
      });
      frameRef.current += 1;
    };

    const video = videoRef.current as FrameCallbackVideo | null;
    const useFrameCallback = Boolean(video?.requestVideoFrameCallback);

    const schedule = (tick: () => void) => {
      if (!running) return;
      if (useFrameCallback && video?.requestVideoFrameCallback) {
        frameHandle = video.requestVideoFrameCallback(tick);
      } else {
        rafHandle = requestAnimationFrame(tick);
      }
    };

    const tick = () => {
      if (!running) return;
      paint();
      schedule(tick);
    };

    schedule(tick);

    const wrap = wrapRef.current;
    if (wrap) {
      ro = new ResizeObserver(() => paint());
      ro.observe(wrap);
      if (wrap.parentElement) ro.observe(wrap.parentElement);
    }

    failTimer = window.setTimeout(() => {
      if (!markedRef.current) fail("Canvas render timed out");
    }, 12_000);

    return () => {
      running = false;
      cancelAnimationFrame(rafHandle);
      if (frameHandle && video?.cancelVideoFrameCallback) {
        video.cancelVideoFrameCallback(frameHandle);
      }
      ro?.disconnect();
      window.clearTimeout(failTimer);
    };
  }, [active, config, mediaId, objectFit, onFailed, onMarked, videoRef]);

  if (!active || !config) return null;

  return (
    <div ref={wrapRef} className={cn("relative size-full overflow-hidden", className)}>
      <canvas
        ref={canvasRef}
        data-forensic-canvas={ready ? "ready" : "loading"}
        data-forensic-media-id={mediaId ?? undefined}
        data-forensic-session-id={config.sessionId}
        className={cn("block", !ready && "opacity-0")}
        aria-hidden
      />
    </div>
  );
}
