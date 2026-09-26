import { useCallback, useEffect, useRef, useState } from "react";
import {
  mediaDevices,
  RTCIceCandidate,
  RTCPeerConnection,
  RTCSessionDescription,
  type MediaStream,
} from "@livekit/react-native-webrtc";
import { fetchMobileWebRtcIceConfiguration } from "@/lib/webrtc-ice-config";
import { ensureLiveKitGlobals } from "@/native/livekit-bootstrap";
import {
  openVoiceSignalChannel,
  type VoiceSignalSession,
  type VoiceWireSignal,
} from "@/lib/supabase-call-signal";

export type MobilePeerCallState = "idle" | "connecting" | "connected" | "failed" | "closed";

export function useMobilePeerCall({
  callId,
  signalingRoomId,
  userId,
  peerUserId,
  isCaller,
  enabled,
  onFailed,
}: {
  callId: string;
  signalingRoomId: string;
  userId: string;
  peerUserId: string;
  isCaller: boolean;
  enabled: boolean;
  onFailed?: (message: string) => void;
}) {
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const rtcConfigRef = useRef<object | null>(null);
  const makingOfferRef = useRef(false);
  const politeRef = useRef(!isCaller);
  const pendingIceRef = useRef<RTCIceCandidateInit[]>([]);
  const sessionSendRef = useRef<(signal: VoiceWireSignal) => void>(() => undefined);
  const onFailedRef = useRef(onFailed);
  const peerUserIdRef = useRef(peerUserId);
  const isCallerRef = useRef(isCaller);

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [state, setState] = useState<MobilePeerCallState>("idle");
  const [micEnabled, setMicEnabled] = useState(true);

  useEffect(() => {
    onFailedRef.current = onFailed;
    peerUserIdRef.current = peerUserId;
    isCallerRef.current = isCaller;
    politeRef.current = !isCaller;
  });

  const cleanup = useCallback(() => {
    pcRef.current?.close();
    pcRef.current = null;
    pendingIceRef.current = [];
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
    await ensureLiveKitGlobals();
    const stream = (await mediaDevices.getUserMedia({
      audio: true,
      video: false,
    })) as MediaStream;
    localStreamRef.current = stream;
    setLocalStream(stream);
    return stream;
  }, []);

  const flushIce = useCallback(async (pc: RTCPeerConnection) => {
    const queued = pendingIceRef.current.splice(0);
    for (const candidate of queued) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch {
        /* ignore */
      }
    }
  }, []);

  const createPeerConnection = useCallback(async (rtcConfiguration?: object) => {
    if (pcRef.current) return pcRef.current;
    await ensureLiveKitGlobals();

    const cfg =
      rtcConfiguration ??
      rtcConfigRef.current ??
      (await fetchMobileWebRtcIceConfiguration());
    rtcConfigRef.current = cfg;

    const pc = new RTCPeerConnection(cfg);
    pcRef.current = pc;

    pc.onicecandidate = (ev) => {
      const candidate = (ev as { candidate?: RTCIceCandidate | null }).candidate;
      if (candidate) {
        sessionSendRef.current({ type: "ice", candidate: candidate.toJSON() });
      }
    };

    pc.ontrack = (ev) => {
      const streams = (ev as { streams?: readonly MediaStream[] }).streams;
      const [first] = streams ?? [];
      if (first) setRemoteStream(first);
    };

    pc.onconnectionstatechange = () => {
      const cs = pc.connectionState;
      if (cs === "connected") setState("connected");
      else if (cs === "failed") {
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
  }, [ensureLocalStream]);

  const handleRemoteSignal = useCallback(
    async (payload: VoiceWireSignal) => {
      if (payload.type === "hello" || payload.type === "ready") return;
      const pc = pcRef.current ?? (await createPeerConnection());
      const polite = politeRef.current;

      if (payload.type === "hangup") {
        cleanup();
        return;
      }

      if (payload.type === "offer") {
        const offerCollision = makingOfferRef.current || pc.signalingState !== "stable";
        if (!polite && offerCollision) return;
        await pc.setRemoteDescription(
          new RTCSessionDescription({ type: "offer", sdp: payload.sdp.sdp ?? "" })
        );
        await flushIce(pc);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        sessionSendRef.current({
          type: "answer",
          sdp: { type: answer.type, sdp: answer.sdp },
        });
        setState("connecting");
        return;
      }

      if (payload.type === "answer" && pc.signalingState === "have-local-offer") {
        await pc.setRemoteDescription(
          new RTCSessionDescription({ type: "answer", sdp: payload.sdp.sdp ?? "" })
        );
        await flushIce(pc);
        return;
      }

      if (payload.type === "ice" && payload.candidate) {
        if (!pc.remoteDescription) {
          pendingIceRef.current.push(payload.candidate);
          return;
        }
        try {
          await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
        } catch {
          /* ignore */
        }
      }
    },
    [cleanup, createPeerConnection, flushIce]
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
          if (local?.type === "offer" && local.sdp) {
            sessionSendRef.current({ type: "offer", sdp: { type: "offer", sdp: local.sdp } });
          }
          return;
        }
        offered.current = true;
        makingOfferRef.current = true;
        const offer = await pc.createOffer();
        if (cancelled) return;
        await pc.setLocalDescription(offer);
        sessionSendRef.current({
          type: "offer",
          sdp: { type: offer.type, sdp: offer.sdp },
        });
      } catch (e) {
        offered.current = false;
        fail(e instanceof Error ? e.message : "미디어 연결 실패");
      } finally {
        makingOfferRef.current = false;
      }
    };

    void (async () => {
      try {
        setState("connecting");
        await ensureLiveKitGlobals();
        const rtcConfiguration = await fetchMobileWebRtcIceConfiguration();
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
            void handleRemoteSignalRef.current(signal).catch(() => fail("시그널 처리 실패"));
          },
        });

        if (cancelled) {
          session?.send({ type: "hangup" });
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
        fail(e instanceof Error ? e.message : "미디어 연결 실패");
      }
    })();

    return () => {
      cancelled = true;
      if (offerTimer) clearTimeout(offerTimer);
      sessionSendRef.current({ type: "hangup" });
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

  const hangup = useCallback(() => {
    sessionSendRef.current({ type: "hangup" });
    cleanup();
  }, [cleanup]);

  return { localStream, remoteStream, state, micEnabled, setMic, hangup };
}
