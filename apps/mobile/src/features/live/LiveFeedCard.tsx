import { memo, useMemo } from "react";
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
  type LiveListItem,
} from "@/api/live";
import { LiveAdultWatermark, isLiveAdultItem } from "@/features/live/LiveAdultWatermark";
import { liveCategoryLabel, providerLabel } from "@/features/live/live-categories";
import { LiveKitConnecting } from "@/features/live/LiveKitViewer";
import { LiveViewerBadge } from "@/features/live/LiveViewerBadge";
import { useAdultVerificationGate } from "@/hooks/useAdultVerificationGate";
import { IMAGE_CACHE_POLICY, feedMediaDecodeWidth } from "@/perf/image";
import { FolkAvatar } from "@/ui/FolkAvatar";
import { liveUi } from "@/features/live/live-ui";
import { useI18n } from "@/i18n/I18nProvider";
import { useTheme } from "@/theme/ThemeContext";
import { radii, spacing, type ThemeColors } from "@/theme/tokens";

type Props = {
  item: LiveListItem;
  /** Card content width (screen ??horizontal gutters). */
  cardWidth: number;
  /** Most-visible card ??mounts the real player. */
  active: boolean;
  onPress: (id: string) => void;
};

/**
 * Vertical LIVE feed card: fixed 16:9 player slot + meta.
 * Not fullscreen ??designed so neighbors peek while scrolling.
 */
function LiveFeedCardInner({ item, cardWidth, active, onPress }: Props) {
  const { locale, t } = useI18n();
  const copy = useMemo(() => liveUi(t), [t]);
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const adultGate = useAdultVerificationGate("LIVE");
  const tokenBusy = false;
  const tokenError = null as string | null;

  const detailQuery = useQuery({
    queryKey: ["mobile-live", item.id],
    queryFn: () => fetchLiveDetail(item.id),
    enabled: active,
    staleTime: 15_000,
    refetchInterval: (q) => (q.state.data?.item?.isLive ? 12_000 : false),
  });

  const detail = detailQuery.data?.item;
  const thumb = item.thumbnailUrl?.trim() || null;
  const decode = feedMediaDecodeWidth(cardWidth);

  const adultBlocked =
    !!detail &&
    !detail.isHost &&
    isLiveAdultItem(detail) &&
    (detail.accessDeniedReason === "ADULT_VERIFICATION_REQUIRED" || detail.canEnter === false);


  const provider =
    detail?.isExternal && detail.external
      ? providerLabel(detail.external.provider, locale)
      : detail && !detail.isExternal
        ? "MoCoMo"
        : null;

  return (
    <View style={[styles.card, { width: cardWidth }]}>
      <View style={styles.playerSlot}>
        {active && detailQuery.isError ? (
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
              <Text style={styles.loadError}>{copy.loadHubError}</Text>
              <Text style={styles.loadRetry}>{copy.tapRetry}</Text>
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
            <Text style={styles.adultTitle}>{copy.adult19}</Text>
            <Text style={styles.adultSub}>{copy.adultSub}</Text>
            <Pressable
              style={styles.adultBtn}
              disabled={adultGate.busy}
              onPress={() => {
                void adultGate.ensureAdult().then((ok) => {
                  if (ok) void detailQuery.refetch();
                });
              }}
            >
              <Text style={styles.adultBtnText}>{copy.adultVerify}</Text>
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
        accessibilityLabel={copy.openLiveA11y(item.title)}
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
              {liveCategoryLabel(item.category, locale)}
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
