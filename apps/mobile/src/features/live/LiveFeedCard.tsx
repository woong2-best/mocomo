import { memo, useEffect, useMemo, useState } from "react";
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
import {
  fetchLiveDetail,
  fetchLiveToken,
  type LiveListItem,
  type LiveToken,
} from "@/api/live";
import { ApiError } from "@/api/client";
import { ExternalLivePlayer } from "@/features/live/ExternalLivePlayer";
import { LiveAdultWatermark, isLiveAdultItem } from "@/features/live/LiveAdultWatermark";
import { liveCategoryLabel, providerLabel } from "@/features/live/live-categories";
import { LiveKitConnecting, LiveKitViewer } from "@/features/live/LiveKitViewer";
import { LiveViewerBadge } from "@/features/live/LiveViewerBadge";
import { useAdultVerificationGate } from "@/hooks/useAdultVerificationGate";
import { IMAGE_CACHE_POLICY, feedMediaDecodeWidth } from "@/perf/image";
import { FolkAvatar } from "@/ui/FolkAvatar";
import { useTheme } from "@/theme/ThemeContext";
import { radii, spacing, type ThemeColors } from "@/theme/tokens";

type Props = {
  item: LiveListItem;
  /** Card content width (screen − horizontal gutters). */
  cardWidth: number;
  /** Most-visible card — mounts the real player. */
  active: boolean;
  onPress: (id: string) => void;
};

/**
 * Vertical LIVE feed card: fixed 16:9 player slot + meta.
 * Not fullscreen — designed so neighbors peek while scrolling.
 */
function LiveFeedCardInner({ item, cardWidth, active, onPress }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const adultGate = useAdultVerificationGate("LIVE");
  const [creds, setCreds] = useState<LiveToken | null>(null);
  const [tokenBusy, setTokenBusy] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);

  const detailQuery = useQuery({
    queryKey: ["mobile-live", item.id],
    queryFn: () => fetchLiveDetail(item.id),
    enabled: active,
    staleTime: 15_000,
    refetchInterval: (q) => (q.state.data?.item?.isLive ? 12_000 : false),
  });

  const detail = detailQuery.data?.item;
  const thumb = item.thumbnailUrl ?? item.host?.image ?? null;
  const decode = feedMediaDecodeWidth(cardWidth);

  const adultBlocked =
    !!detail &&
    !detail.isHost &&
    isLiveAdultItem(detail) &&
    (detail.accessDeniedReason === "ADULT_VERIFICATION_REQUIRED" || detail.canEnter === false);

  useEffect(() => {
    if (!active) {
      setCreds(null);
      setTokenError(null);
      setTokenBusy(false);
      return;
    }
    if (!detail || detail.isExternal || !detail.isLive || adultBlocked) return;
    if (creds) return;

    let cancelled = false;
    setTokenBusy(true);
    setTokenError(null);
    void (async () => {
      try {
        if (!detail.isHost && isLiveAdultItem(detail)) {
          const ok = await adultGate.ensureAdult();
          if (!ok || cancelled) return;
        }
        const token = await fetchLiveToken(item.id);
        if (!cancelled) setCreds(token);
      } catch (err) {
        if (cancelled) return;
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
        if (!cancelled) setTokenBusy(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // intentionally omit creds / adultGate from deps — reconnect only when stream identity changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, adultBlocked, detail?.id, detail?.isExternal, detail?.isLive, detail?.isHost, item.id]);

  const provider =
    detail?.isExternal && detail.external
      ? providerLabel(detail.external.provider)
      : detail && !detail.isExternal
        ? "MoCoMo"
        : null;

  return (
    <View style={[styles.card, { width: cardWidth }]}>
      <View style={styles.playerSlot}>
        {active && detail?.isExternal && detail.external && !adultBlocked ? (
          <ExternalLivePlayer
            external={detail.external}
            title={detail.title}
            active
            showChrome={false}
          />
        ) : active && !detail?.isExternal && creds ? (
          <View style={styles.nativePlayer}>
            <LiveKitViewer
              creds={creds}
              onDisconnected={() => {
                setCreds(null);
              }}
            />
          </View>
        ) : active && detailQuery.isError ? (
          <Pressable style={styles.posterFill} onPress={() => void detailQuery.refetch()}>
            {thumb ? (
              <Image
                source={{ uri: thumb, width: decode, height: Math.round(decode * (9 / 16)) }}
                style={styles.poster}
                contentFit="cover"
                cachePolicy={IMAGE_CACHE_POLICY}
                recyclingKey={thumb}
                transition={0}
              />
            ) : (
              <View style={[styles.poster, styles.posterFallback]} />
            )}
            <View style={styles.loadingScrim}>
              <Text style={styles.loadError}>라이브를 불러오지 못했습니다</Text>
              <Text style={styles.loadRetry}>탭하여 다시 시도</Text>
            </View>
          </Pressable>
        ) : active && (detailQuery.isLoading || tokenBusy) ? (
          <View style={styles.posterFill}>
            {thumb ? (
              <Image
                source={{ uri: thumb, width: decode, height: Math.round(decode * (9 / 16)) }}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
                cachePolicy={IMAGE_CACHE_POLICY}
                recyclingKey={thumb}
                transition={0}
              />
            ) : null}
            <View style={styles.loadingScrim}>
              {tokenBusy || !detail?.isExternal ? <LiveKitConnecting /> : (
                <ActivityIndicator color="#fff" />
              )}
            </View>
          </View>
        ) : (
          <Pressable style={styles.posterFill} onPress={() => onPress(item.id)}>
            {thumb ? (
              <Image
                source={{ uri: thumb, width: decode, height: Math.round(decode * (9 / 16)) }}
                style={styles.poster}
                contentFit="cover"
                cachePolicy={IMAGE_CACHE_POLICY}
                recyclingKey={thumb}
                transition={0}
              />
            ) : (
              <View style={[styles.poster, styles.posterFallback]}>
                <Ionicons name="radio" size={40} color={colors.terracotta} style={{ opacity: 0.45 }} />
              </View>
            )}
            {isLiveAdultItem(item) ? <LiveAdultWatermark /> : null}
            <View style={styles.scrimTop} pointerEvents="none" />
            <View style={styles.scrimBottom} pointerEvents="none" />
            {!active ? (
              <View style={styles.playHint} pointerEvents="none">
                <Ionicons name="play" size={22} color="#fff" />
              </View>
            ) : null}
          </Pressable>
        )}

        {adultBlocked ? (
          <View style={styles.adultGate}>
            <Text style={styles.adultTitle}>19+ 성인 방송</Text>
            <Text style={styles.adultSub}>본인인증된 회원만 시청할 수 있습니다.</Text>
            <Pressable
              style={styles.adultBtn}
              disabled={adultGate.busy}
              onPress={() => {
                void adultGate.ensureAdult().then((ok) => {
                  if (ok) void detailQuery.refetch();
                });
              }}
            >
              <Text style={styles.adultBtnText}>성인 본인인증</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.badgeRow} pointerEvents="none">
          <LiveViewerBadge viewerCount={detail?.viewerCount ?? item.viewerCount} />
        </View>
      </View>

      <Pressable
        style={styles.meta}
        onPress={() => onPress(item.id)}
        accessibilityRole="button"
        accessibilityLabel={`${item.title} 라이브 열기`}
      >
        <View style={styles.hostRow}>
          <FolkAvatar
            uri={item.host?.image}
            name={item.host?.username ?? "?"}
            size={28}
            framed={false}
          />
          <View style={styles.hostText}>
            <Text style={styles.hostName} numberOfLines={1}>
              @{item.host?.username ?? "host"}
            </Text>
            <Text style={styles.sub} numberOfLines={1}>
              {liveCategoryLabel(item.category)}
              {provider ? ` · ${provider}` : ""}
            </Text>
          </View>
          {item.host?.isPartner ? (
            <Ionicons name="checkmark-circle" size={16} color="#4AC77A" />
          ) : null}
        </View>
        <Text style={styles.title} numberOfLines={2}>
          {item.title}
        </Text>
        {tokenError && active ? <Text style={styles.error}>{tokenError}</Text> : null}
      </Pressable>
    </View>
  );
}

export const LiveFeedCard = memo(LiveFeedCardInner);

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    card: {
      alignSelf: "center",
      borderRadius: radii.lg,
      overflow: "hidden",
      backgroundColor: "#0A0C10",
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: "rgba(255,255,255,0.08)",
    },
    playerSlot: {
      width: "100%",
      aspectRatio: 16 / 9,
      backgroundColor: "#000",
      overflow: "hidden",
      position: "relative",
    },
    nativePlayer: {
      ...StyleSheet.absoluteFill,
      backgroundColor: "#000",
    },
    posterFill: {
      ...StyleSheet.absoluteFill,
      backgroundColor: "#000",
    },
    poster: { width: "100%", height: "100%" },
    posterFallback: {
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(27, 74, 140, 0.18)",
    },
    loadingScrim: {
      ...StyleSheet.absoluteFill,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(0,0,0,0.35)",
      gap: 6,
    },
    loadError: { color: "#fff", fontSize: 13, fontWeight: "800" },
    loadRetry: { color: "rgba(255,255,255,0.7)", fontSize: 12, fontWeight: "600" },
    scrimTop: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      height: "28%",
      backgroundColor: "rgba(0,0,0,0.28)",
    },
    scrimBottom: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      height: "40%",
      backgroundColor: "rgba(0,0,0,0.45)",
    },
    playHint: {
      position: "absolute",
      alignSelf: "center",
      top: "42%",
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: "rgba(0,0,0,0.55)",
      alignItems: "center",
      justifyContent: "center",
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: "rgba(255,255,255,0.35)",
    },
    badgeRow: {
      position: "absolute",
      top: 10,
      left: 10,
    },
    adultGate: {
      ...StyleSheet.absoluteFill,
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      padding: spacing.md,
      backgroundColor: "rgba(0,0,0,0.72)",
    },
    adultTitle: { color: "#fff", fontSize: 16, fontWeight: "900" },
    adultSub: {
      color: "rgba(255,255,255,0.85)",
      fontSize: 12,
      fontWeight: "600",
      textAlign: "center",
    },
    adultBtn: {
      marginTop: 4,
      backgroundColor: colors.terracotta,
      borderRadius: radii.md,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    adultBtnText: { color: "#fff", fontWeight: "800", fontSize: 13 },
    meta: {
      paddingHorizontal: 12,
      paddingTop: 10,
      paddingBottom: 12,
      gap: 8,
      backgroundColor: "#0F1420",
    },
    hostRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    hostText: { flex: 1, minWidth: 0 },
    hostName: { color: colors.brand, fontSize: 13, fontWeight: "800" },
    sub: { marginTop: 1, color: colors.textMuted, fontSize: 11, fontWeight: "600" },
    title: {
      color: "#fff",
      fontSize: 15,
      fontWeight: "800",
      lineHeight: 20,
    },
    error: { color: colors.danger, fontSize: 12, fontWeight: "600" },
  });
}
