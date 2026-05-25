"use client";

import { useEffect, useState } from "react";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useLocalParticipant,
  useTracks,
  VideoTrack,
  ControlBar,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { Track } from "livekit-client";
import { fetchLivekitCredentials } from "@/lib/livekit-token-fetch";
import { Loader2, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";

function HostStage() {
  const { localParticipant } = useLocalParticipant();
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: true },
    ],
    { onlySubscribed: false }
  );

  const localTracks = tracks.filter(
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
        <span className="px-2 py-0.5 rounded-md bg-black/50 text-white text-xs">방송 중</span>
      </div>
    </div>
  );
}

function HostControls({ onEndStream }: { onEndStream: () => void }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pt-3">
      <ControlBar
        controls={{
          microphone: true,
          camera: true,
          screenShare: true,
          chat: false,
          settings: false,
          leave: false,
        }}
        className="!border-0 !bg-transparent"
      />
      <Button variant="destructive" className="rounded-xl" onClick={onEndStream}>
        방송 종료
      </Button>
    </div>
  );
}

function HostRoomInner({ onEndStream }: { onEndStream: () => void }) {
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
  onEndStream,
}: {
  channelId: string;
  onEndStream: () => void;
}) {
  const [token, setToken] = useState<string | null>(null);
  const [serverUrl, setServerUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLivekitCredentials(channelId)
      .then((c) => {
        setToken(c.token);
        setServerUrl(c.serverUrl);
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : "방송 서버 연결 실패");
      });
  }, [channelId]);

  if (error) {
    return (
      <p className="text-sm text-destructive text-center p-6 bg-destructive/10 rounded-2xl">{error}</p>
    );
  }

  if (!token || !serverUrl) {
    return (
      <div className="flex items-center justify-center aspect-video rounded-2xl bg-muted/40">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <LiveKitRoom
      token={token}
      serverUrl={serverUrl}
      connect
      audio
      video
      className="space-y-0"
      data-lk-theme="default"
    >
      <HostRoomInner onEndStream={onEndStream} />
    </LiveKitRoom>
  );
}
