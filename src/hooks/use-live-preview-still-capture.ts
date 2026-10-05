"use client";

import { useEffect, useRef } from "react";
import { uploadImageBlob } from "@/lib/client-upload";
import { saveLivePreviewStill } from "@/actions/live-preview-still";

const FIRST_MS = 2_500;
const REPEAT_MS = 180_000;

async function frameToBlob(
  video: HTMLVideoElement | null,
  canvas: HTMLCanvasElement | null
): Promise<Blob | null> {
  const out = document.createElement("canvas");
  out.width = 640;
  out.height = 360;
  const ctx = out.getContext("2d");
  if (!ctx) return null;
  try {
    if (canvas && canvas.width > 0) {
      ctx.drawImage(canvas, 0, 0, out.width, out.height);
    } else if (video && video.videoWidth > 0) {
      ctx.drawImage(video, 0, 0, out.width, out.height);
    } else {
      return null;
    }
  } catch {
    return null;
  }
  return new Promise((resolve) => {
    out.toBlob((blob) => resolve(blob), "image/jpeg", 0.72);
  });
}

/** While the host is on-air, grab a still and store it as the hub poster. */
export function useLivePreviewStillCapture(opts: {
  channelId: string;
  enabled: boolean;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  previewHostRef?: React.RefObject<HTMLDivElement | null>;
}) {
  const { channelId, enabled, videoRef, previewHostRef } = opts;
  const busyRef = useRef(false);

  useEffect(() => {
    if (!enabled || !channelId) return;
    let cancelled = false;

    async function capture() {
      if (busyRef.current || cancelled) return;
      busyRef.current = true;
      try {
        const canvas =
          previewHostRef?.current?.querySelector("canvas") ?? null;
        const blob = await frameToBlob(videoRef.current, canvas);
        if (!blob || cancelled) return;
        const url = await uploadImageBlob(blob, `live-still-${channelId}.jpg`);
        if (cancelled || !url) return;
        await saveLivePreviewStill(channelId, url);
      } catch {
        /* best-effort */
      } finally {
        busyRef.current = false;
      }
    }

    const first = window.setTimeout(() => void capture(), FIRST_MS);
    const repeat = window.setInterval(() => void capture(), REPEAT_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(first);
      window.clearInterval(repeat);
    };
  }, [channelId, enabled, previewHostRef, videoRef]);
}
