"use client";

import { useEffect, useState } from "react";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useTracks,
  VideoTrack,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { Track } from "livekit-client";
import { fetchLivekitCredentials } from "@/lib/livekit-token-fetch";
import { livePublisherIdentities } from "@/lib/live-participant";
import { Loader2, Volume2 } from "lucide-react";

function ViewerStage({ channelId, hostUserId }: { channelId: string; hostUserId: string }) {
  const publishers = livePublisherIdentities(channelId, hostUserId);
  const tracks = useTracks(
    [
      { source: Track.Source.ScreenShare, withPlaceholder: true },
      { source: Track.Source.Camera, withPlaceholder: true },
    ],
    { onlySubscribed: true }
  );

  const trackList = Array.isArray(tracks) ? tracks : [];
  const publisherTracks = trackList.filter((t) => publishers.includes(t.participant.identity));
  const screen = publisherTracks.find((t) => t.source === Track.Source.ScreenShare);
  const camera = publisherTracks.find((t) => t.source === Track.Source.Camera);
  const main = screen ?? camera;
  const hasVideo = main && main.publication;

  return (
    <div className="relative aspect-video w-full bg-black rounded-2xl overflow-hidden ring-1 ring-border/40">
      {hasVideo ? (
        <VideoTrack trackRef={main} className="w-full h-full object-contain" />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white/60 gap-2">
          <Volume2 className="h-10 w-10 animate-pulse" />
          <p className="text-sm">방송 화면을 기다리는 중…</p>
        </div>
      )}
      <div className="absolute top-3 left-3">
        <span className="px-2.5 py-1 rounded-md bg-red-600/90 text-white text-xs font-bold">LIVE</span>
      </div>
    </div>
  );
}

export function LiveViewerPlayer({
  channelId,
  hostUserId,
}: {
  channelId: string;
  hostUserId: string;
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
        setError(e instanceof Error ? e.message : "시청 연결 실패");
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
      video={false}
      className="space-y-0"
      data-lk-theme="default"
    >
      <ViewerStage channelId={channelId} hostUserId={hostUserId} />
      <RoomAudioRenderer />
    </LiveKitRoom>
  );
}
