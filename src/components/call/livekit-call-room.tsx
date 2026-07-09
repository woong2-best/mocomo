"use client";

import { useEffect, useState } from "react";
import {
  LiveKitRoom,
  useLocalParticipant,
  useTracks,
  VideoTrack,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { Track } from "livekit-client";
import type { TrackReference, TrackReferenceOrPlaceholder } from "@livekit/components-react";
import { Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { fetchLivekitCredentials, type LivekitCredentials } from "@/lib/livekit-token-fetch";
import {
  VIDEO_CALL_CAPTURE,
  VIDEO_CALL_ROOM_OPTIONS,
  VOICE_CALL_CAPTURE,
  VOICE_CALL_STABLE_OPTIONS,
} from "@/lib/livekit-audio-options";
import { CallRoomAudio } from "@/components/call/call-room-audio";
import { CallRoomConnection } from "@/components/call/call-room-connection";
import { CallControlBar } from "@/components/call/call-control-bar";
import { CallTopBar } from "@/components/call/call-top-bar";
import { CallInviteSheet } from "@/components/call/call-invite-sheet";
import { CallSettingsSheet } from "@/components/call/call-settings-sheet";
import type { CallParticipant } from "@/lib/call-types";
import { cn } from "@/lib/utils";

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function isCameraLive(trackRef: TrackReferenceOrPlaceholder | undefined): boolean {
  if (!trackRef?.publication) return false;
  return trackRef.publication.isSubscribed && !trackRef.publication.isMuted;
}

function VideoPane({
  trackRef,
  peer,
  waitingLabel,
}: {
  trackRef: TrackReferenceOrPlaceholder | undefined;
  peer: CallParticipant;
  waitingLabel?: string;
}) {
  const live = isCameraLive(trackRef);
  const videoRef =
    trackRef && trackRef.publication ? (trackRef as TrackReference) : undefined;

  return (
    <div className="relative min-h-0 flex-1 overflow-hidden bg-neutral-900">
      {live && videoRef ? (
        <VideoTrack trackRef={videoRef} className="h-full w-full object-cover" />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gradient-to-b from-neutral-700 via-neutral-800 to-neutral-900 px-4">
          <Avatar className="h-24 w-24 ring-2 ring-white/15">
            <AvatarImage src={peer.image ?? undefined} />
            <AvatarFallback className="bg-white/10 text-2xl text-white">
              {peer.username[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          {waitingLabel && (
            <p className="text-center text-sm text-white/55">{waitingLabel}</p>
          )}
        </div>
      )}
    </div>
  );
}

function DmVideoSplitStage({
  peer,
  selfPeer,
  phase,
}: {
  peer: CallParticipant;
  selfPeer: CallParticipant;
  phase: "outgoing" | "active";
}) {
  const { localParticipant } = useLocalParticipant();
  const tracks = useTracks([{ source: Track.Source.Camera, withPlaceholder: true }], {
    onlySubscribed: false,
  });

  const remote = tracks.find(
    (t) =>
      t.participant.identity !== localParticipant.identity &&
      t.source === Track.Source.Camera
  );
  const local = tracks.find(
    (t) =>
      t.participant.identity === localParticipant.identity &&
      t.source === Track.Source.Camera
  );

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <VideoPane
        trackRef={remote}
        peer={peer}
        waitingLabel={phase === "outgoing" ? "연결 대기 중…" : undefined}
      />
      <div className="h-px shrink-0 bg-white/10" />
      <VideoPane trackRef={local} peer={selfPeer} />
    </div>
  );
}

function AudioCallStage({
  peer,
  seconds,
}: {
  peer: CallParticipant;
  seconds: number;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 px-6 pt-16 pb-28">
      <Avatar className="h-28 w-28 ring-2 ring-white/15">
        <AvatarImage src={peer.image ?? undefined} />
        <AvatarFallback className="bg-white/10 text-3xl text-white">
          {peer.username[0]?.toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="text-center">
        <p className="text-2xl font-semibold text-white">{peer.username}</p>
        <p className="mt-1 text-sm tabular-nums text-white/55">{formatDuration(seconds)}</p>
      </div>
    </div>
  );
}

function CallRoomChrome({
  peer,
  selfPeer,
  video,
  phase,
  onHangup,
}: {
  peer: CallParticipant;
  selfPeer: CallParticipant;
  video: boolean;
  phase: "outgoing" | "active";
  onHangup: () => void;
}) {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (phase !== "active") {
      setSeconds(0);
      return;
    }
    const start = Date.now();
    const id = setInterval(() => setSeconds(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(id);
  }, [phase]);

  return (
    <div className="relative flex h-full min-h-0 flex-col bg-black text-white">
      <CallTopBar
        onMinimize={() => undefined}
        onInvite={() => setInviteOpen(true)}
        onSettings={() => setSettingsOpen(true)}
      />

      <div className="min-h-0 flex-1">
        {video ? (
          <DmVideoSplitStage peer={peer} selfPeer={selfPeer} phase={phase} />
        ) : (
          <AudioCallStage peer={peer} seconds={seconds} />
        )}
      </div>

      {video && phase === "active" && (
        <div className="pointer-events-none absolute inset-x-0 top-14 z-10 text-center">
          <p className="text-sm font-medium text-white/90">{peer.username}</p>
          <p className="text-xs tabular-nums text-white/50">{formatDuration(seconds)}</p>
        </div>
      )}

      <CallControlBar video={video} onHangup={onHangup} />

      <CallInviteSheet open={inviteOpen} onClose={() => setInviteOpen(false)} peer={peer} />
      <CallSettingsSheet open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}

export function LivekitCallRoom({
  roomName,
  video,
  prefetched,
  peer,
  selfPeer,
  phase,
  onHangup,
}: {
  roomName: string;
  video: boolean;
  prefetched?: LivekitCredentials | null;
  peer: CallParticipant;
  selfPeer: CallParticipant;
  phase: "outgoing" | "active";
  onHangup: () => void;
}) {
  const [token, setToken] = useState<string | null>(prefetched?.token ?? null);
  const [serverUrl, setServerUrl] = useState<string>(prefetched?.serverUrl ?? "");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (prefetched?.token && prefetched.serverUrl) {
      setToken(prefetched.token);
      setServerUrl(prefetched.serverUrl);
      setError(null);
      return;
    }

    setError(null);
    setToken(null);
    setServerUrl("");

    fetchLivekitCredentials(roomName)
      .then((data) => {
        if (cancelled) return;
        setToken(data.token);
        setServerUrl(data.serverUrl);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "연결에 실패했습니다.");
      });

    return () => {
      cancelled = true;
    };
  }, [roomName, prefetched?.token, prefetched?.serverUrl]);

  if (error) {
    return (
      <div className="flex h-full items-center justify-center bg-black px-6">
        <p className="text-center text-sm text-red-400">{error}</p>
      </div>
    );
  }

  if (!token || !serverUrl) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 bg-black text-white/70">
        <Loader2 className="h-7 w-7 animate-spin" />
        <p className="text-sm">{video ? "영상 연결 중…" : "음성 연결 중…"}</p>
      </div>
    );
  }

  return (
    <LiveKitRoom
      token={token}
      serverUrl={serverUrl}
      connect
      audio={VOICE_CALL_CAPTURE}
      video={video ? VIDEO_CALL_CAPTURE : false}
      options={video ? VIDEO_CALL_ROOM_OPTIONS : VOICE_CALL_STABLE_OPTIONS}
      className={cn("h-full w-full [&_.lk-room-container]:h-full")}
      data-lk-theme="default"
    >
      <CallRoomConnection />
      <CallRoomAudio />
      <CallRoomChrome
        peer={peer}
        selfPeer={selfPeer}
        video={video}
        phase={phase}
        onHangup={onHangup}
      />
    </LiveKitRoom>
  );
}
