"use client";

import { useEffect, useRef, useState } from "react";
import type { ForensicRenderConfig } from "@/lib/watermark/types";
import {
  embedCaptureResilientWatermark,
  verifyForensicCaptureFrame,
} from "@/lib/watermark/encoder/spread-spectrum";
import {
  emitForensicCanvasEvent,
  registerForensicDebug,
} from "@/lib/watermark/client/forensic-diagnostics";
import { cn } from "@/lib/utils";
import {
  alignPaintSizeToDisplay,
  drawSourceFit,
  resolveForensicPaintSize,
} from "@/components/media/forensic-canvas-fit";

type Props = {
  src: string;
  alt?: string;
  className?: string;
  config: ForensicRenderConfig;
  mediaId?: string | null;
  objectFit?: "cover" | "contain";
  /** Feed tile cover mode: fill the parent box instead of intrinsic contain sizing. */
  fillParent?: boolean;
  onMarked?: () => void;
  onFailed?: (message: string) => void;
};

async function loadBitmap(src: string): Promise<ImageBitmap> {
  const res = await fetch(src, { credentials: "include", cache: "no-store" });
  if (!res.ok) throw new Error(`Paid media fetch failed (${res.status})`);
  const blob = await res.blob();
  return createImageBitmap(blob);
}

export function ForensicImageCanvas({
  src,
  alt = "",
  className,
  config,
  mediaId = null,
  objectFit = "cover",
  fillParent = false,
  onMarked,
  onFailed,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bitmapRef = useRef<ImageBitmap | null>(null);
  const layoutHandlerRef = useRef<(() => void) | null>(null);
  const [ready, setReady] = useState(false);
  const failedRef = useRef(false);
  const notifiedRef = useRef(false);
  const readyRef = useRef(false);

  useEffect(() => {
    registerForensicDebug();
  }, []);

  useEffect(() => {
    let cancelled = false;
    let ro: ResizeObserver | null = null;
    let retryTimer = 0;
    let failTimer = 0;

    setReady(false);
    readyRef.current = false;
    failedRef.current = false;
    notifiedRef.current = false;

    emitForensicCanvasEvent({
      phase: "CREATED",
      mediaId,
      sessionId: config.sessionId,
    });

    const fail = (message: string) => {
      if (cancelled || failedRef.current) return;
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
      if (cancelled || failedRef.current) return;
      const wrap = wrapRef.current;
      const canvas = canvasRef.current;
      const bitmap = bitmapRef.current;
      if (!wrap || !canvas || !bitmap) return;

      const size = resolveForensicPaintSize(wrap, bitmap.width, bitmap.height, objectFit, {
        fillParent: fillParent && objectFit === "cover",
      });
      if (!size) {
        retryTimer = window.setTimeout(paint, 50);
        return;
      }

      const wrapMode = fillParent && objectFit === "cover" ? "fill" : "fixed";
      const aligned = alignPaintSizeToDisplay(wrap, canvas, size, wrapMode);
      if (!aligned) {
        retryTimer = window.setTimeout(paint, 50);
        return;
      }

      const { width: w, height: h } = aligned;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) {
        fail("Canvas 2D unavailable");
        return;
      }

      drawSourceFit(ctx, bitmap, bitmap.width, bitmap.height, w, h, objectFit);
      const imageData = ctx.getImageData(0, 0, w, h);
      embedCaptureResilientWatermark({ width: w, height: h, data: imageData.data }, config, 0);
      if (!verifyForensicCaptureFrame({ width: w, height: h, data: imageData.data }, config, 0)) {
        // Layout can settle after the first paint (lightbox flex/max-h). Do not tear down
        // a good frame when a follow-up resize repaint fails verification.
        if (readyRef.current) return;
        fail("Watermark capture verification failed");
        return;
      }
      ctx.putImageData(imageData, 0, 0);
      readyRef.current = true;
      setReady(true);
      emitForensicCanvasEvent({
        phase: "RENDERED",
        mediaId,
        sessionId: config.sessionId,
        width: w,
        height: h,
        cssWidth: aligned.cssWidth,
        cssHeight: aligned.cssHeight,
        devicePixelRatio: aligned.devicePixelRatio,
      });
    };

    void (async () => {
      try {
        const bitmap = await loadBitmap(src);
        if (cancelled) {
          bitmap.close();
          return;
        }
        bitmapRef.current = bitmap;
        paint();
        const wrap = wrapRef.current;
        if (wrap) {
          const onLayoutChange = () => {
            if (readyRef.current && fillParent && objectFit === "cover") {
              paint();
              return;
            }
            if (!readyRef.current) paint();
          };
          layoutHandlerRef.current = onLayoutChange;
          ro = new ResizeObserver(onLayoutChange);
          ro.observe(wrap);
          if (wrap.parentElement) ro.observe(wrap.parentElement);
          window.addEventListener("resize", onLayoutChange);
        }
        failTimer = window.setTimeout(() => {
          if (!readyRef.current && !failedRef.current) fail("Canvas render timed out");
        }, 12_000);
      } catch (e) {
        if (cancelled) return;
        fail(e instanceof Error ? e.message : "Image load failed");
      }
    })();

    return () => {
      cancelled = true;
      ro?.disconnect();
      const layoutHandler = layoutHandlerRef.current;
      if (layoutHandler) window.removeEventListener("resize", layoutHandler);
      layoutHandlerRef.current = null;
      window.clearTimeout(retryTimer);
      window.clearTimeout(failTimer);
      bitmapRef.current?.close();
      bitmapRef.current = null;
    };
  }, [src, config, objectFit, onFailed, mediaId, fillParent]);

  useEffect(() => {
    if (!ready || notifiedRef.current) return;
    notifiedRef.current = true;
    onMarked?.();
  }, [ready, onMarked]);

  return (
    <div
      ref={wrapRef}
      className={cn(
        "relative overflow-hidden",
        fillParent && objectFit === "cover"
          ? "size-full"
          : "inline-block shrink-0",
        className
      )}
    >
      <canvas
        ref={canvasRef}
        data-forensic-canvas={ready ? "ready" : "loading"}
        data-forensic-media-id={mediaId ?? undefined}
        data-forensic-session-id={config.sessionId}
        className={cn("block", !ready && "opacity-0")}
        aria-label={alt}
        role="img"
      />
    </div>
  );
}
