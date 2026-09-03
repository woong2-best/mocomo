"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type HlsType from "hls.js";
import { absolutePlaybackUrl, supportsHubVideoPreview } from "@/lib/live-preview";

type Props = {
  channelId: string;
  broadcastMode?: string | null;
  active: boolean;
  posterUrl?: string | null;
  className?: string;
};

/** Muted hero HLS preview — falls back to poster when unavailable. */
export function LiveHeroPreviewVideo({
  channelId,
  broadcastMode,
  active,
  posterUrl,
  className,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<HlsType | null>(null);
  const [src, setSrc] = useState<string | null>(null);
  const canPreview = supportsHubVideoPreview(broadcastMode);

  const cleanup = useCallback(() => {
    hlsRef.current?.destroy();
    hlsRef.current = null;
    const video = videoRef.current;
    if (video) {
      video.pause();
      video.removeAttribute("src");
      video.load();
    }
  }, []);

  useEffect(() => {
    if (!active || !canPreview) {
      cleanup();
      setSrc(null);
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const res = await fetch(`/api/live/${channelId}/playback`, {
          credentials: "include",
          cache: "no-store",
        });
        const body = (await res.json().catch(() => ({}))) as { hlsUrl?: string | null };
        if (cancelled) return;
        const url = body.hlsUrl?.trim();
        if (url) {
          setSrc(absolutePlaybackUrl(url));
        }
      } catch {
        /* poster fallback */
      }
    })();

    return () => {
      cancelled = true;
      cleanup();
    };
  }, [active, canPreview, channelId, cleanup]);

  useEffect(() => {
    if (!active || !src) return;

    const video = videoRef.current;
    if (!video) return;

    let cancelled = false;

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = src;
      video.play().catch(() => undefined);
      return () => {
        cancelled = true;
        cleanup();
      };
    }

    void import("hls.js").then(({ default: Hls }) => {
      if (cancelled || !videoRef.current) return;
      if (!Hls.isSupported()) return;

      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        maxBufferLength: 8,
        xhrSetup: (xhr) => {
          xhr.withCredentials = true;
        },
      });
      hlsRef.current = hls;
      hls.loadSource(src);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(() => undefined);
      });
    });

    return () => {
      cancelled = true;
      cleanup();
    };
  }, [active, src, cleanup]);

  if (!canPreview || !src) {
    if (posterUrl) {
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={posterUrl} alt="" className={className} />
      );
    }
    return null;
  }

  return (
    <video
      ref={videoRef}
      className={className}
      muted
      playsInline
      autoPlay
      loop
      poster={posterUrl ?? undefined}
    />
  );
}
