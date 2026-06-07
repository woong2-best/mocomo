"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type HlsType from "hls.js";
import { Loader2, Radio, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LiveOverlayLayer } from "@/components/live/overlays/live-overlay-layer";

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

/** VPS SRS — RTMP 있으면 FLV 우선, HLS는 보조 (폴링 시 플레이어 재시작 금지) */
export function LiveSrsPlayer({ channelId }: { channelId: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<HlsType | null>(null);
  const flvRef = useRef<{ destroy: () => void } | null>(null);
  const playingRef = useRef(false);
  const flvStartedRef = useRef(false);
  const hlsStartedRef = useRef(false);
  const [status, setStatus] = useState<"loading" | "playing" | "waiting" | "error">("loading");
  const [playMode, setPlayMode] = useState<"hls" | "flv" | null>(null);
  const [hint, setHint] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [flvUrl, setFlvUrl] = useState<string | null>(null);

  const cleanup = useCallback(() => {
    hlsRef.current?.destroy();
    hlsRef.current = null;
    flvRef.current?.destroy();
    flvRef.current = null;
    flvStartedRef.current = false;
    hlsStartedRef.current = false;
    playingRef.current = false;
  }, []);

  const markPlaying = useCallback((mode: "hls" | "flv") => {
    playingRef.current = true;
    setPlayMode(mode);
    setStatus("playing");
    setHint("");
  }, []);

  const startFlv = useCallback(
    async (urlOverride?: string) => {
      const video = videoRef.current;
      if (!video || playingRef.current) return;
      if (flvStartedRef.current && !urlOverride) return;
      flvStartedRef.current = true;

      hlsRef.current?.destroy();
      hlsRef.current = null;
      flvRef.current?.destroy();
      flvRef.current = null;

      const url = absoluteUrl(urlOverride ?? flvUrl ?? `/api/live/${channelId}/flv`);
      try {
        const head = await fetch(url, {
          method: "HEAD",
          credentials: "include",
          cache: "no-store",
        });
        if (!head.ok) {
          flvStartedRef.current = false;
          setHint(
            head.status === 404
              ? "FLV 없음 — OBS 키 끝자리가 스튜디오와 같은지 확인"
              : `FLV 프록시 ${head.status} — 잠시 후 다시 시도`
          );
          return;
        }

        const mod = await import("flv.js");
        const flvjs = mod.default;
        if (!flvjs.isSupported()) {
          flvStartedRef.current = false;
          setHint("FLV 미지원 — Chrome/Edge 사용");
          return;
        }

        const player = flvjs.createPlayer(
          {
            type: "flv",
            url,
            isLive: true,
            hasAudio: true,
            hasVideo: true,
            cors: true,
            withCredentials: true,
          },
          {
            enableStashBuffer: false,
            stashInitialSize: 128,
            lazyLoad: false,
            autoCleanupSourceBuffer: true,
          }
        );
        flvRef.current = player;
        player.attachMediaElement(video);
        player.on(flvjs.Events.MEDIA_INFO, () => {
          markPlaying("flv");
        });
        player.on(flvjs.Events.ERROR, (_type, _detail, info) => {
          if (playingRef.current) return;
          flvStartedRef.current = false;
          const code = info?.code ?? "";
          setHint(
            code === "HttpStatusCodeInvalid"
              ? "FLV 404 — OBS 서버·키를 스튜디오와 동일하게"
              : "FLV 연결 실패 — 5초 후 자동 재시도"
          );
          setTimeout(() => {
            if (!playingRef.current) void startFlv(url);
          }, 5000);
        });
        player.load();
        await video.play().catch(() => undefined);
      } catch {
        flvStartedRef.current = false;
        setHint("FLV 재생 실패 — OBS 키·다중 송출 대상 확인");
      }
    },
    [channelId, flvUrl, markPlaying]
  );

  const startHls = useCallback(
    (hlsPath: string) => {
      if (playingRef.current || hlsStartedRef.current) return;
      hlsStartedRef.current = true;
      const video = videoRef.current;
      if (!video) return;
      const url = absoluteUrl(hlsPath);
      const onParsed = () => {
        if (!playingRef.current) markPlaying("hls");
      };

      if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = url;
        video.addEventListener("loadedmetadata", onParsed, { once: true });
        video.play().catch(() => undefined);
        return;
      }

      void import("hls.js").then(({ default: Hls }) => {
        if (!videoRef.current || !Hls.isSupported() || playingRef.current) return;
        const hls = new Hls({
          enableWorker: true,
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
        hls.on(Hls.Events.FRAG_LOADED, () => {
          if (!playingRef.current) markPlaying("hls");
        });
      });
    },
    [markPlaying]
  );

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/live/${channelId}/playback`, {
        credentials: "include",
        cache: "no-store",
      });
      const body = (await res.json().catch(() => ({}))) as PlaybackBody;
      if (!res.ok) throw new Error("재생 정보를 가져오지 못했습니다");

      if (body.flvUrl) setFlvUrl(body.flvUrl);

      const hlsPath = body.hlsUrl ?? `/api/live/${channelId}/hls/index.m3u8`;

      if (body.srsPlayable) {
        if (!playingRef.current) startHls(hlsPath);
        return;
      }

      if (body.srsOnAir) {
        setStatus("waiting");
        if (!playingRef.current) {
          setHint("송출 감지됨 · FLV로 화면 연결 중…");
          void startFlv(body.flvUrl ?? undefined);
          startHls(hlsPath);
        }
        return;
      }

      if (!playingRef.current) {
        setStatus("waiting");
        setHint(body.message ?? "다중 송출이 MoCoMo로 나가는지 확인하세요");
      }
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "재생 실패");
      setStatus("error");
    }
  }, [channelId, startHls, startFlv]);

  useEffect(() => {
    void load();
    const poll = setInterval(() => void load(), 12000);
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
          <Radio className="h-8 w-8 text-folk-terracotta" />
          <p className="text-sm max-w-md">{hint || "VPS 연결 중…"}</p>
        </div>
      )}
      {status === "playing" && playMode && (
        <span className="absolute top-3 left-3 px-2 py-0.5 rounded bg-folk-terracotta text-white text-[10px] font-bold">
          LIVE · {playMode === "flv" ? "FLV" : "HLS"}
        </span>
      )}
      {status === "waiting" && (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="absolute bottom-3 right-3 z-10"
          onClick={() => {
            flvStartedRef.current = false;
            void startFlv();
          }}
        >
          FLV로 보기
        </Button>
      )}
      <LiveOverlayLayer pointerEvents="none" className="z-[12]" />
    </div>
  );
}
