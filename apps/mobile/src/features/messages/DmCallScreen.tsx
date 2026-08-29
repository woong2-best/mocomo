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
import { ApiError } from "@/api/client";
import { endDmCall, initiateDmCall } from "@/api/calls";
import { joinCallBooking } from "@/api/call-bookings";
import { emitCallInvite, getCallSocket } from "@/lib/call-socket";
import { useMobilePeerCall } from "@/lib/use-mobile-peer-call";
import { FolkAvatar } from "@/ui/FolkAvatar";
import { useTheme } from "@/theme/ThemeContext";
import { spacing, type ThemeColors } from "@/theme/tokens";
import type { RootStackParamList } from "@/navigation/types";

function PeerCallStage({
  callId,
  peerUserId,
  isCaller,
  video,
  socket,
}: {
  callId: string;
  peerUserId: string;
  isCaller: boolean;
  video: boolean;
  socket: Socket;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const peer = useMobilePeerCall({
    callId,
    peerUserId,
    isCaller,
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
      <Text style={styles.stageHint}>
        {video ? "상대 영상을 기다리는 중…" : "음성 연결 중…"}
      </Text>
    </View>
  );
}

export function DmCallScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RootStackParamList, "DmCall">>();
  const { roomId, calleeId, callType, displayName, displayImage, bookingId } = route.params;
  const isVideo = callType === "VIDEO";

  const [status, setStatus] = useState<"connecting" | "live" | "error">("connecting");
  const [error, setError] = useState<string | null>(null);
  const [callId, setCallId] = useState<string | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const sock = await getCallSocket();
        if (cancelled) return;
        if (!sock) {
          setError("실시간 서버에 연결할 수 없습니다.");
          setStatus("error");
          return;
        }
        setSocket(sock);

        const res = bookingId
          ? await joinCallBooking(bookingId)
          : await initiateDmCall({
              calleeId,
              chatRoomId: roomId,
              callType,
            });
        if (cancelled) {
          void endDmCall(res.call.id).catch(() => undefined);
          return;
        }
        setCallId(res.call.id);
        emitCallInvite(sock, res.call);
        setStatus("live");
      } catch (e) {
        if (cancelled) return;
        const msg =
          e instanceof ApiError &&
          e.body &&
          typeof e.body === "object" &&
          "error" in e.body
            ? String((e.body as { error: string }).error)
            : e instanceof Error
              ? e.message
              : "통화를 시작하지 못했습니다.";
        setError(msg);
        setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [bookingId, calleeId, callType, roomId]);

  const hangUp = useCallback(async () => {
    if (callId) {
      try {
        await endDmCall(callId);
      } catch {
        /* ignore */
      }
    }
    socket?.disconnect();
    navigation.goBack();
  }, [callId, navigation, socket]);

  if (status === "error") {
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

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {status === "connecting" || !callId || !socket ? (
        <View style={styles.center}>
          <FolkAvatar uri={displayImage} name={displayName} size={96} />
          <Text style={styles.name}>{displayName}</Text>
          <Text style={styles.sub}>{isVideo ? "영상 연결 중…" : "전화 거는 중…"}</Text>
          <ActivityIndicator color="#fff" style={{ marginTop: 20 }} />
        </View>
      ) : (
        <View style={styles.room}>
          <PeerCallStage
            callId={callId}
            peerUserId={calleeId}
            isCaller
            video={isVideo}
            socket={socket}
          />
          <View style={[styles.overlayTop, { paddingTop: insets.top + 12 }]}>
            <FolkAvatar uri={displayImage} name={displayName} size={44} />
            <Text style={styles.name}>{displayName}</Text>
            <Text style={styles.sub}>{isVideo ? "영상 통화" : "음성 통화"}</Text>
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
    fullVideo: { flex: 1, width: "100%" },
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
