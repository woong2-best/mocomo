"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type HlsType from "hls.js";
import { Loader2, Radio, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

type PlaybackBody = {
  hlsUrl?: string | null;
  flvUrl?: string | null;
  srsOnAir?: boolean;
  srsPlayable?: boolean;
  message?: string;
  probeError?: string;
};

function absoluteUrl(pathOrUrl: string): string {
  if (pathOrUrl.startsWith("http")) return pathOrUrl;
  if (typeof window === "undefined") return pathOrUrl;
  return `${window.location.origin}${pathOrUrl.startsWith("/") ? "" : "/"}${pathOrUrl}`;
}

/** VPS SRS — HLS 우선, HLS 실패 시 HTTP-FLV */
export function LiveSrsPlayer({ channelId }: { channelId: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<HlsType | null>(null);
  const flvRef = useRef<{ destroy: () => void } | null>(null);
  const playingRef = useRef(false);
  const flvTriedRef = useRef(false);
  const [status, setStatus] = useState<"loading" | "playing" | "waiting" | "error">("loading");
  const [playMode, setPlayMode] = useState<"hls" | "flv" | null>(null);
  const [hint, setHint] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const cleanup = useCallback(() => {
    hlsRef.current?.destroy();
    hlsRef.current = null;
    flvRef.current?.destroy();
    flvRef.current = null;
  }, []);

  const markPlaying = useCallback((mode: "hls" | "flv") => {
    playingRef.current = true;
    setPlayMode(mode);
    setStatus("playing");
    setHint("");
  }, []);

  const startFlv = useCallback(async () => {
    if (flvTriedRef.current) return;
    flvTriedRef.current = true;
    const video = videoRef.current;
    if (!video) return;
    cleanup();
    const url = absoluteUrl(`/api/live/${channelId}/flv`);
    try {
      const mod = await import("flv.js");
      const flvjs = mod.default;
      if (!flvjs.isSupported()) return;
      const player = flvjs.createPlayer(
        { type: "flv", url, isLive: true },
        { enableStashBuffer: false, stashInitialSize: 128 }
      );
      flvRef.current = player;
      player.attachMediaElement(video);
      player.load();
      await player.play();
      markPlaying("flv");
    } catch {
      /* keep waiting */
    }
  }, [channelId, cleanup, markPlaying]);

  const startHls = useCallback(
    (hlsPath: string) => {
      const video = videoRef.current;
      if (!video) return;
      cleanup();
      flvTriedRef.current = false;
      playingRef.current = false;
      const url = absoluteUrl(hlsPath);

      const onParsed = () => markPlaying("hls");

      if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = url;
        video.addEventListener("loadedmetadata", onParsed, { once: true });
        video.play().catch(() => undefined);
        return;
      }

      void import("hls.js").then(({ default: Hls }) => {
        if (!videoRef.current || !Hls.isSupported()) {
          void startFlv();
          return;
        }
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
          xhrSetup: (xhr) => {
            xhr.withCredentials = true;
          },
          manifestLoadingMaxRetry: 40,
          fragLoadingMaxRetry: 40,
        });
        hlsRef.current = hls;
        hls.loadSource(url);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, onParsed);
        hls.on(Hls.Events.ERROR, (_e, data) => {
          if (!data.fatal) return;
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            hls.startLoad();
            return;
          }
          void startFlv();
        });
      });
    },
    [cleanup, markPlaying, startFlv]
  );

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/live/${channelId}/playback`, {
        credentials: "include",
        cache: "no-store",
      });
      const body = (await res.json().catch(() => ({}))) as PlaybackBody;
      if (!res.ok) throw new Error("재생 정보를 가져오지 못했습니다");

      const hlsPath = body.hlsUrl ?? `/api/live/${channelId}/hls/index.m3u8`;

      if (body.srsPlayable) {
        startHls(hlsPath);
        return;
      }

      if (body.srsOnAir) {
        setStatus("waiting");
        setHint(
          body.probeError
            ? `HLS 문제: ${body.probeError}`
            : body.message ?? "HLS 세그먼트 준비 중…"
        );
        startHls(hlsPath);
        window.setTimeout(() => {
          if (!playingRef.current) void startFlv();
        }, 10000);
        return;
      }

      setStatus("waiting");
      setHint(body.message ?? "VPS 송출 대기 중 (다중 송출 확인)");
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "재생 실패");
      setStatus("error");
    }
  }, [channelId, startHls, startFlv]);

  useEffect(() => {
    void load();
    const poll = setInterval(() => void load(), 6000);
    return () => {
      clearInterval(poll);
      cleanup();
    };
  }, [load, cleanup]);

  if (status === "error") {
    return (
      <div className="aspect-video rounded-2xl bg-destructive/10 border border-destructive/30 flex flex-col items-center justify-center gap-3 p-6">
        <p className="text-sm text-destructive text-center">{errorMsg}</p>
        <Button variant="outline" size="sm" onClick={() => void load()}>
          <RefreshCw className="h-4 w-4 mr-1" />
          다시 시도
        </Button>
      </div>
    );
  }

  return (
    <div className="relative aspect-video w-full bg-black rounded-2xl overflow-hidden ring-1 ring-border/40">
      <video ref={videoRef} className="w-full h-full object-contain" playsInline controls autoPlay muted />
      {status !== "playing" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white/80 gap-2 bg-black/60 pointer-events-none px-4 text-center">
          <Loader2 className="h-10 w-10 animate-spin" />
          <Radio className="h-8 w-8 text-red-500" />
          <p className="text-sm max-w-md">{hint || "VPS 연결 중…"}</p>
        </div>
      )}
      {status === "playing" && playMode && (
        <span className="absolute top-3 left-3 px-2 py-0.5 rounded bg-red-600 text-white text-[10px] font-bold">
          LIVE · {playMode === "flv" ? "FLV" : "HLS"}
        </span>
      )}
    </div>
  );
}
