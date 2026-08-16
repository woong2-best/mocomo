"use client";

import { useEffect, useRef } from "react";
import type { ForensicRenderConfig } from "@/lib/watermark/types";
import {
  embedRegionPixels,
  forensicFrameRegions,
} from "@/lib/watermark/encoder/spread-spectrum";

type Props = {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  active: boolean;
  config: ForensicRenderConfig | null;
  className?: string;
};

type FrameCallbackVideo = HTMLVideoElement & {
  requestVideoFrameCallback?: (cb: () => void) => number;
  cancelVideoFrameCallback?: (handle: number) => void;
};

/** Draws playback through a canvas so each frame carries invisible forensic modulation. */
export function ForensicVideoCanvas({ videoRef, active, config, className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef(0);

  useEffect(() => {
    if (!active || !config) return;

    let running = true;
    let rafHandle = 0;
    let frameHandle = 0;

    const video = videoRef.current as FrameCallbackVideo | null;
    // Driving off decoded video frames avoids repeating the whole pipeline on
    // every display refresh, which is pure waste at 60Hz for a 30fps source.
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
      const source = videoRef.current;
      const canvas = canvasRef.current;
      if (!source || !canvas || source.readyState < 2) {
        schedule(tick);
        return;
      }

      const vw = source.videoWidth;
      const vh = source.videoHeight;
      if (!vw || !vh) {
        schedule(tick);
        return;
      }

      if (canvas.width !== vw || canvas.height !== vh) {
        canvas.width = vw;
        canvas.height = vh;
      }

      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;

      ctx.drawImage(source, 0, 0, vw, vh);

      const { temporalShift, regions } = forensicFrameRegions(
        vw,
        vh,
        frameRef.current,
        config.temporalPeriod
      );

      for (const plan of regions) {
        const { x, y, w, h } = plan.region;
        const cx = Math.max(0, Math.min(vw - 1, x));
        const cy = Math.max(0, Math.min(vh - 1, y));
        const cw = Math.max(1, Math.min(w, vw - cx));
        const ch = Math.max(1, Math.min(h, vh - cy));
        if (cw !== w || ch !== h) continue;

        const imageData = ctx.getImageData(cx, cy, cw, ch);
        embedRegionPixels(
          { width: cw, height: ch, data: imageData.data },
          plan,
          config,
          temporalShift
        );
        ctx.putImageData(imageData, cx, cy);
      }

      frameRef.current += 1;
      schedule(tick);
    };

    schedule(tick);

    return () => {
      running = false;
      cancelAnimationFrame(rafHandle);
      if (frameHandle && video?.cancelVideoFrameCallback) {
        video.cancelVideoFrameCallback(frameHandle);
      }
    };
  }, [active, config, videoRef]);

  if (!active || !config) return null;

  return <canvas ref={canvasRef} className={className} aria-hidden />;
}
