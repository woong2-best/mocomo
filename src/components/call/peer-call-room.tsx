"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { usePeerCall } from "@/lib/peer-call/use-peer-call";
import { PeerCallControlBar } from "@/components/call/peer-call-control-bar";
import { CallTopBar } from "@/components/call/call-top-bar";
import { CallInviteSheet } from "@/components/call/call-invite-sheet";
import { CallSettingsSheet } from "@/components/call/call-settings-sheet";
import type { CallParticipant } from "@/lib/call-types";
import type { Socket } from "socket.io-client";

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function VideoAttach({ stream, className }: { stream: MediaStream | null; className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.srcObject = stream;
    void el.play().catch(() => undefined);
  }, [stream]);
  return <video ref={ref} autoPlay playsInline className={className} />;
}

function AudioAttach({ stream }: { stream: MediaStream | null }) {
  const ref = useRef<HTMLAudioElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.srcObject = stream;
    void el.play().catch(() => undefined);
  }, [stream]);
  return <audio ref={ref} autoPlay />;
}

function DmVideoSplitStage({
  peer,
  selfPeer,
  localStream,
  remoteStream,
  phase,
}: {
  peer: CallParticipant;
  selfPeer: CallParticipant;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  phase: "outgoing" | "active";
}) {
  const hasRemoteVideo = !!remoteStream?.getVideoTracks().some((t) => t.enabled);

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <div className="relative min-h-0 flex-1 overflow-hidden bg-neutral-900">
        {hasRemoteVideo ? (
          <VideoAttach stream={remoteStream} className="h-full w-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gradient-to-b from-neutral-700 via-neutral-800 to-neutral-900 px-4">
            <Avatar className="h-24 w-24 ring-2 ring-white/15">
              <AvatarImage src={peer.image ?? undefined} />
              <AvatarFallback className="bg-white/10 text-2xl text-white">
                {peer.username[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {phase === "outgoing" && (
              <p className="text-center text-sm text-white/55">연결 대기 중…</p>
            )}
          </div>
        )}
      </div>
      <div className="h-px shrink-0 bg-white/10" />
      <div className="relative min-h-0 flex-1 overflow-hidden bg-neutral-900">
        {localStream?.getVideoTracks().some((t) => t.enabled) ? (
          <VideoAttach stream={localStream} className="h-full w-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gradient-to-b from-neutral-700 via-neutral-800 to-neutral-900">
            <Avatar className="h-24 w-24 ring-2 ring-white/15">
              <AvatarImage src={selfPeer.image ?? undefined} />
              <AvatarFallback className="bg-white/10 text-2xl text-white">
                {selfPeer.username[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>
        )}
      </div>
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

export function PeerCallRoom({
  callId,
  userId,
  peerUserId,
  isCaller,
  video,
  enabled,
  socket,
  peer,
  selfPeer,
  phase,
  onHangup,
}: {
  callId: string;
  userId: string;
  peerUserId: string;
  isCaller: boolean;
  video: boolean;
  enabled: boolean;
  socket: Socket | null;
  peer: CallParticipant;
  selfPeer: CallParticipant;
  phase: "outgoing" | "active";
  onHangup: () => void;
}) {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const peerCall = usePeerCall({
    callId,
    userId,
    peerUserId,
    isCaller,
    video,
    enabled,
    socket,
    onFailed: (msg) => setError(msg),
  });

  useEffect(() => {
    if (phase !== "active") {
      setSeconds(0);
      return;
    }
    const start = Date.now();
    const id = setInterval(() => setSeconds(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(id);
  }, [phase]);

  if (error) {
    return (
      <div className="flex h-full items-center justify-center bg-black px-6">
        <p className="text-center text-sm text-red-400">{error}</p>
      </div>
    );
  }

  if (enabled && peerCall.state === "connecting" && phase === "outgoing") {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 bg-black text-white/70">
        <Loader2 className="h-7 w-7 animate-spin" />
        <p className="text-sm">{video ? "영상 연결 중…" : "음성 연결 중…"}</p>
      </div>
    );
  }

  return (
    <div className="relative flex h-full min-h-0 flex-col bg-black text-white">
      <AudioAttach stream={peerCall.remoteStream} />
      <CallTopBar
        onMinimize={() => undefined}
        onInvite={() => setInviteOpen(true)}
        onSettings={() => setSettingsOpen(true)}
      />

      <div className="min-h-0 flex-1">
        {video ? (
          <DmVideoSplitStage
            peer={peer}
            selfPeer={selfPeer}
            localStream={peerCall.localStream}
            remoteStream={peerCall.remoteStream}
            phase={phase}
          />
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

      <PeerCallControlBar
        video={video}
        micEnabled={peerCall.micEnabled}
        cameraEnabled={peerCall.cameraEnabled}
        onToggleMic={() => peerCall.setMic(!peerCall.micEnabled)}
        onToggleCamera={() => peerCall.setCamera(!peerCall.cameraEnabled)}
        onFlipCamera={() => void peerCall.flipCamera()}
        onHangup={() => {
          peerCall.hangup();
          onHangup();
        }}
      />

      <CallInviteSheet open={inviteOpen} onClose={() => setInviteOpen(false)} peer={peer} />
      {settingsOpen ? (
        <CallSettingsSheet
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          localStream={peerCall.localStream}
        />
      ) : null}
    </div>
  );
}
