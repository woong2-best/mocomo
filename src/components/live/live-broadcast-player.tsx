"use client";

import { useCallback, useEffect, useState } from "react";
import type { LiveBroadcastMode } from "@prisma/client";
import { LiveSrsPlayer } from "@/components/live/live-srs-player";
import { LivekitLivePlayer } from "@/components/live/livekit-live-player";
import { LiveCloudflarePlayer } from "@/components/live/live-cloudflare-player";
import { LiveCloudflareWhepPlayer } from "@/components/live/live-cloudflare-whep-player";
import { LiveSplitBroadcastPlayer } from "@/components/live/live-split-broadcast-player";
import { VoiceLiveListener } from "@/components/voice-live/voice-live-studio";
import { isVoiceBroadcastMode } from "@/lib/live-voice-broadcast";
import { useLiveCollabState } from "@/hooks/use-live-collab-state";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

type PlaybackEngine = "cloudflare" | "livekit" | "srs";

function parseEngine(body: Record<string, unknown>): PlaybackEngine | null {
  const eng = body.ingestEngine ?? body.engine;
  if (eng === "cloudflare" || eng === "livekit" || eng === "srs") return eng;
  return null;
}

/** 방송 재생 — Cloudflare Stream Live 기본 */
export function LiveBroadcastPlayer({
  channelId,
  preferredEngine,
  hostUserId,
  broadcastMode,
  isLiveOnAir,
}: {
  channelId: string;
  /** OBS 패널에서 이미 알고 있는 엔진 (playback 실패 시 SRS로 떨어지지 않게) */
  preferredEngine?: PlaybackEngine | string | null;
  hostUserId?: string;
  /** BROWSER 방송이면 playback API 응답 전에 WHEP 연결 시작 */
  broadcastMode?: LiveBroadcastMode | null;
  /** 서버에서 LIVE 상태를 알면 WHEP를 즉시 시작 */
  isLiveOnAir?: boolean;
}) {
  const optimisticWhep =
    broadcastMode === "BROWSER" || (!!isLiveOnAir && !isVoiceBroadcastMode(broadcastMode));
  const [engine, setEngine] = useState<PlaybackEngine | null>(() => {
    if (isVoiceBroadcastMode(broadcastMode)) return "livekit";
    if (optimisticWhep) return "cloudflare";
    if (
      preferredEngine === "cloudflare" ||
      preferredEngine === "livekit" ||
      preferredEngine === "srs"
    ) {
      return preferredEngine;
    }
    return null;
  });
  const [hlsUrl, setHlsUrl] = useState<string | null>(null);
  const [useWhep, setUseWhep] = useState(optimisticWhep);
  const [resolvedHostId, setResolvedHostId] = useState<string | undefined>(hostUserId);
  const [loadError, setLoadError] = useState<string | null>(null);
  const collab = useLiveCollabState(channelId, !!channelId);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/live/${channelId}/playback`, {
        credentials: "include",
        cache: "no-store",
      });
      const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;

      if (!res.ok) {
        const msg =
          typeof body.error === "string"
            ? body.error
            : "재생 정보를 가져오지 못했습니다";
        setLoadError(msg);
        const eng = parseEngine(body);
        if (eng) setEngine(eng);
        else if (
          preferredEngine === "cloudflare" ||
          preferredEngine === "livekit" ||
          preferredEngine === "srs"
        ) {
          setEngine(preferredEngine);
        }
        return;
      }

      setLoadError(null);
      const eng = parseEngine(body);
      if (eng) {
        setEngine(eng);
      } else if (
        preferredEngine === "cloudflare" ||
        preferredEngine === "livekit" ||
        preferredEngine === "srs"
      ) {
        setEngine(preferredEngine);
      } else {
        setEngine("cloudflare");
      }
      setHlsUrl(typeof body.hlsUrl === "string" ? body.hlsUrl : null);
      setUseWhep(!!body.useWhep || (!!body.hostBroadcasting && body.ingestEngine === "cloudflare"));
      if (typeof body.hostUserId === "string") {
        setResolvedHostId(body.hostUserId);
      }
    } catch {
      setLoadError("재생 정보를 가져오지 못했습니다");
      if (
        preferredEngine === "cloudflare" ||
        preferredEngine === "livekit" ||
        preferredEngine === "srs"
      ) {
        setEngine(preferredEngine);
      }
    }
  }, [channelId, preferredEngine]);

  useEffect(() => {
    if (hostUserId) setResolvedHostId(hostUserId);
  }, [hostUserId]);

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), 12000);
    return () => clearInterval(id);
  }, [load]);

  if (loadError && !engine) {
    return (
      <div className="aspect-video rounded-2xl bg-destructive/10 border border-destructive/30 flex flex-col items-center justify-center gap-3 p-6">
        <p className="text-sm text-destructive text-center">{loadError}</p>
        <Button variant="outline" size="sm" onClick={() => void load()}>
          <RefreshCw className="h-4 w-4 mr-1" />
          다시 시도
        </Button>
      </div>
    );
  }

  if (!engine) {
    return (
      <div className="aspect-video rounded-xl bg-black flex items-center justify-center text-white/70 gap-2">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (isVoiceBroadcastMode(broadcastMode)) {
    return (
      <VoiceLiveListener
        channelId={channelId}
        hostUserId={resolvedHostId ?? hostUserId}
      />
    );
  }

  if (engine === "cloudflare") {
    if (
      collab.splitActive &&
      collab.coHostUserId &&
      useWhep
    ) {
      return (
        <LiveSplitBroadcastPlayer
          channelId={channelId}
          coHostUserId={collab.coHostUserId}
          coHostLabel={collab.coHost?.name ?? collab.coHost?.username ?? "합방"}
        />
      );
    }
    if (useWhep) {
      return <LiveCloudflareWhepPlayer channelId={channelId} />;
    }
    return <LiveCloudflarePlayer channelId={channelId} hlsUrl={hlsUrl} />;
  }

  if (engine === "livekit") {
    return (
      <LivekitLivePlayer channelId={channelId} hostUserId={resolvedHostId ?? hostUserId} />
    );
  }

  return <LiveSrsPlayer channelId={channelId} />;
}
