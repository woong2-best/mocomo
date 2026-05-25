"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { io, Socket } from "socket.io-client";
import { acceptCall, declineCall, endCall, initiateCall } from "@/actions/call";
import type { ActiveCallState, CallPayload } from "@/lib/call-types";
import { LivekitAudioCall } from "@/components/call/livekit-audio-call";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PhoneOff, PhoneIncoming } from "lucide-react";

type CallContextValue = {
  startCall: (calleeId: string, chatRoomId?: string) => Promise<{ error?: string }>;
  callState: ActiveCallState;
};

const CallContext = createContext<CallContextValue | null>(null);

export function useCall() {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error("useCall must be used within CallProvider");
  return ctx;
}

function peerForUser(call: CallPayload, userId: string) {
  return call.caller.id === userId ? call.callee : call.caller;
}

type SyncResponse =
  | { event: null }
  | { event: "declined" | "ended"; callId: string }
  | { event: "incoming" | "outgoing" | "active"; call: CallPayload; peer: CallPayload["caller"] };

export function CallProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const [callState, setCallState] = useState<ActiveCallState>({ phase: "idle" });
  const [error, setError] = useState("");
  const socketRef = useRef<Socket | null>(null);
  const callStateRef = useRef(callState);
  const lastTerminalRef = useRef<string | null>(null);

  callStateRef.current = callState;

  const emit = useCallback((event: string, payload: { callId: string }) => {
    socketRef.current?.emit(event, payload);
  }, []);

  const resetCall = useCallback(() => {
    setCallState({ phase: "idle" });
    setError("");
  }, []);

  const applySync = useCallback(
    (data: SyncResponse) => {
      const current = callStateRef.current;

      if (data.event === "declined") {
        if (current.phase !== "idle" && current.call.id === data.callId) {
          if (lastTerminalRef.current !== data.callId) {
            lastTerminalRef.current = data.callId;
            setError("상대방이 통화를 거절했습니다.");
          }
          resetCall();
        }
        return;
      }

      if (data.event === "ended") {
        if (current.phase !== "idle" && current.call.id === data.callId) {
          lastTerminalRef.current = data.callId;
          resetCall();
        }
        return;
      }

      if (!data.event) return;

      if (data.event === "incoming" || data.event === "outgoing" || data.event === "active") {
        if (current.phase === "active" && current.call.id === data.call.id && data.event === "active") {
          return;
        }

        if (current.phase === "outgoing" && current.call.id === data.call.id && data.event === "outgoing") {
          return;
        }

        if (current.phase === "incoming" && current.call.id === data.call.id && data.event === "incoming") {
          return;
        }

        setCallState({ phase: data.event, call: data.call, peer: data.peer });
        setError("");
      }
    },
    [resetCall]
  );

  const hangup = useCallback(
    async (callId: string) => {
      await endCall(callId);
      emit("call_end", { callId });
      resetCall();
    },
    [emit, resetCall]
  );

  useEffect(() => {
    if (!userId) return;

    let cancelled = false;

    async function syncCalls() {
      try {
        const res = await fetch("/api/calls/sync", { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as SyncResponse;
        if (!cancelled) applySync(data);
      } catch {
        /* ignore polling errors */
      }
    }

    syncCalls();
    const interval = setInterval(syncCalls, 2000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [userId, applySync]);

  useEffect(() => {
    if (!userId) return;
    const url = process.env.NEXT_PUBLIC_SOCKET_URL;
    if (!url) return;

    const socket = io(url, {
      auth: { userId },
      transports: ["websocket", "polling"],
      reconnection: true,
    });
    socketRef.current = socket;

    socket.on("call_incoming", (call: CallPayload) => {
      setCallState({ phase: "incoming", call, peer: call.caller });
    });

    socket.on("call_accepted", ({ callId }: { callId: string }) => {
      setCallState((prev) => {
        if (prev.phase === "outgoing" && prev.call.id === callId) {
          return { phase: "active", call: prev.call, peer: prev.peer };
        }
        if (prev.phase === "incoming" && prev.call.id === callId) {
          return { phase: "active", call: prev.call, peer: prev.peer };
        }
        return prev;
      });
    });

    socket.on("call_declined", ({ callId }: { callId: string }) => {
      setCallState((prev) => {
        if (prev.phase !== "idle" && prev.call.id === callId) {
          setError("상대방이 통화를 거절했습니다.");
          return { phase: "idle" };
        }
        return prev;
      });
    });

    socket.on("call_ended", ({ callId }: { callId: string }) => {
      setCallState((prev) => {
        if (prev.phase !== "idle" && prev.call.id === callId) {
          return { phase: "idle" };
        }
        return prev;
      });
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [userId]);

  const startCall = useCallback(
    async (calleeId: string, chatRoomId?: string) => {
      if (!userId) return { error: "로그인이 필요합니다." };
      setError("");
      const result = await initiateCall({ calleeId, chatRoomId });
      if (result.error || !result.call) return { error: result.error ?? "통화를 시작할 수 없습니다." };

      const peer = peerForUser(result.call, userId);
      setCallState({ phase: "outgoing", call: result.call, peer });
      emit("call_invite", { callId: result.call.id });
      return {};
    },
    [emit, userId]
  );

  const acceptIncoming = useCallback(async () => {
    if (callState.phase !== "incoming") return;
    const result = await acceptCall(callState.call.id);
    if (result.error) {
      setError(result.error);
      resetCall();
      return;
    }
    emit("call_accept", { callId: callState.call.id });
    setCallState({ phase: "active", call: callState.call, peer: callState.peer });
  }, [callState, emit, resetCall]);

  const declineIncoming = useCallback(async () => {
    if (callState.phase !== "incoming") return;
    await declineCall(callState.call.id);
    emit("call_decline", { callId: callState.call.id });
    resetCall();
  }, [callState, emit, resetCall]);

  const cancelOutgoing = useCallback(async () => {
    if (callState.phase !== "outgoing") return;
    await declineCall(callState.call.id);
    emit("call_decline", { callId: callState.call.id });
    resetCall();
  }, [callState, emit, resetCall]);

  const value = useMemo(() => ({ startCall, callState }), [startCall, callState]);

  return (
    <CallContext.Provider value={value}>
      {children}

      {callState.phase !== "idle" && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl border border-border bg-background shadow-2xl p-6 space-y-5">
            <div className="flex flex-col items-center text-center gap-3">
              <Avatar className="h-16 w-16">
                <AvatarImage src={callState.peer.image ?? undefined} />
                <AvatarFallback>{callState.peer.username[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold text-lg">{callState.peer.username}</p>
                <p className="text-sm text-muted-foreground">
                  {callState.phase === "incoming" && "전화가 왔습니다"}
                  {callState.phase === "outgoing" && "연결 중…"}
                  {callState.phase === "active" && "통화 중"}
                </p>
              </div>
            </div>

            {callState.phase === "active" && (
              <LivekitAudioCall
                roomName={callState.call.livekitRoom}
                onDisconnected={() => hangup(callState.call.id)}
              />
            )}

            {error && <p className="text-xs text-destructive text-center">{error}</p>}

            <div className="flex justify-center gap-3">
              {callState.phase === "incoming" && (
                <>
                  <Button
                    size="lg"
                    className="rounded-full h-14 w-14 bg-green-600 hover:bg-green-700"
                    onClick={acceptIncoming}
                  >
                    <PhoneIncoming className="h-6 w-6" />
                  </Button>
                  <Button
                    size="lg"
                    variant="destructive"
                    className="rounded-full h-14 w-14"
                    onClick={declineIncoming}
                  >
                    <PhoneOff className="h-6 w-6" />
                  </Button>
                </>
              )}

              {callState.phase === "outgoing" && (
                <Button
                  size="lg"
                  variant="destructive"
                  className="rounded-full h-14 w-14"
                  onClick={cancelOutgoing}
                >
                  <PhoneOff className="h-6 w-6" />
                </Button>
              )}

              {callState.phase === "active" && (
                <Button
                  size="lg"
                  variant="destructive"
                  className="rounded-full h-14 w-14"
                  onClick={() => hangup(callState.call.id)}
                >
                  <PhoneOff className="h-6 w-6" />
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </CallContext.Provider>
  );
}
