import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ApiError } from "@/api/client";
import { endDmCall, fetchMobileCallSync, initiateDmCall, acceptDmCall, type DmCallPayload } from "@/api/calls";
import { useAuth } from "@/auth/AuthContext";
import { publishUserCallEvent, subscribeUserCallEvents } from "@/lib/supabase-call-signal";
import { useMobileCallSession } from "@/features/messages/MobileCallSession";
import { FolkAvatar } from "@/ui/FolkAvatar";
import { useI18n } from "@/i18n/I18nProvider";
import { useTheme } from "@/theme/ThemeContext";
import { spacing, type ThemeColors } from "@/theme/tokens";
import type { RootStackParamList } from "@/navigation/types";

export function DmCallScreen() {
  const { t } = useI18n();
  const errorMessage = useCallback(
    (e: unknown) => {
      if (e instanceof ApiError && e.body && typeof e.body === "object" && "error" in e.body) {
        return String((e.body as { error: string }).error);
      }
      return e instanceof Error ? e.message : t("m.messages.could_not_start_the_call");
    },
    [t]
  );
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { user } = useAuth();
  const session = useMobileCallSession();
  const route = useRoute<RouteProp<RootStackParamList, "DmCall">>();
  const { roomId, calleeId, displayName, displayImage } = route.params;
  const resumed =
    session.live != null &&
    (session.live.peerUserId === calleeId ||
      (session.live.resumeName === "DmCall" &&
        "calleeId" in session.live.resumeParams &&
        session.live.resumeParams.calleeId === calleeId));

  const [phase, setPhase] = useState<"dialing" | "ringing" | "live" | "error">(
    resumed ? "live" : "dialing"
  );
  const [error, setError] = useState<string | null>(null);
  const [call, setCall] = useState<DmCallPayload | null>(null);
  const closedRef = useRef(false);
  const hadLiveRef = useRef(false);
  const phaseRef = useRef(phase);
  const callRef = useRef(call);
  phaseRef.current = phase;
  callRef.current = call;

  const closeFromRemote = useCallback(() => {
    if (closedRef.current) return;
    closedRef.current = true;
    if (phaseRef.current === "live") session.end();
    else if (call?.id) void endDmCall(call.id).catch(() => undefined);
    if (navigation.isFocused()) navigation.goBack();
  }, [call?.id, navigation, session]);

  useEffect(() => {
    const unsubRemove = navigation.addListener("beforeRemove", () => {
      if (closedRef.current) return;
      if (phaseRef.current === "live") {
        session.collapse();
        return;
      }
      const current = callRef.current;
      if (!current || !user?.id) return;
      const peerId = current.caller.id === user.id ? current.callee.id : current.caller.id;
      void publishUserCallEvent(peerId, "declined", current.id);
      void endDmCall(current.id).catch(() => undefined);
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
  }, [navigation, session, user?.id]);

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
    if (session.live) {
      const same =
        session.live.peerUserId === calleeId ||
        (session.live.resumeName === "DmCall" &&
          "calleeId" in session.live.resumeParams &&
          session.live.resumeParams.calleeId === calleeId);
      if (same) {
        setPhase("live");
        return;
      }
      session.end();
    }
    let cancelled = false;
    void (async () => {
      try {
        const res = await initiateDmCall({
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
  }, [calleeId, roomId, user?.id]);

  useEffect(() => {
    if (!user?.id || !call || (phase !== "ringing" && phase !== "live")) return;
    const callId = call.id;
    const unsub = subscribeUserCallEvents(user.id, (event, id) => {
      if (id !== callId) return;
      if (event === "accepted") setPhase("live");
      if (event === "declined" || event === "ended") closeFromRemote();
    });
    const timer = setInterval(() => {
      void fetchMobileCallSync()
        .then((data) => {
          if (data.event === "active" && data.call.id === callId) setPhase("live");
          if ((data.event === "declined" || data.event === "ended") && data.callId === callId) {
            closeFromRemote();
          }
        })
        .catch(() => undefined);
    }, 1500);
    return () => {
      unsub();
      clearInterval(timer);
    };
  }, [call, phase, user?.id, closeFromRemote]);

  useEffect(() => {
    if (phase !== "live" || !call || !user?.id) return;
    const selfIsCaller = call.caller.id === user.id;
    session.attach({
      callId: call.id,
      signalingRoomId: call.signalingRoomId,
      peerUserId: selfIsCaller ? call.callee.id : call.caller.id,
      isCaller: selfIsCaller,
      displayName,
      displayImage: displayImage ?? null,
      resumeName: "DmCall",
      resumeParams: {
        roomId,
        calleeId,
        callType: "AUDIO",
        displayName,
        displayImage,
      },
    });
  }, [call, calleeId, displayImage, displayName, phase, roomId, session, user?.id]);

  const hangUp = useCallback(async () => {
    if (closedRef.current) return;
    closedRef.current = true;
    if (phase === "live") {
      session.end();
      navigation.goBack();
      return;
    }
    if (call) {
      const peerId = call.caller.id === user?.id ? call.callee.id : call.caller.id;
      const event = "declined";
      try {
        await endDmCall(call.id);
      } catch {
        /* ignore */
      }
      void publishUserCallEvent(peerId, event, call.id);
    }
    navigation.goBack();
  }, [call, navigation, phase, session, user?.id]);

  if (phase === "error") {
    return (
      <View style={[styles.root, { paddingTop: insets.top + 24 }]}>
        <Text style={styles.errorTitle}>{t("m.messages.call_failed")}</Text>
        <Text style={styles.errorBody}>{error}</Text>
        <Pressable style={styles.endBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.endBtnText}>{t("common.close")}</Text>
        </Pressable>
      </View>
    );
  }

  const liveReady = phase === "live" && (call || session.live) && user?.id;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {!liveReady ? (
        <View style={styles.center}>
          <FolkAvatar uri={displayImage} name={displayName} size={96} />
          <Text style={styles.name}>{displayName}</Text>
          <Text style={styles.sub}>
            {phase === "ringing"
              ? t("m.messages.ringing")
              : t("m.messages.connecting")}
          </Text>
          <ActivityIndicator color="#fff" style={{ marginTop: 20 }} />
        </View>
      ) : (
        <View style={styles.room}>
          <View style={styles.audioStage}>
            <Text style={styles.stageHint}>
              {session.peer.state === "failed"
                ? (session.peer.failure ?? t("m.messages.call_failed"))
                : session.peer.state === "connected"
                  ? t("m.messages.on_voice_call")
                  : t("m.messages.connecting_voice")}
            </Text>
            <Pressable
              style={styles.micBtn}
              onPress={() => session.peer.setMic(!session.peer.micEnabled)}
              accessibilityLabel={
                session.peer.micEnabled ? t("m.messages.mute_mic") : t("m.messages.unmute_mic")
              }
            >
              <Ionicons name={session.peer.micEnabled ? "mic" : "mic-off"} size={26} color="#fff" />
            </Pressable>
          </View>
          <View style={[styles.overlayTop, { paddingTop: insets.top + 12 }]}>
            <FolkAvatar uri={displayImage} name={displayName} size={44} />
            <Text style={styles.name}>{displayName}</Text>
            <Text style={styles.sub}>{t("m.messages.voice_call")}</Text>
          </View>
        </View>
      )}

      <View style={[styles.controls, { paddingBottom: Math.max(insets.bottom, 24) }]}>
        <Pressable
          style={styles.hangup}
          onPress={() => void hangUp()}
          accessibilityLabel={t("m.messages.end_call")}
        >
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
