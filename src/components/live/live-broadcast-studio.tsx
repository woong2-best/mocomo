"use client";

import { useEffect, useState } from "react";
import type { LiveBroadcastMode } from "@prisma/client";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useLocalParticipant,
  useTracks,
  VideoTrack,
} from "@livekit/components-react";
import { LiveHostMediaControls } from "@/lib/live-host-controls";
import "@livekit/components-styles";
import { Track } from "livekit-client";
import { fetchLivekitCredentials } from "@/lib/livekit-token-fetch";
import { setLiveBroadcastMode } from "@/actions/live-stream";
import { LiveObsStudio } from "@/components/live/live-obs-studio";
import { Loader2, Radio, Monitor, Laptop } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function HostStage() {
  const { localParticipant } = useLocalParticipant();
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: true },
    ],
    { onlySubscribed: false }
  );

  const trackList = Array.isArray(tracks) ? tracks : [];
  const localTracks = trackList.filter(
    (t) => t.participant.identity === localParticipant.identity
  );
  const screen = localTracks.find((t) => t.source === Track.Source.ScreenShare);
  const camera = localTracks.find((t) => t.source === Track.Source.Camera);
  const main = screen ?? camera;
  const hasVideo = main && main.publication;

  return (
    <div className="relative aspect-video w-full bg-black rounded-2xl overflow-hidden">
      {hasVideo ? (
        <VideoTrack trackRef={main} className="w-full h-full object-contain" />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white/70 gap-2">
          <Radio className="h-10 w-10" />
          <p className="text-sm">카메라 또는 화면 공유를 켜 주세요</p>
        </div>
      )}
      <div className="absolute top-3 left-3 flex items-center gap-2">
        <span className="px-2.5 py-1 rounded-md bg-red-600 text-white text-xs font-bold flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
          LIVE
        </span>
      </div>
    </div>
  );
}

function HostControls({ onEndStream }: { onEndStream: () => void }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pt-3">
      <LiveHostMediaControls />
      <Button variant="destructive" className="rounded-xl" onClick={onEndStream}>
        방송 종료
      </Button>
    </div>
  );
}

function BrowserStudio({ onEndStream }: { onEndStream: () => void }) {
  return (
    <>
      <HostStage />
      <RoomAudioRenderer />
      <HostControls onEndStream={onEndStream} />
    </>
  );
}

export function LiveBroadcastStudio({
  channelId,
  initialMode = "BROWSER",
  onEndStream,
}: {
  channelId: string;
  initialMode?: LiveBroadcastMode;
  onEndStream: () => void;
}) {
  const [mode, setMode] = useState<LiveBroadcastMode>(initialMode ?? "BROWSER");
  const [token, setToken] = useState<string | null>(null);
  const [serverUrl, setServerUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    if (mode !== "BROWSER") return;
    fetchLivekitCredentials(channelId)
      .then((c) => {
        setToken(c.token);
        setServerUrl(c.serverUrl);
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : "방송 서버 연결 실패");
      });
  }, [channelId, mode]);

  async function switchMode(next: LiveBroadcastMode) {
    if (next === mode) return;
    setSwitching(true);
    setError(null);
    const res = await setLiveBroadcastMode(channelId, next);
    setSwitching(false);
    if ("error" in res && res.error) {
      setError(res.error);
      return;
    }
    setMode(next);
    if (next === "BROWSER") {
      setToken(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2 p-1 rounded-xl bg-muted/50 border border-border/60">
        <button
          type="button"
          disabled={switching}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 text-sm py-2 rounded-lg font-medium transition-colors",
            mode === "BROWSER" ? "bg-background shadow text-foreground" : "text-muted-foreground"
          )}
          onClick={() => switchMode("BROWSER")}
        >
          <Laptop className="h-4 w-4" />
          브라우저
        </button>
        <button
          type="button"
          disabled={switching}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 text-sm py-2 rounded-lg font-medium transition-colors",
            mode === "OBS" ? "bg-background shadow text-foreground" : "text-muted-foreground"
          )}
          onClick={() => switchMode("OBS")}
        >
          <Monitor className="h-4 w-4" />
          OBS
        </button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {mode === "OBS" ? (
        <LiveObsStudio channelId={channelId} onEndStream={onEndStream} />
      ) : !token || !serverUrl ? (
        <div className="flex items-center justify-center aspect-video rounded-2xl bg-muted/40">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <LiveKitRoom
          token={token}
          serverUrl={serverUrl}
          connect
          audio
          video
          className="space-y-0"
          data-lk-theme="default"
        >
          <BrowserStudio onEndStream={onEndStream} />
        </LiveKitRoom>
      )}
    </div>
  );
}
