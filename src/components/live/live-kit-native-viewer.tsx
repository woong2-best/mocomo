"use client";

import { useEffect, useRef, useState } from "react";
import { RemoteParticipant, Room, RoomEvent, Track } from "livekit-client";
import { fetchLivekitCredentials } from "@/lib/livekit-token-fetch";
import { livePublisherIdentities } from "@/lib/live-participant";
import { LIVE_VIEWER_ROOM_OPTIONS } from "@/lib/live-broadcast-options";
import { Loader2, Volume2 } from "lucide-react";

/** 시청 전용 — @livekit/components-react 없이 livekit-client만 사용 */
export function LiveKitNativeViewer({
  channelId,
  hostUserId,
}: {
  channelId: string;
  hostUserId: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [waiting, setWaiting] = useState(true);

  useEffect(() => {
    let room: Room | null = null;
    let mounted = true;
    const publishers = livePublisherIdentities(channelId, hostUserId);

    function attachVideo(track: Track) {
      if (track.kind !== Track.Kind.Video || !videoRef.current) return;
      track.attach(videoRef.current);
      setWaiting(false);
    }

    function tryAttachParticipant(participant: RemoteParticipant) {
      if (!publishers.includes(participant.identity)) return;
      for (const pub of participant.trackPublications.values()) {
        if (pub.track && (pub.source === Track.Source.Camera || pub.source === Track.Source.ScreenShare)) {
          attachVideo(pub.track);
        }
      }
    }

    (async () => {
      try {
        const creds = await fetchLivekitCredentials(channelId);
        room = new Room(LIVE_VIEWER_ROOM_OPTIONS);
        room.on(RoomEvent.TrackSubscribed, (track, _pub, participant) => {
          if (!publishers.includes(participant.identity)) return;
          if (track.kind === Track.Kind.Video) attachVideo(track);
          if (track.kind === Track.Kind.Audio) {
            const el = track.attach();
            el.style.display = "none";
            document.body.appendChild(el);
          }
        });
        room.on(RoomEvent.TrackUnsubscribed, (track) => {
          track.detach();
        });
        await room.connect(creds.serverUrl, creds.token);
        if (!mounted) return;
        room.remoteParticipants.forEach((p) => tryAttachParticipant(p));
      } catch (e) {
        if (mounted) {
          setError(e instanceof Error ? e.message : "시청 연결 실패");
          setWaiting(false);
        }
      }
    })();

    return () => {
      mounted = false;
      room?.disconnect();
    };
  }, [channelId, hostUserId]);

  if (error) {
    return (
      <p className="text-sm text-destructive text-center p-6 bg-destructive/10 rounded-2xl">{error}</p>
    );
  }

  return (
    <div className="relative aspect-video w-full bg-black rounded-2xl overflow-hidden ring-1 ring-border/40">
      <video ref={videoRef} className="w-full h-full object-contain" autoPlay playsInline />
      {waiting && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white/60 gap-2">
          <Loader2 className="h-10 w-10 animate-spin" />
          <Volume2 className="h-8 w-8" />
          <p className="text-sm">방송 화면을 기다리는 중…</p>
        </div>
      )}
    </div>
  );
}
