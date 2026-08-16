import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
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
import {
  fetchLiveDetail,
  fetchLiveToken,
  type LiveToken,
} from "@/api/live";
import { ApiError } from "@/api/client";
import { ExternalLivePlayer } from "@/features/live/ExternalLivePlayer";
import { LiveChatPanel } from "@/features/live/LiveChatPanel";
import { LiveKitConnecting, LiveKitViewer } from "@/features/live/LiveKitViewer";
import { liveCategoryLabel, providerLabel } from "@/features/live/live-categories";
import { FolkAvatar } from "@/ui/FolkAvatar";
import { IMAGE_CACHE_POLICY } from "@/perf/image";
import { useTheme } from "@/theme/ThemeContext";
import { radii, spacing, type ThemeColors } from "@/theme/tokens";
import type { RootStackParamList } from "@/navigation/types";
import { LiveDonationAlertOverlay } from "@/features/live/LiveDonationAlertOverlay";
import { TipCreatorSheet } from "@/payments/TipCreatorSheet";

export function LiveDetailScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, "LiveDetail">>();
  const [watchingFirstParty, setWatchingFirstParty] = useState(false);
  const [creds, setCreds] = useState<LiveToken | null>(null);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [tokenLoading, setTokenLoading] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);
  const [tipOpen, setTipOpen] = useState(false);

  const query = useQuery({
    queryKey: ["mobile-live", route.params.id],
    queryFn: () => fetchLiveDetail(route.params.id),
    staleTime: 15_000,
    refetchInterval: (q) => (q.state.data?.item?.isLive ? 5_000 : false),
  });
  const item = query.data?.item;

  const onViewerCount = useCallback((n: number) => setViewerCount(n), []);

  const startFirstParty = async () => {
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

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.cobalt} />
          <Text style={styles.back}>뒤로</Text>
        </Pressable>
        <Text style={styles.heading} numberOfLines={1}>
          {item?.title ?? "라이브"}
        </Text>
        {item?.isLive ? (
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        ) : (
          <View style={{ width: 48 }} />
        )}
      </View>

      {query.isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.terracotta} />
      ) : query.isError || !item ? (
        <Text style={styles.error}>라이브를 불러오지 못했습니다.</Text>
      ) : item.liveStatus === "ENDED" || (!item.isLive && !item.isHost) ? (
        <View style={styles.ended}>
          <Text style={styles.endedTitle}>방송이 종료되었습니다</Text>
          <Text style={styles.endedSub}>다른 라이브 방송을 둘러보세요.</Text>
          <Pressable style={styles.primaryBtn} onPress={() => navigation.navigate("LiveList")}>
            <Text style={styles.primaryBtnText}>라이브 홈</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.playerBlock}>
            {item.isLive && item.paymentsEnabled && item.donationAlertsOnStream ? (
              <LiveDonationAlertOverlay
                channelId={item.id}
                streamStartedAt={item.streamStartedAt}
              />
            ) : null}
            {item.isExternal && item.external ? (
              <ExternalLivePlayer external={item.external} title={item.title} />
            ) : watchingFirstParty && creds ? (
              <View style={styles.firstPartyPlayer}>
                <LiveKitViewer
                  creds={creds}
                  onDisconnected={() => {
                    setWatchingFirstParty(false);
                    setCreds(null);
                  }}
                />
              </View>
            ) : tokenLoading ? (
              <View style={styles.firstPartyPlayer}>
                <LiveKitConnecting />
              </View>
            ) : item.thumbnailUrl ? (
              <Image
                source={{ uri: item.thumbnailUrl }}
                style={styles.hero}
                cachePolicy={IMAGE_CACHE_POLICY}
                transition={0}
              />
            ) : (
              <View style={[styles.hero, styles.heroFallback]}>
                <Ionicons name="radio" size={40} color={colors.terracotta} style={{ opacity: 0.5 }} />
              </View>
            )}
          </View>

          <View style={styles.body}>
            <Text style={styles.title}>{item.title}</Text>
            <Pressable
              style={styles.hostRow}
              onPress={() => navigation.navigate("UserProfile", { username: item.host.username })}
            >
              <FolkAvatar uri={item.host.image} name={item.host.username} size={40} />
              <View style={{ flex: 1 }}>
                <Text style={styles.hostName}>@{item.host.username}</Text>
                <Text style={styles.sub}>
                  {liveCategoryLabel(item.category)}
                  {item.isExternal && item.external
                    ? ` · ${providerLabel(item.external.provider)}`
                    : ""}
                  {` · ${viewerCount || item.viewerCount}명`}
                  {item.isHost ? " · 호스트" : ""}
                </Text>
              </View>
            </Pressable>

            {item.description ? <Text style={styles.desc}>{item.description}</Text> : null}

            {item.paymentsEnabled && !item.isHost ? (
              <Pressable style={styles.tipBtn} onPress={() => setTipOpen(true)}>
                <Ionicons name="heart" size={16} color="#fff" />
                <Text style={styles.primaryBtnText}>후원하기</Text>
              </Pressable>
            ) : null}

            {item.paymentsEnabled && !item.isHost ? (
              <TipCreatorSheet
                visible={tipOpen}
                onClose={() => setTipOpen(false)}
                creatorId={item.host.id}
                username={item.host.username}
                displayName={item.host.name || item.host.username}
                channelId={item.id}
                onSuccess={() => Alert.alert("후원 완료", "라이브 후원이 완료되었습니다.")}
              />
            ) : null}

            {!item.isExternal ? (
              watchingFirstParty ? (
                <Pressable
                  style={styles.secondaryBtn}
                  onPress={() => {
                    setWatchingFirstParty(false);
                    setCreds(null);
                  }}
                >
                  <Text style={styles.secondaryBtnText}>시청 종료</Text>
                </Pressable>
              ) : (
                <Pressable
                  style={[styles.primaryBtn, (tokenLoading || !item.isLive) && styles.btnDisabled]}
                  disabled={tokenLoading || !item.isLive}
                  onPress={() => void startFirstParty()}
                >
                  <Text style={styles.primaryBtnText}>
                    {item.isLive ? "시청하기" : "방송 종료됨"}
                  </Text>
                </Pressable>
              )
            ) : item.external?.watchUrl ? (
              <Pressable
                style={styles.secondaryBtn}
                onPress={() =>
                  void Linking.openURL(item.external!.watchUrl).catch(() => undefined)
                }
              >
                <Ionicons name="open-outline" size={16} color={colors.cobalt} />
                <Text style={styles.secondaryBtnText}>원본 플랫폼에서 열기</Text>
              </Pressable>
            ) : null}

            {tokenError ? <Text style={styles.errorInline}>{tokenError}</Text> : null}

            {(item.canEnter !== false || item.isLive) && (
              <View style={styles.chatWrap}>
                <LiveChatPanel
                  channelId={item.id}
                  viewerCount={viewerCount || item.viewerCount}
                  onViewerCount={onViewerCount}
                />
              </View>
            )}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    topBar: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
      backgroundColor: colors.surface,
    },
    backBtn: { flexDirection: "row", alignItems: "center", gap: 2 },
    back: { color: colors.cobalt, fontWeight: "700" },
    heading: { flex: 1, fontSize: 16, fontWeight: "800", color: colors.text },
    liveBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: "#059669",
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#fff" },
    liveText: { color: "#fff", fontSize: 10, fontWeight: "900" },
    playerBlock: { padding: spacing.md, paddingBottom: 0, position: "relative" },
    firstPartyPlayer: {
      borderRadius: 12,
      overflow: "hidden",
      backgroundColor: "#000",
      minHeight: 220,
      aspectRatio: 16 / 9,
    },
    hero: {
      width: "100%",
      aspectRatio: 16 / 9,
      borderRadius: 12,
      backgroundColor: colors.muted,
    },
    heroFallback: { alignItems: "center", justifyContent: "center" },
    body: { padding: spacing.md, gap: 10 },
    title: { fontSize: 20, fontWeight: "900", color: colors.text },
    hostRow: { flexDirection: "row", alignItems: "center", gap: 10 },
    hostName: { fontWeight: "800", color: colors.cobalt, fontSize: 14 },
    sub: { marginTop: 2, color: colors.textMuted, fontSize: 12, fontWeight: "600" },
    desc: { color: colors.textSecondary, fontSize: 13, lineHeight: 20, fontWeight: "600" },
    primaryBtn: {
      backgroundColor: colors.terracotta,
      borderRadius: radii.md,
      paddingVertical: 12,
      alignItems: "center",
    },
    primaryBtnText: { color: "#fff", fontWeight: "800" },
    tipBtn: {
      backgroundColor: colors.cobalt,
      borderRadius: radii.md,
      paddingVertical: 12,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: 6,
    },
    secondaryBtn: {
      borderRadius: radii.md,
      paddingVertical: 12,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: 6,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      backgroundColor: colors.surfaceRaised,
    },
    secondaryBtnText: { color: colors.cobalt, fontWeight: "800" },
    btnDisabled: { opacity: 0.5 },
    chatWrap: { marginTop: 8, minHeight: 360 },
    ended: { padding: spacing.lg, alignItems: "center", gap: 10, marginTop: 40 },
    endedTitle: { fontSize: 18, fontWeight: "900", color: colors.text },
    endedSub: { color: colors.textMuted, fontWeight: "600" },
    error: { color: colors.danger, padding: spacing.lg },
    errorInline: { color: colors.danger, fontWeight: "600" },
  });
}
