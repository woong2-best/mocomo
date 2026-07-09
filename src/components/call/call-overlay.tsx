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

function phaseSubtitle(isVideo: boolean, phase: ActiveCallState["phase"]) {
  if (phase === "preparing") return isVideo ? "영상 통화 연결 준비 중…" : "음성 통화 연결 준비 중…";
  if (phase === "incoming") return isVideo ? "영상 통화" : "음성 통화";
  if (phase === "outgoing") return isVideo ? "영상 통화 연결 대기 중…" : "연결 중…";
  return isVideo ? "영상·음성 통화" : "음성 통화";
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
    <div className="mx-auto max-w-sm rounded-2xl bg-white/10 px-4 py-3 text-center text-xs text-white/80">
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
}: {
  variant: "accept" | "decline";
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="flex flex-col items-center gap-2 disabled:opacity-40"
      aria-label={label}
    >
      <span
        className={cn(
          "flex h-16 w-16 items-center justify-center rounded-full transition-transform active:scale-95",
          variant === "accept" ? "bg-emerald-500 text-white" : "bg-red-500 text-white"
        )}
      >
        <Icon className="h-7 w-7" />
      </span>
      <span className="text-sm text-white/80">{label}</span>
    </button>
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
  livekitSlot,
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
  livekitSlot?: React.ReactNode;
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

  const isLivekitPhase =
    callState.phase === "active" || callState.phase === "outgoing";

  if (isLivekitPhase && livekitSlot) {
    return (
      <div className="fixed inset-0 z-[100] bg-black">
        <div className="h-full w-full">{livekitSlot}</div>
        {error && (
          <p className="absolute inset-x-4 top-safe mt-14 z-30 rounded-xl bg-red-500/20 px-3 py-2 text-center text-xs text-red-200">
            {error}
          </p>
        )}
      </div>
    );
  }

  const peer =
    callState.phase === "preparing" ? callState.peer : callState.peer;
  const subtitle = phaseSubtitle(isVideo, callState.phase);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-black text-white">
      <div className="flex flex-1 flex-col items-center justify-center px-6 pb-32 pt-safe">
        {callState.phase === "preparing" ? (
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-white/70" />
            <p className="text-sm text-white/60">{subtitle}</p>
          </div>
        ) : (
          <>
            <div className="relative mb-8">
              {(callState.phase === "incoming" || callState.phase === "outgoing") && (
                <>
                  <span className="absolute inset-0 scale-125 rounded-full bg-white/5 animate-ping" />
                  <span className="absolute -inset-4 rounded-full border border-white/10" />
                </>
              )}
              <Avatar className="relative h-28 w-28 ring-2 ring-white/15">
                <AvatarImage src={peer.image ?? undefined} />
                <AvatarFallback className="bg-white/10 text-3xl text-white">
                  {peer.username[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>

            <p className="text-2xl font-semibold tracking-tight">{peer.username}</p>
            <p className="mt-2 flex items-center gap-2 text-sm text-white/55">
              {isVideo ? <Video className="h-4 w-4" /> : <Phone className="h-4 w-4" />}
              {subtitle}
            </p>

            {callState.phase === "incoming" && (
              <div className="mt-8 w-full max-w-sm">
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
          </>
        )}

        {error && (
          <p className="mt-6 flex max-w-sm items-center justify-center gap-2 text-center text-xs text-red-300">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </p>
        )}
      </div>

      <div className="absolute inset-x-0 bottom-0 z-10 px-8 pb-safe pt-4">
        {callState.phase === "incoming" && (
          <div className="mx-auto flex max-w-xs items-center justify-between">
            <RingButton variant="decline" label="거절" icon={PhoneOff} onClick={onDecline} />
            <RingButton
              variant="accept"
              label="받기"
              icon={isVideo ? Video : PhoneIncoming}
              disabled={!mediaReady || micChecking || cameraChecking}
              onClick={onAccept}
            />
          </div>
        )}

        {(callState.phase === "outgoing" || callState.phase === "preparing") && (
          <div className="flex justify-center">
            <RingButton variant="decline" label="취소" icon={PhoneOff} onClick={onCancel} />
          </div>
        )}

        {callState.phase === "active" && !livekitSlot && (
          <div className="flex justify-center">
            <RingButton variant="decline" label="끊기" icon={PhoneOff} onClick={onHangup} />
          </div>
        )}
      </div>
    </div>
  );
}
