"use client";

import { useEffect, useState } from "react";
import type { ActiveCallState } from "@/lib/call-types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Mic,
  MicOff,
  Phone,
  PhoneIncoming,
  PhoneOff,
  PhoneOutgoing,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { MicCheckResult } from "@/lib/microphone";

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const PHASE_META = {
  incoming: {
    badge: "수신 중",
    badgeClass: "bg-green-500/15 text-green-700 dark:text-green-400",
    subtitle: "음성 통화 요청이 왔습니다",
    icon: PhoneIncoming,
  },
  outgoing: {
    badge: "발신 중",
    badgeClass: "bg-primary/15 text-primary",
    subtitle: "상대방이 받을 때까지 기다리는 중…",
    icon: PhoneOutgoing,
  },
  active: {
    badge: "통화 중",
    badgeClass: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
    subtitle: "마이크가 연결되어 대화 중입니다",
    icon: Phone,
  },
} as const;

function MicCheckPanel({
  mic,
  checking,
  onCheck,
}: {
  mic: MicCheckResult | null;
  checking: boolean;
  onCheck: () => void;
}) {
  const granted = mic?.ok;
  const denied = mic?.status === "denied";

  return (
    <div
      className={cn(
        "rounded-2xl border px-4 py-3 text-left transition-colors",
        granted
          ? "border-emerald-500/30 bg-emerald-500/10"
          : denied
            ? "border-destructive/30 bg-destructive/10"
            : "border-border bg-muted/40"
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
            granted ? "bg-emerald-500/20 text-emerald-600" : "bg-muted text-muted-foreground"
          )}
        >
          {granted ? <CheckCircle2 className="h-5 w-5" /> : denied ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-sm font-semibold">마이크 연결 확인</p>
          {checking ? (
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Loader2 className="h-3 w-3 animate-spin" />
              마이크를 확인하는 중…
            </p>
          ) : granted ? (
            <p className="text-xs text-emerald-700 dark:text-emerald-400 truncate">
              ✓ {mic?.deviceLabel ?? "마이크 준비됨"}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground leading-relaxed">
              {mic?.message ?? "통화 전 마이크·헤드셋 연결과 브라우저 권한을 확인해 주세요."}
            </p>
          )}
        </div>
      </div>
      {!granted && (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="mt-3 w-full rounded-xl"
          disabled={checking}
          onClick={onCheck}
        >
          {checking ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              확인 중…
            </>
          ) : (
            <>
              <Mic className="h-4 w-4 mr-2" />
              마이크 허용 · 연결 테스트
            </>
          )}
        </Button>
      )}
    </div>
  );
}

function CallActionButton({
  label,
  sublabel,
  variant,
  icon: Icon,
  onClick,
  disabled,
  className,
}: {
  label: string;
  sublabel?: string;
  variant: "accept" | "decline" | "cancel";
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}) {
  const styles = {
    accept: "bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-600/25",
    decline: "bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/25",
    cancel: "bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/25",
  };

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-2 disabled:opacity-50 disabled:pointer-events-none",
        className
      )}
    >
      <span
        className={cn(
          "flex h-[4.25rem] w-[4.25rem] items-center justify-center rounded-full transition-transform active:scale-95",
          styles[variant]
        )}
      >
        <Icon className="h-7 w-7" />
      </span>
      <span className="text-sm font-semibold text-foreground">{label}</span>
      {sublabel && <span className="text-[11px] text-muted-foreground -mt-1">{sublabel}</span>}
    </button>
  );
}

export function CallOverlay({
  callState,
  error,
  mic,
  micChecking,
  onMicCheck,
  livekitSlot,
  onAccept,
  onDecline,
  onCancel,
  onHangup,
}: {
  callState: Exclude<ActiveCallState, { phase: "idle" }>;
  error: string;
  mic: MicCheckResult | null;
  micChecking: boolean;
  onMicCheck: () => void;
  livekitSlot?: React.ReactNode;
  onAccept: () => void;
  onDecline: () => void;
  onCancel: () => void;
  onHangup: () => void;
}) {
  const meta = PHASE_META[callState.phase];
  const PhaseIcon = meta.icon;
  const [seconds, setSeconds] = useState(0);
  const micReady = !!mic?.ok;

  useEffect(() => {
    if (callState.phase !== "active") {
      setSeconds(0);
      return;
    }
    const start = Date.now();
    const id = setInterval(() => setSeconds(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(id);
  }, [callState.phase, callState.call.id]);

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-3 sm:p-6">
      <div
        className="absolute inset-0 bg-gradient-to-b from-primary/25 via-background/95 to-background backdrop-blur-md"
        aria-hidden
      />

      <div className="relative w-full max-w-md overflow-hidden rounded-[2rem] border border-border/80 bg-background/95 shadow-2xl shadow-primary/10">
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-primary/20 to-transparent pointer-events-none" />

        <div className="relative px-6 pt-6 pb-6 space-y-5">
          <div className="flex items-center justify-between">
            <span className={cn("text-xs font-bold px-3 py-1 rounded-full", meta.badgeClass)}>
              {meta.badge}
            </span>
            {callState.phase === "active" && (
              <span className="text-sm font-mono tabular-nums text-muted-foreground">
                {formatDuration(seconds)}
              </span>
            )}
          </div>

          <div className="flex flex-col items-center text-center gap-4 pt-2">
            <div className="relative">
              <span className="absolute inset-0 rounded-full bg-primary/20 animate-ping scale-110 opacity-40" />
              <span className="absolute -inset-2 rounded-full border-2 border-primary/30 animate-pulse" />
              <Avatar className="relative h-24 w-24 ring-4 ring-background shadow-xl">
                <AvatarImage src={callState.peer.image ?? undefined} />
                <AvatarFallback className="text-2xl font-bold bg-primary/10 text-primary">
                  {callState.peer.username[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>

            <div className="space-y-1">
              <p className="text-2xl font-bold tracking-tight">{callState.peer.username}</p>
              <p className="text-sm text-muted-foreground flex items-center justify-center gap-1.5">
                <PhaseIcon className="h-4 w-4 shrink-0 opacity-70" />
                {meta.subtitle}
              </p>
            </div>
          </div>

          <MicCheckPanel mic={mic} checking={micChecking} onCheck={onMicCheck} />

          {callState.phase === "active" && livekitSlot}

          {error && (
            <p className="text-xs text-destructive text-center flex items-center justify-center gap-1.5 bg-destructive/10 rounded-xl py-2 px-3">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              {error}
            </p>
          )}

          <div className="flex justify-center gap-8 sm:gap-12 pt-1">
            {callState.phase === "incoming" && (
              <>
                <CallActionButton
                  label="받기"
                  sublabel={micReady ? "통화 시작" : "마이크 확인 후"}
                  variant="accept"
                  icon={PhoneIncoming}
                  disabled={!micReady || micChecking}
                  onClick={onAccept}
                />
                <CallActionButton
                  label="거절"
                  sublabel="부재중 처리"
                  variant="decline"
                  icon={PhoneOff}
                  onClick={onDecline}
                />
              </>
            )}

            {callState.phase === "outgoing" && (
              <CallActionButton
                label="취소"
                sublabel="발신 취소"
                variant="cancel"
                icon={PhoneOff}
                onClick={onCancel}
              />
            )}

            {callState.phase === "active" && (
              <CallActionButton
                label="끊기"
                sublabel="통화 종료"
                variant="decline"
                icon={PhoneOff}
                onClick={onHangup}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
