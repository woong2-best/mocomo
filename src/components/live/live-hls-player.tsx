"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import { Loader2, Radio, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

type PlaybackResponse = {
  ok?: boolean;
  hlsUrl?: string | null;
  waiting?: boolean;
  message?: string;
  error?: string;
};

/** 트위치/치지직 방식 HLS 시청 (hls.js) */
export function LiveHlsPlayer({ channelId }: { channelId: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [status, setStatus] = useState<"loading" | "waiting" | "playing" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [hlsUrl, setHlsUrl] = useState<string | null>(null);

  const loadPlayback = useCallback(async () => {
    setStatus("loading");
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/live/${channelId}/playback`, {
        credentials: "include",
        cache: "no-store",
      });
      const body = (await res.json().catch(() => ({}))) as PlaybackResponse;
      if (!res.ok) {
        throw new Error(body.error ?? "재생 정보를 불러오지 못했습니다.");
      }
      if (!body.hlsUrl || body.waiting) {
        setHlsUrl(null);
        setStatus("waiting");
        return;
      }
      setHlsUrl(body.hlsUrl);
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "재생 실패");
      setStatus("error");
    }
  }, [channelId]);

  useEffect(() => {
    loadPlayback();
  }, [loadPlayback]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !hlsUrl) return;

    function attachNative() {
      video!.src = hlsUrl!;
      video!.addEventListener("loadedmetadata", () => setStatus("playing"));
      video!.play().catch(() => setStatus("waiting"));
    }

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      attachNative();
      return;
    }

    if (!Hls.isSupported()) {
      setErrorMsg("이 브라우저는 HLS 재생을 지원하지 않습니다.");
      setStatus("error");
      return;
    }

    const hls = new Hls({
      enableWorker: true,
      lowLatencyMode: false,
      backBufferLength: 30,
    });
    hlsRef.current = hls;
    hls.loadSource(hlsUrl);
    hls.attachMedia(video);
    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      setStatus("playing");
      video.play().catch(() => undefined);
    });
    hls.on(Hls.Events.ERROR, (_e, data) => {
      if (data.fatal) {
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
          setStatus("waiting");
          hls.startLoad();
        } else {
          setStatus("error");
          setErrorMsg("방송 신호를 받지 못했습니다. 잠시 후 다시 시도해 주세요.");
        }
      }
    });

    return () => {
      hls.destroy();
      hlsRef.current = null;
    };
  }, [hlsUrl]);

  useEffect(() => {
    if (status !== "waiting") return;
    const t = setInterval(loadPlayback, 5000);
    return () => clearInterval(t);
  }, [status, loadPlayback]);

  if (status === "error") {
    return (
      <div className="aspect-video rounded-2xl bg-destructive/10 border border-destructive/30 flex flex-col items-center justify-center gap-3 p-6">
        <p className="text-sm text-destructive text-center">{errorMsg}</p>
        <Button variant="outline" size="sm" onClick={loadPlayback}>
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
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white/70 gap-2 bg-black/60">
          <Loader2 className="h-10 w-10 animate-spin" />
          <Radio className="h-8 w-8 text-red-500" />
          <p className="text-sm text-center px-4">
            {status === "waiting"
              ? "스트리머가 OBS에서 방송을 시작하면 화면이 나타납니다…"
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
