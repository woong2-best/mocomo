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
import { ExternalLivePlayer } from "@/features/live/ExternalLivePlayer";
import { LiveAdultWatermark, isLiveAdultItem } from "@/features/live/LiveAdultWatermark";
import {
  emptySlotHint,
  type LiveBeadSlot,
} from "@/features/live/live-bead-slots";
import { LiveKitConnecting, LiveKitViewer } from "@/features/live/LiveKitViewer";
import { LiveViewerBadge } from "@/features/live/LiveViewerBadge";
import { useAdultVerificationGate } from "@/hooks/useAdultVerificationGate";
import { IMAGE_CACHE_POLICY, feedMediaDecodeWidth } from "@/perf/image";
import { useTheme } from "@/theme/ThemeContext";
import { radii, type ThemeColors } from "@/theme/tokens";

type Props = {
  slot: LiveBeadSlot;
  width: number;
  /** True only for the focused (center) bead. */
  active: boolean;
  onOpenLive: (id: string) => void;
};

function LiveBeadCardInner({ slot, width, active, onOpenLive }: Props) {
  if (slot.kind === "empty") {
    return <EmptyBeadCard width={width} tone={slot.tone} focused={active} />;
  }
  return (
    <LiveBeadLiveCard
      item={slot.item}
      width={width}
      active={active}
      onOpenLive={onOpenLive}
    />
  );
}

export const LiveBeadCard = memo(LiveBeadCardInner);

function EmptyBeadCard({
  width,
  tone,
  focused,
}: {
  width: number;
  tone: number;
  focused: boolean;
}) {
  const tint = 8 + (tone % 8) * 2;
  return (
    <View style={[styles.emptyCard, { width, backgroundColor: `rgb(${tint},${tint + 2},${tint + 8})` }]}>
      <View style={styles.emptyInner}>
        <View style={[styles.emptyOrb, { opacity: 0.18 + (tone % 5) * 0.04 }]} />
        {focused ? (
          <View style={styles.emptyCopy}>
            <Text style={styles.emptyTitle}>현재 라이브 방송이 없습니다</Text>
            <Text style={styles.emptySub}>새로운 방송이 시작되면 이곳에 표시됩니다</Text>
          </View>
        ) : (
          <Text style={styles.emptyHint}>{emptySlotHint(tone)}</Text>
        )}
      </View>
    </View>
  );
}

function LiveBeadLiveCard({
  item,
  width,
  active,
  onOpenLive,
}: {
  item: LiveListItem;
  width: number;
  active: boolean;
  onOpenLive: (id: string) => void;
}) {
  const { colors } = useTheme();
  const themed = useMemo(() => createLiveStyles(colors), [colors]);
  const adultGate = useAdultVerificationGate("LIVE");
  const [creds, setCreds] = useState<LiveToken | null>(null);
  const [tokenBusy, setTokenBusy] = useState(false);

  const detailQuery = useQuery({
    queryKey: ["mobile-live", item.id],
    queryFn: () => fetchLiveDetail(item.id),
    enabled: active,
    staleTime: 15_000,
    refetchInterval: (q) => (q.state.data?.item?.isLive ? 12_000 : false),
  });

  const detail = detailQuery.data?.item;
  const thumb = item.thumbnailUrl ?? item.host?.image ?? null;
  const decode = feedMediaDecodeWidth(width);
  const title = detail?.title ?? item.title;

  const adultBlocked =
    !!detail &&
    !detail.isHost &&
    isLiveAdultItem(detail) &&
    (detail.accessDeniedReason === "ADULT_VERIFICATION_REQUIRED" || detail.canEnter === false);

  useEffect(() => {
    if (!active) {
      setCreds(null);
      setTokenBusy(false);
      return;
    }
    if (!detail || detail.isExternal || !detail.isLive || adultBlocked) return;
    if (creds) return;

    let cancelled = false;
    setTokenBusy(true);
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
        void err;
      } finally {
        if (!cancelled) setTokenBusy(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, adultBlocked, detail?.id, detail?.isExternal, detail?.isLive, item.id]);

  const open = () => onOpenLive(item.id);

  return (
    <Pressable
      style={[themed.card, { width }]}
      onPress={open}
      accessibilityRole="button"
      accessibilityLabel={`${title} 라이브 열기`}
    >
      <View style={themed.player}>
        {active && detail?.isExternal && detail.external && !adultBlocked ? (
          <ExternalLivePlayer
            external={detail.external}
            title={title}
            active
            showChrome={false}
            onPress={open}
          />
        ) : active && !detail?.isExternal && creds ? (
          <View style={themed.fill} pointerEvents="none">
            <LiveKitViewer creds={creds} onDisconnected={() => setCreds(null)} />
          </View>
        ) : active && (detailQuery.isLoading || tokenBusy) ? (
          <View style={themed.fill}>
            {thumb ? (
              <Image
                source={{ uri: thumb, width: decode, height: Math.round(decode * (9 / 16)) }}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
                cachePolicy={IMAGE_CACHE_POLICY}
                transition={0}
              />
            ) : null}
            <View style={themed.scrimCenter}>
              {tokenBusy ? <LiveKitConnecting /> : <ActivityIndicator color="#fff" />}
            </View>
          </View>
        ) : (
          <View style={themed.fill}>
            {thumb ? (
              <Image
                source={{ uri: thumb, width: decode, height: Math.round(decode * (9 / 16)) }}
                style={themed.poster}
                contentFit="cover"
                cachePolicy={IMAGE_CACHE_POLICY}
                recyclingKey={thumb}
                transition={0}
              />
            ) : (
              <View style={[themed.poster, themed.posterFallback]}>
                <Ionicons name="radio" size={36} color={colors.terracotta} style={{ opacity: 0.4 }} />
              </View>
            )}
            {isLiveAdultItem(item) ? <LiveAdultWatermark /> : null}
          </View>
        )}

        {adultBlocked ? (
          <View style={themed.adultGate}>
            <Text style={themed.adultTitle}>19+ 성인 방송</Text>
            <Pressable
              style={themed.adultBtn}
              onPress={(e) => {
                e.stopPropagation?.();
                void adultGate.ensureAdult().then((ok) => {
                  if (ok) void detailQuery.refetch();
                });
              }}
            >
              <Text style={themed.adultBtnText}>본인인증</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={themed.scrimTop} pointerEvents="none" />
        <View style={themed.scrimBottom} pointerEvents="none" />

        <View style={themed.badge} pointerEvents="none">
          <LiveViewerBadge viewerCount={detail?.viewerCount ?? item.viewerCount} />
        </View>

        <View style={themed.titleOverlay} pointerEvents="none">
          <Text style={themed.title} numberOfLines={2}>
            {title}
          </Text>
          <Text style={themed.host} numberOfLines={1}>
            @{item.host?.username ?? "host"}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  emptyCard: {
    aspectRatio: 16 / 9,
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.08)",
  },
  emptyInner: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  emptyOrb: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  emptyCopy: { alignItems: "center", gap: 6 },
  emptyTitle: {
    color: "rgba(255,255,255,0.88)",
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
  },
  emptySub: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 12,
    fontWeight: "500",
    textAlign: "center",
    lineHeight: 17,
  },
  emptyHint: {
    color: "rgba(255,255,255,0.28)",
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
});

function createLiveStyles(colors: ThemeColors) {
  return StyleSheet.create({
    card: {
      borderRadius: 18,
      overflow: "hidden",
      backgroundColor: "#0A0C10",
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: "rgba(255,255,255,0.1)",
    },
    player: {
      width: "100%",
      aspectRatio: 16 / 9,
      backgroundColor: "#000",
      overflow: "hidden",
    },
    fill: { ...StyleSheet.absoluteFill, backgroundColor: "#000" },
    poster: { width: "100%", height: "100%" },
    posterFallback: {
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(27,74,140,0.16)",
    },
    scrimCenter: {
      ...StyleSheet.absoluteFill,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(0,0,0,0.28)",
    },
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
      height: "42%",
      backgroundColor: "rgba(0,0,0,0.55)",
    },
    badge: { position: "absolute", top: 10, left: 10 },
    titleOverlay: {
      position: "absolute",
      left: 12,
      right: 12,
      bottom: 12,
      gap: 3,
    },
    title: {
      color: "#fff",
      fontSize: 15,
      fontWeight: "900",
      lineHeight: 20,
    },
    host: {
      color: "rgba(255,255,255,0.78)",
      fontSize: 12,
      fontWeight: "700",
    },
    adultGate: {
      ...StyleSheet.absoluteFill,
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
      backgroundColor: "rgba(0,0,0,0.7)",
    },
    adultTitle: { color: "#fff", fontWeight: "800", fontSize: 14 },
    adultBtn: {
      backgroundColor: colors.terracotta,
      borderRadius: radii.md,
      paddingHorizontal: 14,
      paddingVertical: 8,
    },
    adultBtnText: { color: "#fff", fontWeight: "800", fontSize: 12 },
  });
}
