"use client";

import { useEffect, useRef, useState } from "react";
import type { ForensicRenderConfig } from "@/lib/watermark/types";
import { embedInvisibleWatermark } from "@/lib/watermark/encoder/spread-spectrum";
import { cn } from "@/lib/utils";

type Props = {
  src: string;
  alt?: string;
  className?: string;
  config: ForensicRenderConfig;
  loading?: "lazy" | "eager";
};

/** Draws a still image through canvas so the central 4-quadrant carrier is embedded. */
export function ForensicImageCanvas({ src, alt = "", className, config, loading = "lazy" }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setReady(false);
    setFailed(false);

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.decoding = "async";
    img.loading = loading;

    img.onload = () => {
      if (cancelled) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      if (!w || !h) {
        setFailed(true);
        return;
      }

      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) {
        setFailed(true);
        return;
      }

      ctx.drawImage(img, 0, 0, w, h);
      const imageData = ctx.getImageData(0, 0, w, h);
      embedInvisibleWatermark({ width: w, height: h, data: imageData.data }, config, 0);
      ctx.putImageData(imageData, 0, 0);
      setReady(true);
    };

    img.onerror = () => {
      if (!cancelled) setFailed(true);
    };

    img.src = src;

    return () => {
      cancelled = true;
    };
  }, [src, config, loading]);

  if (failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={alt} className={className} loading={loading} draggable={false} />
    );
  }

  return (
    <canvas
      ref={canvasRef}
      className={cn(className, !ready && "opacity-0")}
      aria-label={alt}
      role="img"
    />
  );
}
