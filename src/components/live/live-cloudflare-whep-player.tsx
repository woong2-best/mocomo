"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Play, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { attachCloudflareWhepPlayback, WhepNotReadyError } from "@/lib/cloudflare-whep-playback";

/** Cloudflare WHIP 송출 → WHEP 실시간 시청 (HLS 대신) */
export function LiveCloudflareWhepPlayer({
  channelId,
  whepUrl: initialWhepUrl,
  startDelayMs = 5000,
}: {
  channelId: string;
  whepUrl?: string | null;
  startDelayMs?: number;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const playingRef = useRef(false);
  const connectingRef = useRef(false);
  const [status, setStatus] = useState<"loading" | "playing" | "waiting">("loading");
  const [hint, setHint] = useState("실시간 방송 연결 중…");
  const [needsTap, setNeedsTap] = useState(false);
  const [whepUrl, setWhepUrl] = useState<string | null>(initialWhepUrl ?? null);

  const tryPlayVideo = useCallback(() => {
    const video = videoRef.current;
    if (!video?.srcObject) return;
    void video.play().then(() => {
      setNeedsTap(false);
      setStatus("playing");
      setHint("");
      playingRef.current = true;
    }).catch(() => {
      setNeedsTap(true);
      setStatus("waiting");
      setHint("재생하려면 아래 버튼을 눌러 주세요 (PC 브라우저)");
    });
  }, []);

  const connect = useCallback(
    async (url: string) => {
      if (connectingRef.current || playingRef.current) return;
      const video = videoRef.current;
      if (!video) return;
      connectingRef.current = true;
      cleanupRef.current?.();
      cleanupRef.current = null;
      setStatus("loading");
      setHint("실시간 방송 연결 중…");
      setNeedsTap(false);
      try {
        cleanupRef.current = await attachCloudflareWhepPlayback(url, video);
        playingRef.current = true;
        await video.play().catch(() => undefined);
        if (video.paused) {
          setNeedsTap(true);
          setStatus("waiting");
          setHint("재생하려면 아래 버튼을 눌러 주세요 (PC 브라우저)");
        } else {
          setStatus("playing");
          setHint("");
        }
      } catch (e) {
        playingRef.current = false;
        setStatus("waiting");
        setHint(
          e instanceof WhepNotReadyError
            ? e.message
            : e instanceof Error
              ? e.message
              : "실시간 재생 연결 실패"
        );
      } finally {
        connectingRef.current = false;
      }
    },
    []
  );

  const resolveWhepUrl = useCallback(async (): Promise<string | null> => {
    if (whepUrl) return whepUrl;
    const res = await fetch(`/api/live/${channelId}/playback`, {
      credentials: "include",
      cache: "no-store",
    });
    const body = await res.json().catch(() => ({}));
    const url = typeof body.whepPlaybackUrl === "string" ? body.whepPlaybackUrl : null;
    const live =
      !!body.srsOnAir || !!body.cloudflareLive || !!body.hostBroadcasting;
    if (url && live) {
      setWhepUrl(url);
      return url;
    }
    setStatus("waiting");
    setHint(
      typeof body.message === "string"
        ? body.message
        : "스트리머가 방송을 시작하면 화면이 나타납니다"
    );
    return null;
  }, [channelId, whepUrl]);

  const refresh = useCallback(async () => {
    if (playingRef.current) return;
    const url = await resolveWhepUrl();
    if (url) await connect(url);
  }, [connect, resolveWhepUrl]);

  useEffect(() => {
    const start = setTimeout(() => void refresh(), startDelayMs);
    const poll = setInterval(() => void refresh(), 8000);
    return () => {
      clearTimeout(start);
      clearInterval(poll);
      playingRef.current = false;
      cleanupRef.current?.();
    };
  }, [refresh, startDelayMs]);

  return (
    <div className="relative aspect-video w-full bg-black rounded-2xl overflow-hidden ring-1 ring-border/40">
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        playsInline
        autoPlay
        controls
        muted
      />
      {status !== "playing" && !needsTap && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white/80 gap-2 bg-black/60 pointer-events-none px-4 text-center">
          <Loader2 className="h-10 w-10 animate-spin" />
          <Radio className="h-8 w-8 text-orange-500" />
          <p className="text-sm max-w-md">{hint}</p>
        </div>
      )}
      {needsTap && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/70">
          <p className="text-sm text-white/90 text-center px-4 max-w-md">{hint}</p>
          <Button
            type="button"
            className="rounded-xl gap-2"
            onClick={() => tryPlayVideo()}
          >
            <Play className="h-4 w-4" />
            재생
          </Button>
        </div>
      )}
      {status === "playing" && !needsTap && (
        <span className="absolute top-3 left-3 px-2 py-0.5 rounded bg-orange-600 text-white text-[10px] font-bold">
          LIVE · 실시간
        </span>
      )}
    </div>
  );
}
