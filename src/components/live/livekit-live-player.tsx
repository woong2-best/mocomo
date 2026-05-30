"use client";

import { useEffect, useState } from "react";
import { LiveKitRoom, VideoTrack, useTracks } from "@livekit/components-react";
import { Track } from "livekit-client";
import { Loader2, Radio } from "lucide-react";
import { obsParticipantIdentity } from "@/lib/live-participant";
import "@livekit/components-styles";

function ObsVideo({ channelId }: { channelId: string }) {
  const tracks = useTracks(
    [Track.Source.Camera, Track.Source.ScreenShare, Track.Source.Unknown],
    { onlySubscribed: true }
  );
  const obsId = obsParticipantIdentity(channelId);
  const ref = tracks.find((t) => t.participant.identity === obsId);

  if (!ref) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center text-white/80 gap-2 bg-black/70">
        <Loader2 className="h-10 w-10 animate-spin" />
        <Radio className="h-8 w-8 text-red-500" />
        <p className="text-sm text-center px-4 max-w-sm">
          OBS에서 「방송 시작」을 누르면 3~10초 안에 화면이 나타납니다.
        </p>
      </div>
    );
  }

  return (
    <VideoTrack
      trackRef={ref}
      className="w-full h-full object-contain bg-black"
    />
  );
}

/** LiveKit — OBS RTMP → WebRTC 미리보기/시청 (HLS 없음) */
export function LivekitLivePlayer({ channelId }: { channelId: string }) {
  const [token, setToken] = useState<string | null>(null);
  const [serverUrl, setServerUrl] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`/api/livekit/token?room=${encodeURIComponent(channelId)}`, {
          credentials: "include",
          cache: "no-store",
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(typeof body.error === "string" ? body.error : "LiveKit 연결 실패");
        }
        if (!cancelled) {
          setToken(body.token);
          setServerUrl(body.serverUrl);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "연결 실패");
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [channelId]);

  if (error) {
    return (
      <div className="aspect-video rounded-xl bg-destructive/10 border border-destructive/30 flex items-center justify-center p-6 text-sm text-destructive text-center">
        {error}
      </div>
    );
  }

  if (!token || !serverUrl) {
    return (
      <div className="aspect-video rounded-xl bg-black flex items-center justify-center text-white/70 gap-2">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="text-sm">방송 화면 연결 중…</span>
      </div>
    );
  }

  return (
    <div className="relative aspect-video w-full bg-black rounded-xl overflow-hidden ring-1 ring-border/40">
      <LiveKitRoom
        token={token}
        serverUrl={serverUrl}
        connect
        video
        audio
        className="h-full w-full"
      >
        <ObsVideo channelId={channelId} />
      </LiveKitRoom>
      <span className="absolute top-3 left-3 px-2 py-0.5 rounded bg-violet-600 text-white text-[10px] font-bold z-10 pointer-events-none">
        LiveKit
      </span>
    </div>
  );
}
