import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  BackHandler,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
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
import { useTheme } from "@/theme/ThemeContext";
import { radii, spacing, type ThemeColors } from "@/theme/tokens";
import type { RootStackParamList } from "@/navigation/types";
import { LiveDonationAlertOverlay } from "@/features/live/LiveDonationAlertOverlay";
import { useAdultVerificationGate } from "@/hooks/useAdultVerificationGate";
import { useLivePictureInPicture } from "@/features/live/useLivePictureInPicture";
import { useI18n } from "@/i18n/I18nProvider";
import { liveUi } from "@/features/live/live-ui";
import { useUserProfileNav } from "@/features/profile/user-profile-nav";

export function LiveDetailScreen() {
  const { t } = useI18n();
  const copy = useMemo(() => liveUi(t), [t]);
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const landscape = windowWidth > windowHeight;
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { open: openUserProfile, prefetch: prefetchUserProfile } = useUserProfileNav();
  const route = useRoute<RouteProp<RootStackParamList, "LiveDetail">>();
  const { user } = useAuth();
  const adultGate = useAdultVerificationGate("LIVE");
  const [watchingFirstParty, setWatchingFirstParty] = useState(false);
  const [creds, setCreds] = useState<LiveToken | null>(null);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [tokenLoading, setTokenLoading] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);
  const [chatOpen, setChatOpen] = useState(true);
  const [landscapeChrome, setLandscapeChrome] = useState(false);
  const [embedChrome, setEmbedChrome] = useState(false);
  const [embedBlocked, setEmbedBlocked] = useState(false);
  const [paused, setPaused] = useState(false);
  const [stageSize, setStageSize] = useState({ w: 0, h: 0 });
  const wasLandscape = useRef(false);
  const forcedLandscape = useRef(false);

  const query = useQuery({
    queryKey: ["mobile-live", route.params.id],
    queryFn: () => fetchLiveDetail(route.params.id),
    staleTime: 15_000,
    refetchInterval: (q) => (q.state.data?.item?.isLive ? 5_000 : false),
  });
  const item = query.data?.item;

  const onViewerCount = useCallback((n: number) => setViewerCount(n), []);
  const markEmbedBlocked = useCallback(() => setEmbedBlocked(true), []);

  useEffect(() => {
    setEmbedBlocked(false);
    setEmbedChrome(false);
  }, [route.params.id]);

  useLayoutEffect(() => {
    // Portrait + both landscapes. Never upside-down (360° invert).
    navigation.setOptions({ orientation: "default" });
    return () => {
      navigation.setOptions({ orientation: "portrait" });
    };
  }, [navigation]);

  const enterLandscape = useCallback(() => {
    setChatOpen(false);
    setLandscapeChrome(false);
    setEmbedChrome(false);
    forcedLandscape.current = true;
    navigation.setOptions({ orientation: "landscape" });
  }, [navigation]);

  const exitLandscape = useCallback(() => {
    forcedLandscape.current = false;
    navigation.setOptions({ orientation: "default" });
  }, [navigation]);

  useEffect(() => {
    if (!landscape) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (forcedLandscape.current) {
        exitLandscape();
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [exitLandscape, landscape]);

  useEffect(() => {
    if (landscape && !wasLandscape.current) {
      setChatOpen(false);
      setLandscapeChrome(false);
      setEmbedChrome(false);
    }
    if (!landscape) {
      if (!item?.isExternal) setPaused(false);
      setLandscapeChrome(false);
      setEmbedChrome(false);
      setStageSize({ w: 0, h: 0 });
    }
    wasLandscape.current = landscape;
  }, [landscape, item?.isExternal]);

  useEffect(() => {
    if (!landscape || !landscapeChrome) return;
    const id = setTimeout(() => setLandscapeChrome(false), 4000);
    return () => clearTimeout(id);
  }, [landscape, landscapeChrome, paused, chatOpen]);

  useEffect(() => {
    if (!embedChrome || paused) return;
    const id = setTimeout(() => setEmbedChrome(false), 4000);
    return () => clearTimeout(id);
  }, [embedChrome, paused]);

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
          : copy.connectError;
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
        <Text style={styles.error}>{copy.loadHubError}</Text>
      </View>
    );
  }

  if (ended) {
    return (
      <View style={[styles.root, styles.center, { paddingTop: insets.top }]}>
        <Text style={styles.endedTitle}>{copy.streamEnded}</Text>
        <Text style={styles.endedSub}>{copy.browseOther}</Text>
        <Pressable style={styles.primaryBtn} onPress={() => navigation.navigate("LiveList")}>
          <Text style={styles.primaryBtnText}>{copy.liveHome}</Text>
        </Pressable>
      </View>
    );
  }

  const viewers = viewerCount || item.viewerCount;
  const canChat = (item.canEnter !== false || item.isLive) && !adultBlocked;
  const showChat = !inPip && canChat;
  const chatWidth = Math.min(360, Math.max(260, Math.round(windowWidth * 0.36)));
  const landscapePlayer =
    landscape &&
    !inPip &&
    ((!!item.isExternal && !!item.external && !adultBlocked) || (watchingFirstParty && !!creds));
  const embedControls =
    !!item.isExternal && !!item.external && !adultBlocked && !inPip && !embedBlocked;
  const fittedFrame = (() => {
    const w = stageSize.w;
    const h = stageSize.h;
    if (w <= 0 || h <= 0) return null;
    if (w / h > 16 / 9) {
      const height = h;
      return { width: height * (16 / 9), height };
    }
    const width = w;
    return { width, height: width * (9 / 16) };
  })();

  return (
    <View style={[styles.root, landscape && !inPip ? styles.rootLandscape : null]}>
      <StatusBar style="light" hidden={landscape && !inPip} />
      {!inPip && !landscape ? <View style={[styles.statusShield, { height: insets.top }]} /> : null}
      <View
        style={[
          styles.playerWrap,
          inPip && styles.playerWrapPip,
          landscape && !inPip ? styles.playerWrapLandscape : null,
        ]}
      >
        {!inPip && !landscape && !embedControls ? (
          <View style={[styles.playerChrome, styles.portraitChrome]} pointerEvents="box-none">
            <Pressable
              onPress={() => navigation.goBack()}
              hitSlop={12}
              style={styles.portraitIconBtn}
              accessibilityRole="button"
              accessibilityLabel={copy.back}
            >
              <Ionicons name="chevron-back" size={30} color="#fff" />
            </Pressable>
            <View style={styles.chromeRight} pointerEvents="box-none">
              <Pressable
                onPressIn={() =>
                  prefetchUserProfile({
                    username: item.host.username,
                    name: item.host.name,
                    image: item.host.image,
                  })
                }
                onPress={() =>
                  openUserProfile({
                    username: item.host.username,
                    name: item.host.name,
                    image: item.host.image,
                  })
                }
                hitSlop={8}
                style={styles.profileBtn}
                accessibilityRole="button"
                accessibilityLabel={copy.profile}
              >
                <Ionicons name="person" size={18} color="#f3f4f6" />
              </Pressable>
              <Pressable
                onPress={enterLandscape}
                hitSlop={8}
                style={styles.portraitIconBtn}
                accessibilityRole="button"
                accessibilityLabel={copy.expandVideo}
              >
                <Ionicons name="expand" size={24} color="#fff" />
              </Pressable>
            </View>
          </View>
        ) : null}

        {!inPip && landscape && landscapeChrome && landscapePlayer && !item.isExternal ? (
          <View style={styles.landscapeOverlay} pointerEvents="box-none">
            <View
              style={[
                styles.playerChrome,
                {
                  paddingTop: 8,
                  paddingLeft: Math.max(insets.left, 8),
                  paddingRight: Math.max(insets.right, 8),
                },
              ]}
              pointerEvents="box-none"
            >
              <Pressable
                onPress={exitLandscape}
                hitSlop={12}
                style={styles.chromeBtn}
                accessibilityRole="button"
                accessibilityLabel={copy.exitLandscape}
              >
                <Ionicons name="chevron-back" size={22} color="#fff" />
              </Pressable>
              <View style={styles.chromeRight} pointerEvents="box-none">
                <Pressable
                  onPress={() => setChatOpen((v) => !v)}
                  hitSlop={8}
                  style={[styles.chromeBtn, chatOpen && styles.chromeBtnOn]}
                  accessibilityRole="button"
                  accessibilityLabel={chatOpen ? copy.hideChat : copy.showChat}
                >
                  <Ionicons name="chatbubble-ellipses" size={18} color="#fff" />
                </Pressable>
                <Pressable
                  onPress={exitLandscape}
                  hitSlop={8}
                  style={styles.chromeBtn}
                  accessibilityRole="button"
                  accessibilityLabel={copy.exitLandscape}
                >
                  <Ionicons name="contract" size={18} color="#fff" />
                </Pressable>
              </View>
            </View>
            <View style={styles.pauseSlot} pointerEvents="box-none">
              <Pressable
                style={styles.pauseBtn}
                onPress={() => setPaused((v) => !v)}
                accessibilityRole="button"
                accessibilityLabel={paused ? copy.play : copy.pause}
              >
                <Ionicons name={paused ? "play" : "pause"} size={34} color="#fff" />
              </Pressable>
            </View>
          </View>
        ) : null}

        <View
          style={[
            landscape && !inPip ? styles.playerStageLandscape : styles.playerSurface,
            inPip && styles.playerSurfacePip,
          ]}
          onLayout={
            landscape && !inPip
              ? (event) => {
                  const { width, height } = event.nativeEvent.layout;
                  setStageSize((prev) =>
                    prev.w === width && prev.h === height ? prev : { w: width, h: height }
                  );
                }
              : undefined
          }
        >
          <View style={landscape && !inPip && fittedFrame ? [styles.videoFrame, fittedFrame] : styles.videoFrameFill}>
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
                  <Text style={styles.adultGateTitle}>{copy.adult19}</Text>
                  <Text style={styles.adultGateSub}>{copy.adultSub}</Text>
                  <Pressable
                    style={[styles.primaryBtn, adultGate.busy && styles.btnDisabled]}
                    disabled={adultGate.busy}
                    onPress={() =>
                      void adultGate.ensureAdult().then((ok) => {
                        if (ok) void query.refetch();
                      })
                    }
                  >
                    <Text style={styles.primaryBtnText}>{copy.adultVerify}</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <ExternalLivePlayer
                external={item.external}
                title={item.title}
                posterUrl={item.thumbnailUrl}
                active
                showChrome={false}
                paused={paused}
                startImmediately
                onSurfacePress={() => setEmbedChrome((open) => !open)}
                onPlaybackFailed={markEmbedBlocked}
                controls={
                  embedChrome ? (
                    <>
                      <View pointerEvents="none" style={styles.embedScrim} />
                      <View
                        style={[
                          styles.playerChrome,
                          {
                            paddingTop: landscape ? 8 : 6,
                            paddingLeft: Math.max(insets.left, 8),
                            paddingRight: Math.max(insets.right, 8),
                          },
                        ]}
                        pointerEvents="box-none"
                      >
                        <Pressable
                          onPress={() => (landscape ? exitLandscape() : navigation.goBack())}
                          hitSlop={12}
                          style={styles.chromeBtn}
                          accessibilityRole="button"
                          accessibilityLabel={landscape ? copy.exitLandscape : copy.back}
                        >
                          <Ionicons name="chevron-back" size={22} color="#fff" />
                        </Pressable>
                        <View style={styles.chromeRight} pointerEvents="box-none">
                          <Pressable
                            onPressIn={() =>
                              prefetchUserProfile({
                                username: item.host.username,
                                name: item.host.name,
                                image: item.host.image,
                              })
                            }
                            onPress={() =>
                              openUserProfile({
                                username: item.host.username,
                                name: item.host.name,
                                image: item.host.image,
                              })
                            }
                            hitSlop={8}
                            style={styles.profileBtn}
                            accessibilityRole="button"
                            accessibilityLabel={copy.profile}
                          >
                            <Ionicons name="person" size={18} color="#f3f4f6" />
                          </Pressable>
                          {landscape ? (
                            <Pressable
                              onPress={() => setChatOpen((v) => !v)}
                              hitSlop={8}
                              style={[styles.chromeBtn, chatOpen && styles.chromeBtnOn]}
                              accessibilityRole="button"
                              accessibilityLabel={chatOpen ? copy.hideChat : copy.showChat}
                            >
                              <Ionicons name="chatbubble-ellipses" size={18} color="#fff" />
                            </Pressable>
                          ) : null}
                          <Pressable
                            onPress={() => (landscape ? exitLandscape() : enterLandscape())}
                            hitSlop={8}
                            style={styles.chromeBtn}
                            accessibilityRole="button"
                            accessibilityLabel={landscape ? copy.exitLandscape : copy.expandVideo}
                          >
                            <Ionicons name={landscape ? "contract" : "expand"} size={18} color="#fff" />
                          </Pressable>
                        </View>
                      </View>
                      <View style={styles.pauseSlot} pointerEvents="box-none">
                        <Pressable
                          style={styles.pauseBtn}
                          onPress={() => setPaused((v) => !v)}
                          accessibilityRole="button"
                          accessibilityLabel={paused ? copy.play : copy.pause}
                        >
                          <Ionicons name={paused ? "play" : "pause"} size={34} color="#fff" />
                        </Pressable>
                      </View>
                    </>
                  ) : null
                }
              />
            )
          ) : watchingFirstParty && creds ? (
            <LiveKitViewer
              creds={creds}
              enablePip
              paused={paused}
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
                contentFit={landscape ? "contain" : "cover"}
                cachePolicy={IMAGE_CACHE_POLICY}
                transition={0}
              />
              {isLiveAdultItem(item) ? <LiveAdultWatermark style={styles.hero} /> : null}
              {adultBlocked ? (
                <View style={styles.adultGateOverlay}>
                  <Text style={styles.adultGateTitle}>{copy.adult19}</Text>
                  <Pressable
                    style={styles.primaryBtn}
                    onPress={() =>
                      void adultGate.ensureAdult().then((ok) => {
                        if (ok) void query.refetch();
                      })
                    }
                  >
                    <Text style={styles.primaryBtnText}>{copy.adultVerifyWatch}</Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable style={styles.watchOverlay} onPress={() => void startFirstParty()}>
                  <Text style={styles.primaryBtnText}>{copy.watch}</Text>
                </Pressable>
              )}
            </View>
          ) : (
            <View style={[styles.hero, styles.heroFallback]}>
              <Ionicons name="radio" size={40} color="#F5C518" style={{ opacity: 0.5 }} />
            </View>
          )}
          </View>
          {landscapePlayer && !item.isExternal ? (
            <Pressable style={styles.tapCatch} onPress={() => setLandscapeChrome((open) => !open)} />
          ) : null}
        </View>

        {tokenError && !inPip ? <Text style={styles.errorInline}>{tokenError}</Text> : null}
      </View>

      {showChat ? (
        <View
          style={
            landscape
              ? { width: chatOpen ? chatWidth : 0, overflow: "hidden", height: "100%" }
              : styles.chatColumn
          }
        >
          <LiveChatPanel
            immersive
            sidebar={landscape}
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
        </View>
      ) : !inPip && !landscape ? (
        <View style={styles.chatPlaceholder}>
          <Text style={styles.endedSub}>{copy.chatUnavailable}</Text>
        </View>
      ) : null}
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: "#131C2D" },
    rootLandscape: { flexDirection: "row", backgroundColor: "#000" },
    center: { alignItems: "center", justifyContent: "center", gap: 10, padding: spacing.lg },
    topBack: { padding: spacing.md },
    statusShield: { width: "100%", backgroundColor: "#131C2D" },
    portraitChrome: { paddingTop: 6, paddingHorizontal: 6, paddingBottom: 4 },
    portraitIconBtn: { padding: 4 },
    profileBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#6D6E70",
    },
    playerWrap: {
      backgroundColor: "#000",
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: "#1f1f24",
      flexShrink: 0,
    },
    playerWrapLandscape: { flex: 1, height: "100%", borderBottomWidth: 0, backgroundColor: "#000" },
    playerStageLandscape: {
      flex: 1,
      width: "100%",
      backgroundColor: "#000",
      alignItems: "center",
      justifyContent: "center",
    },
    videoFrame: { overflow: "hidden", backgroundColor: "#000" },
    videoFrameFill: { ...StyleSheet.absoluteFill },
    tapCatch: { ...StyleSheet.absoluteFill, zIndex: 4 },
    embedScrim: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(0,0,0,0.28)" },
    landscapeOverlay: { ...StyleSheet.absoluteFill, zIndex: 6, elevation: 8 },
    pauseSlot: {
      ...StyleSheet.absoluteFill,
      alignItems: "center",
      justifyContent: "center",
    },
    pauseBtn: {
      width: 68,
      height: 68,
      borderRadius: 34,
      backgroundColor: "rgba(0,0,0,0.55)",
      alignItems: "center",
      justifyContent: "center",
    },
    playerWrapPip: { flex: 1, borderBottomWidth: 0 },
    playerChrome: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      zIndex: 5,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 8,
      paddingBottom: 6,
    },
    chromeRight: { flexDirection: "row", alignItems: "center", gap: 8 },
    chromeBtn: {
      padding: 6,
      borderRadius: 18,
      backgroundColor: "rgba(0,0,0,0.4)",
    },
    chromeBtnOn: {
      backgroundColor: "rgba(37,99,235,0.72)",
    },
    playerSurface: {
      width: "100%",
      aspectRatio: 16 / 9,
      backgroundColor: "#000",
      overflow: "hidden",
      flexShrink: 0,
    },
    playerSurfaceLandscape: {
      flex: 1,
      aspectRatio: undefined,
      width: "100%",
      height: "100%",
    },
    playerSurfacePip: {
      flex: 1,
      aspectRatio: undefined,
      width: "100%",
      height: "100%",
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
    chatColumn: { flex: 1 },
    chatPlaceholder: { flex: 1, alignItems: "center", justifyContent: "center" },
  });
}
