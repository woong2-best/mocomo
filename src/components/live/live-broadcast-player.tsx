"use client";

import { useEffect, useState } from "react";
import { LiveHlsPlayer } from "@/components/live/live-hls-player";
import { LivekitLivePlayer } from "@/components/live/livekit-live-player";
import { Loader2 } from "lucide-react";

type PlaybackEngine = "livekit" | "srs" | null;

/** 방송 재생 — LiveKit 우선, 없으면 SRS HLS */
export function LiveBroadcastPlayer({ channelId }: { channelId: string }) {
  const [engine, setEngine] = useState<PlaybackEngine>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const res = await fetch(`/api/live/${channelId}/playback`, {
        credentials: "include",
        cache: "no-store",
      });
      const body = await res.json().catch(() => ({}));
      if (cancelled) return;
      if (body.ingestEngine === "livekit" || body.engine === "livekit") {
        setEngine("livekit");
        return;
      }
      try {
        const health = await fetch("/api/health/obs", { cache: "no-store" });
        const h = await health.json().catch(() => ({}));
        if (h.engine === "livekit") {
          setEngine("livekit");
          return;
        }
      } catch {
        /* ignore */
      }
      setEngine("srs");
    }
    void load();
    const id = setInterval(() => void load(), 12000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [channelId]);

  if (!engine) {
    return (
      <div className="aspect-video rounded-xl bg-black flex items-center justify-center text-white/70 gap-2">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (engine === "livekit") {
    return <LivekitLivePlayer channelId={channelId} />;
  }

  return <LiveHlsPlayer channelId={channelId} />;
}
