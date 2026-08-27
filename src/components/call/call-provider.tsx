"use client";

import dynamic from "next/dynamic";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import type { Socket } from "socket.io-client";
import { acceptCall, declineCall, endCall, initiateCall } from "@/actions/call";
import type { ActiveCallState, CallPayload, CallParticipant, CallType } from "@/lib/call-types";
import {
  ensureMicrophoneAccess,
  probeMicrophonePermission,
  quickMicrophoneCheck,
  type MicCheckResult,
} from "@/lib/microphone";
import {
  ensureCameraAccess,
  probeCameraPermission,
  quickCameraCheck,
  type CameraCheckResult,
} from "@/lib/camera";
import { CallOverlay } from "@/components/call/call-overlay";
import { useAppSocket } from "@/components/providers/app-socket-provider";

const PeerCallRoom = dynamic(
  () => import("@/components/call/peer-call-room").then((m) => m.PeerCallRoom),
  { ssr: false, loading: () => null }
);

type CallActionsValue = {
  startCall: (
    calleeId: string,
    chatRoomId?: string,
    callType?: CallType,
    peerHint?: CallParticipant
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

function isCallPhase(
  state: ActiveCallState
): state is Extract<ActiveCallState, { call: CallPayload }> {
  return (
    state.phase === "outgoing" ||
    state.phase === "incoming" ||
    state.phase === "active"
  );
}

type SyncResponse =
  | { event: null }
  | { event: "declined" | "ended"; callId: string }
  | { event: "incoming" | "outgoing" | "active"; call: CallPayload; peer: CallPayload["caller"] };

function syncPollIntervalMs(phase: ActiveCallState["phase"], hidden: boolean) {
  if (phase === "active") return 5000;
  if (phase === "outgoing" || phase === "incoming" || phase === "preparing") return 250;
  return hidden ? 15000 : 2000;
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
  const { socket, socketReady } = useAppSocket();
  const pendingEmitsRef = useRef<{ event: string; payload: Record<string, unknown> }[]>([]);
  const startCallGenRef = useRef(0);
  const callStateRef = useRef(callState);
  const lastTerminalRef = useRef<string | null>(null);
  const pendingDeepLinkRef = useRef<{
    callId: string;
    action?: "accept" | "decline";
  } | null>(null);
  /** 로컬에서 끊은 통화 — sync 폴링이 다시 띄우지 않도록 */
  const locallyDismissedCallIdsRef = useRef<Set<string>>(new Set());

  callStateRef.current = callState;

  const needsVideo =
    (callState.phase === "preparing" && callState.callType === "VIDEO") ||
    (callState.phase !== "idle" &&
      callState.phase !== "preparing" &&
      isVideoCall(callState.call));

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

  const flushPendingEmits = useCallback((socket: Socket) => {
    const queue = pendingEmitsRef.current;
    pendingEmitsRef.current = [];
    for (const item of queue) {
      socket.emit(item.event, item.payload);
    }
  }, []);

  const emit = useCallback(
    (event: string, payload: Record<string, unknown>) => {
      if (socket?.connected) {
        socket.emit(event, payload);
        return;
      }
      pendingEmitsRef.current.push({ event, payload });
    },
    [socket]
  );

  const resetCall = useCallback(() => {
    startCallGenRef.current += 1;
    setCallState({ phase: "idle" });
    setError("");
    setMic(null);
    setCamera(null);
    setMicChecking(false);
    setCameraChecking(false);
  }, []);

  const dismissCallUi = useCallback(
    (callId?: string) => {
      if (callId) {
        locallyDismissedCallIdsRef.current.add(callId);
        lastTerminalRef.current = callId;
      }
      resetCall();
    },
    [resetCall]
  );

  const applySync = useCallback(
    (data: SyncResponse) => {
      const current = callStateRef.current;

      if (data.event === "declined") {
        if (isCallPhase(current) && current.call.id === data.callId) {
          if (lastTerminalRef.current !== data.callId) {
            lastTerminalRef.current = data.callId;
            setError("상대방이 통화를 거절했습니다.");
          }
          dismissCallUi();
        }
        locallyDismissedCallIdsRef.current.delete(data.callId);
        return;
      }

      if (data.event === "ended") {
        if (isCallPhase(current) && current.call.id === data.callId) {
          lastTerminalRef.current = data.callId;
          dismissCallUi();
        }
        locallyDismissedCallIdsRef.current.delete(data.callId);
        return;
      }

      if (!data.event) return;

      if (data.event === "incoming" || data.event === "outgoing" || data.event === "active") {
        if (locallyDismissedCallIdsRef.current.has(data.call.id)) return;

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
    [dismissCallUi]
  );

  const hangup = useCallback(
    (callId: string) => {
      const current = callStateRef.current;
      const peerId = isCallPhase(current) ? current.peer.id : undefined;
      dismissCallUi(callId);
      if (peerId) emit("call_end", { callId, peerId });
      void endCall(callId)
        .then(() => locallyDismissedCallIdsRef.current.delete(callId))
        .catch(() => undefined);
    },
    [dismissCallUi, emit]
  );

  useEffect(() => {
    if (!userId || typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const incomingCall = params.get("incomingCall");
    if (!incomingCall) return;

    const accept = params.get("accept") === "1";
    const decline = params.get("decline") === "1";
    pendingDeepLinkRef.current = {
      callId: incomingCall,
      action: accept ? "accept" : decline ? "decline" : undefined,
    };

    const url = new URL(window.location.href);
    url.searchParams.delete("incomingCall");
    url.searchParams.delete("accept");
    url.searchParams.delete("decline");
    window.history.replaceState({}, "", url.pathname + url.search + url.hash);

    void fetch("/api/calls/sync", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) applySync(data as SyncResponse);
      })
      .catch(() => undefined);
  }, [userId, applySync]);

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

  const ringingSyncKey =
    callState.phase === "outgoing" || callState.phase === "incoming"
      ? `${callState.phase}:${callState.call.id}`
      : null;

  useEffect(() => {
    if (!ringingSyncKey || !userId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/calls/sync", { cache: "no-store" });
        if (!res.ok || cancelled) return;
        applySync((await res.json()) as SyncResponse);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ringingSyncKey, userId, applySync]);

  const prefetchCallRoom = useCallback(() => {
    void import("@/components/call/peer-call-room");
  }, []);

  useEffect(() => {
    if (!userId || !socket) return;

    const onConnect = () => {
      flushPendingEmits(socket);
      void fetch("/api/calls/sync", { cache: "no-store" })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data) applySync(data as SyncResponse);
        })
        .catch(() => undefined);
    };

    const onCallIncoming = (call: CallPayload) => {
      setCallState({ phase: "incoming", call, peer: call.caller });
      setError("");
      prefetchCallRoom();
    };

    const onCallAccepted = ({ callId }: { callId: string }) => {
      setCallState((prev) => {
        if (prev.phase === "outgoing" && prev.call.id === callId) {
          return { phase: "active", call: prev.call, peer: prev.peer };
        }
        if (prev.phase === "incoming" && prev.call.id === callId) {
          return { phase: "active", call: prev.call, peer: prev.peer };
        }
        return prev;
      });
    };

    const onCallDeclined = ({ callId }: { callId: string }) => {
      setCallState((prev) => {
        if (isCallPhase(prev) && prev.call.id === callId) {
          setError("상대방이 통화를 거절했습니다.");
          return { phase: "idle" };
        }
        return prev;
      });
    };

    const onCallEnded = ({ callId }: { callId: string }) => {
      setCallState((prev) => {
        if (isCallPhase(prev) && prev.call.id === callId) {
          return { phase: "idle" };
        }
        return prev;
      });
    };

    socket.on("connect", onConnect);
    socket.on("call_incoming", onCallIncoming);
    socket.on("call_accepted", onCallAccepted);
    socket.on("call_declined", onCallDeclined);
    socket.on("call_ended", onCallEnded);

    if (socket.connected) {
      flushPendingEmits(socket);
    }

    return () => {
      socket.off("connect", onConnect);
      socket.off("call_incoming", onCallIncoming);
      socket.off("call_accepted", onCallAccepted);
      socket.off("call_declined", onCallDeclined);
      socket.off("call_ended", onCallEnded);
      pendingEmitsRef.current = [];
    };
  }, [userId, socket, flushPendingEmits, prefetchCallRoom, applySync]);

  useEffect(() => {
    if (!socketReady || !socket?.connected) return;
    flushPendingEmits(socket);
  }, [socketReady, socket, flushPendingEmits]);

  const activeCallId = isCallPhase(callState) ? callState.call.id : null;

  useEffect(() => {
    if (!activeCallId) return;
    if (mic?.ok && (!needsVideo || camera?.ok)) return;

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
  }, [activeCallId, needsVideo, mic?.ok, camera?.ok]);

  const startCall = useCallback(
    async (
      calleeId: string,
      chatRoomId?: string,
      callType: CallType = "AUDIO",
      peerHint?: CallParticipant
    ) => {
      if (!userId) return { error: "로그인이 필요합니다." };
      setError("");

      const peer: CallParticipant = peerHint ?? {
        id: calleeId,
        username: "상대방",
        image: null,
      };
      const gen = ++startCallGenRef.current;
      setCallState({ phase: "preparing", peer, callType, chatRoomId });

      const micPromise = quickMicrophoneCheck().then((r) => {
        setMic(r);
        return r;
      });
      const camPromise: Promise<CameraCheckResult> =
        callType === "VIDEO"
          ? quickCameraCheck().then((r) => {
              setCamera(r);
              return r;
            })
          : Promise.resolve({ ok: true, status: "granted" });
      const callPromise = initiateCall({
        calleeId,
        chatRoomId,
        callType: callType === "VIDEO" ? "VIDEO" : "AUDIO",
      });

      const [micResult, camResult, result] = await Promise.all([
        micPromise,
        camPromise,
        callPromise,
      ]);

      if (gen !== startCallGenRef.current) return {};

      if (!micResult.ok) {
        resetCall();
        return { error: micResult.message ?? "마이크 확인이 필요합니다." };
      }
      if (callType === "VIDEO" && !camResult.ok) {
        resetCall();
        return { error: camResult.message ?? "카메라 확인이 필요합니다." };
      }
      if (result.error || !result.call) {
        resetCall();
        return { error: result.error ?? "통화를 시작할 수 없습니다." };
      }

      const callPeer = peerForUser(result.call, userId);
      setCallState({ phase: "outgoing", call: result.call, peer: callPeer });
      emit("call_invite", { callId: result.call.id, call: result.call });
      return {};
    },
    [emit, resetCall, userId]
  );

  const acceptIncoming = useCallback(async () => {
    if (callState.phase !== "incoming") return;
    const needsCam = isVideoCall(callState.call);
    const [micResult, camResult] = await Promise.all([
      mic?.ok ? Promise.resolve(mic) : quickMicrophoneCheck(),
      needsCam
        ? camera?.ok
          ? Promise.resolve(camera)
          : quickCameraCheck()
        : Promise.resolve({ ok: true, status: "granted" } as CameraCheckResult),
    ]);
    if (!micResult.ok) {
      setMic(micResult);
      setError(micResult.message ?? "마이크 확인 후 받을 수 있습니다.");
      return;
    }
    setMic(micResult);
    if (needsCam && !camResult.ok) {
      setCamera(camResult);
      setError(camResult.message ?? "카메라 확인 후 받을 수 있습니다.");
      return;
    }
    if (needsCam) setCamera(camResult);

    const result = await acceptCall(callState.call.id);
    if (result.error) {
      setError(result.error);
      resetCall();
      return;
    }
    emit("call_accept", {
      callId: callState.call.id,
      callerId: callState.call.caller.id,
      calleeId: callState.call.callee.id,
    });
    setCallState({ phase: "active", call: callState.call, peer: callState.peer });
  }, [callState, camera, emit, mic, resetCall]);

  const declineIncoming = useCallback(() => {
    const current = callStateRef.current;
    if (current.phase !== "incoming") return;
    const callId = current.call.id;
    const peerId = current.peer.id;
    dismissCallUi(callId);
    emit("call_decline", { callId, peerId });
    void declineCall(callId)
      .then(() => locallyDismissedCallIdsRef.current.delete(callId))
      .catch(() => undefined);
  }, [dismissCallUi, emit]);

  const cancelOutgoing = useCallback(() => {
    const current = callStateRef.current;
    if (current.phase !== "outgoing") return;
    const callId = current.call.id;
    const peerId = current.peer.id;
    dismissCallUi(callId);
    emit("call_decline", { callId, peerId });
    void declineCall(callId)
      .then(() => locallyDismissedCallIdsRef.current.delete(callId))
      .catch(() => undefined);
  }, [dismissCallUi, emit]);

  useEffect(() => {
    const pending = pendingDeepLinkRef.current;
    if (!pending || callState.phase !== "incoming" || callState.call.id !== pending.callId) {
      return;
    }
    pendingDeepLinkRef.current = null;
    if (pending.action === "decline") {
      void declineIncoming();
    } else if (pending.action === "accept") {
      void acceptIncoming();
    }
  }, [callState, acceptIncoming, declineIncoming]);

  const value = useMemo(() => ({ startCall }), [startCall]);
  const busy = callState.phase !== "idle";
  const connectPeer =
    isCallPhase(callState) &&
    (callState.phase === "active" || callState.phase === "outgoing");
  const activeVideo =
    callState.phase === "active" && isVideoCall(callState.call);

  const selfPeer = useMemo<CallParticipant>(
    () => ({
      id: userId ?? "",
      username: session?.user?.username ?? session?.user?.name ?? "나",
      image: session?.user?.image ?? null,
    }),
    [userId, session?.user?.username, session?.user?.name, session?.user?.image]
  );

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
            onCancel={
              callState.phase === "preparing"
                ? () => dismissCallUi()
                : cancelOutgoing
            }
            onHangup={() => {
              if (callState.phase === "active") hangup(callState.call.id);
            }}
            livekitSlot={
              connectPeer && isCallPhase(callState) && userId ? (
                <PeerCallRoom
                  callId={callState.call.id}
                  userId={userId}
                  peerUserId={callState.peer.id}
                  isCaller={callState.call.caller.id === userId}
                  video={activeVideo || isVideoCall(callState.call)}
                  enabled={connectPeer}
                  socket={socket}
                  peer={callState.peer}
                  selfPeer={selfPeer}
                  phase={callState.phase === "active" ? "active" : "outgoing"}
                  onHangup={() => {
                    if (callState.phase === "active" || callState.phase === "outgoing") {
                      hangup(callState.call.id);
                    }
                  }}
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
