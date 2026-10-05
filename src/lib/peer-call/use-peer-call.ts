"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import { fetchWebRtcIceConfiguration } from "@/lib/webrtc-ice-config";
import { CALL_NAT_BLOCKED_MESSAGE } from "@/lib/peer-call/p2p-ice";
import type { CallSignalEvent, CallSignalPayload } from "@/lib/peer-call/types";
import {
  openVoiceSignalChannel,
  type VoiceSignalSession,
  type VoiceWireSignal,
} from "@/lib/peer-call/supabase-signal";
export type PeerCallState = "idle" | "connecting" | "connected" | "failed" | "closed";

const CALL_AUDIO: MediaTrackConstraints = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
  channelCount: 1,
};

let heldMic: MediaStream | null = null;

function holdMic(stream: MediaStream) {
  if (heldMic && heldMic !== stream) {
    for (const track of heldMic.getTracks()) track.stop();
  }
  heldMic = stream;
}

function releaseMic(stream: MediaStream | null) {
  if (stream && heldMic === stream) heldMic = null;
}

function signalKey(payload: CallSignalPayload): string {
  if (payload.type === "offer" || payload.type === "answer") {
    const body = typeof payload.sdp?.sdp === "string" ? payload.sdp.sdp : "";
    return `${payload.type}:${body}`;
  }
  if (payload.type === "ice") {
    const candidate = payload.candidate;
    return `ice:${candidate?.candidate ?? ""}:${candidate?.sdpMid ?? ""}:${candidate?.sdpMLineIndex ?? ""}`;
  }
  return payload.type;
}

function isBenignSignalingError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const name = "name" in error ? String(error.name) : "";
  const message = "message" in error ? String(error.message) : "";
  return (
    name === "InvalidStateError" ||
    name === "InvalidAccessError" ||
    /wrong state|InvalidState|stable|have-local-offer|have-remote-offer/i.test(message)
  );
}

function asSdp(
  raw: RTCSessionDescriptionInit | undefined,
  fallback: "offer" | "answer"
): RTCSessionDescriptionInit {
  const type =
    raw?.type === "offer" || raw?.type === "answer" || raw?.type === "pranswer" ? raw.type : fallback;
  return { type, sdp: typeof raw?.sdp === "string" ? raw.sdp : "" };
}

type UsePeerCallOptions = {
  callId: string;
  signalingRoomId: string;
  userId: string;
  peerUserId: string;
  isCaller: boolean;
  video: boolean;
  enabled: boolean;
  /** Installed phone app still exchanges SDP on the socket. Supabase is the other path. */
  socket?: Socket | null;
  initialSignals?: CallSignalEvent[];
  onConnected?: () => void;
  onFailed?: (message: string) => void;
  /** ICE reached `failed` — the other process is gone, or the path cannot recover. */
  onConnectionLost?: () => void;
  onRemoteHangup?: () => void;
};

export function usePeerCall({
  callId,
  signalingRoomId,
  userId,
  peerUserId,
  isCaller,
  video,
  enabled,
  socket,
  initialSignals,
  onConnected,
  onFailed,
  onConnectionLost,
  onRemoteHangup,
}: UsePeerCallOptions) {
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const creatingPcRef = useRef<Promise<RTCPeerConnection> | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const rawMicRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const epochRef = useRef(0);
  const appliedSignalsRef = useRef(new Set<string>());
  const signalChainRef = useRef(Promise.resolve());
  const rtcConfigRef = useRef<RTCConfiguration | null>(null);
  const makingOfferRef = useRef(false);
  const ignoreOfferRef = useRef(false);
  const politeRef = useRef(!isCaller);
  const pendingIceRef = useRef<RTCIceCandidateInit[]>([]);
  const sessionSendRef = useRef<(signal: VoiceWireSignal) => void>(() => undefined);
  const onConnectedRef = useRef(onConnected);
  const onFailedRef = useRef(onFailed);
  const onConnectionLostRef = useRef(onConnectionLost);
  const onRemoteHangupRef = useRef(onRemoteHangup);
  const callIdRef = useRef(callId);
  const peerUserIdRef = useRef(peerUserId);
  const videoRef = useRef(video);
  const isCallerRef = useRef(isCaller);
  const socketRef = useRef(socket);
  const answeredRef = useRef(false);
  const natFailedRef = useRef(false);
  const initialSignalsRef = useRef(initialSignals);
  initialSignalsRef.current = initialSignals;

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [state, setState] = useState<PeerCallState>("idle");
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(video);

  useEffect(() => {
    onConnectedRef.current = onConnected;
    onFailedRef.current = onFailed;
    onConnectionLostRef.current = onConnectionLost;
    onRemoteHangupRef.current = onRemoteHangup;
    callIdRef.current = callId;
    peerUserIdRef.current = peerUserId;
    videoRef.current = video;
    isCallerRef.current = isCaller;
    socketRef.current = socket;
    politeRef.current = !isCaller;
  });

  const emitSignal = useCallback((payload: CallSignalPayload) => {
    const plain = JSON.parse(JSON.stringify(payload)) as CallSignalPayload;
    sessionSendRef.current(plain);
    const sock = socketRef.current;
    if (sock?.connected) {
      sock.emit("call_signal", {
        callId: callIdRef.current,
        toUserId: peerUserIdRef.current,
        payload: plain,
      });
    }
  }, []);

  const cleanup = useCallback(() => {
    const pc = pcRef.current;
    pcRef.current = null;
    creatingPcRef.current = null;
    pendingIceRef.current = [];
    if (pc) {
      pc.onicecandidate = null;
      pc.ontrack = null;
      pc.onconnectionstatechange = null;
      pc.oniceconnectionstatechange = null;
      pc.close();
    }
    for (const track of localStreamRef.current?.getTracks() ?? []) {
      track.stop();
    }
    for (const track of rawMicRef.current?.getTracks() ?? []) {
      track.stop();
    }
    releaseMic(rawMicRef.current);
    rawMicRef.current = null;
    localStreamRef.current = null;
    remoteStreamRef.current = null;
    rtcConfigRef.current = null;
    setLocalStream(null);
    setRemoteStream(null);
    setState("closed");
  }, []);

  const ensureLocalStream = useCallback(async () => {
    if (localStreamRef.current) return localStreamRef.current;
    const wantsVideo = videoRef.current;
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: CALL_AUDIO,
      video: wantsVideo
        ? { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } }
        : false,
    });
    holdMic(stream);
    rawMicRef.current = stream;
    localStreamRef.current = stream;
    setLocalStream(stream);
    setCameraEnabled(wantsVideo && stream.getVideoTracks().some((t) => t.enabled));
    return stream;
  }, []);

  const flushIce = useCallback(async (pc: RTCPeerConnection) => {
    const queued = pendingIceRef.current.splice(0);
    for (const candidate of queued) {
      try {
        await pc.addIceCandidate(candidate);
      } catch {
        /* ignore stale ICE */
      }
    }
  }, []);

  const createPeerConnection = useCallback(async (rtcConfiguration?: RTCConfiguration) => {
    const existing = pcRef.current;
    if (existing && existing.connectionState !== "closed") {
      return existing;
    }
    if (creatingPcRef.current) return creatingPcRef.current;

    const pending = (async () => {
      const epochAtStart = epochRef.current;
      const again = pcRef.current;
      if (again && again.connectionState !== "closed") return again;

      const cfg =
        rtcConfiguration ??
        rtcConfigRef.current ??
        (await fetchWebRtcIceConfiguration());
      if (epochRef.current !== epochAtStart) {
        const current = pcRef.current;
        if (current) return current;
        const abandoned = new RTCPeerConnection();
        abandoned.close();
        return abandoned;
      }
      rtcConfigRef.current = cfg;

      const current = pcRef.current;
      if (current && current.connectionState !== "closed") return current;

      const pc = new RTCPeerConnection(cfg);
      pcRef.current = pc;

      pc.onicecandidate = (ev) => {
        if (ev.candidate) {
          emitSignal({ type: "ice", candidate: ev.candidate.toJSON() });
        }
      };

      pc.ontrack = (ev) => {
        const [first] = ev.streams;
        if (first) {
          remoteStreamRef.current = first;
          setRemoteStream(first);
          return;
        }
        const merged = remoteStreamRef.current ?? new MediaStream();
        if (!merged.getTracks().some((track) => track.id === ev.track.id)) {
          merged.addTrack(ev.track);
        }
        remoteStreamRef.current = merged;
        setRemoteStream(merged);
      };

      const failNatBlocked = () => {
        if (natFailedRef.current || pcRef.current !== pc) return;
        natFailedRef.current = true;
        for (const track of localStreamRef.current?.getTracks() ?? []) {
          track.stop();
        }
        for (const track of rawMicRef.current?.getTracks() ?? []) {
          track.stop();
        }
        setState("failed");
        onFailedRef.current?.(CALL_NAT_BLOCKED_MESSAGE);
        emitSignal({ type: "hangup" });
        onConnectionLostRef.current?.();
      };

      pc.oniceconnectionstatechange = () => {
        if (pc.iceConnectionState === "failed") failNatBlocked();
      };

      pc.onconnectionstatechange = () => {
        const cs = pc.connectionState;
        if (cs === "connected") {
          setState("connected");
          onConnectedRef.current?.();
        } else if (cs === "failed") {
          failNatBlocked();
        }
      };

      const local = await ensureLocalStream();
      if (epochRef.current !== epochAtStart || pcRef.current !== pc || pc.connectionState === "closed") {
        pc.close();
        if (pcRef.current === pc) pcRef.current = null;
        const current = pcRef.current;
        return current ?? pc;
      }
      for (const track of local.getTracks()) {
        pc.addTrack(track, local);
      }

      return pc;
    })();

    creatingPcRef.current = pending;
    try {
      return await pending;
    } finally {
      if (creatingPcRef.current === pending) creatingPcRef.current = null;
    }
  }, [emitSignal, ensureLocalStream]);

  const handleRemoteSignal = useCallback(
    async (payload: CallSignalPayload) => {
      const epoch = epochRef.current;
      const live = () => epochRef.current === epoch;
      const key = signalKey(payload);
      if (payload.type !== "hangup" && appliedSignalsRef.current.has(key)) return;

      const pc = pcRef.current ?? (await createPeerConnection());
      if (!live() || pc.connectionState === "closed") return;
      const polite = politeRef.current;

      if (payload.type === "hangup") {
        appliedSignalsRef.current.add(key);
        onRemoteHangupRef.current?.();
        cleanup();
        return;
      }

      if (payload.type === "offer") {
        if (answeredRef.current && pc.signalingState === "stable") return;
        const offerCollision = makingOfferRef.current || pc.signalingState !== "stable";
        ignoreOfferRef.current = !polite && offerCollision;
        if (ignoreOfferRef.current) return;

        const offer = asSdp(payload.sdp, "offer");
        if (!offer.sdp) return;
        if (pc.currentRemoteDescription?.sdp === offer.sdp) {
          appliedSignalsRef.current.add(key);
          return;
        }
        try {
          if (offerCollision && pc.signalingState === "have-local-offer") {
            await pc.setLocalDescription({ type: "rollback" });
          }
          if (!live()) return;
          await pc.setRemoteDescription(offer);
        } catch (error) {
          if (isBenignSignalingError(error)) return;
          throw error;
        }
        if (!live()) return;
        appliedSignalsRef.current.add(key);
        await flushIce(pc);
        if (
          pc.signalingState !== "have-remote-offer" &&
          pc.signalingState !== "have-local-pranswer"
        ) {
          return;
        }
        const answer = await pc.createAnswer();
        if (!live()) return;
        await pc.setLocalDescription(answer);
        answeredRef.current = true;
        emitSignal({ type: "answer", sdp: answer });
        setState("connecting");
        return;
      }

      if (payload.type === "answer") {
        if (pc.signalingState !== "have-local-offer") return;
        const answer = asSdp(payload.sdp, "answer");
        if (!answer.sdp) return;
        try {
          await pc.setRemoteDescription(answer);
        } catch (error) {
          if (isBenignSignalingError(error)) return;
          throw error;
        }
        if (!live()) return;
        appliedSignalsRef.current.add(key);
        answeredRef.current = true;
        await flushIce(pc);
        return;
      }

      if (payload.type === "ice") {
        if (!payload.candidate) return;
        if (!pc.remoteDescription) {
          pendingIceRef.current.push(payload.candidate);
          return;
        }
        try {
          await pc.addIceCandidate(payload.candidate);
          appliedSignalsRef.current.add(key);
        } catch (error) {
          if (isBenignSignalingError(error)) return;
          /* stale ICE from the other path */
        }
      }
    },
    [cleanup, createPeerConnection, emitSignal, flushIce]
  );

  const createPeerConnectionRef = useRef(createPeerConnection);
  createPeerConnectionRef.current = createPeerConnection;
  const handleRemoteSignalRef = useRef(handleRemoteSignal);
  handleRemoteSignalRef.current = handleRemoteSignal;

  const enqueueSignalRef = useRef<(payload: CallSignalPayload) => void>(() => undefined);

  useEffect(() => {
    if (!enabled || !callId || !signalingRoomId || !userId) return;

    const epoch = ++epochRef.current;
    answeredRef.current = false;
    natFailedRef.current = false;
    makingOfferRef.current = false;
    appliedSignalsRef.current = new Set();
    pendingIceRef.current = [];
    signalChainRef.current = Promise.resolve();

    let cancelled = false;
    let session: VoiceSignalSession | null = null;
    let offerTimer: ReturnType<typeof setTimeout> | null = null;
    const offered = { current: false };
    const live = () => !cancelled && epochRef.current === epoch;

    const fail = (message: string) => {
      if (!live()) return;
      setState("failed");
      onFailedRef.current?.(message);
    };

    const enqueueSignal = (payload: CallSignalPayload) => {
      signalChainRef.current = signalChainRef.current
        .then(async () => {
          if (!live()) return;
          await handleRemoteSignalRef.current(payload);
        })
        .catch((error: unknown) => {
          if (!live() || isBenignSignalingError(error)) return;
          fail("An error occurred while processing signaling.");
        });
    };
    enqueueSignalRef.current = enqueueSignal;

    const maybeOffer = async () => {
      if (!isCallerRef.current || !live()) return;
      if (offered.current) {
        const local = pcRef.current?.localDescription;
        if (local?.type === "offer") emitSignal({ type: "offer", sdp: local });
        return;
      }
      offered.current = true;
      try {
        const pc = await createPeerConnectionRef.current();
        if (!live()) return;
        makingOfferRef.current = true;
        const offer = await pc.createOffer();
        if (!live()) return;
        await pc.setLocalDescription(offer);
        emitSignal({ type: "offer", sdp: offer });
      } catch (e) {
        offered.current = false;
        fail(e instanceof Error ? e.message : "Media connection failed.");
      } finally {
        makingOfferRef.current = false;
      }
    };

    void (async () => {
      try {
        setState("connecting");
        const rtcConfiguration = await fetchWebRtcIceConfiguration();
        if (!live()) return;

        session = await openVoiceSignalChannel({
          signalingRoomId,
          userId,
          onSignal: (fromUserId, signal) => {
            if (!live() || fromUserId !== peerUserIdRef.current) return;
            if (signal.type === "hello") {
              if (!isCallerRef.current) sessionSendRef.current({ type: "ready" });
              return;
            }
            if (signal.type === "ready") {
              void maybeOffer();
              return;
            }
            enqueueSignal(signal);
          },
        });

        if (!live()) {
          session?.close();
          return;
        }
        if (session) {
          sessionSendRef.current = session.send;
        } else if (!socketRef.current?.connected) {
          const sock = socketRef.current;
          if (sock) {
            await new Promise<void>((resolve) => {
              const timer = window.setTimeout(resolve, 4000);
              sock.once("connect", () => {
                window.clearTimeout(timer);
                resolve();
              });
            });
          }
          if (!live()) return;
          if (!socketRef.current?.connected) {
            fail("Could not connect to the signaling server.");
            return;
          }
        }

        await createPeerConnectionRef.current(rtcConfiguration);
        if (!live()) return;
        session?.send({ type: "hello" });
        if (session && !isCaller) session.send({ type: "ready" });

        if (isCaller) {
          offerTimer = setTimeout(() => {
            void maybeOffer();
          }, 800);
        }

        for (const queued of initialSignalsRef.current ?? []) {
          if (queued.callId !== callId || queued.fromUserId !== peerUserIdRef.current) continue;
          enqueueSignal(queued.payload);
        }
      } catch (e) {
        fail(e instanceof Error ? e.message : "Media connection failed.");
      }
    })();

    const retry = isCaller
      ? setInterval(() => {
          if (answeredRef.current || !live()) return;
          const local = pcRef.current?.localDescription;
          if (local?.type === "offer" && local.sdp) {
            emitSignal({ type: "offer", sdp: local });
          } else {
            void maybeOffer();
          }
        }, 2000)
      : null;

    return () => {
      cancelled = true;
      epochRef.current += 1;
      enqueueSignalRef.current = () => undefined;
      if (offerTimer) clearTimeout(offerTimer);
      if (retry) clearInterval(retry);
      sessionSendRef.current = () => undefined;
      session?.close();
      cleanup();
    };
  }, [enabled, callId, signalingRoomId, userId, isCaller, cleanup, emitSignal]);

  useEffect(() => {
    if (!enabled || !socket) return;
    const onSignal = (data: CallSignalEvent) => {
      if (data.callId !== callIdRef.current || data.fromUserId !== peerUserIdRef.current) return;
      enqueueSignalRef.current(data.payload);
    };
    socket.on("call_signal", onSignal);
    return () => {
      socket.off("call_signal", onSignal);
    };
  }, [enabled, socket]);

  const setMic = useCallback((on: boolean) => {
    for (const track of rawMicRef.current?.getAudioTracks() ?? []) {
      track.enabled = on;
    }
    for (const track of localStreamRef.current?.getAudioTracks() ?? []) {
      track.enabled = on;
    }
    setMicEnabled(on);
  }, []);

  const setCamera = useCallback((on: boolean) => {
    for (const track of localStreamRef.current?.getVideoTracks() ?? []) {
      track.enabled = on;
    }
    setCameraEnabled(on);
  }, []);

  const flipCamera = useCallback(async () => {
    const videoTrack = localStreamRef.current?.getVideoTracks()[0];
    if (!videoTrack) return;
    try {
      const nextFacing = videoTrack.getSettings().facingMode === "user" ? "environment" : "user";
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: nextFacing },
      });
      const newTrack = stream.getVideoTracks()[0];
      if (!newTrack || !pcRef.current) return;
      const sender = pcRef.current.getSenders().find((s) => s.track?.kind === "video");
      await sender?.replaceTrack(newTrack);
      videoTrack.stop();
      localStreamRef.current?.removeTrack(videoTrack);
      localStreamRef.current?.addTrack(newTrack);
      setLocalStream(localStreamRef.current ? new MediaStream(localStreamRef.current.getTracks()) : null);
      setCameraEnabled(true);
    } catch {
      /* ignore */
    }
  }, []);

  return {
    localStream,
    remoteStream,
    state,
    micEnabled,
    cameraEnabled,
    setMic,
    setCamera,
    flipCamera,
    hangup: () => {
      emitSignal({ type: "hangup" });
      cleanup();
    },
  };
}
