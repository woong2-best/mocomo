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
  loading?: "lazy" | "eager";
  onMarked?: () => void;
};

async function loadBitmap(src: string): Promise<ImageBitmap> {
  const res = await fetch(src, { credentials: "include", cache: "no-store" });
  if (!res.ok) throw new Error(`Paid media fetch failed (${res.status})`);
  const blob = await res.blob();
  return createImageBitmap(blob);
}

/**
 * Embeds the carrier at the **displayed** pixel size so OS screenshots of the
 * player match detector coordinates (not naturalWidth of the origin file).
 *
 * Loads bytes via fetch→blob so canvas stays untainted without CDN CORS headers.
 */
export function ForensicImageCanvas({
  src,
  alt = "",
  className,
  config,
  mediaId = null,
  loading = "lazy",
  onMarked,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bitmapRef = useRef<ImageBitmap | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [failMessage, setFailMessage] = useState<string | null>(null);
  const markedRef = useRef(false);

  useEffect(() => {
    registerForensicDebug();
  }, []);

  useEffect(() => {
    let cancelled = false;
    let ro: ResizeObserver | null = null;

    setReady(false);
    setFailed(false);
    setFailMessage(null);
    markedRef.current = false;

    emitForensicCanvasEvent({
      phase: "CREATED",
      mediaId,
      sessionId: config.sessionId,
    });

    const paint = () => {
      if (cancelled) return;
      const wrap = wrapRef.current;
      const canvas = canvasRef.current;
      const bitmap = bitmapRef.current;
      if (!wrap || !canvas || !bitmap) return;

      const w = Math.max(1, wrap.clientWidth);
      const h = Math.max(1, wrap.clientHeight);
      if (w < 8 || h < 8) return;

      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) {
        setFailed(true);
        setFailMessage("Canvas 2D unavailable");
        emitForensicCanvasEvent({
          phase: "FALLBACK",
          mediaId,
          sessionId: config.sessionId,
          message: "Canvas 2D unavailable",
        });
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
        if (!wrap) return;
        ro = new ResizeObserver(() => paint());
        ro.observe(wrap);
      } catch (e) {
        if (cancelled) return;
        const message = e instanceof Error ? e.message : "Image load failed";
        setFailed(true);
        setFailMessage(message);
        emitForensicCanvasEvent({
          phase: "FALLBACK",
          mediaId,
          sessionId: config.sessionId,
          message,
        });
      }
    })();

    return () => {
      cancelled = true;
      ro?.disconnect();
      bitmapRef.current?.close();
      bitmapRef.current = null;
    };
  }, [src, config, loading, onMarked, mediaId]);

  if (failed) {
    return (
      <div
        ref={wrapRef}
        className={cn(
          "relative flex items-center justify-center overflow-hidden bg-muted/50 text-center",
          className
        )}
        data-forensic-state="failed"
        role="img"
        aria-label={alt}
      >
        <p className="px-3 text-xs text-muted-foreground">
          Forensic render unavailable
          {failMessage ? `: ${failMessage}` : ""}
        </p>
      </div>
    );
  }

  return (
    <div ref={wrapRef} className={cn("relative overflow-hidden", className)}>
      <canvas
        ref={canvasRef}
        data-forensic-canvas={ready ? "ready" : "loading"}
        data-forensic-media-id={mediaId ?? undefined}
        data-forensic-session-id={config.sessionId}
        className={cn("h-full w-full object-cover", !ready && "opacity-0")}
        aria-label={alt}
        role="img"
      />
    </div>
  );
}
