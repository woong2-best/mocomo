"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import { fetchWebRtcIceConfiguration } from "@/lib/webrtc-ice-config";
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
  onRemoteHangup,
}: UsePeerCallOptions) {
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const rtcConfigRef = useRef<RTCConfiguration | null>(null);
  const makingOfferRef = useRef(false);
  const ignoreOfferRef = useRef(false);
  const politeRef = useRef(!isCaller);
  const pendingIceRef = useRef<RTCIceCandidateInit[]>([]);
  const sessionSendRef = useRef<(signal: VoiceWireSignal) => void>(() => undefined);
  const onConnectedRef = useRef(onConnected);
  const onFailedRef = useRef(onFailed);
  const onRemoteHangupRef = useRef(onRemoteHangup);
  const callIdRef = useRef(callId);
  const peerUserIdRef = useRef(peerUserId);
  const videoRef = useRef(video);
  const isCallerRef = useRef(isCaller);
  const socketRef = useRef(socket);
  const answeredRef = useRef(false);
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
    pendingIceRef.current = [];
    if (pc) {
      pc.onicecandidate = null;
      pc.ontrack = null;
      pc.onconnectionstatechange = null;
      pc.close();
    }
    for (const track of localStreamRef.current?.getTracks() ?? []) {
      track.stop();
    }
    releaseMic(localStreamRef.current);
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

    const cfg =
      rtcConfiguration ??
      rtcConfigRef.current ??
      (await fetchWebRtcIceConfiguration());
    rtcConfigRef.current = cfg;

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

    pc.onconnectionstatechange = () => {
      const cs = pc.connectionState;
      if (cs === "connected") {
        setState("connected");
        onConnectedRef.current?.();
      } else if (cs === "failed") {
        setState("failed");
        onFailedRef.current?.("통화 연결이 끊겼습니다. 같은 와이파이가 아니면 잠시 후 다시 걸어 주세요.");
      }
    };

    const local = await ensureLocalStream();
    for (const track of local.getTracks()) {
      pc.addTrack(track, local);
    }

    return pc;
  }, [emitSignal, ensureLocalStream]);

  const handleRemoteSignal = useCallback(
    async (payload: CallSignalPayload) => {
      const pc = pcRef.current ?? (await createPeerConnection());
      const polite = politeRef.current;

      if (payload.type === "hangup") {
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
        if (answeredRef.current && pc.currentRemoteDescription?.sdp === offer.sdp) return;
        try {
          await pc.setRemoteDescription(offer);
        } catch {
          return;
        }
        await flushIce(pc);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        answeredRef.current = true;
        emitSignal({ type: "answer", sdp: answer });
        setState("connecting");
        return;
      }

      if (payload.type === "answer") {
        if (pc.signalingState === "have-local-offer") {
          const answer = asSdp(payload.sdp, "answer");
          if (!answer.sdp) return;
          await pc.setRemoteDescription(answer);
          answeredRef.current = true;
          await flushIce(pc);
        }
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
        } catch {
          /* ignore stale ICE */
        }
      }
    },
    [cleanup, createPeerConnection, emitSignal, flushIce]
  );

  const createPeerConnectionRef = useRef(createPeerConnection);
  createPeerConnectionRef.current = createPeerConnection;
  const handleRemoteSignalRef = useRef(handleRemoteSignal);
  handleRemoteSignalRef.current = handleRemoteSignal;

  useEffect(() => {
    if (!enabled || !callId || !signalingRoomId || !userId) return;

    let cancelled = false;
    let session: VoiceSignalSession | null = null;
    let offerTimer: ReturnType<typeof setTimeout> | null = null;
    const offered = { current: false };

    const fail = (message: string) => {
      if (cancelled) return;
      setState("failed");
      onFailedRef.current?.(message);
    };

    const maybeOffer = async () => {
      if (!isCallerRef.current || cancelled) return;
      try {
        const pc = await createPeerConnectionRef.current();
        if (cancelled) return;
        if (offered.current) {
          const local = pc.localDescription;
          if (local?.type === "offer") {
            emitSignal({ type: "offer", sdp: local });
          }
          return;
        }
        offered.current = true;
        makingOfferRef.current = true;
        const offer = await pc.createOffer();
        if (cancelled) return;
        await pc.setLocalDescription(offer);
        emitSignal({ type: "offer", sdp: offer });
      } catch (e) {
        offered.current = false;
        fail(e instanceof Error ? e.message : "미디어 연결에 실패했습니다.");
      } finally {
        makingOfferRef.current = false;
      }
    };

    void (async () => {
      try {
        setState("connecting");
        const rtcConfiguration = await fetchWebRtcIceConfiguration();
        if (cancelled) return;

        session = await openVoiceSignalChannel({
          signalingRoomId,
          userId,
          onSignal: (fromUserId, signal) => {
            if (cancelled || fromUserId !== peerUserIdRef.current) return;
            if (signal.type === "hello") {
              if (!isCallerRef.current) sessionSendRef.current({ type: "ready" });
              return;
            }
            if (signal.type === "ready") {
              void maybeOffer();
              return;
            }
            void handleRemoteSignalRef.current(signal).catch(() => {
              fail("시그널 처리 중 오류가 발생했습니다.");
            });
          },
        });

        if (cancelled) {
          session?.close();
          return;
        }
        if (session) {
          sessionSendRef.current = session.send;
        } else if (!socketRef.current?.connected) {
          fail("시그널링 서버에 연결할 수 없습니다.");
          return;
        }

        await createPeerConnectionRef.current(rtcConfiguration);
        if (cancelled) return;
        session?.send({ type: "hello" });
        if (session && !isCaller) session.send({ type: "ready" });

        if (isCaller) {
          offerTimer = setTimeout(() => {
            void maybeOffer();
          }, 800);
        }

        for (const queued of initialSignalsRef.current ?? []) {
          if (queued.callId !== callId || queued.fromUserId !== peerUserIdRef.current) continue;
          void handleRemoteSignalRef.current(queued.payload);
        }
      } catch (e) {
        fail(e instanceof Error ? e.message : "미디어 연결에 실패했습니다.");
      }
    })();

    const retry = isCaller
      ? setTimeout(() => {
          if (answeredRef.current || cancelled) return;
          const pc = pcRef.current;
          const local = pc?.localDescription;
          if (local?.type === "offer" && local.sdp) {
            emitSignal({ type: "offer", sdp: local });
          }
        }, 2000)
      : null;

    return () => {
      cancelled = true;
      if (offerTimer) clearTimeout(offerTimer);
      if (retry) clearTimeout(retry);
      sessionSendRef.current = () => undefined;
      session?.close();
      cleanup();
    };
  }, [enabled, callId, signalingRoomId, userId, isCaller, cleanup, emitSignal]);

  useEffect(() => {
    if (!enabled || !socket) return;
    const onSignal = (data: CallSignalEvent) => {
      if (data.callId !== callIdRef.current || data.fromUserId !== peerUserIdRef.current) return;
      void handleRemoteSignalRef.current(data.payload).catch(() => {
        onFailedRef.current?.("시그널 처리 중 오류가 발생했습니다.");
      });
    };
    socket.on("call_signal", onSignal);
    return () => {
      socket.off("call_signal", onSignal);
    };
  }, [enabled, socket]);

  const setMic = useCallback((on: boolean) => {
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
