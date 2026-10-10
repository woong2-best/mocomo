"use client";

import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

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
    return isVideo ? t("call.s1wdz0kw") : t("call.sp21ex7");
  }
  if (phase === "incoming") {
    return isVideo ? t("call.sia326y") : t("call.s1eph47z");
  }
  if (phase === "outgoing") {
    return isVideo ? t("call.sq9kz4g") : t("call.sr1s7dt");
  }
  return isVideo ? t("call.sh6w58f") : t("call.smavk62");
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
          {t("call.sqnjif7")}
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
          {t("call.s1g8931j")}
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
              {phase === "outgoing" ? t("call.sjshb0n") : t("call.mocomo")}
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
  onAccept,
  onDecline,
  onCancel,
  onHangup,
  minimized,
  onExpand,
}: {
  callState: Exclude<ActiveCallState, { phase: "idle" }>;
  error: string;
  mic: MicCheckResult | null;
  camera: CameraCheckResult | null;
  micChecking: boolean;
  cameraChecking: boolean;
  onMicCheck: () => void;
  onCameraCheck?: () => void;
  onAccept: () => void;
  onDecline: () => void;
  onCancel: () => void;
  onHangup: () => void;
  minimized?: boolean;
  onExpand?: () => void;
}) {
  const isVideo =
    callState.phase === "preparing"
      ? callState.callType === "VIDEO"
      : callState.call.callType === "VIDEO";

  useCallWakeLock(
    (callState.phase === "active" || callState.phase === "outgoing") && isVideo
  );

  // Media stays in CallProvider's stable host. This chrome must not remount WebRTC.
  if (callState.phase === "active" && minimized) {
    const name = callState.peer.username || t("call.s10ugv");
    return (
      <div className="fixed inset-x-3 bottom-24 z-[220] flex items-center gap-3 rounded-full bg-zinc-900/95 px-3 py-2 text-white shadow-2xl ring-1 ring-white/10 backdrop-blur-md">
        <button
          type="button"
          onClick={onExpand}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
          aria-label={t("call.sv97sbf")}
        >
          <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-400" />
          <span className="truncate text-sm font-semibold">{name}</span>
          <span className="shrink-0 text-xs text-white/60">{t("call.srbmgkw")}</span>
        </button>
        <button
          type="button"
          onClick={onHangup}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-500"
          aria-label={t("call.s1to4lew")}
        >
          <PhoneOff className="h-5 w-5" />
        </button>
      </div>
    );
  }

  if (callState.phase === "active") {
    return null;
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
            <RingButton variant="decline" label={t("collab.reject")} icon={PhoneOff} onClick={onDecline} large />
            <RingButton
              variant="accept"
              label={t("call.swy9h")}
              icon={isVideo ? Video : PhoneIncoming}
              onClick={onAccept}
              large
            />
          </div>
        )}

        {(callState.phase === "outgoing" || callState.phase === "preparing") && (
          <div className="flex justify-center">
            <RingButton variant="decline" label={t("toast.cancel")} icon={PhoneOff} onClick={onCancel} large />
          </div>
        )}
      </div>
    </div>
  );
}
