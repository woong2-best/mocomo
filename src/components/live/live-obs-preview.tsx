"use client";

import { useTracks, VideoTrack } from "@livekit/components-react";
import { Track } from "livekit-client";
import { livePublisherIdentities } from "@/lib/live-participant";
import { Loader2 } from "lucide-react";

/** LiveObsStudio의 LiveKitRoom 안에서만 사용 */
export function LiveObsPreviewStage({
  channelId,
  hostUserId,
}: {
  channelId: string;
  hostUserId: string;
}) {
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
