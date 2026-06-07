"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Play, Radio, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  attachCloudflareWhepPlayback,
  WhepNotReadyError,
} from "@/lib/cloudflare-whep-playback";

/** Cloudflare WHIP → WHEP 시청 (서버 프록시) */
export function LiveCloudflareWhepPlayer({
  channelId,
  startDelayMs = 3000,
}: {
  channelId: string;
  whepUrl?: string | null;
  startDelayMs?: number;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const hasMediaRef = useRef(false);
  const connectingRef = useRef(false);
  const [status, setStatus] = useState<"loading" | "playing" | "waiting">("loading");
  const [hint, setHint] = useState("실시간 방송 연결 중…");
  const [needsTap, setNeedsTap] = useState(false);

  const tryPlayVideo = useCallback(() => {
    const video = videoRef.current;
    if (!video?.srcObject) return;
    void video.play().then(() => {
      setNeedsTap(false);
      setStatus("playing");
      setHint("");
    }).catch(() => {
      setNeedsTap(true);
      setHint("재생하려면 버튼을 눌러 주세요");
    });
  }, []);

  const connect = useCallback(async () => {
    if (connectingRef.current || hasMediaRef.current) return;
    const video = videoRef.current;
    if (!video) return;

    connectingRef.current = true;
    cleanupRef.current?.();
    cleanupRef.current = null;
    setStatus("loading");
    setHint("실시간 방송 연결 중…");
    setNeedsTap(false);

    try {
      cleanupRef.current = await attachCloudflareWhepPlayback(channelId, video);
      hasMediaRef.current = true;
      await video.play().catch(() => undefined);
      if (video.paused) {
        setNeedsTap(true);
        setStatus("waiting");
        setHint("재생하려면 버튼을 눌러 주세요");
      } else {
        setStatus("playing");
        setHint("");
      }
    } catch (e) {
      hasMediaRef.current = false;
      setStatus("waiting");
      const raw =
        e instanceof WhepNotReadyError
          ? e.message
          : e instanceof Error
            ? e.message
            : "실시간 재생 연결 실패";
      setHint(
        /parse sdp|missing termination/i.test(raw)
          ? "실시간 연결을 다시 시도 중입니다. 10~30초 후 자동으로 재연결됩니다."
          : raw
      );
    } finally {
      connectingRef.current = false;
    }
  }, [channelId]);

  useEffect(() => {
    const start = setTimeout(() => void connect(), startDelayMs);
    const poll = setInterval(() => {
      if (!hasMediaRef.current) void connect();
    }, 5000);
    return () => {
      clearTimeout(start);
      clearInterval(poll);
      hasMediaRef.current = false;
      cleanupRef.current?.();
    };
  }, [connect, startDelayMs]);

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
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white/80 gap-2 bg-black/60 px-4 text-center">
          <Loader2 className="h-10 w-10 animate-spin" />
          <Radio className="h-8 w-8 text-orange-500" />
          <p className="text-sm max-w-md">{hint}</p>
          {status === "waiting" && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="rounded-xl pointer-events-auto mt-2"
              onClick={() => {
                hasMediaRef.current = false;
                void connect();
              }}
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              다시 연결
            </Button>
          )}
        </div>
      )}
      {needsTap && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/70">
          <p className="text-sm text-white/90 text-center px-4 max-w-md">{hint}</p>
          <Button type="button" className="rounded-xl gap-2" onClick={() => tryPlayVideo()}>
            <Play className="h-4 w-4" />
            재생
          </Button>
        </div>
      )}
      {status === "playing" && !needsTap && (
        <span className="absolute top-3 left-3 px-2 py-0.5 rounded bg-orange-600 text-white text-[10px] font-bold">
          LIVE
        </span>
      )}
    </div>
  );
}
