"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type HlsType from "hls.js";
import { Loader2, Radio, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

type PlaybackResponse = {
  ok?: boolean;
  hlsUrl?: string | null;
  waiting?: boolean;
  tryLoad?: boolean;
  srsOnAir?: boolean;
  srsPlayable?: boolean;
  message?: string;
  error?: string;
  probeError?: string;
  streamKeyHint?: string;
};

function absoluteHlsUrl(pathOrUrl: string): string {
  if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) {
    return pathOrUrl;
  }
  if (typeof window === "undefined") return pathOrUrl;
  return `${window.location.origin}${pathOrUrl.startsWith("/") ? "" : "/"}${pathOrUrl}`;
}

/** 트위치/치지직 방식 HLS — HTTPS 프록시, SRS 신호 대기 시 자동 재시도 */
export function LiveHlsPlayer({ channelId }: { channelId: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<HlsType | null>(null);
  const [status, setStatus] = useState<"loading" | "waiting" | "playing" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [waitHint, setWaitHint] = useState<string | null>(null);
  const [hlsUrl, setHlsUrl] = useState<string | null>(null);
  const retryRef = useRef(0);

  const attachHls = useCallback((url: string) => {
    const video = videoRef.current;
    if (!video) return () => undefined;

    let cancelled = false;

    const cleanup = () => {
      cancelled = true;
      hlsRef.current?.destroy();
      hlsRef.current = null;
    };

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = url;
      const onMeta = () => {
        if (!cancelled) setStatus("playing");
      };
      video.addEventListener("loadedmetadata", onMeta);
      video.play().catch(() => undefined);
      return () => {
        video.removeEventListener("loadedmetadata", onMeta);
        cleanup();
      };
    }

    void import("hls.js").then(({ default: Hls }) => {
      if (cancelled || !videoRef.current) return;
      if (!Hls.isSupported()) {
        setErrorMsg("이 브라우저는 HLS 재생을 지원하지 않습니다.");
        setStatus("error");
        return;
      }

      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 30,
        liveSyncDurationCount: 3,
        liveMaxLatencyDurationCount: 10,
        manifestLoadingTimeOut: 15000,
        manifestLoadingMaxRetry: 20,
        levelLoadingTimeOut: 15000,
        fragLoadingTimeOut: 25000,
        xhrSetup: (xhr) => {
          xhr.withCredentials = true;
        },
      });
      hlsRef.current = hls;
      hls.loadSource(url);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (!cancelled) {
          setStatus("playing");
          setWaitHint(null);
          retryRef.current = 0;
        }
        video.play().catch(() => undefined);
      });
      hls.on(Hls.Events.ERROR, (_e, data) => {
        if (!data.fatal) return;
        if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
          hls.recoverMediaError();
          return;
        }
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
          setStatus("waiting");
          setWaitHint(
            "OBS 방송 신호 대기 중… OBS에서 「방송 시작」 후 5~20초 기다려 주세요."
          );
          hls.startLoad();
          return;
        }
        setStatus("error");
        setErrorMsg(
          "재생 오류입니다. OBS 키·서버 주소를 확인하고 방송을 재시작한 뒤 새로고침해 주세요."
        );
      });
    });

    return cleanup;
  }, []);

  const loadPlayback = useCallback(async () => {
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/live/${channelId}/playback`, {
        credentials: "include",
        cache: "no-store",
      });
      const body = (await res.json().catch(() => ({}))) as PlaybackResponse;
      if (!res.ok) {
        const detail =
          typeof body.error === "string"
            ? body.error
            : res.status === 401
              ? "로그인이 만료되었습니다. 새로고침 후 다시 로그인해 주세요."
              : "재생 정보를 불러오지 못했습니다.";
        throw new Error(detail);
      }
      if (!body.hlsUrl) {
        setHlsUrl(null);
        setStatus("waiting");
        setWaitHint(body.message ?? "OBS에서 방송을 시작해 주세요.");
        return;
      }

      const url = absoluteHlsUrl(body.hlsUrl);
      setHlsUrl(url);
      setWaitHint(body.message ?? null);

      if (body.srsPlayable) {
        setStatus("loading");
      } else if (body.srsOnAir || body.tryLoad !== false) {
        setStatus("waiting");
      } else {
        setStatus("waiting");
      }
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "재생 실패");
      setStatus("error");
    }
  }, [channelId]);

  useEffect(() => {
    void loadPlayback();
  }, [loadPlayback]);

  useEffect(() => {
    if (!hlsUrl || status === "error") return;
    if (status !== "loading" && status !== "playing") return;
    return attachHls(hlsUrl);
  }, [hlsUrl, status, attachHls]);

  useEffect(() => {
    if (status !== "waiting") return;
    const t = setInterval(() => {
      retryRef.current += 1;
      void loadPlayback();
    }, 3000);
    return () => clearInterval(t);
  }, [status, loadPlayback]);

  useEffect(() => {
    if (status !== "loading" || !hlsUrl) return;
    const t = setTimeout(() => {
      setStatus("waiting");
      setWaitHint("HLS 준비가 지연되고 있습니다. OBS 방송을 유지한 채 잠시만 기다려 주세요…");
      void loadPlayback();
    }, 22000);
    return () => clearTimeout(t);
  }, [status, hlsUrl, loadPlayback]);

  if (status === "error") {
    return (
      <div className="aspect-video rounded-2xl bg-destructive/10 border border-destructive/30 flex flex-col items-center justify-center gap-3 p-6">
        <p className="text-sm text-destructive text-center">{errorMsg}</p>
        <Button variant="outline" size="sm" onClick={() => void loadPlayback()}>
          <RefreshCw className="h-4 w-4 mr-1" />
          다시 시도
        </Button>
      </div>
    );
  }

  return (
    <div className="relative aspect-video w-full bg-black rounded-2xl overflow-hidden ring-1 ring-border/40">
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        playsInline
        controls
        autoPlay
        muted
      />
      {(status === "loading" || status === "waiting") && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white/70 gap-2 bg-black/60 pointer-events-none">
          <Loader2 className="h-10 w-10 animate-spin" />
          <Radio className="h-8 w-8 text-red-500" />
          <p className="text-sm text-center px-4 max-w-sm">
            {status === "waiting"
              ? waitHint ??
                "OBS에서 방송을 시작하면 5~15초 뒤 화면이 나타납니다…"
              : "방송 화면 연결 중…"}
          </p>
        </div>
      )}
      {status === "playing" && (
        <span className="absolute top-3 left-3 px-2 py-0.5 rounded bg-red-600 text-white text-[10px] font-bold">
          LIVE
        </span>
      )}
    </div>
  );
}
