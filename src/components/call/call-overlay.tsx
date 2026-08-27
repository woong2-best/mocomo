"use client";

import type { ActiveCallState } from "@/lib/call-types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Loader2,
  Phone,
  PhoneIncoming,
  PhoneOff,
  Video,
  MicOff,
  VideoOff,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { MicCheckResult } from "@/lib/microphone";
import type { CameraCheckResult } from "@/lib/camera";
import { useCallWakeLock } from "@/hooks/use-call-wake-lock";
import type { CallParticipant } from "@/lib/call-types";

function phaseSubtitle(isVideo: boolean, phase: ActiveCallState["phase"]) {
  if (phase === "preparing") {
    return isVideo ? "영상 통화 준비 중…" : "음성 통화 준비 중…";
  }
  if (phase === "incoming") {
    return isVideo ? "영상 통화 요청" : "음성 통화 요청";
  }
  if (phase === "outgoing") {
    return isVideo ? "영상 통화 거는 중…" : "전화 거는 중…";
  }
  return isVideo ? "영상 통화" : "음성 통화";
}

function PermissionBanner({
  mic,
  camera,
  video,
  onMicCheck,
  onCameraCheck,
  micChecking,
  cameraChecking,
}: {
  mic: MicCheckResult | null;
  camera: CameraCheckResult | null;
  video: boolean;
  onMicCheck: () => void;
  onCameraCheck?: () => void;
  micChecking: boolean;
  cameraChecking: boolean;
}) {
  const micDenied = mic && !mic.ok;
  const camDenied = video && camera && !camera.ok;
  if (!micDenied && !camDenied) return null;

  return (
    <div className="mx-auto max-w-sm rounded-2xl bg-white/10 px-4 py-3 text-center text-xs text-white/80 backdrop-blur-sm">
      {!mic?.ok && (
        <button
          type="button"
          disabled={micChecking}
          onClick={onMicCheck}
          className="flex w-full items-center justify-center gap-2 py-1"
        >
          {micChecking ? <Loader2 className="h-4 w-4 animate-spin" /> : <MicOff className="h-4 w-4" />}
          마이크 권한이 필요합니다
        </button>
      )}
      {camDenied && onCameraCheck && (
        <button
          type="button"
          disabled={cameraChecking}
          onClick={onCameraCheck}
          className="flex w-full items-center justify-center gap-2 py-1"
        >
          {cameraChecking ? <Loader2 className="h-4 w-4 animate-spin" /> : <VideoOff className="h-4 w-4" />}
          카메라 권한이 필요합니다
        </button>
      )}
    </div>
  );
}

function RingButton({
  variant,
  label,
  icon: Icon,
  onClick,
  disabled,
  large,
}: {
  variant: "accept" | "decline";
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  disabled?: boolean;
  large?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="flex flex-col items-center gap-2.5 disabled:opacity-40"
      aria-label={label}
    >
      <span
        className={cn(
          "flex items-center justify-center rounded-full transition-transform active:scale-95 shadow-lg",
          large ? "h-[4.5rem] w-[4.5rem]" : "h-16 w-16",
          variant === "accept" ? "bg-emerald-500 text-white" : "bg-red-500 text-white"
        )}
      >
        <Icon className={cn(large ? "h-8 w-8" : "h-7 w-7")} />
      </span>
      <span className="text-sm font-medium text-white/85">{label}</span>
    </button>
  );
}

export function CallRingingStage({
  peer,
  isVideo,
  phase,
  subtitle,
}: {
  peer: CallParticipant;
  isVideo: boolean;
  phase: "preparing" | "incoming" | "outgoing";
  subtitle?: string;
}) {
  const label = subtitle ?? phaseSubtitle(isVideo, phase);
  const ringing = phase === "incoming" || phase === "outgoing";

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 pb-36 pt-safe">
      {phase === "preparing" ? (
        <div className="flex flex-col items-center gap-5">
          <Loader2 className="h-11 w-11 animate-spin text-white/75" />
          <p className="text-base text-white/65">{label}</p>
        </div>
      ) : (
        <>
          <div className="relative mb-10 flex items-center justify-center">
            {ringing && (
              <>
                <span className="absolute h-44 w-44 rounded-full bg-white/[0.04] animate-ping" />
                <span className="absolute h-40 w-40 rounded-full border border-white/10" />
                <span className="absolute h-36 w-36 rounded-full border border-white/15" />
              </>
            )}
            <Avatar className="relative h-32 w-32 ring-4 ring-white/20 shadow-2xl">
              <AvatarImage src={peer.image ?? undefined} className="object-cover" />
              <AvatarFallback className="bg-gradient-to-br from-zinc-700 to-zinc-900 text-4xl text-white">
                {peer.username[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>

          <p className="text-3xl font-bold tracking-tight text-white">{peer.username}</p>
          <p className="mt-3 flex items-center gap-2 text-base text-white/60">
            {isVideo ? <Video className="h-4 w-4" /> : <Phone className="h-4 w-4" />}
            {label}
          </p>
          {ringing && (
            <p className="mt-2 text-sm text-white/40">
              {phase === "outgoing" ? "상대방이 받을 때까지 기다려 주세요" : "MoCoMo 통화"}
            </p>
          )}
        </>
      )}
    </div>
  );
}

export function CallOverlay({
  callState,
  error,
  mic,
  camera,
  micChecking,
  cameraChecking,
  onMicCheck,
  onCameraCheck,
  peerCallSlot,
  onAccept,
  onDecline,
  onCancel,
  onHangup,
}: {
  callState: Exclude<ActiveCallState, { phase: "idle" }>;
  error: string;
  mic: MicCheckResult | null;
  camera: CameraCheckResult | null;
  micChecking: boolean;
  cameraChecking: boolean;
  onMicCheck: () => void;
  onCameraCheck?: () => void;
  peerCallSlot?: React.ReactNode;
  onAccept: () => void;
  onDecline: () => void;
  onCancel: () => void;
  onHangup: () => void;
}) {
  const isVideo =
    callState.phase === "preparing"
      ? callState.callType === "VIDEO"
      : callState.call.callType === "VIDEO";

  useCallWakeLock(
    (callState.phase === "active" || callState.phase === "outgoing") && isVideo
  );

  const micReady = !!mic?.ok;
  const camReady = !isVideo || !!camera?.ok;
  const mediaReady = micReady && camReady;

  if (callState.phase === "active" && peerCallSlot) {
    return (
      <div className="fixed inset-0 z-[200] bg-black">
        <div className="h-full w-full">{peerCallSlot}</div>
        {error && (
          <p className="absolute inset-x-4 top-safe mt-14 z-30 rounded-xl bg-red-500/20 px-3 py-2 text-center text-xs text-red-200">
            {error}
          </p>
        )}
      </div>
    );
  }

  const peer = callState.phase === "preparing" ? callState.peer : callState.peer;
  const ringingPhase: "preparing" | "incoming" | "outgoing" =
    callState.phase === "preparing"
      ? "preparing"
      : callState.phase === "incoming"
        ? "incoming"
        : "outgoing";

  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-gradient-to-b from-zinc-900 via-black to-zinc-950 text-white">
      <CallRingingStage peer={peer} isVideo={isVideo} phase={ringingPhase} />

      {callState.phase === "incoming" && (
        <div className="absolute inset-x-6 top-[calc(50%+6rem)] z-10">
          <PermissionBanner
            mic={mic}
            camera={camera}
            video={isVideo}
            onMicCheck={onMicCheck}
            onCameraCheck={onCameraCheck}
            micChecking={micChecking}
            cameraChecking={cameraChecking}
          />
        </div>
      )}

      {error && (
        <p className="absolute inset-x-6 top-safe mt-16 z-20 flex items-center justify-center gap-2 text-center text-sm text-red-300">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </p>
      )}

      <div className="absolute inset-x-0 bottom-0 z-10 px-10 pb-safe pt-6">
        {callState.phase === "incoming" && (
          <div className="mx-auto flex max-w-sm items-center justify-between gap-8">
            <RingButton variant="decline" label="거절" icon={PhoneOff} onClick={onDecline} large />
            <RingButton
              variant="accept"
              label="받기"
              icon={isVideo ? Video : PhoneIncoming}
              disabled={!mediaReady || micChecking || cameraChecking}
              onClick={onAccept}
              large
            />
          </div>
        )}

        {(callState.phase === "outgoing" || callState.phase === "preparing") && (
          <div className="flex justify-center">
            <RingButton variant="decline" label="취소" icon={PhoneOff} onClick={onCancel} large />
          </div>
        )}
      </div>
    </div>
  );
}
