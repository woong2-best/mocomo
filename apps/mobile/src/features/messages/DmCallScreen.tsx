import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { RTCView } from "@livekit/react-native-webrtc";
import { ApiError } from "@/api/client";
import { endDmCall, fetchMobileCallSync, initiateDmCall, acceptDmCall, type DmCallPayload } from "@/api/calls";
import { joinCallBooking } from "@/api/call-bookings";
import { useAuth } from "@/auth/AuthContext";
import { publishUserCallEvent, subscribeUserCallEvents } from "@/lib/supabase-call-signal";
import { useMobilePeerCall } from "@/lib/use-mobile-peer-call";
import { FolkAvatar } from "@/ui/FolkAvatar";
import { showIslandError } from "@/ui/IslandToast";
import { useTheme } from "@/theme/ThemeContext";
import { spacing, type ThemeColors } from "@/theme/tokens";
import type { RootStackParamList } from "@/navigation/types";

function PeerCallStage({
  callId,
  signalingRoomId,
  userId,
  peerUserId,
  isCaller,
}: {
  callId: string;
  signalingRoomId: string;
  userId: string;
  peerUserId: string;
  isCaller: boolean;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const peer = useMobilePeerCall({
    callId,
    signalingRoomId,
    userId,
    peerUserId,
    isCaller,
    enabled: true,
    onFailed: (msg) => showIslandError("연결 오류", msg),
  });

  return (
    <View style={styles.audioStage}>
      {peer.remoteStream ? (
        <RTCView streamURL={peer.remoteStream.toURL()} style={styles.hiddenAudio} objectFit="cover" />
      ) : null}
      <Text style={styles.stageHint}>
        {peer.state === "connected" ? "음성 통화 중" : "음성 연결 중…"}
      </Text>
      <Pressable
        style={styles.micBtn}
        onPress={() => peer.setMic(!peer.micEnabled)}
        accessibilityLabel={peer.micEnabled ? "마이크 끄기" : "마이크 켜기"}
      >
        <Ionicons name={peer.micEnabled ? "mic" : "mic-off"} size={26} color="#fff" />
      </Pressable>
    </View>
  );
}

function errorMessage(e: unknown) {
  if (e instanceof ApiError && e.body && typeof e.body === "object" && "error" in e.body) {
    return String((e.body as { error: string }).error);
  }
  return e instanceof Error ? e.message : "통화를 시작하지 못했습니다.";
}

export function DmCallScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { user } = useAuth();
  const route = useRoute<RouteProp<RootStackParamList, "DmCall">>();
  const { roomId, calleeId, displayName, displayImage, bookingId } = route.params;

  const [phase, setPhase] = useState<"dialing" | "ringing" | "live" | "error">("dialing");
  const [error, setError] = useState<string | null>(null);
  const [call, setCall] = useState<DmCallPayload | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = bookingId
          ? await joinCallBooking(bookingId)
          : await initiateDmCall({
              calleeId,
              chatRoomId: roomId,
              callType: "AUDIO",
            });
        if (cancelled) {
          void endDmCall(res.call.id).catch(() => undefined);
          return;
        }
        const next = res.call;
        setCall(next);
        const selfIsCaller = next.caller.id === user?.id;
        if (next.status === "ACTIVE" || (!selfIsCaller && next.status === "RINGING")) {
          if (!selfIsCaller && next.status === "RINGING") {
            const accepted = await acceptDmCall(next.id);
            if (cancelled) return;
            setCall(accepted.call);
            void publishUserCallEvent(accepted.call.caller.id, "accepted", accepted.call.id);
          }
          setPhase("live");
          return;
        }
        void publishUserCallEvent(next.callee.id, "ring", next.id);
        setPhase("ringing");
      } catch (e) {
        if (cancelled) return;
        setError(errorMessage(e));
        setPhase("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [bookingId, calleeId, roomId, user?.id]);

  useEffect(() => {
    if (!user?.id || !call || phase !== "ringing") return;
    const callId = call.id;
    const unsub = subscribeUserCallEvents(user.id, (event, id) => {
      if (id !== callId) return;
      if (event === "accepted") setPhase("live");
      if (event === "declined" || event === "ended") {
        setError(event === "declined" ? "상대방이 통화를 거절했습니다." : "통화가 종료되었습니다.");
        setPhase("error");
      }
    });
    const timer = setInterval(() => {
      void fetchMobileCallSync()
        .then((data) => {
          if (data.event === "active" && data.call.id === callId) setPhase("live");
          if ((data.event === "declined" || data.event === "ended") && data.callId === callId) {
            setError(
              data.event === "declined" ? "상대방이 통화를 거절했습니다." : "통화가 종료되었습니다."
            );
            setPhase("error");
          }
        })
        .catch(() => undefined);
    }, 2000);
    return () => {
      unsub();
      clearInterval(timer);
    };
  }, [call, phase, user?.id]);

  const hangUp = useCallback(async () => {
    if (call) {
      const peerId = call.caller.id === user?.id ? call.callee.id : call.caller.id;
      const event = phase === "live" ? "ended" : "declined";
      void publishUserCallEvent(peerId, event, call.id);
      try {
        await endDmCall(call.id);
      } catch {
        /* ignore */
      }
    }
    navigation.goBack();
  }, [call, navigation, phase, user?.id]);

  const selfIsCaller = call ? call.caller.id === user?.id : true;
  const peerUserId = call ? (selfIsCaller ? call.callee.id : call.caller.id) : calleeId;

  if (phase === "error") {
    return (
      <View style={[styles.root, { paddingTop: insets.top + 24 }]}>
        <Text style={styles.errorTitle}>통화 실패</Text>
        <Text style={styles.errorBody}>{error}</Text>
        <Pressable style={styles.endBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.endBtnText}>닫기</Text>
        </Pressable>
      </View>
    );
  }

  const liveReady = phase === "live" && call && user?.id;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {!liveReady ? (
        <View style={styles.center}>
          <FolkAvatar uri={displayImage} name={displayName} size={96} />
          <Text style={styles.name}>{displayName}</Text>
          <Text style={styles.sub}>{phase === "ringing" ? "상대방에게 전화 거는 중…" : "전화 연결 중…"}</Text>
          <ActivityIndicator color="#fff" style={{ marginTop: 20 }} />
        </View>
      ) : (
        <View style={styles.room}>
          <PeerCallStage
            callId={call.id}
            signalingRoomId={call.signalingRoomId}
            userId={user.id}
            peerUserId={peerUserId}
            isCaller={selfIsCaller}
          />
          <View style={[styles.overlayTop, { paddingTop: insets.top + 12 }]}>
            <FolkAvatar uri={displayImage} name={displayName} size={44} />
            <Text style={styles.name}>{displayName}</Text>
            <Text style={styles.sub}>음성 통화</Text>
          </View>
        </View>
      )}

      <View style={[styles.controls, { paddingBottom: Math.max(insets.bottom, 24) }]}>
        <Pressable style={styles.hangup} onPress={() => void hangUp()} accessibilityLabel="통화 종료">
          <Ionicons name="call" size={28} color="#fff" style={{ transform: [{ rotate: "135deg" }] }} />
        </Pressable>
      </View>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: "#0B1220" },
    room: { flex: 1 },
    center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
    overlayTop: {
      position: "absolute",
      left: 0,
      right: 0,
      alignItems: "center",
      gap: 8,
    },
    name: { color: "#fff", fontSize: 20, fontWeight: "700" },
    sub: { color: "rgba(255,255,255,0.7)", fontSize: 14, fontWeight: "500" },
    audioStage: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#0B1220",
    },
    stageHint: { color: "rgba(255,255,255,0.55)", fontWeight: "600" },
    hiddenAudio: { width: 1, height: 1, opacity: 0, position: "absolute" },
    micBtn: {
      marginTop: 28,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: "rgba(255,255,255,0.16)",
      alignItems: "center",
      justifyContent: "center",
    },
    controls: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      alignItems: "center",
      paddingTop: spacing.lg,
    },
    hangup: {
      width: 68,
      height: 68,
      borderRadius: 34,
      backgroundColor: colors.danger,
      alignItems: "center",
      justifyContent: "center",
    },
    errorTitle: {
      color: "#fff",
      fontSize: 18,
      fontWeight: "800",
      textAlign: "center",
      marginHorizontal: spacing.lg,
    },
    errorBody: {
      color: "rgba(255,255,255,0.7)",
      textAlign: "center",
      marginTop: 10,
      marginHorizontal: spacing.lg,
    },
    endBtn: {
      marginTop: 28,
      alignSelf: "center",
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 12,
      backgroundColor: colors.terracotta,
    },
    endBtnText: { color: "#fff", fontWeight: "800" },
  });
}
