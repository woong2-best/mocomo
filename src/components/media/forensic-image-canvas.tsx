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
  onMarked?: () => void;
};

/**
 * Embeds the carrier at the **displayed** pixel size so OS screenshots of the
 * player match detector coordinates (not naturalWidth of the origin file).
 */
export function ForensicImageCanvas({
  src,
  alt = "",
  className,
  config,
  loading = "lazy",
  onMarked,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const markedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    setReady(false);
    setFailed(false);
    markedRef.current = false;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.decoding = "async";
    img.loading = loading;
    imgRef.current = img;

    let ro: ResizeObserver | null = null;

    const paint = () => {
      if (cancelled) return;
      const wrap = wrapRef.current;
      const canvas = canvasRef.current;
      const source = imgRef.current;
      if (!wrap || !canvas || !source?.naturalWidth) return;

      const w = Math.max(1, wrap.clientWidth);
      const h = Math.max(1, wrap.clientHeight);
      if (w < 8 || h < 8) return;

      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) {
        setFailed(true);
        return;
      }

      ctx.drawImage(source, 0, 0, w, h);
      const imageData = ctx.getImageData(0, 0, w, h);
      embedInvisibleWatermark({ width: w, height: h, data: imageData.data }, config, 0);
      ctx.putImageData(imageData, 0, 0);
      setReady(true);
      if (!markedRef.current) {
        markedRef.current = true;
        onMarked?.();
      }
    };

    img.onload = () => {
      if (cancelled) return;
      paint();
      const wrap = wrapRef.current;
      if (!wrap) return;
      ro = new ResizeObserver(() => paint());
      ro.observe(wrap);
    };

    img.onerror = () => {
      if (!cancelled) setFailed(true);
    };

    img.src = src;

    return () => {
      cancelled = true;
      ro?.disconnect();
    };
  }, [src, config, loading, onMarked]);

  if (failed) {
    return (
      <div ref={wrapRef} className={cn("relative overflow-hidden", className)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} className="h-full w-full object-cover" loading={loading} draggable={false} />
      </div>
    );
  }

  return (
    <div ref={wrapRef} className={cn("relative overflow-hidden", className)}>
      <canvas
        ref={canvasRef}
        className={cn("h-full w-full object-cover", !ready && "opacity-0")}
        aria-label={alt}
        role="img"
      />
    </div>
  );
}
