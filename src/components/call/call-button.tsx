"use client";

import { useState } from "react";
import { useCall } from "@/components/call/call-provider";
import { Button } from "@/components/ui/button";
import { Phone, Loader2 } from "lucide-react";

export function CallButton({
  calleeId,
  chatRoomId,
  disabled,
}: {
  calleeId: string;
  chatRoomId: string;
  disabled?: boolean;
}) {
  const { startCall, callState } = useCall();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const busy = callState.phase !== "idle";

  async function handleCall() {
    setLoading(true);
    setError("");
    const result = await startCall(calleeId, chatRoomId);
    if (result.error) setError(result.error);
    setLoading(false);
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="rounded-xl gap-1.5"
        disabled={disabled || loading || busy}
        onClick={handleCall}
        title="음성 통화 (마이크 확인 후 연결)"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Phone className="h-4 w-4" />}
        <span className="hidden sm:inline">음성 통화</span>
      </Button>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}
