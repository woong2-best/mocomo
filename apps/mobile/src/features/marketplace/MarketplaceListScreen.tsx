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
import { displayUsedRegion, formatUsedPrice, formatUsedTimeAgo } from "@/features/marketplace/used-catalog";
import { floatingTabClearance } from "@/navigation/tab-layout";
import { showIslandError } from "@/ui/IslandToast";
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
  const isCombined = hubLane !== "purchased" && hubLane !== "favorites" && hubLane !== "disputes";
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const queryClient = useQueryClient();
  const { user, status: authStatus } = useAuth();

  const [q, setQ] = useState(routeParams.q ?? "");
  const [category, setCategory] = useState<string | "ALL">("ALL");
  const [hubOpen, setHubOpen] = useState(false);
  const [liked, setLiked] = useState<Record<string, boolean>>({});
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
      mode: isCombined ? undefined : ("fixed" as const),
      lane:
        hubLane === "recommend" ||
        hubLane === "purchased" ||
        hubLane === "favorites" ||
        hubLane === "disputes"
          ? hubLane
          : undefined,
      take: 48,
    };
  }, [q, category, isCombined, hubLane]);

  const query = useQuery({
    queryKey: ["mobile-marketplace", hubLane ?? "used", listQuery],
    queryFn: () => fetchMarketplaceList(listQuery),
    staleTime: 90_000,
    placeholderData: (previous) => previous,
  });

  const favorite = useMutation({
    mutationFn: (id: string) => toggleMarketplaceFavorite(id),
    onSuccess: (res, id) => {
      setLiked((prev) => ({ ...prev, [id]: res.favorited }));
      void queryClient.invalidateQueries({ queryKey: ["mobile-marketplace"] });
    },
  });

  useEffect(() => {
    const rows = query.data?.items;
    if (!rows?.length) return;
    setLiked((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const row of rows) {
        if (row.favorited != null && next[row.id] === undefined) {
          next[row.id] = row.favorited;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [query.data?.items]);

  const toggleFavorite = useCallback(
    (id: string) => {
      if (authStatus !== "signedIn") {
        showIslandError("로그인 필요", "관심 등록은 로그인 후 이용할 수 있습니다.");
        return;
      }
      favorite.mutate(id);
    },
    [authStatus, favorite]
  );

  const items = (query.data?.items ?? []).filter(
    (item) => item.saleType !== "AUCTION" && !dismissedIds.has(item.id)
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
      navigation.navigate("MarketplaceDetail", { id: item.id });
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
      const on = liked[item.id] ?? item.favorited ?? false;
      const isOwner = !!user?.id && item.sellerId === user.id;
      return (
        <View style={styles.row}>
          <Pressable style={styles.thumbWrap} onPress={() => openItem(item)}>
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
          </Pressable>
          <View style={styles.body}>
            <Pressable
              style={styles.menuBtn}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="더보기"
              onPress={(e) => {
                e.currentTarget.measureInWindow((x, y, width, height) => {
                  setMenuAnchor({ x, y, width, height });
                  setMenuItem(item);
                });
              }}
            >
              <Ionicons name="ellipsis-vertical" size={18} color={muted} />
            </Pressable>
            <Pressable style={styles.bodyTap} onPress={() => openItem(item)}>
              <Text style={styles.title} numberOfLines={2}>
                {item.title || "상품"}
              </Text>
              <Text style={styles.meta} numberOfLines={1}>
                {[displayUsedRegion(item.region || "") || "지역 미정", formatUsedTimeAgo(item.createdAt)].join(" · ")}
              </Text>
              <Text style={styles.price}>
                {auction ? `현재 ${formatUsedPrice(price, item.currency)}` : formatUsedPrice(price, item.currency)}
              </Text>
              <View style={styles.stat}>
                <Ionicons name="eye-outline" size={14} color={muted} />
                <Text style={styles.statText}>{item.viewCount ?? 0}</Text>
                <Ionicons name="heart-outline" size={14} color={muted} style={styles.statIconGap} />
                <Text style={styles.statText}>{item.favoriteCount ?? 0}</Text>
              </View>
              {auction && item.auctionEndsAt && item.status === "SELLING" ? (
                <AuctionCountdown endsAt={item.auctionEndsAt} />
              ) : null}
              {auction && item.bidCount != null ? (
                <View style={styles.stat}>
                  <Ionicons name="chatbubble-outline" size={14} color={muted} />
                  <Text style={styles.statText}>{item.bidCount}</Text>
                </View>
              ) : null}
            </Pressable>
            {!isOwner ? (
              <Pressable
                style={styles.heartBtn}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel={on ? "관심 해제" : "관심 등록"}
                onPress={() => toggleFavorite(item.id)}
              >
                <Ionicons name={on ? "heart" : "heart-outline"} size={22} color={on ? colors.like : muted} />
              </Pressable>
            ) : null}
          </View>
        </View>
      );
    },
    [colors.like, liked, muted, openItem, styles, toggleFavorite, user?.id]
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
    body: { flex: 1, minHeight: 108, position: "relative" },
    bodyTap: { flex: 1, paddingRight: 28 },
    menuBtn: {
      position: "absolute",
      top: 0,
      right: 0,
      zIndex: 2,
      padding: 2,
    },
    heartBtn: {
      position: "absolute",
      right: 0,
      bottom: 0,
      zIndex: 2,
      padding: 4,
    },
    title: { fontWeight: "700", color: colors.text, fontSize: 15, lineHeight: 20, paddingRight: 8 },
    meta: { color: colors.textMuted, fontSize: 12, fontWeight: "600", marginTop: 4 },
    price: { color: colors.terracotta, fontWeight: "800", fontSize: 16, marginTop: 6 },
    stat: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 6 },
    statIconGap: { marginLeft: 8 },
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
