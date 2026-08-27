import { useCallback, useEffect, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import {
  mediaDevices,
  RTCIceCandidate,
  RTCPeerConnection,
  RTCSessionDescription,
  type MediaStream,
} from "react-native-webrtc";
import { fetchMobileWebRtcIceConfiguration } from "@/lib/webrtc-ice-config";
import { emitCallSignal } from "@/lib/call-socket";

export type CallSignalPayload =
  | { type: "offer"; sdp: RTCSessionDescriptionInit }
  | { type: "answer"; sdp: RTCSessionDescriptionInit }
  | { type: "ice"; candidate: RTCIceCandidateInit }
  | { type: "hangup" };

type CallSignalEvent = {
  callId: string;
  fromUserId: string;
  payload: CallSignalPayload;
};

export type MobilePeerCallState = "idle" | "connecting" | "connected" | "failed" | "closed";

export function useMobilePeerCall({
  callId,
  peerUserId,
  isCaller,
  video,
  enabled,
  socket,
  onFailed,
}: {
  callId: string;
  peerUserId: string;
  isCaller: boolean;
  video: boolean;
  enabled: boolean;
  socket: Socket | null;
  onFailed?: (message: string) => void;
}) {
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const rtcConfigRef = useRef<object | null>(null);
  const makingOfferRef = useRef(false);
  const politeRef = useRef(!isCaller);

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [state, setState] = useState<MobilePeerCallState>("idle");

  const signal = useCallback(
    (payload: CallSignalPayload) => {
      if (!socket?.connected) return;
      emitCallSignal(socket, callId, peerUserId, payload);
    },
    [socket, callId, peerUserId]
  );

  const cleanup = useCallback(() => {
    pcRef.current?.close();
    pcRef.current = null;
    for (const track of localStreamRef.current?.getTracks() ?? []) {
      track.stop();
    }
    localStreamRef.current = null;
    rtcConfigRef.current = null;
    setLocalStream(null);
    setRemoteStream(null);
    setState("closed");
  }, []);

  const ensureLocalStream = useCallback(async () => {
    if (localStreamRef.current) return localStreamRef.current;
    const stream = (await mediaDevices.getUserMedia({
      audio: true,
      video: video ? { facingMode: "user" } : false,
    })) as MediaStream;
    localStreamRef.current = stream;
    setLocalStream(stream);
    return stream;
  }, [video]);

  const createPeerConnection = useCallback(async (rtcConfiguration?: object) => {
    if (pcRef.current) return pcRef.current;

    const cfg =
      rtcConfiguration ??
      rtcConfigRef.current ??
      (await fetchMobileWebRtcIceConfiguration());
    rtcConfigRef.current = cfg;

    const pc = new RTCPeerConnection(cfg);
    pcRef.current = pc;

    pc.onicecandidate = (ev: { candidate: RTCIceCandidate | null }) => {
      if (ev.candidate) {
        signal({ type: "ice", candidate: ev.candidate.toJSON() });
      }
    };

    pc.ontrack = (ev: { streams: readonly MediaStream[] }) => {
      const [first] = ev.streams;
      if (first) setRemoteStream(first);
    };

    pc.onconnectionstatechange = () => {
      const cs = pc.connectionState;
      if (cs === "connected") setState("connected");
      else if (cs === "failed") {
        setState("failed");
        onFailed?.("P2P 연결에 실패했습니다.");
      } else if (cs === "disconnected" || cs === "closed") {
        setState("closed");
      }
    };

    const local = await ensureLocalStream();
    for (const track of local.getTracks()) {
      pc.addTrack(track, local);
    }

    return pc;
  }, [ensureLocalStream, onFailed, signal]);

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
        if (!polite && offerCollision) return;
        await pc.setRemoteDescription(new RTCSessionDescription({ type: payload.sdp.type!, sdp: payload.sdp.sdp ?? "" }));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        signal({ type: "answer", sdp: answer });
        setState("connecting");
        return;
      }

      if (payload.type === "answer" && pc.signalingState === "have-local-offer") {
        await pc.setRemoteDescription(new RTCSessionDescription({ type: payload.sdp.type!, sdp: payload.sdp.sdp ?? "" }));
        return;
      }

      if (payload.type === "ice" && payload.candidate) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
        } catch {
          /* ignore */
        }
      }
    },
    [cleanup, createPeerConnection, signal]
  );

  useEffect(() => {
    if (!enabled || !socket) return;
    const onSignal = (data: CallSignalEvent) => {
      if (data.callId !== callId || data.fromUserId !== peerUserId) return;
      void handleRemoteSignal(data.payload).catch(() => onFailed?.("시그널 처리 실패"));
    };
    socket.on("call_signal", onSignal);
    return () => {
      socket.off("call_signal", onSignal);
    };
  }, [enabled, socket, callId, peerUserId, handleRemoteSignal, onFailed]);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    void (async () => {
      try {
        setState("connecting");
        const rtcConfiguration = await fetchMobileWebRtcIceConfiguration();
        if (cancelled) return;
        const pc = await createPeerConnection(rtcConfiguration);
        if (cancelled) return;
        if (isCaller) {
          makingOfferRef.current = true;
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          signal({ type: "offer", sdp: offer });
          makingOfferRef.current = false;
        }
      } catch (e) {
        if (!cancelled) {
          setState("failed");
          onFailed?.(e instanceof Error ? e.message : "미디어 연결 실패");
        }
      }
    })();

    return () => {
      cancelled = true;
      signal({ type: "hangup" });
      cleanup();
    };
  }, [enabled, isCaller, createPeerConnection, signal, cleanup, onFailed]);

  return { localStream, remoteStream, state, hangup: () => { signal({ type: "hangup" }); cleanup(); } };
}
