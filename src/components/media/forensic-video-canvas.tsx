"use client";

import { useEffect, useRef } from "react";
import type { ForensicRenderConfig } from "@/lib/watermark/types";
import { embedInvisibleWatermark } from "@/lib/watermark/encoder/spread-spectrum";

type Props = {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  active: boolean;
  config: ForensicRenderConfig | null;
  className?: string;
};

/** Renders video frames to canvas with invisible forensic watermark modulation */
export function ForensicVideoCanvas({ videoRef, active, config, className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef(0);

  useEffect(() => {
    if (!active || !config) return;
    let raf = 0;
    let running = true;

    const tick = () => {
      if (!running) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState < 2) {
        raf = requestAnimationFrame(tick);
        return;
      }

      const vw = video.videoWidth;
      const vh = video.videoHeight;
      if (!vw || !vh) {
        raf = requestAnimationFrame(tick);
        return;
      }

      if (canvas.width !== vw || canvas.height !== vh) {
        canvas.width = vw;
        canvas.height = vh;
      }

      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;

      ctx.drawImage(video, 0, 0, vw, vh);
      const imageData = ctx.getImageData(0, 0, vw, vh);
      embedInvisibleWatermark(
        { width: vw, height: vh, data: imageData.data },
        config,
        frameRef.current
      );
      ctx.putImageData(imageData, 0, 0);
      frameRef.current += 1;
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => {
      running = false;
      cancelAnimationFrame(raf);
    };
  }, [active, config, videoRef]);

  if (!active || !config) return null;

  return (
    <canvas
      ref={canvasRef}
      className={className}
      aria-hidden
    />
  );
}
