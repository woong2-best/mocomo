"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Radio } from "lucide-react";
import { attachCloudflareWhepPlayback } from "@/lib/cloudflare-whep-playback";

/** Cloudflare WHIP 송출 → WHEP 실시간 시청 (HLS 대신) */
export function LiveCloudflareWhepPlayer({
  channelId,
  whepUrl: initialWhepUrl,
}: {
  channelId: string;
  whepUrl?: string | null;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const [status, setStatus] = useState<"loading" | "playing" | "waiting">("loading");
  const [hint, setHint] = useState("실시간 방송 연결 중…");
  const [whepUrl, setWhepUrl] = useState<string | null>(initialWhepUrl ?? null);

  const connect = useCallback(
    async (url: string) => {
      const video = videoRef.current;
      if (!video) return;
      cleanupRef.current?.();
      cleanupRef.current = null;
      setStatus("loading");
      setHint("실시간 방송 연결 중…");
      try {
        cleanupRef.current = await attachCloudflareWhepPlayback(url, video);
        setStatus("playing");
        setHint("");
      } catch (e) {
        setStatus("waiting");
        setHint(e instanceof Error ? e.message : "실시간 재생 연결 실패");
      }
    },
    []
  );

  const refresh = useCallback(async () => {
    if (whepUrl) {
      await connect(whepUrl);
      return;
    }
    try {
      const res = await fetch(`/api/live/${channelId}/playback`, {
        credentials: "include",
        cache: "no-store",
      });
      const body = await res.json().catch(() => ({}));
      const url = typeof body.whepPlaybackUrl === "string" ? body.whepPlaybackUrl : null;
      const live =
        !!body.srsOnAir ||
        !!body.cloudflareLive ||
        !!body.hostBroadcasting;
      if (url && live) {
        setWhepUrl(url);
        await connect(url);
        return;
      }
      setStatus("waiting");
      setHint(
        typeof body.message === "string"
          ? body.message
          : "스트리머가 방송을 시작하면 화면이 나타납니다"
      );
    } catch {
      setHint("재생 정보를 불러오지 못했습니다");
      setStatus("waiting");
    }
  }, [channelId, connect, whepUrl]);

  useEffect(() => {
    void refresh();
    const poll = setInterval(() => void refresh(), 5000);
    return () => {
      clearInterval(poll);
      cleanupRef.current?.();
    };
  }, [refresh]);

  return (
    <div className="relative aspect-video w-full bg-black rounded-2xl overflow-hidden ring-1 ring-border/40">
      <video ref={videoRef} className="w-full h-full object-contain" playsInline autoPlay controls muted />
      {status !== "playing" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white/80 gap-2 bg-black/60 pointer-events-none px-4 text-center">
          <Loader2 className="h-10 w-10 animate-spin" />
          <Radio className="h-8 w-8 text-orange-500" />
          <p className="text-sm max-w-md">{hint}</p>
        </div>
      )}
      {status === "playing" && (
        <span className="absolute top-3 left-3 px-2 py-0.5 rounded bg-orange-600 text-white text-[10px] font-bold">
          LIVE · 실시간
        </span>
      )}
    </div>
  );
}
