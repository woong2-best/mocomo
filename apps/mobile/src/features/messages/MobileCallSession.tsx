import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { RTCView } from "@livekit/react-native-webrtc";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { endDmCall, fetchMobileCallSync } from "@/api/calls";
import { useAuth } from "@/auth/AuthContext";
import { getAccessToken } from "@/auth/token-store";
import { API_BASE_URL } from "@/config/env";
import { publishUserCallEvent } from "@/lib/supabase-call-signal";
import { useMobilePeerCall } from "@/lib/use-mobile-peer-call";
import { startCallForeground, stopCallForeground } from "mocomo-call-audio";
import { navigationRef } from "@/navigation/navigationRef";
import type { RootStackParamList } from "@/navigation/types";

export type LiveCall = {
  callId: string;
  signalingRoomId: string;
  peerUserId: string;
  isCaller: boolean;
  displayName: string;
  displayImage: string | null;
  resumeName: "DmCall" | "IncomingCall";
  resumeParams: RootStackParamList["DmCall"] | RootStackParamList["IncomingCall"];
};

type SessionValue = {
  live: LiveCall | null;
  collapsed: boolean;
  peer: ReturnType<typeof useMobilePeerCall>;
  attach: (call: LiveCall) => void;
  collapse: () => void;
  show: () => void;
  expand: () => void;
  end: () => void;
};

const MobileCallSessionContext = createContext<SessionValue | null>(null);

export function useMobileCallSession(): SessionValue {
  const ctx = useContext(MobileCallSessionContext);
  if (!ctx) throw new Error("useMobileCallSession must be used within MobileCallSessionProvider");
  return ctx;
}

export function MobileCallSessionProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [live, setLive] = useState<LiveCall | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const liveRef = useRef<LiveCall | null>(null);
  const hangupRef = useRef<() => void>(() => undefined);

  const clearLocal = useCallback(() => {
    liveRef.current = null;
    setLive(null);
    setCollapsed(false);
    stopCallForeground();
  }, []);

  const end = useCallback(() => {
    const current = liveRef.current;
    if (!current) return;
    hangupRef.current();
    clearLocal();
    void publishUserCallEvent(current.peerUserId, "ended", current.callId);
    void endDmCall(current.callId).catch(() => undefined);
  }, [clearLocal]);

  const peer = useMobilePeerCall({
    callId: live?.callId ?? "",
    signalingRoomId: live?.signalingRoomId ?? "",
    userId: user?.id ?? "",
    peerUserId: live?.peerUserId ?? "",
    isCaller: live?.isCaller ?? false,
    enabled: Boolean(live && user?.id),
    onRemoteHangup: () => {
      const current = liveRef.current;
      clearLocal();
      if (current) void endDmCall(current.callId).catch(() => undefined);
    },
    onConnectionLost: () => {
      const current = liveRef.current;
      if (!current) return;
      hangupRef.current();
      clearLocal();
      void publishUserCallEvent(current.peerUserId, "ended", current.callId);
      void endDmCall(current.callId).catch(() => undefined);
    },
  });
  hangupRef.current = peer.hangup;

  const attach = useCallback((call: LiveCall) => {
    setLive((prev) => {
      if (prev?.callId === call.callId) {
        liveRef.current = prev;
        return prev;
      }
      liveRef.current = call;
      setCollapsed(false);
      return call;
    });
  }, []);

  const collapse = useCallback(() => {
    if (!liveRef.current) return;
    setCollapsed(true);
  }, []);

  const show = useCallback(() => {
    if (!liveRef.current) return;
    setCollapsed(false);
  }, []);

  const expand = useCallback(() => {
    const current = liveRef.current;
    if (!current) return;
    setCollapsed(false);
    if (!navigationRef.isReady()) return;
    if (current.resumeName === "DmCall") {
      navigationRef.navigate("DmCall", current.resumeParams as RootStackParamList["DmCall"]);
    } else {
      navigationRef.navigate("IncomingCall", current.resumeParams as RootStackParamList["IncomingCall"]);
    }
  }, []);

  useEffect(() => {
    if (!live) return;
    const callId = live.callId;
    const timer = setInterval(() => {
      void fetchMobileCallSync()
        .then((data) => {
          if (liveRef.current?.callId !== callId) return;
          if ((data.event === "ended" || data.event === "declined") && data.callId === callId) {
            clearLocal();
          }
        })
        .catch(() => undefined);
    }, 1500);
    return () => clearInterval(timer);
  }, [clearLocal, live]);

  useEffect(() => {
    if (!live) return;
    let cancelled = false;
    void (async () => {
      const token = await getAccessToken();
      if (cancelled || !token) return;
      const endUrl = `${API_BASE_URL}/api/mobile/calls/${live.callId}/end`;
      startCallForeground(endUrl, token);
    })();
    return () => {
      cancelled = true;
    };
  }, [live]);

  const value = useMemo<SessionValue>(
    () => ({ live, collapsed, peer, attach, collapse, show, expand, end }),
    [live, collapsed, peer, attach, collapse, show, expand, end]
  );

  return (
    <MobileCallSessionContext.Provider value={value}>
      <View style={styles.host}>
      {children}
      {live && peer.remoteStream ? (
        <RTCView
          streamURL={peer.remoteStream.toURL()}
          style={styles.hiddenAudio}
          objectFit="cover"
          pointerEvents="none"
        />
      ) : null}
      {live && collapsed ? (
        <View style={[styles.bar, { bottom: Math.max(insets.bottom, 12) + 64 }]}>
          <Pressable style={styles.barMain} onPress={expand} accessibilityLabel="통화 화면 열기">
            <View style={styles.dot} />
            <Text style={styles.barName} numberOfLines={1}>
              {live.displayName}
            </Text>
            <Text style={styles.barSub}>통화 중</Text>
          </Pressable>
          <Pressable style={styles.hangup} onPress={end} accessibilityLabel="통화 종료">
            <Ionicons name="call" size={18} color="#fff" style={{ transform: [{ rotate: "135deg" }] }} />
          </Pressable>
        </View>
      ) : null}
      </View>
    </MobileCallSessionContext.Provider>
  );
}

const styles = StyleSheet.create({
  host: { flex: 1 },
  hiddenAudio: { position: "absolute", width: 1, height: 1, opacity: 0.01 },
  bar: {
    position: "absolute",
    left: 12,
    right: 12,
    zIndex: 40,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingLeft: 14,
    paddingRight: 6,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(11,18,32,0.96)",
  },
  barMain: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#34d399" },
  barName: { flexShrink: 1, color: "#fff", fontWeight: "700" },
  barSub: { color: "rgba(255,255,255,0.65)", fontSize: 12, fontWeight: "600" },
  hangup: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#e11d48",
    alignItems: "center",
    justifyContent: "center",
  },
});
