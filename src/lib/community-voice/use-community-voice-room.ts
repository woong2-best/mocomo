"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { fetchWebRtcIceConfiguration } from "@/lib/webrtc-ice-config";
import { fetchSocketAuthToken } from "@/lib/socket-client";
import type {
  CommunityVoicePeerEvent,
  CommunityVoicePeersSnapshot,
  CommunityVoiceSignalEvent,
} from "@/lib/community-voice/types";
import type { CallSignalPayload } from "@/lib/peer-call/types";

export type CommunityVoiceRoomState = "idle" | "connecting" | "connected" | "failed";

type PeerEntry = {
  pc: RTCPeerConnection;
  stream: MediaStream | null;
  makingOffer: boolean;
  ignoreOffer: boolean;
  polite: boolean;
};

function shouldInitiate(localUserId: string, remoteUserId: string): boolean {
  return localUserId.localeCompare(remoteUserId) < 0;
}

export function useCommunityVoiceRoom({
  channelId,
  userId,
  displayName,
  muted,
  deafened,
  enabled,
  onConnected,
  onFailed,
}: {
  channelId: string;
  userId: string;
  displayName: string;
  muted: boolean;
  deafened: boolean;
  enabled: boolean;
  onConnected?: () => void;
  onFailed?: (message: string) => void;
}) {
  const socketRef = useRef<Socket | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<Map<string, PeerEntry>>(new Map());
  const rtcConfigRef = useRef<RTCConfiguration | null>(null);
  const connectedNotifiedRef = useRef(false);
  const onConnectedRef = useRef(onConnected);
  const onFailedRef = useRef(onFailed);
  onConnectedRef.current = onConnected;
  onFailedRef.current = onFailed;

  const [state, setState] = useState<CommunityVoiceRoomState>("idle");
  const [remotePeers, setRemotePeers] = useState<
    { userId: string; stream: MediaStream | null }[]
  >([]);

  const syncRemotePeers = useCallback(() => {
    setRemotePeers(
      [...peersRef.current.entries()].map(([peerUserId, entry]) => ({
        userId: peerUserId,
        stream: entry.stream,
      }))
    );
  }, []);

  const emitSignal = useCallback(
    (toUserId: string, payload: CallSignalPayload) => {
      socketRef.current?.emit("community_voice_signal", { channelId, toUserId, payload });
    },
    [channelId]
  );

  const closePeer = useCallback(
    (peerUserId: string) => {
      const entry = peersRef.current.get(peerUserId);
      if (!entry) return;
      entry.pc.close();
      peersRef.current.delete(peerUserId);
      syncRemotePeers();
    },
    [syncRemotePeers]
  );

  const ensureLocalStream = useCallback(async () => {
    if (localStreamRef.current) return localStreamRef.current;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    localStreamRef.current = stream;
    return stream;
  }, []);

  const getRtcConfig = useCallback(async () => {
    if (!rtcConfigRef.current) {
      rtcConfigRef.current = await fetchWebRtcIceConfiguration();
    }
    return rtcConfigRef.current;
  }, []);

  const markConnected = useCallback(() => {
    if (connectedNotifiedRef.current) return;
    connectedNotifiedRef.current = true;
    setState("connected");
    onConnectedRef.current?.();
  }, []);

  const handleRemoteSignal = useCallback(
    async (fromUserId: string, payload: CallSignalPayload) => {
      if (fromUserId === userId) return;

      if (payload.type === "hangup") {
        closePeer(fromUserId);
        return;
      }

      let entry = peersRef.current.get(fromUserId);

      if (!entry && payload.type === "offer") {
        const cfg = await getRtcConfig();
        const pc = new RTCPeerConnection(cfg);
        entry = {
          pc,
          stream: null,
          makingOffer: false,
          ignoreOffer: false,
          polite: !shouldInitiate(userId, fromUserId),
        };
        peersRef.current.set(fromUserId, entry);

        pc.onicecandidate = (ev) => {
          if (ev.candidate) {
            emitSignal(fromUserId, { type: "ice", candidate: ev.candidate.toJSON() });
          }
        };

        pc.ontrack = (ev) => {
          const [first] = ev.streams;
          entry!.stream = first ?? new MediaStream([ev.track]);
          syncRemotePeers();
        };

        pc.onconnectionstatechange = () => {
          if (pc.connectionState === "failed") closePeer(fromUserId);
          if (pc.connectionState === "connected") markConnected();
        };

        const local = await ensureLocalStream();
        for (const track of local.getTracks()) {
          pc.addTrack(track, local);
        }
      }

      if (!entry) return;
      const { pc, polite } = entry;

      if (payload.type === "offer") {
        const offerCollision = entry.makingOffer || pc.signalingState !== "stable";
        entry.ignoreOffer = !polite && offerCollision;
        if (entry.ignoreOffer) return;

        await pc.setRemoteDescription(payload.sdp);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        emitSignal(fromUserId, { type: "answer", sdp: answer });
        return;
      }

      if (payload.type === "answer") {
        if (pc.signalingState === "have-local-offer") {
          await pc.setRemoteDescription(payload.sdp);
        }
        return;
      }

      if (payload.type === "ice" && payload.candidate) {
        try {
          await pc.addIceCandidate(payload.candidate);
        } catch {
          /* stale ICE */
        }
      }
    },
    [userId, closePeer, getRtcConfig, emitSignal, syncRemotePeers, ensureLocalStream, markConnected]
  );

  const connectToPeer = useCallback(
    async (peerUserId: string) => {
      if (peerUserId === userId || peersRef.current.has(peerUserId)) return;
      if (!shouldInitiate(userId, peerUserId)) return;

      const cfg = await getRtcConfig();
      const pc = new RTCPeerConnection(cfg);
      const entry: PeerEntry = {
        pc,
        stream: null,
        makingOffer: false,
        ignoreOffer: false,
        polite: !shouldInitiate(userId, peerUserId),
      };
      peersRef.current.set(peerUserId, entry);

      pc.onicecandidate = (ev) => {
        if (ev.candidate) {
          emitSignal(peerUserId, { type: "ice", candidate: ev.candidate.toJSON() });
        }
      };

      pc.ontrack = (ev) => {
        const [first] = ev.streams;
        entry.stream = first ?? new MediaStream([ev.track]);
        syncRemotePeers();
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "failed") closePeer(peerUserId);
        if (pc.connectionState === "connected") markConnected();
      };

      const local = await ensureLocalStream();
      for (const track of local.getTracks()) {
        pc.addTrack(track, local);
      }

      entry.makingOffer = true;
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      entry.makingOffer = false;
      emitSignal(peerUserId, { type: "offer", sdp: offer });
      syncRemotePeers();
    },
    [userId, getRtcConfig, emitSignal, syncRemotePeers, ensureLocalStream, closePeer, markConnected]
  );

  useEffect(() => {
    if (!enabled || !userId || !channelId) return;

    let cancelled = false;
    let socket: Socket | null = null;

    const onPeers = (data: CommunityVoicePeersSnapshot) => {
      if (data.channelId !== channelId) return;
      for (const peerId of data.peerIds) {
        void connectToPeer(peerId);
      }
    };

    const onPeerJoined = (data: CommunityVoicePeerEvent) => {
      if (data.channelId !== channelId || data.userId === userId) return;
      void connectToPeer(data.userId);
    };

    const onPeerLeft = (data: CommunityVoicePeerEvent) => {
      if (data.channelId !== channelId) return;
      closePeer(data.userId);
    };

    const onSignal = (data: CommunityVoiceSignalEvent) => {
      if (data.channelId !== channelId || data.fromUserId === userId) return;
      void handleRemoteSignal(data.fromUserId, data.payload).catch(() => {
        onFailedRef.current?.("음성 연결 중 오류가 발생했습니다.");
      });
    };

    void (async () => {
      try {
        setState("connecting");
        const joinRes = await fetch(
          `/api/community-voice/join?channelId=${encodeURIComponent(channelId)}`,
          { credentials: "include", cache: "no-store" }
        );
        const joinBody = await joinRes.json().catch(() => ({}));
        if (!joinRes.ok) {
          throw new Error((joinBody as { error?: string }).error ?? "입장 권한 확인 실패");
        }

        const token = await fetchSocketAuthToken();
        if (!token || cancelled) throw new Error("소켓 인증에 실패했습니다.");

        const url = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001";
        socket = io(url, { auth: { token }, transports: ["websocket", "polling"] });
        socketRef.current = socket;

        socket.on("voice_peers", onPeers);
        socket.on("voice_peer_joined", onPeerJoined);
        socket.on("voice_peer_left", onPeerLeft);
        socket.on("community_voice_signal", onSignal);

        const joinRoom = () => {
          socket?.emit("join_voice", { channelId, displayName });
        };

        socket.on("connect", joinRoom);
        if (socket.connected) joinRoom();

        await ensureLocalStream();
        if (cancelled) return;
        markConnected();
      } catch (e) {
        if (cancelled) return;
        setState("failed");
        onFailedRef.current?.(e instanceof Error ? e.message : "음성 채널 연결 실패");
      }
    })();

    return () => {
      cancelled = true;
      for (const peerUserId of [...peersRef.current.keys()]) {
        emitSignal(peerUserId, { type: "hangup" });
        closePeer(peerUserId);
      }
      for (const track of localStreamRef.current?.getTracks() ?? []) {
        track.stop();
      }
      localStreamRef.current = null;
      rtcConfigRef.current = null;
      connectedNotifiedRef.current = false;
      socket?.emit("leave_voice", channelId);
      socket?.off("voice_peers", onPeers);
      socket?.off("voice_peer_joined", onPeerJoined);
      socket?.off("voice_peer_left", onPeerLeft);
      socket?.off("community_voice_signal", onSignal);
      socket?.disconnect();
      socketRef.current = null;
      setRemotePeers([]);
      setState("idle");
    };
  }, [
    enabled,
    channelId,
    userId,
    displayName,
    connectToPeer,
    closePeer,
    handleRemoteSignal,
    ensureLocalStream,
    emitSignal,
    markConnected,
  ]);

  useEffect(() => {
    for (const track of localStreamRef.current?.getAudioTracks() ?? []) {
      track.enabled = !muted;
    }
    socketRef.current?.emit("voice_state", { channelId, isMuted: muted, cameraOn: false });
  }, [muted, channelId]);

  useEffect(() => {
    for (const entry of peersRef.current.values()) {
      for (const track of entry.stream?.getAudioTracks() ?? []) {
        track.enabled = !deafened;
      }
    }
  }, [deafened]);

  return { state, remotePeers };
}
