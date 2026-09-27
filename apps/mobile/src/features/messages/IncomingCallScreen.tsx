import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { acceptDmCall, declineDmCall, endDmCall, fetchMobileCallSync } from "@/api/calls";
import { useAuth } from "@/auth/AuthContext";
import { publishUserCallEvent, subscribeUserCallEvents } from "@/lib/supabase-call-signal";
import { useMobileCallSession } from "@/features/messages/MobileCallSession";
import { FolkAvatar } from "@/ui/FolkAvatar";
import { useTheme } from "@/theme/ThemeContext";
import { spacing, type ThemeColors } from "@/theme/tokens";
import type { RootStackParamList } from "@/navigation/types";

/** Callee — push tap or in-app incoming voice call */
export function IncomingCallScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { user } = useAuth();
  const session = useMobileCallSession();
  const route = useRoute<RouteProp<RootStackParamList, "IncomingCall">>();
  const { callId } = route.params;
  const resumed = session.live?.callId === callId ? session.live : null;

  const [phase, setPhase] = useState<"ringing" | "connecting" | "live">(resumed ? "live" : "ringing");
  const [callerName, setCallerName] = useState(resumed?.displayName ?? "음성 통화");
  const [callerImage, setCallerImage] = useState<string | null>(resumed?.displayImage ?? null);
  const [callerId, setCallerId] = useState<string | null>(resumed?.peerUserId ?? null);
  const [signalingRoomId, setSignalingRoomId] = useState<string | null>(resumed?.signalingRoomId ?? null);
  const [error, setError] = useState<string | null>(null);
  const closedRef = useRef(false);
  const hadLiveRef = useRef(false);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  const closeFromRemote = useCallback(() => {
    if (closedRef.current) return;
    closedRef.current = true;
    if (phaseRef.current === "live") session.end();
    else void endDmCall(callId).catch(() => undefined);
    if (navigation.isFocused()) navigation.goBack();
  }, [callId, navigation, session]);

  useEffect(() => {
    const unsubRemove = navigation.addListener("beforeRemove", () => {
      if (closedRef.current) return;
      if (phaseRef.current === "live") {
        session.collapse();
        return;
      }
      if (phaseRef.current === "ringing" || phaseRef.current === "connecting") {
        void endDmCall(callId).catch(() => undefined);
        if (callerId) void publishUserCallEvent(callerId, "declined", callId);
      }
    });
    const unsubBlur = navigation.addListener("blur", () => {
      if (closedRef.current) return;
      if (phaseRef.current === "live") session.collapse();
    });
    const unsubFocus = navigation.addListener("focus", () => {
      if (phaseRef.current === "live" && session.live) session.show();
    });
    return () => {
      unsubRemove();
      unsubBlur();
      unsubFocus();
    };
  }, [callId, callerId, navigation, session]);

  useEffect(() => {
    if (session.live) {
      hadLiveRef.current = true;
      return;
    }
    if (!hadLiveRef.current || phaseRef.current !== "live" || closedRef.current) return;
    if (!navigation.isFocused()) return;
    closedRef.current = true;
    navigation.goBack();
  }, [navigation, session.live]);

  useEffect(() => {
    if (!user?.id) return;
    const unsub = subscribeUserCallEvents(user.id, (event, id) => {
      if (id !== callId) return;
      if (event === "ended" || event === "declined") closeFromRemote();
    });
    const timer = setInterval(() => {
      void fetchMobileCallSync()
        .then((data) => {
          if ((data.event === "ended" || data.event === "declined") && data.callId === callId) {
            closeFromRemote();
          }
        })
        .catch(() => undefined);
    }, 1500);
    return () => {
      unsub();
      clearInterval(timer);
    };
  }, [callId, closeFromRemote, user?.id]);

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
    if (closedRef.current) return;
    closedRef.current = true;
    await declineDmCall(callId).catch(() => undefined);
    if (callerId) void publishUserCallEvent(callerId, "declined", callId);
    navigation.goBack();
  }, [callId, callerId, navigation]);

  const accept = useCallback(async () => {
    setPhase("connecting");
    setError(null);
    try {
      const res = await acceptDmCall(callId);
      if (closedRef.current) {
        void endDmCall(callId).catch(() => undefined);
        return;
      }
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

  useEffect(() => {
    if (phase !== "live" || !user?.id || !callerId || !signalingRoomId) return;
    session.attach({
      callId,
      signalingRoomId,
      peerUserId: callerId,
      isCaller: false,
      displayName: callerName,
      displayImage: callerImage,
      resumeName: "IncomingCall",
      resumeParams: { callId },
    });
  }, [callId, callerId, callerImage, callerName, phase, session, signalingRoomId, user?.id]);

  const hangUp = useCallback(async () => {
    if (closedRef.current) return;
    closedRef.current = true;
    if (phase === "live") {
      session.end();
      navigation.goBack();
      return;
    }
    await endDmCall(callId).catch(() => undefined);
    if (callerId) void publishUserCallEvent(callerId, "ended", callId);
    navigation.goBack();
  }, [callId, callerId, navigation, phase, session]);

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
      <View style={styles.audioStage}>
        <Text style={styles.stageHint}>
          {session.peer.state === "connected" ? "음성 통화 중" : "음성 연결 중…"}
        </Text>
        <Pressable
          style={styles.micBtn}
          onPress={() => session.peer.setMic(!session.peer.micEnabled)}
          accessibilityLabel={session.peer.micEnabled ? "마이크 끄기" : "마이크 켜기"}
        >
          <Ionicons name={session.peer.micEnabled ? "mic" : "mic-off"} size={26} color="#fff" />
        </Pressable>
      </View>
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
