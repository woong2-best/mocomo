"use client";

import { useEffect, useState } from "react";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  GridLayout,
  ParticipantTile,
  useTracks,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { Track } from "livekit-client";
import { Loader2 } from "lucide-react";
import { fetchLivekitCredentials } from "@/lib/livekit-token-fetch";

function VideoGrid() {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false }
  );

  return (
    <GridLayout tracks={tracks} className="min-h-[320px]">
      <ParticipantTile />
    </GridLayout>
  );
}

export function LivekitVideoRoom({
  channelId,
  channelName,
}: {
  channelId: string;
  channelName: string;
}) {
  const [token, setToken] = useState<string | null>(null);
  const [serverUrl, setServerUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLivekitCredentials(channelId)
      .then((data) => {
        setToken(data.token);
        setServerUrl(data.serverUrl);
      })
      .catch(() => setError("LiveKit 연결에 실패했습니다."));
  }, [channelId]);

  if (error) {
    return <div className="text-center text-sm text-destructive py-8">{error}</div>;
  }
  if (!token || !serverUrl) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        영상 연결 중...
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">{channelName} · HD 영상</p>
      <LiveKitRoom
        token={token}
        serverUrl={serverUrl}
        connect
        video
        audio
        className="rounded-xl overflow-hidden border border-border"
      >
        <VideoGrid />
        <RoomAudioRenderer />
      </LiveKitRoom>
    </div>
  );
}
