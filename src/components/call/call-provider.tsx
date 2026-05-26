"use client";

import dynamic from "next/dynamic";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import type { Socket } from "socket.io-client";
import { acceptCall, declineCall, endCall, initiateCall } from "@/actions/call";
import type { ActiveCallState, CallPayload, CallType } from "@/lib/call-types";
import { ensureMicrophoneAccess, probeMicrophonePermission, type MicCheckResult } from "@/lib/microphone";
import { ensureCameraAccess, probeCameraPermission, type CameraCheckResult } from "@/lib/camera";
import { fetchLivekitCredentials, type LivekitCredentials } from "@/lib/livekit-token-fetch";
import { CallOverlay } from "@/components/call/call-overlay";

const LivekitCallRoom = dynamic(
  () => import("@/components/call/livekit-call-room").then((m) => m.LivekitCallRoom),
  { ssr: false, loading: () => null }
);

type CallActionsValue = {
  startCall: (
    calleeId: string,
    chatRoomId?: string,
    callType?: CallType
  ) => Promise<{ error?: string }>;
};

const CallActionsContext = createContext<CallActionsValue | null>(null);
const CallBusyContext = createContext(false);

export function useCall() {
  const ctx = useContext(CallActionsContext);
  if (!ctx) throw new Error("useCall must be used within CallProvider");
  return ctx;
}

export function useCallBusy() {
  return useContext(CallBusyContext);
}

function peerForUser(call: CallPayload, userId: string) {
  return call.caller.id === userId ? call.callee : call.caller;
}

function isVideoCall(call: CallPayload) {
  return call.callType === "VIDEO";
}

type SyncResponse =
  | { event: null }
  | { event: "declined" | "ended"; callId: string }
  | { event: "incoming" | "outgoing" | "active"; call: CallPayload; peer: CallPayload["caller"] };

function syncPollIntervalMs(phase: ActiveCallState["phase"], hidden: boolean) {
  if (phase === "active") return 5000;
  if (phase !== "idle") return 3000;
  return hidden ? 15000 : 8000;
}

function CallProviderRuntime({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const [callState, setCallState] = useState<ActiveCallState>({ phase: "idle" });
  const [error, setError] = useState("");
  const [mic, setMic] = useState<MicCheckResult | null>(null);
  const [camera, setCamera] = useState<CameraCheckResult | null>(null);
  const [micChecking, setMicChecking] = useState(false);
  const [cameraChecking, setCameraChecking] = useState(false);
  const [prefetchedLivekit, setPrefetchedLivekit] = useState<LivekitCredentials | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const callStateRef = useRef(callState);
  const lastTerminalRef = useRef<string | null>(null);

  callStateRef.current = callState;

  const needsVideo =
    callState.phase !== "idle" && isVideoCall(callState.call);

  const runMicCheck = useCallback(async () => {
    setMicChecking(true);
    const result = await ensureMicrophoneAccess();
    setMic(result);
    setMicChecking(false);
    return result;
  }, []);

  const runCameraCheck = useCallback(async () => {
    setCameraChecking(true);
    const result = await ensureCameraAccess();
    setCamera(result);
    setCameraChecking(false);
    return result;
  }, []);

  const emit = useCallback((event: string, payload: { callId: string }) => {
    socketRef.current?.emit(event, payload);
  }, []);

  const resetCall = useCallback(() => {
    setCallState({ phase: "idle" });
    setError("");
    setMic(null);
    setCamera(null);
    setMicChecking(false);
    setCameraChecking(false);
    setPrefetchedLivekit(null);
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
    let intervalId: ReturnType<typeof setInterval> | null = null;

    async function syncCalls() {
      try {
        const res = await fetch("/api/calls/sync", { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as SyncResponse;
        if (!cancelled) applySync(data);
      } catch {
        /* ignore */
      }
    }

    function schedule() {
      if (intervalId) clearInterval(intervalId);
      const ms = syncPollIntervalMs(callStateRef.current.phase, document.hidden);
      intervalId = setInterval(syncCalls, ms);
    }

    syncCalls();
    schedule();

    const onVisibility = () => {
      syncCalls();
      schedule();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [userId, applySync]);

  useEffect(() => {
    if (!userId) return;
    const url = process.env.NEXT_PUBLIC_SOCKET_URL;
    if (!url) return;

    let socket: Socket | null = null;
    let disposed = false;

    import("socket.io-client").then(({ io }) => {
      if (disposed) return;
      socket = io(url, {
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
    });

    return () => {
      disposed = true;
      socket?.disconnect();
      socketRef.current = null;
    };
  }, [userId]);

  const activeCallId = callState.phase !== "idle" ? callState.call.id : null;

  useEffect(() => {
    if (!activeCallId) return;

    let cancelled = false;
    (async () => {
      const perm = await probeMicrophonePermission();
      if (cancelled) return;
      if (perm === "granted") {
        const result = await ensureMicrophoneAccess();
        if (!cancelled) setMic(result);
      } else {
        setMic({
          ok: false,
          status: perm === "denied" ? "denied" : "unknown",
          message:
            perm === "denied"
              ? "마이크 권한이 꺼져 있습니다. 설정에서 허용해 주세요."
              : undefined,
        });
      }

      if (needsVideo) {
        const camPerm = await probeCameraPermission();
        if (cancelled) return;
        if (camPerm === "granted") {
          const camResult = await ensureCameraAccess();
          if (!cancelled) setCamera(camResult);
        } else {
          setCamera({
            ok: false,
            status: camPerm === "denied" ? "denied" : "unknown",
            message:
              camPerm === "denied"
                ? "카메라 권한이 꺼져 있습니다. 설정에서 허용해 주세요."
                : undefined,
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [callState.phase, activeCallId, needsVideo]);

  const livekitRoom =
    callState.phase !== "idle" ? callState.call.livekitRoom : null;

  useEffect(() => {
    if (!livekitRoom) return;
    let cancelled = false;
    fetchLivekitCredentials(livekitRoom)
      .then((creds) => {
        if (!cancelled) setPrefetchedLivekit(creds);
      })
      .catch(() => {
        if (!cancelled) setPrefetchedLivekit(null);
      });
    return () => {
      cancelled = true;
    };
  }, [livekitRoom]);

  const startCall = useCallback(
    async (calleeId: string, chatRoomId?: string, callType: CallType = "AUDIO") => {
      if (!userId) return { error: "로그인이 필요합니다." };
      setError("");
      const micResult = await runMicCheck();
      if (!micResult.ok) return { error: micResult.message ?? "마이크 확인이 필요합니다." };

      if (callType === "VIDEO") {
        const camResult = await runCameraCheck();
        if (!camResult.ok) return { error: camResult.message ?? "카메라 확인이 필요합니다." };
      }

      const result = await initiateCall({
        calleeId,
        chatRoomId,
        callType: callType === "VIDEO" ? "VIDEO" : "AUDIO",
      });
      if (result.error || !result.call) return { error: result.error ?? "통화를 시작할 수 없습니다." };

      const peer = peerForUser(result.call, userId);
      setCallState({ phase: "outgoing", call: result.call, peer });
      emit("call_invite", { callId: result.call.id });
      return {};
    },
    [emit, runCameraCheck, runMicCheck, userId]
  );

  const acceptIncoming = useCallback(async () => {
    if (callState.phase !== "incoming") return;
    const micResult = mic?.ok ? mic : await runMicCheck();
    if (!micResult.ok) {
      setError(micResult.message ?? "마이크 확인 후 받을 수 있습니다.");
      return;
    }
    if (isVideoCall(callState.call)) {
      const camResult = camera?.ok ? camera : await runCameraCheck();
      if (!camResult.ok) {
        setError(camResult.message ?? "카메라 확인 후 받을 수 있습니다.");
        return;
      }
    }
    const result = await acceptCall(callState.call.id);
    if (result.error) {
      setError(result.error);
      resetCall();
      return;
    }
    emit("call_accept", { callId: callState.call.id });
    setCallState({ phase: "active", call: callState.call, peer: callState.peer });
  }, [callState, camera, emit, mic, resetCall, runCameraCheck, runMicCheck]);

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

  const value = useMemo(() => ({ startCall }), [startCall]);
  const busy = callState.phase !== "idle";
  const activeVideo =
    callState.phase === "active" && isVideoCall(callState.call);

  return (
    <CallActionsContext.Provider value={value}>
      <CallBusyContext.Provider value={busy}>
        {children}
        {busy && (
          <CallOverlay
            callState={callState}
            error={error}
            mic={mic}
            camera={needsVideo ? camera : null}
            micChecking={micChecking}
            cameraChecking={cameraChecking}
            onMicCheck={runMicCheck}
            onCameraCheck={needsVideo ? runCameraCheck : undefined}
            onAccept={acceptIncoming}
            onDecline={declineIncoming}
            onCancel={cancelOutgoing}
            onHangup={() => hangup(callState.call.id)}
            livekitSlot={
              callState.phase === "active" ? (
                <LivekitCallRoom
                  roomName={callState.call.livekitRoom}
                  video={activeVideo}
                  prefetched={prefetchedLivekit}
                />
              ) : undefined
            }
          />
        )}
      </CallBusyContext.Provider>
    </CallActionsContext.Provider>
  );
}

export function CallProvider({ children }: { children: React.ReactNode }) {
  return <CallProviderRuntime>{children}</CallProviderRuntime>;
}
