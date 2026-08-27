"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import { fetchWebRtcIceConfiguration } from "@/lib/webrtc-ice-config";
import type { CallSignalEvent, CallSignalPayload } from "@/lib/peer-call/types";

export type PeerCallState = "idle" | "connecting" | "connected" | "failed" | "closed";

type UsePeerCallOptions = {
  callId: string;
  userId: string;
  peerUserId: string;
  isCaller: boolean;
  video: boolean;
  enabled: boolean;
  socket: Socket | null;
  onConnected?: () => void;
  onFailed?: (message: string) => void;
};

export function usePeerCall({
  callId,
  userId,
  peerUserId,
  isCaller,
  video,
  enabled,
  socket,
  onConnected,
  onFailed,
}: UsePeerCallOptions) {
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const rtcConfigRef = useRef<RTCConfiguration | null>(null);
  const makingOfferRef = useRef(false);
  const ignoreOfferRef = useRef(false);
  const politeRef = useRef(!isCaller);
  const initSessionRef = useRef<string | null>(null);
  const onConnectedRef = useRef(onConnected);
  const onFailedRef = useRef(onFailed);
  const socketRef = useRef(socket);
  const callIdRef = useRef(callId);
  const peerUserIdRef = useRef(peerUserId);
  const videoRef = useRef(video);

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [state, setState] = useState<PeerCallState>("idle");
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(video);

  useEffect(() => {
    onConnectedRef.current = onConnected;
    onFailedRef.current = onFailed;
    socketRef.current = socket;
    callIdRef.current = callId;
    peerUserIdRef.current = peerUserId;
    videoRef.current = video;
    politeRef.current = !isCaller;
  });

  const emitSignal = useCallback((payload: CallSignalPayload) => {
    const sock = socketRef.current;
    if (!sock?.connected) return;
    sock.emit("call_signal", {
      callId: callIdRef.current,
      toUserId: peerUserIdRef.current,
      payload,
    });
  }, []);

  const cleanup = useCallback(() => {
    const pc = pcRef.current;
    pcRef.current = null;
    if (pc) {
      pc.onicecandidate = null;
      pc.ontrack = null;
      pc.onconnectionstatechange = null;
      pc.close();
    }
    for (const track of localStreamRef.current?.getTracks() ?? []) {
      track.stop();
    }
    localStreamRef.current = null;
    remoteStreamRef.current = null;
    rtcConfigRef.current = null;
    initSessionRef.current = null;
    setLocalStream(null);
    setRemoteStream(null);
    setState("closed");
  }, []);

  const ensureLocalStream = useCallback(async () => {
    if (localStreamRef.current) return localStreamRef.current;
    const wantsVideo = videoRef.current;
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: wantsVideo
        ? { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } }
        : false,
    });
    localStreamRef.current = stream;
    setLocalStream(stream);
    setCameraEnabled(wantsVideo && stream.getVideoTracks().some((t) => t.enabled));
    return stream;
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
      } else {
        const merged = remoteStreamRef.current ?? new MediaStream();
        merged.addTrack(ev.track);
        remoteStreamRef.current = merged;
        setRemoteStream(merged);
      }
    };

    pc.onconnectionstatechange = () => {
      const cs = pc.connectionState;
      if (cs === "connected") {
        setState("connected");
        onConnectedRef.current?.();
      } else if (cs === "failed") {
        setState("failed");
        onFailedRef.current?.("P2P 연결에 실패했습니다.");
      } else if (cs === "disconnected" || cs === "closed") {
        setState("closed");
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
        cleanup();
        return;
      }

      if (payload.type === "offer") {
        const offerCollision = makingOfferRef.current || pc.signalingState !== "stable";
        ignoreOfferRef.current = !polite && offerCollision;
        if (ignoreOfferRef.current) return;

        await pc.setRemoteDescription(payload.sdp);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        emitSignal({ type: "answer", sdp: answer });
        setState("connecting");
        return;
      }

      if (payload.type === "answer") {
        if (pc.signalingState === "have-local-offer") {
          await pc.setRemoteDescription(payload.sdp);
        }
        return;
      }

      if (payload.type === "ice") {
        if (payload.candidate) {
          try {
            await pc.addIceCandidate(payload.candidate);
          } catch {
            /* ignore stale ICE */
          }
        }
      }
    },
    [cleanup, createPeerConnection, emitSignal]
  );

  useEffect(() => {
    if (!enabled || !socket || !callId) return;

    const onSignal = (data: CallSignalEvent) => {
      if (data.callId !== callId || data.fromUserId !== peerUserId) return;
      void handleRemoteSignal(data.payload).catch(() => {
        setState("failed");
        onFailedRef.current?.("시그널 처리 중 오류가 발생했습니다.");
      });
    };

    socket.on("call_signal", onSignal);
    return () => {
      socket.off("call_signal", onSignal);
    };
  }, [enabled, socket, callId, peerUserId, handleRemoteSignal]);

  const createPeerConnectionRef = useRef(createPeerConnection);
  createPeerConnectionRef.current = createPeerConnection;

  useEffect(() => {
    if (!enabled || !callId) return;

    const sessionKey = `${callId}:${isCaller ? "caller" : "callee"}`;
    if (initSessionRef.current === sessionKey) return;
    initSessionRef.current = sessionKey;

    let cancelled = false;

    void (async () => {
      try {
        setState("connecting");
        const rtcConfiguration = await fetchWebRtcIceConfiguration();
        if (cancelled) return;
        const pc = await createPeerConnectionRef.current(rtcConfiguration);
        if (cancelled) return;

        if (isCaller) {
          makingOfferRef.current = true;
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          emitSignal({ type: "offer", sdp: offer });
          makingOfferRef.current = false;
        }
      } catch (e) {
        if (cancelled) return;
        initSessionRef.current = null;
        setState("failed");
        onFailedRef.current?.(
          e instanceof Error ? e.message : "미디어 연결에 실패했습니다."
        );
      }
    })();

    return () => {
      cancelled = true;
      if (initSessionRef.current === sessionKey) {
        initSessionRef.current = null;
      }
      cleanup();
    };
  }, [enabled, callId, isCaller, emitSignal, cleanup]);

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
