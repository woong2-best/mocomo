"use client";

import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { useCallback, useEffect, useRef, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { usePeerCall } from "@/lib/peer-call/use-peer-call";
import { PeerCallControlBar } from "@/components/call/peer-call-control-bar";
import { CallTopBar } from "@/components/call/call-top-bar";
import { CallRingingStage } from "@/components/call/call-overlay";
import { CallInviteSheet } from "@/components/call/call-invite-sheet";
import type { Socket } from "socket.io-client";
import type { CallParticipant } from "@/lib/call-types";
import type { CallSignalEvent } from "@/lib/peer-call/types";

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
    el.muted = true;
    void el.play().catch(() => undefined);
  }, [stream]);
  return <video ref={ref} autoPlay playsInline muted className={className} />;
}

function AudioAttach({ stream, speakerOn }: { stream: MediaStream | null; speakerOn: boolean }) {
  const ref = useRef<HTMLAudioElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.srcObject = stream;
    el.muted = !speakerOn;
    el.volume = speakerOn ? 1 : 0;
    const play = () => {
      void el.play().catch(() => undefined);
    };
    play();
    el.addEventListener("canplay", play);
    return () => el.removeEventListener("canplay", play);
  }, [stream, speakerOn]);
  return <audio ref={ref} autoPlay playsInline />;
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
              <p className="text-center text-sm text-white/55">{t("call.s6y69qd")}</p>
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
  signalingRoomId,
  userId,
  peerUserId,
  isCaller,
  video,
  enabled,
  socket,
  initialSignals,
  peer,
  selfPeer,
  phase,
  onHangup,
  onRemoteHangup,
  onMinimize,
  onCallFailed,
}: {
  callId: string;
  signalingRoomId: string;
  userId: string;
  peerUserId: string;
  isCaller: boolean;
  video: boolean;
  enabled: boolean;
  socket?: Socket | null;
  initialSignals?: CallSignalEvent[];
  peer: CallParticipant;
  selfPeer: CallParticipant;
  phase: "outgoing" | "active";
  onHangup: () => void;
  onRemoteHangup?: () => void;
  onMinimize?: () => void;
  onCallFailed?: () => void;
}) {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(true);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const onPeerFailed = useCallback((msg: string) => setError(msg), []);

  const peerCall = usePeerCall({
    callId,
    signalingRoomId,
    userId,
    peerUserId,
    isCaller,
    video,
    enabled,
    socket,
    initialSignals,
    onFailed: onPeerFailed,
    onConnectionLost: () => onCallFailed?.(),
    onRemoteHangup,
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

  if (enabled && peerCall.state === "connecting") {
    const localPreview = video && peerCall.localStream?.getVideoTracks().some((track) => track.enabled);
    return (
      <div className="relative flex h-full min-h-0 flex-col bg-gradient-to-b from-zinc-900 via-black to-zinc-950 text-white">
        <AudioAttach stream={peerCall.remoteStream} speakerOn={speakerOn} />
        <CallTopBar onMinimize={onMinimize} />
        {error ? (
          <p className="absolute inset-x-4 top-14 z-30 rounded-xl bg-red-500/20 px-3 py-2 text-center text-xs text-red-200">
            {error}
          </p>
        ) : null}
        {localPreview ? (
          <div className="flex min-h-0 flex-1 flex-col">
            <VideoAttach stream={peerCall.localStream} className="h-full w-full object-cover" />
            <p className="pointer-events-none absolute inset-x-0 top-16 z-10 text-center text-sm text-white/70">
              {t("call.s121ftcl")}
            </p>
          </div>
        ) : (
          <CallRingingStage
            peer={peer}
            isVideo={video}
            phase="outgoing"
            subtitle={video ? t("call.s121ftcl") : t("call.s1ygtvdm")}
          />
        )}
        <div className="absolute inset-x-0 bottom-0 z-20 pb-safe pt-4">
          <PeerCallControlBar
            video={video}
            micEnabled={peerCall.micEnabled}
            cameraEnabled={peerCall.cameraEnabled}
            speakerOn={speakerOn}
            onToggleMic={() => peerCall.setMic(!peerCall.micEnabled)}
            onToggleCamera={() => peerCall.setCamera(!peerCall.cameraEnabled)}
            onFlipCamera={() => void peerCall.flipCamera()}
            onToggleSpeaker={() => setSpeakerOn((on) => !on)}
            onHangup={() => {
              peerCall.hangup();
              onHangup();
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex h-full min-h-0 flex-col bg-black text-white">
      <AudioAttach stream={peerCall.remoteStream} speakerOn={speakerOn} />
      <CallTopBar
        onMinimize={onMinimize}
        onInvite={() => setInviteOpen(true)}
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
        speakerOn={speakerOn}
        onToggleMic={() => peerCall.setMic(!peerCall.micEnabled)}
        onToggleCamera={() => peerCall.setCamera(!peerCall.cameraEnabled)}
        onFlipCamera={() => void peerCall.flipCamera()}
        onToggleSpeaker={() => setSpeakerOn((on) => !on)}
        onHangup={() => {
          peerCall.hangup();
          onHangup();
        }}
      />

      {error ? (
        <p className="absolute inset-x-4 top-14 z-30 rounded-xl bg-red-500/20 px-3 py-2 text-center text-xs text-red-200">
          {error}
        </p>
      ) : null}

      <CallInviteSheet open={inviteOpen} onClose={() => setInviteOpen(false)} peer={peer} />
    </div>
  );
}
