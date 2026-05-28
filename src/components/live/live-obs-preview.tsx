"use client";

import { useEffect, useState } from "react";
import { LiveKitRoom, RoomAudioRenderer, useTracks, VideoTrack } from "@livekit/components-react";
import "@livekit/components-styles";
import { Track } from "livekit-client";
import { fetchLivekitCredentials } from "@/lib/livekit-token-fetch";
import { livePublisherIdentities } from "@/lib/live-participant";
import { Loader2 } from "lucide-react";

function ObsPreviewStage({ channelId, hostUserId }: { channelId: string; hostUserId: string }) {
  const publishers = livePublisherIdentities(channelId, hostUserId);
  const tracks = useTracks(
    [
      { source: Track.Source.ScreenShare, withPlaceholder: true },
      { source: Track.Source.Camera, withPlaceholder: true },
    ],
    { onlySubscribed: true }
  );

  const publisherTracks = tracks.filter((t) => publishers.includes(t.participant.identity));
  const screen = publisherTracks.find((t) => t.source === Track.Source.ScreenShare);
  const camera = publisherTracks.find((t) => t.source === Track.Source.Camera);
  const main = screen ?? camera;

  return (
    <div className="relative aspect-video w-full bg-black rounded-2xl overflow-hidden ring-1 ring-border/40">
      {main?.publication ? (
        <VideoTrack trackRef={main} className="w-full h-full object-contain" />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white/60 gap-2 text-sm">
          <Loader2 className="h-8 w-8 animate-spin" />
          OBS에서「방송 시작」을 눌러 주세요
        </div>
      )}
    </div>
  );
}

export function LiveObsPreview({ channelId }: { channelId: string }) {
  const [token, setToken] = useState<string | null>(null);
  const [serverUrl, setServerUrl] = useState("");
  const [hostUserId, setHostUserId] = useState("");

  useEffect(() => {
    fetchLivekitCredentials(channelId)
      .then((c) => {
        setToken(c.token);
        setServerUrl(c.serverUrl);
        setHostUserId(c.hostUserId ?? "");
      })
      .catch(() => {});
  }, [channelId]);

  if (!token || !serverUrl) {
    return (
      <div className="aspect-video rounded-2xl bg-muted/30 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <LiveKitRoom token={token} serverUrl={serverUrl} connect audio video={false}>
      <ObsPreviewStage channelId={channelId} hostUserId={hostUserId} />
      <RoomAudioRenderer />
    </LiveKitRoom>
  );
}
