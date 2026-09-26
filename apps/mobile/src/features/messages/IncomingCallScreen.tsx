import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { RTCView } from "@livekit/react-native-webrtc";
import { acceptDmCall, declineDmCall, endDmCall, fetchMobileCallSync } from "@/api/calls";
import { useAuth } from "@/auth/AuthContext";
import { publishUserCallEvent } from "@/lib/supabase-call-signal";
import { useMobilePeerCall } from "@/lib/use-mobile-peer-call";
import { FolkAvatar } from "@/ui/FolkAvatar";
import { showIslandError } from "@/ui/IslandToast";
import { useTheme } from "@/theme/ThemeContext";
import { spacing, type ThemeColors } from "@/theme/tokens";
import type { RootStackParamList } from "@/navigation/types";

function LivePeerStage({
  callId,
  signalingRoomId,
  userId,
  callerId,
}: {
  callId: string;
  signalingRoomId: string;
  userId: string;
  callerId: string;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const peer = useMobilePeerCall({
    callId,
    signalingRoomId,
    userId,
    peerUserId: callerId,
    isCaller: false,
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

/** Callee — push tap or in-app incoming voice call */
export function IncomingCallScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { user } = useAuth();
  const route = useRoute<RouteProp<RootStackParamList, "IncomingCall">>();
  const { callId } = route.params;

  const [phase, setPhase] = useState<"ringing" | "connecting" | "live">("ringing");
  const [callerName, setCallerName] = useState("음성 통화");
  const [callerImage, setCallerImage] = useState<string | null>(null);
  const [callerId, setCallerId] = useState<string | null>(null);
  const [signalingRoomId, setSignalingRoomId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchMobileCallSync()
      .then((data) => {
        if (cancelled || data.event !== "incoming" || data.call.id !== callId) return;
        const caller = data.call.caller;
        setCallerName(caller.username ? `@${caller.username}` : "음성 통화");
        setCallerImage(caller.image);
        setCallerId(caller.id);
        setSignalingRoomId(data.call.signalingRoomId);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [callId]);

  const decline = useCallback(async () => {
    if (callerId) void publishUserCallEvent(callerId, "declined", callId);
    await declineDmCall(callId).catch(() => undefined);
    navigation.goBack();
  }, [callId, callerId, navigation]);

  const accept = useCallback(async () => {
    setPhase("connecting");
    setError(null);
    try {
      const res = await acceptDmCall(callId);
      const caller = res.call.caller;
      setCallerName(caller.username ? `@${caller.username}` : "음성 통화");
      setCallerImage(caller.image);
      setCallerId(caller.id);
      setSignalingRoomId(res.call.signalingRoomId);
      void publishUserCallEvent(caller.id, "accepted", callId);
      setPhase("live");
    } catch (e) {
      setError(e instanceof Error ? e.message : "통화 연결에 실패했습니다.");
      setPhase("ringing");
    }
  }, [callId]);

  const hangUp = useCallback(async () => {
    if (callerId) void publishUserCallEvent(callerId, "ended", callId);
    await endDmCall(callId).catch(() => undefined);
    navigation.goBack();
  }, [callId, callerId, navigation]);

  if (phase === "ringing") {
    return (
      <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <Text style={styles.label}>수신 음성 통화</Text>
        <FolkAvatar uri={callerImage} name={callerName} size={96} />
        <Text style={styles.name}>{callerName}</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <View style={styles.actions}>
          <Pressable style={[styles.btn, styles.decline]} onPress={() => void decline()}>
            <Ionicons name="close" size={32} color="#fff" />
          </Pressable>
          <Pressable style={[styles.btn, styles.accept]} onPress={() => void accept()}>
            <Ionicons name="call" size={28} color="#fff" />
          </Pressable>
        </View>
      </View>
    );
  }

  if (phase === "connecting" || !user?.id || !callerId || !signalingRoomId) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.terracotta} />
        <Text style={styles.stageHintDark}>연결 중…</Text>
      </View>
    );
  }

  return (
    <View style={styles.liveRoot}>
      <LivePeerStage
        callId={callId}
        signalingRoomId={signalingRoomId}
        userId={user.id}
        callerId={callerId}
      />
      <View style={[styles.liveBar, { paddingBottom: insets.bottom + spacing.md }]}>
        <Text style={styles.liveName}>{callerName}</Text>
        <Pressable style={[styles.btn, styles.decline]} onPress={() => void hangUp()}>
          <Ionicons
            name="call"
            size={28}
            color="#fff"
            style={{ transform: [{ rotate: "135deg" }] }}
          />
        </Pressable>
      </View>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.background,
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.lg,
      paddingHorizontal: spacing.lg,
    },
    label: { fontSize: 14, color: colors.textMuted, fontWeight: "600" },
    name: { fontSize: 22, fontWeight: "800", color: colors.text },
    error: { color: colors.danger, textAlign: "center" },
    actions: { flexDirection: "row", gap: 48, marginTop: spacing.xl },
    btn: {
      width: 72,
      height: 72,
      borderRadius: 36,
      alignItems: "center",
      justifyContent: "center",
    },
    accept: { backgroundColor: "#22c55e" },
    decline: { backgroundColor: "#ef4444" },
    liveRoot: { flex: 1, backgroundColor: "#0B1220" },
    audioStage: { flex: 1, alignItems: "center", justifyContent: "center" },
    hiddenAudio: { width: 1, height: 1, opacity: 0, position: "absolute" },
    stageHint: { color: "#fff", opacity: 0.8, marginTop: spacing.md },
    stageHintDark: { color: colors.textMuted, marginTop: spacing.md },
    micBtn: {
      marginTop: 28,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: "rgba(255,255,255,0.16)",
      alignItems: "center",
      justifyContent: "center",
    },
    liveBar: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      alignItems: "center",
      gap: spacing.md,
      paddingTop: spacing.md,
      backgroundColor: "rgba(0,0,0,0.55)",
    },
    liveName: { color: "#fff", fontSize: 18, fontWeight: "700" },
  });
}
