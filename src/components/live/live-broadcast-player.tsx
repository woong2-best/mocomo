"use client";

import { useEffect, useState } from "react";
import { LiveSrsPlayer } from "@/components/live/live-srs-player";
import { LivekitLivePlayer } from "@/components/live/livekit-live-player";
import { LiveCloudflarePlayer } from "@/components/live/live-cloudflare-player";
import { Loader2 } from "lucide-react";

type PlaybackEngine = "cloudflare" | "livekit" | "srs" | null;

/** 방송 재생 — Cloudflare Stream Live 기본 */
export function LiveBroadcastPlayer({ channelId }: { channelId: string }) {
  const [engine, setEngine] = useState<PlaybackEngine>(null);
  const [hlsUrl, setHlsUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const res = await fetch(`/api/live/${channelId}/playback`, {
        credentials: "include",
        cache: "no-store",
      });
      const body = await res.json().catch(() => ({}));
      if (cancelled) return;
      const eng = body.ingestEngine ?? body.engine;
      if (eng === "cloudflare") {
        setEngine("cloudflare");
        setHlsUrl(typeof body.hlsUrl === "string" ? body.hlsUrl : null);
      } else if (eng === "livekit") {
        setEngine("livekit");
        setHlsUrl(null);
      } else {
        setEngine("srs");
        setHlsUrl(null);
      }
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

  if (engine === "cloudflare") {
    return <LiveCloudflarePlayer channelId={channelId} hlsUrl={hlsUrl} />;
  }

  if (engine === "livekit") {
    return <LivekitLivePlayer channelId={channelId} />;
  }

  return <LiveSrsPlayer channelId={channelId} />;
}
