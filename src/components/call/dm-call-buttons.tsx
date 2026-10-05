"use client";

import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { useState } from "react";
import { useCall, useCallBusy } from "@/components/call/call-provider";
import type { CallParticipant } from "@/lib/call-types";
import { Button } from "@/components/ui/button";
import { Phone, Video } from "lucide-react";

function VideoCallButton({
  calleeId,
  chatRoomId,
  calleePeer,
  disabled,
  busy,
  onError,
}: {
  calleeId: string;
  chatRoomId: string;
  calleePeer: CallParticipant;
  disabled?: boolean;
  busy: boolean;
  onError: (msg: string) => void;
}) {
  const { startCall } = useCall();

  async function handleCall() {
    onError("");
    const result = await startCall(calleeId, chatRoomId, "VIDEO", calleePeer);
    if (result.error) onError(result.error);
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className="rounded-xl shrink-0"
      disabled={disabled || busy}
      onClick={handleCall}
      title={t("call.sh6w58f")}
      aria-label={t("call.sh6w58f")}
    >
      <Video className="h-4 w-4" />
    </Button>
  );
}

function VoiceCallButton({
  calleeId,
  chatRoomId,
  calleePeer,
  disabled,
  busy,
  onError,
}: {
  calleeId: string;
  chatRoomId: string;
  calleePeer: CallParticipant;
  disabled?: boolean;
  busy: boolean;
  onError: (msg: string) => void;
}) {
  const { startCall } = useCall();

  async function handleCall() {
    onError("");
    const result = await startCall(calleeId, chatRoomId, "AUDIO", calleePeer);
    if (result.error) onError(result.error);
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className="rounded-xl shrink-0"
      disabled={disabled || busy}
      onClick={handleCall}
      title={t("call.smavk62")}
      aria-label={t("call.smavk62")}
    >
      <Phone className="h-4 w-4" />
    </Button>
  );
}

export function DmCallButtons({
  calleeId,
  chatRoomId,
  calleePeer,
  disabled,
}: {
  calleeId: string;
  chatRoomId: string;
  calleePeer: CallParticipant;
  disabled?: boolean;
}) {
  const busy = useCallBusy();
  const [error, setError] = useState("");

  return (
    <div className="relative flex items-center gap-1.5 shrink-0">
      <VideoCallButton
        calleeId={calleeId}
        chatRoomId={chatRoomId}
        calleePeer={calleePeer}
        disabled={disabled}
        busy={busy}
        onError={setError}
      />
      <VoiceCallButton
        calleeId={calleeId}
        chatRoomId={chatRoomId}
        calleePeer={calleePeer}
        disabled={disabled}
        busy={busy}
        onError={setError}
      />
      {error && (
        <span className="absolute -bottom-6 right-0 text-[10px] text-destructive max-w-[10rem] truncate">
          {error}
        </span>
      )}
    </div>
  );
}
