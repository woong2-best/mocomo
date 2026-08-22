"use client";

import { useEffect, useRef, useState } from "react";
import type { ForensicRenderConfig } from "@/lib/watermark/types";
import { embedInvisibleWatermark } from "@/lib/watermark/encoder/spread-spectrum";
import {
  emitForensicCanvasEvent,
  registerForensicDebug,
} from "@/lib/watermark/client/forensic-diagnostics";
import { cn } from "@/lib/utils";

type Props = {
  src: string;
  alt?: string;
  className?: string;
  config: ForensicRenderConfig;
  mediaId?: string | null;
  onMarked?: () => void;
  onFailed?: (message: string) => void;
};

async function loadBitmap(src: string): Promise<ImageBitmap> {
  const res = await fetch(src, { credentials: "include", cache: "no-store" });
  if (!res.ok) throw new Error(`Paid media fetch failed (${res.status})`);
  const blob = await res.blob();
  return createImageBitmap(blob);
}

function resolvePaintSize(
  wrap: HTMLElement,
  bitmap: ImageBitmap
): { width: number; height: number } | null {
  let w = wrap.clientWidth;
  let h = wrap.clientHeight;
  if (w >= 8 && h >= 8) return { width: w, height: h };

  w = wrap.offsetWidth;
  h = wrap.offsetHeight;
  if (w >= 8 && h >= 8) return { width: w, height: h };

  const parent = wrap.parentElement;
  if (parent) {
    w = parent.clientWidth;
    h = parent.clientHeight;
    if (w >= 8 && h >= 8) return { width: w, height: h };
  }

  if (bitmap.width >= 8 && bitmap.height >= 8) {
    w = Math.max(w, bitmap.width);
    h = Math.max(h, Math.round(bitmap.height * (w / bitmap.width)));
    if (w >= 8 && h >= 8) return { width: w, height: h };
  }

  return null;
}

/**
 * Embeds the carrier at the **displayed** pixel size so OS screenshots of the
 * player match detector coordinates (not naturalWidth of the origin file).
 */
export function ForensicImageCanvas({
  src,
  alt = "",
  className,
  config,
  mediaId = null,
  onMarked,
  onFailed,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bitmapRef = useRef<ImageBitmap | null>(null);
  const [ready, setReady] = useState(false);
  const markedRef = useRef(false);
  const failedRef = useRef(false);

  useEffect(() => {
    registerForensicDebug();
  }, []);

  useEffect(() => {
    let cancelled = false;
    let ro: ResizeObserver | null = null;
    let retryTimer = 0;
    let failTimer = 0;

    setReady(false);
    markedRef.current = false;
    failedRef.current = false;

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

      const size = resolvePaintSize(wrap, bitmap);
      if (!size) {
        retryTimer = window.setTimeout(paint, 50);
        return;
      }

      const { width: w, height: h } = size;
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) {
        fail("Canvas 2D unavailable");
        return;
      }

      ctx.drawImage(bitmap, 0, 0, w, h);
      const imageData = ctx.getImageData(0, 0, w, h);
      embedInvisibleWatermark({ width: w, height: h, data: imageData.data }, config, 0);
      ctx.putImageData(imageData, 0, 0);
      setReady(true);
      if (!markedRef.current) {
        markedRef.current = true;
        onMarked?.();
      }
      emitForensicCanvasEvent({
        phase: "RENDERED",
        mediaId,
        sessionId: config.sessionId,
        width: w,
        height: h,
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
          ro = new ResizeObserver(() => paint());
          ro.observe(wrap);
          if (wrap.parentElement) ro.observe(wrap.parentElement);
        }
        failTimer = window.setTimeout(() => {
          if (!markedRef.current) fail("Canvas render timed out");
        }, 12_000);
      } catch (e) {
        if (cancelled) return;
        fail(e instanceof Error ? e.message : "Image load failed");
      }
    })();

    return () => {
      cancelled = true;
      ro?.disconnect();
      window.clearTimeout(retryTimer);
      window.clearTimeout(failTimer);
      bitmapRef.current?.close();
      bitmapRef.current = null;
    };
  }, [src, config, onMarked, onFailed, mediaId]);

  return (
    <div ref={wrapRef} className={cn("relative h-full w-full overflow-hidden", className)}>
      <canvas
        ref={canvasRef}
        data-forensic-canvas={ready ? "ready" : "loading"}
        data-forensic-media-id={mediaId ?? undefined}
        data-forensic-session-id={config.sessionId}
        className={cn("block h-full w-full object-cover", !ready && "opacity-0")}
        aria-label={alt}
        role="img"
      />
    </div>
  );
}
