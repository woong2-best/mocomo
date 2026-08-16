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
import {
  AudioSession,
  LiveKitRoom,
  VideoTrack,
  useTracks,
  isTrackReference,
} from "@livekit/react-native";
import { Track } from "livekit-client";
import { acceptDmCall, declineDmCall } from "@/api/calls";
import { ensureLiveKitGlobals } from "@/native/livekit-bootstrap";
import { FolkAvatar } from "@/ui/FolkAvatar";
import { useTheme } from "@/theme/ThemeContext";
import { spacing, type ThemeColors } from "@/theme/tokens";
import type { RootStackParamList } from "@/navigation/types";

function CallTracks({ video }: { video: boolean }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const tracks = useTracks(
    video ? [Track.Source.Camera, Track.Source.Microphone] : [Track.Source.Microphone],
    { onlySubscribed: false }
  );
  const remoteVideo = tracks.find(
    (t) => isTrackReference(t) && t.source === Track.Source.Camera && !t.participant.isLocal
  );

  if (video && remoteVideo && isTrackReference(remoteVideo)) {
    return <VideoTrack trackRef={remoteVideo} style={styles.fullVideo} objectFit="cover" />;
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
  const [callType, setCallType] = useState<"AUDIO" | "VIDEO">("AUDIO");
  const [token, setToken] = useState<string | null>(null);
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const decline = useCallback(async () => {
    await declineDmCall(callId).catch(() => undefined);
    navigation.goBack();
  }, [callId, navigation]);

  const accept = useCallback(async () => {
    setPhase("connecting");
    setError(null);
    try {
      await ensureLiveKitGlobals();
      const res = await acceptDmCall(callId);
      const caller = res.call.caller;
      setCallerName(caller.username ? `@${caller.username}` : "통화");
      setCallerImage(caller.image);
      setCallType(res.call.callType);
      setToken(res.livekit.token);
      setServerUrl(res.livekit.serverUrl);
      setPhase("live");
    } catch (e) {
      setError(e instanceof Error ? e.message : "통화 연결에 실패했습니다.");
      setPhase("ringing");
    }
  }, [callId]);

  useEffect(() => {
    void ensureLiveKitGlobals();
  }, []);

  useEffect(() => {
    if (phase !== "live" || !token || !serverUrl) return;
    void AudioSession.startAudioSession();
    return () => {
      void AudioSession.stopAudioSession();
    };
  }, [phase, token, serverUrl]);

  const hangUp = useCallback(async () => {
    await declineDmCall(callId).catch(() => undefined);
    navigation.goBack();
  }, [callId, navigation]);

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

  if (phase === "connecting" || !token || !serverUrl) {
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
      <LiveKitRoom
        token={token}
        serverUrl={serverUrl}
        connect
        audio
        video={isVideo}
        onDisconnected={() => {
          Alert.alert("통화 종료", "연결이 끊어졌습니다.");
          navigation.goBack();
        }}
      >
        <CallTracks video={isVideo} />
      </LiveKitRoom>
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
