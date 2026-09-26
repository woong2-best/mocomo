"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchWebRtcIceConfiguration } from "@/lib/webrtc-ice-config";
import type { CallSignalPayload } from "@/lib/peer-call/types";
import {
  openVoiceSignalChannel,
  type VoiceSignalSession,
  type VoiceWireSignal,
} from "@/lib/peer-call/supabase-signal";

export type PeerCallState = "idle" | "connecting" | "connected" | "failed" | "closed";

type UsePeerCallOptions = {
  callId: string;
  signalingRoomId: string;
  userId: string;
  peerUserId: string;
  isCaller: boolean;
  video: boolean;
  enabled: boolean;
  onConnected?: () => void;
  onFailed?: (message: string) => void;
};

export function usePeerCall({
  callId,
  signalingRoomId,
  userId,
  peerUserId,
  isCaller,
  video,
  enabled,
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
  const pendingIceRef = useRef<RTCIceCandidateInit[]>([]);
  const sessionSendRef = useRef<(signal: VoiceWireSignal) => void>(() => undefined);
  const onConnectedRef = useRef(onConnected);
  const onFailedRef = useRef(onFailed);
  const callIdRef = useRef(callId);
  const peerUserIdRef = useRef(peerUserId);
  const videoRef = useRef(video);
  const isCallerRef = useRef(isCaller);

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [state, setState] = useState<PeerCallState>("idle");
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(video);

  useEffect(() => {
    onConnectedRef.current = onConnected;
    onFailedRef.current = onFailed;
    callIdRef.current = callId;
    peerUserIdRef.current = peerUserId;
    videoRef.current = video;
    isCallerRef.current = isCaller;
    politeRef.current = !isCaller;
  });

  const emitSignal = useCallback((payload: CallSignalPayload) => {
    sessionSendRef.current(payload);
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
        await flushIce(pc);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        emitSignal({ type: "answer", sdp: answer });
        setState("connecting");
        return;
      }

      if (payload.type === "answer") {
        if (pc.signalingState === "have-local-offer") {
          await pc.setRemoteDescription(payload.sdp);
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
            sessionSendRef.current({ type: "offer", sdp: local });
          }
          return;
        }
        offered.current = true;
        makingOfferRef.current = true;
        const offer = await pc.createOffer();
        if (cancelled) return;
        await pc.setLocalDescription(offer);
        sessionSendRef.current({ type: "offer", sdp: offer });
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
        await createPeerConnectionRef.current(rtcConfiguration);
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
        if (!session) {
          fail("시그널링 서버에 연결할 수 없습니다.");
          return;
        }

        sessionSendRef.current = session.send;
        session.send({ type: "hello" });
        if (!isCaller) session.send({ type: "ready" });
        if (isCaller) {
          offerTimer = setTimeout(() => {
            void maybeOffer();
          }, 1500);
        }
      } catch (e) {
        fail(e instanceof Error ? e.message : "미디어 연결에 실패했습니다.");
      }
    })();

    return () => {
      cancelled = true;
      if (offerTimer) clearTimeout(offerTimer);
      sessionSendRef.current = () => undefined;
      session?.close();
      cleanup();
    };
  }, [enabled, callId, signalingRoomId, userId, isCaller, cleanup]);

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
