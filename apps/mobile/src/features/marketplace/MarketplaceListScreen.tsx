import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fetchMarketplaceList, toggleMarketplaceFavorite, type MarketplaceListItem } from "@/api/marketplace";
import { AuctionCountdown } from "@/features/marketplace/AuctionCountdown";
import { formatUsedPrice, formatUsedTimeAgo } from "@/features/marketplace/used-catalog";
import { floatingTabClearance } from "@/navigation/tab-layout";
import { Screen } from "@/ui/Screen";
import { SensitiveContentGate } from "@/ui/SensitiveContentGate";
import { IMAGE_CACHE_POLICY } from "@/perf/image";
import { useTheme } from "@/theme/ThemeContext";
import type { ThemeColors } from "@/theme/tokens";
import type { RootStackParamList } from "@/navigation/types";
import { useAuth } from "@/auth/AuthContext";
import { MarketHubSlidePanel } from "@/features/marketplace/MarketHubSlidePanel";
import type { MarketHubLane } from "@/features/marketplace/MarketHomeScreen";
import { SearchField } from "@/ui/SearchField";
import {
  UsedListingOverflowMenu,
  type MenuAnchor,
} from "@/features/marketplace/UsedListingOverflowMenu";
import { loadDismissedUsedListingIds } from "@/lib/used-listing-dismiss";

type HubLane = MarketHubLane;
type Props = { mode?: "tab" | "stack"; lane?: "used" | "auction" };

const LIST_CATEGORIES = [
  { id: "ALL", label: "전체" },
  { id: "FIGURE", label: "피규어" },
  { id: "TCG", label: "TCG" },
  { id: "GOODS", label: "굿즈" },
  { id: "BOOK", label: "도서" },
  { id: "COSPLAY", label: "코스프레" },
  { id: "DIGITAL", label: "디지털" },
] as const;

export function MarketplaceListScreen({ mode = "stack", lane = "used" }: Props) {
  const { colors, isDark } = useTheme();
  const ink = isDark ? colors.text : colors.brand;
  const muted = colors.textMuted;
  const styles = useMemo(() => createStyles(colors), [colors]);

  const insets = useSafeAreaInsets();
  const route = useRoute();
  const routeParams = (route.params ?? {}) as { lane?: HubLane; q?: string };
  const [hubLaneLocal, setHubLaneLocal] = useState<HubLane | undefined>(undefined);
  const isTab = mode === "tab" || route.name === "Used";
  const hubLane = isTab ? hubLaneLocal : routeParams.lane;
  const isAuction = lane === "auction" || route.name === "AuctionList" || hubLane === "live-auctions";
  const isCombined = !isAuction && hubLane !== "purchased" && hubLane !== "favorites" && hubLane !== "disputes";
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [q, setQ] = useState(routeParams.q ?? "");
  const [category, setCategory] = useState<string | "ALL">("ALL");
  const [hubOpen, setHubOpen] = useState(false);
  const [liked, setLiked] = useState<Record<string, boolean>>({});
  const [likeBump, setLikeBump] = useState<Record<string, number>>({});
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [menuItem, setMenuItem] = useState<MarketplaceListItem | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<MenuAnchor | null>(null);
  useEffect(() => {
    void loadDismissedUsedListingIds().then(setDismissedIds);
  }, []);

  const listQuery = useMemo(() => {
    return {
      q: q || undefined,
      category: category !== "ALL" ? category : undefined,
      mode: isAuction ? ("auction" as const) : isCombined ? undefined : ("fixed" as const),
      lane:
        hubLane === "recommend" ||
        hubLane === "purchased" ||
        hubLane === "favorites" ||
        hubLane === "live-auctions" ||
        hubLane === "disputes"
          ? hubLane
          : undefined,
      take: 48,
    };
  }, [q, category, isAuction, isCombined, hubLane]);

  const query = useQuery({
    queryKey: ["mobile-marketplace", hubLane ?? (isAuction ? "auction" : "used"), listQuery],
    queryFn: () => fetchMarketplaceList(listQuery),
    staleTime: 90_000,
    placeholderData: (previous) => previous,
  });

  const favorite = useMutation({
    mutationFn: (id: string) => toggleMarketplaceFavorite(id),
    onSuccess: (res, id) => {
      setLiked((prev) => ({ ...prev, [id]: res.favorited }));
      setLikeBump((prev) => ({ ...prev, [id]: res.favorited ? 1 : -1 }));
      void queryClient.invalidateQueries({ queryKey: ["mobile-marketplace"] });
    },
  });

  const items = (query.data?.items ?? []).filter(
    (item) =>
      (isAuction ? item.saleType === "AUCTION" : true) && !dismissedIds.has(item.id)
  );

  const applyHubLane = useCallback(
    (lane: HubLane, q?: string) => {
      const resolved = lane === "all" ? undefined : lane;
      if (isTab) {
        setHubLaneLocal(resolved);
      } else {
        navigation.setParams({ lane: resolved, q });
      }
      if (q !== undefined) {
        setQ(q);
      }
      setHubOpen(false);
    },
    [isTab, navigation]
  );

  const openItem = useCallback(
    (item: MarketplaceListItem) => {
      navigation.navigate(item.saleType === "AUCTION" ? "AuctionDetail" : "MarketplaceDetail", {
        id: item.id,
      });
    },
    [navigation]
  );

  const renderItem = useCallback(
    ({ item }: { item: MarketplaceListItem }) => {
      if (!item?.id) return null;
      const auction = item.saleType === "AUCTION";
      const price = auction
        ? item.currentBidAmount && item.currentBidAmount > 0
          ? item.currentBidAmount
          : item.price
        : item.price;
      const nsfwGate = !!item.isNsfw && item.sellerId !== user?.id;
      const hearts = Math.max(0, (item.favoriteCount ?? 0) + (likeBump[item.id] ?? 0));
      const on = !!liked[item.id];
      return (
        <Pressable style={styles.row} onPress={() => openItem(item)}>
          <View style={styles.thumbWrap}>
            <SensitiveContentGate enabled={nsfwGate} style={styles.thumb}>
              {item.thumbnailUrl ? (
                <Image
                  source={{ uri: item.thumbnailUrl }}
                  style={StyleSheet.absoluteFill}
                  cachePolicy={IMAGE_CACHE_POLICY}
                  transition={0}
                />
              ) : (
                <View style={[StyleSheet.absoluteFill, styles.thumbFallback]} />
              )}
            </SensitiveContentGate>
          </View>
          <View style={styles.body}>
            <View style={styles.titleRow}>
              <Text style={styles.title} numberOfLines={2}>
                {item.title || "상품"}
              </Text>
              <Pressable
                hitSlop={8}
                onPress={(e) => {
                  e.stopPropagation?.();
                  const target = e.currentTarget;
                  target.measureInWindow((x, y, width, height) => {
                    setMenuAnchor({ x, y, width, height });
                    setMenuItem(item);
                  });
                }}
              >
                <Ionicons name="ellipsis-vertical" size={16} color={muted} />
              </Pressable>
            </View>
            <Text style={styles.meta} numberOfLines={1}>
              {[item.region || "지역 미정", formatUsedTimeAgo(item.createdAt)].join(" · ")}
            </Text>
            <Text style={styles.price}>
              {auction ? `현재 ${formatUsedPrice(price, item.currency)}` : formatUsedPrice(price, item.currency)}
            </Text>
            {auction && item.auctionEndsAt && item.status === "SELLING" ? (
              <AuctionCountdown endsAt={item.auctionEndsAt} />
            ) : null}
            <View style={styles.foot}>
              <View style={styles.stats}>
                {auction && item.bidCount != null ? (
                  <View style={styles.stat}>
                    <Ionicons name="chatbubble-outline" size={14} color={muted} />
                    <Text style={styles.statText}>{item.bidCount}</Text>
                  </View>
                ) : null}
                <Pressable style={styles.stat} onPress={() => favorite.mutate(item.id)}>
                  <Ionicons name={on ? "heart" : "heart-outline"} size={16} color={on ? colors.like : muted} />
                  {hearts > 0 ? <Text style={styles.statText}>{hearts}</Text> : null}
                </Pressable>
              </View>
            </View>
          </View>
        </Pressable>
      );
    },
    [
      colors.like,
      favorite,
      likeBump,
      liked,
      menuItem?.id,
      muted,
      openItem,
      styles,
      user?.id,
    ]
  );

  const listHeader = (
    <View>
      <View style={styles.searchRow}>
        <Pressable
          onPress={() => {
            if (isTab) navigation.navigate("Main", { screen: "Home" });
            else navigation.goBack();
          }}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="뒤로"
        >
          <Ionicons name="chevron-back" size={26} color={ink} />
        </Pressable>
        <SearchField
          variant="pill"
          value={q}
          onChangeText={setQ}
          onClear={() => setQ("")}
          placeholder="검색"
          containerStyle={{ flex: 1 }}
        />
        <Pressable
          onPress={() => setHubOpen(true)}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="마켓 메뉴"
        >
          <Ionicons name="menu-outline" size={26} color={ink} />
        </Pressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.catRow}
      >
        {LIST_CATEGORIES.map((c) => {
          const active = category === c.id;
          return (
            <Pressable
              key={c.id}
              onPress={() => setCategory(c.id)}
              style={[
                styles.cat,
                {
                  backgroundColor: active ? colors.brand : colors.surfaceRaised,
                  borderColor: active ? colors.brand : colors.border,
                },
              ]}
            >
              <Text style={[styles.catText, { color: active ? colors.textOnAccent : colors.brand }]}>{c.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );

  const listEmpty =
    query.isLoading && !query.data ? (
      <ActivityIndicator style={{ marginTop: 24 }} color={colors.terracotta} />
    ) : query.isError ? (
      <Pressable style={{ padding: 24 }} onPress={() => void query.refetch()}>
        <Text style={styles.empty}>목록을 불러오지 못했습니다. 다시 시도</Text>
      </Pressable>
    ) : (
      <Text style={styles.empty}>조건에 맞는 상품이 없습니다.</Text>
    );

  return (
    <Screen>
      <FlatList
        data={query.isError ? [] : items}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={listEmpty}
        contentContainerStyle={{
          paddingBottom: (isTab ? floatingTabClearance(insets.bottom) : insets.bottom) + 88,
          flexGrow: 1,
        }}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        refreshing={query.isFetching && !!query.data}
        onRefresh={() => void query.refetch()}
      />

      <Pressable
        style={[
          styles.fab,
          { bottom: (isTab ? floatingTabClearance(insets.bottom) : insets.bottom) + 12 },
        ]}
        onPress={() => navigation.navigate("UsedCreate")}
        accessibilityRole="button"
        accessibilityLabel="Sell"
      >
        <Ionicons name="add" size={30} color="#fff" />
      </Pressable>

      <MarketHubSlidePanel visible={hubOpen} onClose={() => setHubOpen(false)} onOpenLane={applyHubLane} />

      {menuItem ? (
        <UsedListingOverflowMenu
          visible={!!menuAnchor}
          anchor={menuAnchor}
          item={menuItem}
          isOwner={
            !!user?.id &&
            (menuItem.sellerId ?? menuItem.seller?.id) === user.id
          }
          navigation={navigation}
          onClose={() => {
            setMenuAnchor(null);
            setMenuItem(null);
          }}
          onDismissed={(id) => setDismissedIds((prev) => new Set(prev).add(id))}
          onDeleted={(id) => setDismissedIds((prev) => new Set(prev).add(id))}
        />
      ) : null}
    </Screen>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    searchRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingHorizontal: 14,
      paddingTop: 8,
      paddingBottom: 10,
    },
    search: {
      flex: 1,
      height: 40,
      borderRadius: 999,
      borderWidth: 1.5,
      borderColor: colors.border,
      paddingHorizontal: 16,
      color: colors.text,
      fontWeight: "600",
      backgroundColor: colors.surfaceRaised,
      fontSize: 14,
    },
    catRow: { paddingHorizontal: 14, paddingBottom: 8, gap: 8 },
    cat: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 999,
      borderWidth: 1.5,
    },
    catText: { fontWeight: "800", fontSize: 13 },
    row: {
      flexDirection: "row",
      paddingHorizontal: 14,
      paddingVertical: 14,
      gap: 12,
      backgroundColor: colors.background,
    },
    thumbWrap: {
      width: 108,
      height: 108,
      borderRadius: 8,
      overflow: "hidden",
      backgroundColor: colors.muted,
    },
    thumb: { width: "100%", height: "100%" },
    thumbFallback: { backgroundColor: colors.muted },
    body: { flex: 1, minHeight: 108 },
    titleRow: { flexDirection: "row", alignItems: "flex-start", gap: 6 },
    title: { flex: 1, fontWeight: "700", color: colors.text, fontSize: 15, lineHeight: 20 },
    meta: { color: colors.textMuted, fontSize: 12, fontWeight: "600", marginTop: 4 },
    price: { color: colors.terracotta, fontWeight: "800", fontSize: 16, marginTop: 6 },
    foot: {
      marginTop: "auto",
      flexDirection: "row",
      alignItems: "flex-end",
      justifyContent: "flex-end",
    },
    stats: { flexDirection: "row", alignItems: "center", gap: 10 },
    stat: { flexDirection: "row", alignItems: "center", gap: 3 },
    statText: { color: colors.textMuted, fontSize: 12, fontWeight: "600" },
    sep: { height: StyleSheet.hairlineWidth, backgroundColor: colors.hairline, marginLeft: 134 },
    empty: { color: colors.textMuted, padding: 24, fontWeight: "600", textAlign: "center" },
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
  });
}
