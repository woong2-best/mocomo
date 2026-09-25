import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fetchMarketplaceList, type MarketplaceListItem } from "@/api/marketplace";
import {
  clearRecentSearches,
  loadRecentSearches,
  loadRecentViews,
} from "@/features/marketplace/market-memory";
import { floatingTabClearance } from "@/navigation/tab-layout";
import type { RootStackParamList } from "@/navigation/types";
import { IMAGE_CACHE_POLICY } from "@/perf/image";
import { MarketDisputeScaleIcon } from "@/ui/icons/MarketDisputeScaleIcon";
import { Screen } from "@/ui/Screen";
import { useTheme } from "@/theme/ThemeContext";
import { radii, spacing, type ThemeColors } from "@/theme/tokens";

export type MarketHubLane = "all" | "recommend" | "purchased" | "favorites" | "live-auctions" | "disputes";

type HubLane = MarketHubLane;

type MarketHomeProps = {
  /** 오른쪽 슬라이드 허브 (목록 위). */
  embedded?: boolean;
  onClose?: () => void;
  onOpenLane?: (lane: HubLane, q?: string) => void;
};

const SHORTCUTS: {
  lane?: HubLane;
  my?: boolean;
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
}[] = [
  { lane: "purchased", label: "구매내역", icon: "bag-handle-outline" },
  { my: true, label: "판매내역", icon: "logo-usd" },
  { lane: "live-auctions", label: "진행중인경매", icon: "time-outline" },
  { lane: "favorites", label: "찜리스트", icon: "heart-outline" },
  { lane: "disputes", label: "분쟁" },
];

export function MarketHomeScreen(props: MarketHomeProps = {}) {
  const { embedded = false, onClose, onOpenLane } = props;
  const { colors, isDark } = useTheme();
  const icon = isDark ? colors.text : colors.brand;
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [recentQ, setRecentQ] = useState<string[]>([]);
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const [clearOpen, setClearOpen] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      void Promise.all([loadRecentSearches(), loadRecentViews()]).then(([searches, ids]) => {
        if (!alive) return;
        setRecentQ(searches);
        setRecentIds(ids);
      });
      return () => {
        alive = false;
      };
    }, [])
  );

  const recommend = useQuery({
    queryKey: ["mobile-marketplace", "recommend"],
    queryFn: async () => {
      const rec = await fetchMarketplaceList({ lane: "recommend", take: 8 });
      if (rec.items.length > 0) return rec;
      const [fixed, auction] = await Promise.all([
        fetchMarketplaceList({ take: 24, mode: "fixed" }),
        fetchMarketplaceList({ take: 24, mode: "auction" }),
      ]);
      return { items: [...auction.items, ...fixed.items].slice(0, 8) };
    },
    staleTime: 60_000,
  });
  const recent = useQuery({
    queryKey: ["mobile-marketplace", "recent-ids", recentIds],
    queryFn: () => fetchMarketplaceList({ ids: recentIds.slice(0, 8), take: 8 }),
    enabled: recentIds.length > 0,
    staleTime: 30_000,
  });

  const openLane = useCallback(
    (lane: HubLane, q?: string) => {
      if (onOpenLane) {
        onOpenLane(lane, q);
        return;
      }
      navigation.navigate("MarketplaceList", { lane, q });
    },
    [navigation, onOpenLane]
  );

  const refreshing = recommend.isFetching || recent.isFetching;
  const body = (
    <>
        {!embedded ? (
          <View style={styles.topRow}>
            <Pressable
              onPress={() => navigation.navigate("Main", { screen: "Home" })}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="뒤로"
            >
              <Ionicons name="chevron-back" size={26} color={icon} />
            </Pressable>
          </View>
        ) : null}

        <View style={[styles.sectionHead, embedded && styles.sectionHeadEmbeddedTop]}>
          <Text style={styles.sectionTitle}>최근검색어</Text>
          <Pressable
            hitSlop={10}
            onPress={() => setClearOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="최근 검색어 메뉴"
          >
            <Ionicons name="ellipsis-horizontal" size={18} color={icon} />
          </Pressable>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipScroll}
          contentContainerStyle={styles.chipRow}
        >
          {recentQ.length === 0 ? (
            <Text style={styles.muted}>최근 검색어가 없습니다</Text>
          ) : (
            recentQ.map((term) => (
              <Pressable key={term} style={styles.chip} onPress={() => openLane("all", term)}>
                <Text style={styles.chipText} numberOfLines={1}>
                  {term}
                </Text>
              </Pressable>
            ))
          )}
        </ScrollView>

        <View style={styles.shortcutRow}>
          {SHORTCUTS.map((item) => (
            <Pressable
              key={item.label}
              style={styles.shortcut}
              onPress={() => {
                if (item.my) {
                  if (embedded) onClose?.();
                  navigation.navigate("UsedMy");
                } else if (item.lane) openLane(item.lane);
              }}
            >
              {item.lane === "disputes" ? (
                <MarketDisputeScaleIcon size={26} color={icon} />
              ) : item.icon ? (
                <Ionicons name={item.icon} size={26} color={icon} />
              ) : null}
              <Text style={styles.shortcutLabel}>{item.label}</Text>
            </Pressable>
          ))}
        </View>

        <ProductRail
          title="최근 본 상품"
          items={recent.data?.items ?? []}
          loading={recent.isLoading && recentIds.length > 0}
          onMore={() => openLane("all")}
          onOpen={(id) => {
            if (embedded) onClose?.();
            navigation.navigate("MarketplaceDetail", { id });
          }}
          ink={icon}
          styles={styles}
        />
        <ProductRail
          title="추천상품"
          items={recommend.data?.items ?? []}
          loading={recommend.isLoading}
          onMore={() => openLane("recommend")}
          onOpen={(id) => {
            if (embedded) onClose?.();
            navigation.navigate("MarketplaceDetail", { id });
          }}
          ink={icon}
          styles={styles}
        />
    </>
  );

  return (
    <Screen safeTop={!embedded}>
      {embedded ? (
        <ScrollView
          style={styles.embeddedBody}
          contentContainerStyle={styles.embeddedScrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {body}
        </ScrollView>
      ) : (
        <ScrollView
          contentContainerStyle={{
            paddingBottom: floatingTabClearance(insets.bottom) + 72,
          }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing && !recommend.isLoading}
              onRefresh={() => {
                void recommend.refetch();
                void recent.refetch();
              }}
              tintColor={colors.terracotta}
            />
          }
        >
          {body}
        </ScrollView>
      )}

      <Modal visible={clearOpen} transparent animationType="fade" onRequestClose={() => setClearOpen(false)}>
        <Pressable style={styles.popupScrim} onPress={() => setClearOpen(false)}>
          <Pressable style={styles.popup} onPress={() => undefined}>
            <Pressable
              style={styles.popupBtn}
              onPress={() => {
                void clearRecentSearches().then((next) => {
                  setRecentQ(next);
                  setClearOpen(false);
                });
              }}
            >
              <Text style={styles.popupBtnText}>검색어 초기화</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {embedded ? null : (
        <Pressable
          style={[styles.fab, { bottom: floatingTabClearance(insets.bottom) + 12 }]}
          onPress={() => navigation.navigate("UsedCreate")}
          accessibilityRole="button"
          accessibilityLabel="Sell"
        >
          <Ionicons name="add" size={30} color="#fff" />
        </Pressable>
      )}
    </Screen>
  );
}

function ProductRail({
  title,
  items,
  loading,
  onMore,
  onOpen,
  ink,
  styles,
}: {
  title: string;
  items: MarketplaceListItem[];
  loading: boolean;
  onMore: () => void;
  onOpen: (id: string) => void;
  ink: string;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.rail}>
      <View style={styles.sectionHead}>
        <Text style={styles.railTitle}>{title}</Text>
        <Pressable onPress={onMore} style={styles.moreBtn} accessibilityRole="button">
          <Text style={styles.moreText}>전체보기</Text>
          <Ionicons name="chevron-forward" size={16} color={ink} />
        </Pressable>
      </View>
      {loading ? (
        <ActivityIndicator color={ink} style={{ marginVertical: 24 }} />
      ) : items.length === 0 ? (
        <Text style={styles.muted}>아직 상품이 없습니다</Text>
      ) : (
        <View style={styles.grid}>
          {items.slice(0, 4).map((item) => (
            <Pressable key={item.id} style={styles.card} onPress={() => onOpen(item.id)}>
              {item.thumbnailUrl ? (
                <Image
                  source={{ uri: item.thumbnailUrl }}
                  style={styles.photo}
                  cachePolicy={IMAGE_CACHE_POLICY}
                  transition={0}
                />
              ) : (
                <View style={[styles.photo, styles.photoEmpty]} />
              )}
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    embeddedBody: {
      flex: 1,
    },
    embeddedScrollContent: {
      paddingBottom: spacing.lg,
    },
    chipScroll: {
      flexGrow: 0,
      flexShrink: 0,
    },
    topRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: spacing.md,
      paddingTop: spacing.sm,
      minHeight: 42,
    },
    fab: {
      position: "absolute",
      right: 18,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.terracotta,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: "#000",
      shadowOpacity: 0.28,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 8,
    },
    sectionHead: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: spacing.md,
      marginTop: 18,
      marginBottom: 10,
    },
    sectionHeadEmbeddedTop: {
      marginTop: spacing.sm,
    },
    sectionTitle: { fontSize: 16, fontWeight: "800", color: colors.brand },
    chipRow: { paddingHorizontal: spacing.md, gap: 8, paddingBottom: 4 },
    chip: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 7,
      backgroundColor: colors.surfaceRaised,
      maxWidth: 160,
    },
    chipText: { color: colors.text, fontWeight: "600", fontSize: 12 },
    shortcutRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingHorizontal: 10,
      marginTop: 18,
    },
    shortcut: { width: "19%", alignItems: "center", gap: 6 },
    shortcutLabel: {
      fontSize: 10,
      fontWeight: "700",
      color: colors.text,
      textAlign: "center",
    },
    rail: { marginTop: 8 },
    railTitle: { fontSize: 18, fontWeight: "800", color: colors.brand },
    moreBtn: { flexDirection: "row", alignItems: "center", gap: 2 },
    moreText: { fontSize: 13, fontWeight: "700", color: colors.brand },
    grid: {
      paddingHorizontal: spacing.md,
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 12,
    },
    card: {
      width: "48%",
      borderRadius: radii.md,
      overflow: "hidden",
      backgroundColor: colors.surfaceRaised,
      borderWidth: 1,
      borderColor: colors.hairline,
    },
    photo: { width: "100%", aspectRatio: 1, backgroundColor: colors.muted },
    photoEmpty: { alignItems: "center", justifyContent: "center" },
    muted: { color: colors.textMuted, paddingHorizontal: spacing.md, fontWeight: "600" },
    popupScrim: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.35)",
      justifyContent: "center",
      paddingHorizontal: 40,
    },
    popup: {
      backgroundColor: colors.surfaceRaised,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: colors.border,
      overflow: "hidden",
    },
    popupBtn: { paddingVertical: 16, paddingHorizontal: 18, alignItems: "center" },
    popupBtnText: { color: colors.brand, fontWeight: "800", fontSize: 15 },
  });
}
