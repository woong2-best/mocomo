"use client";

import { useState } from "react";
import { useCall, useCallBusy } from "@/components/call/call-provider";
import type { CallParticipant, CallType } from "@/lib/call-types";
import { Button } from "@/components/ui/button";
import { Phone, Video } from "lucide-react";

function CallActionButton({
  callType,
  calleeId,
  chatRoomId,
  calleePeer,
  disabled,
  busy,
  onError,
}: {
  callType: CallType;
  calleeId: string;
  chatRoomId: string;
  calleePeer: CallParticipant;
  disabled?: boolean;
  busy: boolean;
  onError: (msg: string) => void;
}) {
  const { startCall } = useCall();
  const isVideo = callType === "VIDEO";

  async function handleCall() {
    onError("");
    const result = await startCall(calleeId, chatRoomId, callType, calleePeer);
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
      title={isVideo ? "영상 통화" : "음성 통화"}
      aria-label={isVideo ? "영상 통화" : "음성 통화"}
    >
      {isVideo ? (
        <Video className="h-4 w-4" />
      ) : (
        <Phone className="h-4 w-4" />
      )}
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
      <CallActionButton
        callType="AUDIO"
        calleeId={calleeId}
        chatRoomId={chatRoomId}
        calleePeer={calleePeer}
        disabled={disabled}
        busy={busy}
        onError={setError}
      />
      <CallActionButton
        callType="VIDEO"
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
