import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { fetchLiveDetail, fetchLiveToken, type LiveToken } from "@/api/live";
import { ApiError } from "@/api/client";
import { useAuth } from "@/auth/AuthContext";
import { ExternalLivePlayer } from "@/features/live/ExternalLivePlayer";
import { LiveAdultWatermark, isLiveAdultItem } from "@/features/live/LiveAdultWatermark";
import { LiveChatPanel } from "@/features/live/LiveChatPanel";
import { LiveKitConnecting, LiveKitViewer } from "@/features/live/LiveKitViewer";
import { IMAGE_CACHE_POLICY } from "@/perf/image";
import { useKeyboardBottomInset } from "@/lib/use-keyboard-inset";
import { useTheme } from "@/theme/ThemeContext";
import { radii, spacing, type ThemeColors } from "@/theme/tokens";
import type { RootStackParamList } from "@/navigation/types";
import { LiveDonationAlertOverlay } from "@/features/live/LiveDonationAlertOverlay";
import { useAdultVerificationGate } from "@/hooks/useAdultVerificationGate";
import { useLivePictureInPicture } from "@/features/live/useLivePictureInPicture";

export function LiveDetailScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const keyboardHeight = useKeyboardBottomInset();
  const keyboardOpen = keyboardHeight > 80;
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, "LiveDetail">>();
  const { user } = useAuth();
  const adultGate = useAdultVerificationGate("LIVE");
  const [watchingFirstParty, setWatchingFirstParty] = useState(false);
  const [creds, setCreds] = useState<LiveToken | null>(null);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [tokenLoading, setTokenLoading] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);

  const query = useQuery({
    queryKey: ["mobile-live", route.params.id],
    queryFn: () => fetchLiveDetail(route.params.id),
    staleTime: 15_000,
    refetchInterval: (q) => (q.state.data?.item?.isLive ? 5_000 : false),
  });
  const item = query.data?.item;

  const onViewerCount = useCallback((n: number) => setViewerCount(n), []);

  const startFirstParty = async () => {
    if (item && !item.isHost && isLiveAdultItem(item)) {
      const ok = await adultGate.ensureAdult();
      if (!ok) return;
    }
    setTokenLoading(true);
    setTokenError(null);
    try {
      const token = await fetchLiveToken(route.params.id);
      setCreds(token);
      setWatchingFirstParty(true);
    } catch (err) {
      const msg =
        err instanceof ApiError &&
        err.body &&
        typeof err.body === "object" &&
        "error" in err.body &&
        typeof (err.body as { error: unknown }).error === "string"
          ? (err.body as { error: string }).error
          : "라이브에 연결하지 못했습니다.";
      setTokenError(msg);
    } finally {
      setTokenLoading(false);
    }
  };

  const adultBlocked =
    !!item &&
    !item.isHost &&
    isLiveAdultItem(item) &&
    (item.accessDeniedReason === "ADULT_VERIFICATION_REQUIRED" || item.canEnter === false);

  useEffect(() => {
    if (!item?.isLive || item.isExternal || watchingFirstParty || creds || tokenLoading) return;
    if (adultBlocked) return;
    void startFirstParty();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.id, item?.isLive, item?.isExternal, adultBlocked]);

  const pipActive =
    !!item?.isLive &&
    !item.isExternal &&
    watchingFirstParty &&
    !!creds &&
    !creds.audioOnly;

  const { inPip } = useLivePictureInPicture(pipActive);

  const ended =
    !!item && (item.liveStatus === "ENDED" || (!item.isLive && !item.isHost));

  if (query.isLoading) {
    return (
      <View style={[styles.root, styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator color="#F5C518" />
      </View>
    );
  }

  if (query.isError || !item) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.topBack}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </Pressable>
        <Text style={styles.error}>라이브를 불러오지 못했습니다.</Text>
      </View>
    );
  }

  if (ended) {
    return (
      <View style={[styles.root, styles.center, { paddingTop: insets.top }]}>
        <Text style={styles.endedTitle}>방송이 종료되었습니다</Text>
        <Text style={styles.endedSub}>다른 라이브 방송을 둘러보세요.</Text>
        <Pressable style={styles.primaryBtn} onPress={() => navigation.navigate("LiveList")}>
          <Text style={styles.primaryBtnText}>라이브 홈</Text>
        </Pressable>
      </View>
    );
  }

  const viewers = viewerCount || item.viewerCount;

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      {/* Player only — title overlays video; no host strip under the frame */}
      <View
        style={[
          styles.playerWrap,
          inPip && styles.playerWrapPip,
          keyboardOpen && !inPip ? styles.playerWrapKeyboard : null,
        ]}
      >
        {!inPip ? (
          <View style={[styles.playerChrome, { paddingTop: insets.top + 6 }]} pointerEvents="box-none">
            <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={styles.chromeBtn}>
              <Ionicons name="chevron-back" size={22} color="#fff" />
            </Pressable>
          </View>
        ) : null}

        <View
          style={[
            styles.playerSurface,
            inPip && styles.playerSurfacePip,
            keyboardOpen && !inPip ? styles.playerSurfaceKeyboard : null,
          ]}
        >
          {item.isLive && item.donationAlertsOnStream && !inPip ? (
            <LiveDonationAlertOverlay
              channelId={item.id}
              streamStartedAt={item.streamStartedAt}
            />
          ) : null}

          {item.isExternal && item.external ? (
            adultBlocked ? (
              <View style={styles.adultGate}>
                {item.thumbnailUrl ? (
                  <Image
                    source={{ uri: item.thumbnailUrl }}
                    style={StyleSheet.absoluteFill}
                    cachePolicy={IMAGE_CACHE_POLICY}
                    transition={0}
                  />
                ) : (
                  <View style={[StyleSheet.absoluteFill, styles.heroFallback]}>
                    <Ionicons name="radio" size={40} color="#F5C518" style={{ opacity: 0.5 }} />
                  </View>
                )}
                <LiveAdultWatermark />
                <View style={styles.adultGateOverlay}>
                  <Text style={styles.adultGateTitle}>19+ 성인 방송</Text>
                  <Text style={styles.adultGateSub}>본인인증된 회원만 시청할 수 있습니다.</Text>
                  <Pressable
                    style={[styles.primaryBtn, adultGate.busy && styles.btnDisabled]}
                    disabled={adultGate.busy}
                    onPress={() =>
                      void adultGate.ensureAdult().then((ok) => {
                        if (ok) void query.refetch();
                      })
                    }
                  >
                    <Text style={styles.primaryBtnText}>성인 본인인증</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <ExternalLivePlayer
                external={item.external}
                title={item.title}
                active
                showChrome={false}
              />
            )
          ) : watchingFirstParty && creds ? (
            <LiveKitViewer
              creds={creds}
              enablePip
              onDisconnected={() => {
                setWatchingFirstParty(false);
                setCreds(null);
              }}
            />
          ) : tokenLoading ? (
            <LiveKitConnecting />
          ) : item.thumbnailUrl ? (
            <View style={styles.heroWrap}>
              <Image
                source={{ uri: item.thumbnailUrl }}
                style={styles.hero}
                cachePolicy={IMAGE_CACHE_POLICY}
                transition={0}
              />
              {isLiveAdultItem(item) ? <LiveAdultWatermark style={styles.hero} /> : null}
              {adultBlocked ? (
                <View style={styles.adultGateOverlay}>
                  <Text style={styles.adultGateTitle}>19+ 성인 방송</Text>
                  <Pressable
                    style={styles.primaryBtn}
                    onPress={() =>
                      void adultGate.ensureAdult().then((ok) => {
                        if (ok) void query.refetch();
                      })
                    }
                  >
                    <Text style={styles.primaryBtnText}>성인 본인인증 후 시청</Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable style={styles.watchOverlay} onPress={() => void startFirstParty()}>
                  <Text style={styles.primaryBtnText}>시청하기</Text>
                </Pressable>
              )}
            </View>
          ) : (
            <View style={[styles.hero, styles.heroFallback]}>
              <Ionicons name="radio" size={40} color="#F5C518" style={{ opacity: 0.5 }} />
            </View>
          )}
        </View>

        {tokenError && !inPip ? <Text style={styles.errorInline}>{tokenError}</Text> : null}
      </View>

      {!inPip ? (
        (item.canEnter !== false || item.isLive) && !adultBlocked ? (
          <LiveChatPanel
            immersive
            channelId={item.id}
            viewerCount={viewers}
            onViewerCount={onViewerCount}
            isHost={item.isHost}
            paymentsEnabled={item.paymentsEnabled}
            hostDisplayName={item.host.name || item.host.username}
            hostUserId={item.host.id}
            hostUsername={item.host.username}
            pinnedMessage={item.pinnedMessage}
            currentUserId={user?.id}
            streamStartedAt={item.streamStartedAt}
          />
        ) : (
          <View style={styles.chatPlaceholder}>
            <Text style={styles.endedSub}>채팅에 참여할 수 없습니다.</Text>
          </View>
        )
      ) : null}
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: "#0b0b0d" },
    center: { alignItems: "center", justifyContent: "center", gap: 10, padding: spacing.lg },
    topBack: { padding: spacing.md },
    playerWrap: {
      backgroundColor: "#000",
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: "#1f1f24",
    },
    playerWrapPip: { flex: 1, borderBottomWidth: 0 },
    playerWrapKeyboard: { borderBottomWidth: 0 },
    playerChrome: {
      position: "absolute",
      top: 0,
      left: 0,
      zIndex: 5,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 8,
      paddingBottom: 6,
    },
    chromeBtn: {
      padding: 6,
      borderRadius: 18,
      backgroundColor: "rgba(0,0,0,0.4)",
    },
    playerSurface: {
      width: "100%",
      aspectRatio: 16 / 9,
      backgroundColor: "#000",
      overflow: "hidden",
    },
    playerSurfacePip: {
      flex: 1,
      aspectRatio: undefined,
      width: "100%",
      height: "100%",
    },
    playerSurfaceKeyboard: {
      aspectRatio: 2.4,
    },
    firstPartyFill: { flex: 1, backgroundColor: "#000" },
    hero: { width: "100%", height: "100%", backgroundColor: "#111" },
    heroWrap: { width: "100%", height: "100%", overflow: "hidden", backgroundColor: "#111" },
    heroFallback: { alignItems: "center", justifyContent: "center" },
    adultGate: { width: "100%", height: "100%", overflow: "hidden", backgroundColor: "#000" },
    adultGateOverlay: {
      ...StyleSheet.absoluteFill,
      alignItems: "center",
      justifyContent: "center",
      padding: spacing.md,
      backgroundColor: "rgba(0,0,0,0.55)",
      gap: 8,
    },
    adultGateTitle: { color: "#fff", fontSize: 18, fontWeight: "900" },
    adultGateSub: {
      color: "rgba(255,255,255,0.85)",
      fontSize: 13,
      fontWeight: "600",
      textAlign: "center",
    },
    watchOverlay: {
      ...StyleSheet.absoluteFill,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(0,0,0,0.4)",
    },
    primaryBtn: {
      backgroundColor: colors.terracotta,
      borderRadius: radii.md,
      paddingVertical: 12,
      paddingHorizontal: 18,
      alignItems: "center",
    },
    primaryBtnText: { color: "#fff", fontWeight: "800" },
    btnDisabled: { opacity: 0.5 },
    endedTitle: { fontSize: 18, fontWeight: "900", color: "#f3f4f6" },
    endedSub: { color: "#9ca3af", fontWeight: "600" },
    error: { color: "#f87171", padding: spacing.lg },
    errorInline: {
      color: "#f87171",
      fontWeight: "600",
      fontSize: 12,
      paddingHorizontal: 12,
      paddingBottom: 6,
    },
    chatPlaceholder: { flex: 1, alignItems: "center", justifyContent: "center" },
  });
}
