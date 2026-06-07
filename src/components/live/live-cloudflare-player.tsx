"use client";

import { LiveOverlayLayer } from "@/components/live/overlays/live-overlay-layer";

import { useCallback, useEffect, useRef, useState } from "react";
import type HlsType from "hls.js";
import { Loader2, Radio } from "lucide-react";

/** Cloudflare Stream Live — CDN HLS 직접 재생 (Vercel 프록시 없음) */
export function LiveCloudflarePlayer({
  channelId,
  hlsUrl: initialHlsUrl,
}: {
  channelId: string;
  hlsUrl?: string | null;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<HlsType | null>(null);
  const [status, setStatus] = useState<"loading" | "playing" | "waiting">("loading");
  const [hint, setHint] = useState("Cloudflare Stream 연결 중…");
  const [, setHlsUrl] = useState<string | null>(initialHlsUrl ?? null);

  const attachHls = useCallback((url: string) => {
    const video = videoRef.current;
    if (!video) return;

    hlsRef.current?.destroy();
    hlsRef.current = null;

    const onPlaying = () => {
      setStatus("playing");
      setHint("");
    };

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = url;
      video.addEventListener("loadedmetadata", onPlaying, { once: true });
      video.play().catch(() => undefined);
      return;
    }

    void import("hls.js").then(({ default: Hls }) => {
      if (!videoRef.current || !Hls.isSupported()) {
        setHint("HLS 미지원 브라우저");
        return;
      }
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        liveSyncDurationCount: 2,
        manifestLoadingMaxRetry: 30,
        fragLoadingMaxRetry: 30,
      });
      hlsRef.current = hls;
      hls.loadSource(url);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, onPlaying);
      hls.on(Hls.Events.FRAG_LOADED, onPlaying);
      hls.on(Hls.Events.ERROR, (_e, data) => {
        if (!data.fatal) return;
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
          setStatus("waiting");
          setHint("방송 시작 후 5~15초 기다려 주세요…");
          hls.startLoad();
          return;
        }
        setStatus("waiting");
        setHint("재생 오류 — 방송을 다시 시작한 뒤 새로고침해 주세요");
      });
    });
  }, []);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/live/${channelId}/playback`, {
        credentials: "include",
        cache: "no-store",
      });
      const body = await res.json().catch(() => ({}));
      const url = typeof body.hlsUrl === "string" ? body.hlsUrl : null;
      const onAir = !!body.srsOnAir || !!body.cloudflareLive;
      const playable = !!body.srsPlayable || !!body.cloudflarePlayable;

      if (url && playable) {
        setHlsUrl(url);
        attachHls(url);
        return;
      }
      if (onAir && url) {
        setHlsUrl(url);
        setStatus("waiting");
        setHint("송출 감지 · HLS 준비 중 (5~15초)…");
        attachHls(url);
        return;
      }
      setStatus("waiting");
      setHint(body.message ?? "스트리머가 방송을 시작하면 화면이 나타납니다");
    } catch {
      setHint("재생 정보를 불러오지 못했습니다");
    }
  }, [channelId, attachHls]);

  useEffect(() => {
    if (initialHlsUrl) {
      attachHls(initialHlsUrl);
    }
    void refresh();
    const poll = setInterval(() => void refresh(), 10000);
    return () => {
      clearInterval(poll);
      hlsRef.current?.destroy();
    };
  }, [initialHlsUrl, attachHls, refresh]);

  return (
    <div className="relative aspect-video w-full bg-black rounded-2xl overflow-hidden ring-1 ring-border/40">
      <video ref={videoRef} className="w-full h-full object-contain" playsInline controls autoPlay muted />
      {status !== "playing" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white/80 gap-2 bg-black/60 pointer-events-none px-4 text-center">
          <Loader2 className="h-10 w-10 animate-spin" />
          <Radio className="h-8 w-8 text-orange-500" />
          <p className="text-sm max-w-md">{hint}</p>
        </div>
      )}
      {status === "playing" && (
        <span className="absolute top-3 left-3 px-2 py-0.5 rounded bg-orange-600 text-white text-[10px] font-bold">
          LIVE · Cloudflare
        </span>
      )}
      <LiveOverlayLayer pointerEvents="none" className="z-[12]" />
    </div>
  );
}
