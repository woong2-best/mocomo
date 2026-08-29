import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { RTCView } from "@livekit/react-native-webrtc";
import type { Socket } from "socket.io-client";
import { acceptDmCall, declineDmCall } from "@/api/calls";
import { emitCallAccept, getCallSocket } from "@/lib/call-socket";
import { useMobilePeerCall } from "@/lib/use-mobile-peer-call";
import { FolkAvatar } from "@/ui/FolkAvatar";
import { useTheme } from "@/theme/ThemeContext";
import { spacing, type ThemeColors } from "@/theme/tokens";
import type { RootStackParamList } from "@/navigation/types";

function LivePeerStage({
  callId,
  callerId,
  video,
  socket,
}: {
  callId: string;
  callerId: string;
  video: boolean;
  socket: Socket;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const peer = useMobilePeerCall({
    callId,
    peerUserId: callerId,
    isCaller: false,
    video,
    enabled: true,
    socket,
    onFailed: (msg) => Alert.alert("연결 오류", msg),
  });

  if (video && peer.remoteStream) {
    return (
      <RTCView
        streamURL={peer.remoteStream.toURL()}
        style={styles.fullVideo}
        objectFit="cover"
      />
    );
  }

  return (
    <View style={styles.audioStage}>
      <Text style={styles.stageHint}>{video ? "상대 영상 연결 중…" : "음성 연결 중…"}</Text>
    </View>
  );
}

/** Callee — push tap or in-app incoming call */
export function IncomingCallScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RootStackParamList, "IncomingCall">>();
  const { callId } = route.params;

  const [phase, setPhase] = useState<"ringing" | "connecting" | "live">("ringing");
  const [callerName, setCallerName] = useState("통화");
  const [callerImage, setCallerImage] = useState<string | null>(null);
  const [callerId, setCallerId] = useState<string | null>(null);
  const [callType, setCallType] = useState<"AUDIO" | "VIDEO">("AUDIO");
  const [socket, setSocket] = useState<Socket | null>(null);
  const [error, setError] = useState<string | null>(null);

  const decline = useCallback(async () => {
    await declineDmCall(callId).catch(() => undefined);
    socket?.disconnect();
    navigation.goBack();
  }, [callId, navigation, socket]);

  const accept = useCallback(async () => {
    setPhase("connecting");
    setError(null);
    try {
      const sock = await getCallSocket();
      if (!sock) {
        setError("실시간 서버에 연결할 수 없습니다.");
        setPhase("ringing");
        return;
      }
      setSocket(sock);

      const res = await acceptDmCall(callId);
      const caller = res.call.caller;
      setCallerName(caller.username ? `@${caller.username}` : "통화");
      setCallerImage(caller.image);
      setCallerId(caller.id);
      setCallType(res.call.callType);
      emitCallAccept(sock, callId, caller.id, res.call.callee.id);
      setPhase("live");
    } catch (e) {
      setError(e instanceof Error ? e.message : "통화 연결에 실패했습니다.");
      setPhase("ringing");
    }
  }, [callId]);

  const hangUp = useCallback(async () => {
    await declineDmCall(callId).catch(() => undefined);
    socket?.disconnect();
    navigation.goBack();
  }, [callId, navigation, socket]);

  if (phase === "ringing") {
    return (
      <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <Text style={styles.label}>수신 통화</Text>
        <FolkAvatar uri={callerImage} size={96} />
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

  if (phase === "connecting" || !socket || !callerId) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.terracotta} />
        <Text style={styles.stageHintDark}>연결 중…</Text>
      </View>
    );
  }

  const isVideo = callType === "VIDEO";

  return (
    <View style={styles.liveRoot}>
      <LivePeerStage callId={callId} callerId={callerId} video={isVideo} socket={socket} />
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
    liveRoot: { flex: 1, backgroundColor: "#000" },
    fullVideo: { ...StyleSheet.absoluteFill },
    audioStage: { flex: 1, alignItems: "center", justifyContent: "center" },
    stageHint: { color: "#fff", opacity: 0.8, marginTop: spacing.md },
    stageHintDark: { color: colors.textMuted, marginTop: spacing.md },
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
