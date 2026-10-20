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
import { fetchStudios, type StudioCard } from "@/api/studios";
import { AuctionCountdown } from "@/features/marketplace/AuctionCountdown";
import {
  displayUsedRegion,
  formatUsedPrice,
  formatUsedTimeAgo,
} from "@/features/marketplace/used-catalog";
import {
  findHubCategory,
  hubForTrack,
  HUB_BROWSE_ALL_ID,
  isDigitalListing,
  type MarketScope,
} from "@/features/marketplace/market-browse";
import { useI18n } from "@/i18n/I18nProvider";
import { floatingTabClearance } from "@/navigation/tab-layout";
import { showIslandError } from "@/ui/IslandToast";
import { Screen } from "@/ui/Screen";
import { SearchField } from "@/ui/SearchField";
import { SensitiveContentGate } from "@/ui/SensitiveContentGate";
import { IMAGE_CACHE_POLICY } from "@/perf/image";
import { useTheme } from "@/theme/ThemeContext";
import type { ThemeColors } from "@/theme/tokens";
import type { RootStackParamList } from "@/navigation/types";
import { useAuth } from "@/auth/AuthContext";
import { MarketHubSlidePanel } from "@/features/marketplace/MarketHubSlidePanel";
import type { MarketHubLane } from "@/features/marketplace/MarketHomeScreen";
import { loadRecentSearches, rememberSearch } from "@/features/marketplace/market-memory";
import {
  UsedListingOverflowMenu,
  type MenuAnchor,
} from "@/features/marketplace/UsedListingOverflowMenu";
import { loadDismissedUsedListingIds } from "@/lib/used-listing-dismiss";
import { SellChoiceSheet } from "@/features/marketplace/SellChoiceSheet";

type HubLane = MarketHubLane;
type Props = { mode?: "tab" | "stack"; lane?: "used" | "auction" };

function digitalStepLabel(meta: unknown, t: (key: string) => string) {
  const status =
    meta && typeof meta === "object" && !Array.isArray(meta)
      ? (meta as { digitalDelivery?: { status?: string } }).digitalDelivery?.status
      : undefined;
  if (status === "progress") return t("m.market.track.in_progress");
  if (status === "uploaded") return t("m.market.track.file_uploaded");
  if (status === "completed") return t("m.market.track.completed");
  return t("m.market.track.payment_held");
}

type BrowsePick = { source: "hub" | "shelf"; id: string };

const LANE_PILLS = [
  { id: "purchased" as const, labelKey: "m.marketplace.purchases" },
  { id: "sales" as const, labelKey: "m.marketplace.sales" },
  { id: "favorites" as const, labelKey: "m.marketplace.favorites" },
];

export function MarketplaceListScreen({ mode = "stack", lane = "used" }: Props) {
  const { t } = useI18n();
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
  const isCombined =
    hubLane !== "purchased" &&
    hubLane !== "sales" &&
    hubLane !== "favorites" &&
    hubLane !== "disputes" &&
    hubLane !== "my-bids";
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const queryClient = useQueryClient();
  const { user, status: authStatus } = useAuth();

  const [q, setQ] = useState(routeParams.q ?? "");
  const [recentQ, setRecentQ] = useState<string[]>([]);
  const [searchFocused, setSearchFocused] = useState(false);
  const [browse, setBrowse] = useState<BrowsePick>({ source: "hub", id: HUB_BROWSE_ALL_ID });
  const [scope, setScope] = useState<MarketScope>("physical");
  const [hubOpen, setHubOpen] = useState(false);
  const [liked, setLiked] = useState<Record<string, boolean>>({});
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [menuItem, setMenuItem] = useState<MarketplaceListItem | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<MenuAnchor | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [sellOpen, setSellOpen] = useState(false);
  useEffect(() => {
    void loadDismissedUsedListingIds().then(setDismissedIds);
  }, []);
  useEffect(() => {
    void loadRecentSearches().then((terms) => setRecentQ(terms.slice(0, 3)));
  }, []);

  const saveSearch = useCallback((term: string) => {
    const trimmed = term.trim();
    if (!trimmed) return;
    void rememberSearch(trimmed).then((terms) => setRecentQ(terms.slice(0, 3)));
  }, []);

  const applySearch = useCallback(
    (term: string) => {
      setQ(term);
      saveSearch(term);
      setSearchFocused(false);
    },
    [saveSearch]
  );

  const listQuery = useMemo(() => {
    const hub =
      browse.source === "hub" && browse.id !== HUB_BROWSE_ALL_ID ? findHubCategory(browse.id) : undefined;
    const personalLane = !isCombined;
    return {
      q: q || undefined,
      category: personalLane ? undefined : hub?.category,
      product: personalLane ? undefined : hub?.product,
      track: personalLane ? undefined : scope,
      lane: hubLane === "recommend" ||
            hubLane === "purchased" ||
            hubLane === "sales" ||
            hubLane === "favorites" ||
            hubLane === "disputes" ||
            hubLane === "my-bids"
          ? hubLane
          : undefined,
      take: 48,
    };
  }, [q, browse, isCombined, hubLane, scope]);

  const query = useQuery({
    queryKey: ["mobile-marketplace", hubLane ?? "used", listQuery],
    queryFn: () => fetchMarketplaceList(listQuery),
    staleTime: 90_000,
    refetchOnMount: false,
    placeholderData: (previous) => previous,
  });

  const showStudios = isCombined && scope !== "physical";
  const studiosQuery = useQuery({
    queryKey: ["studios", q],
    queryFn: () => fetchStudios(q),
    enabled: showStudios,
    staleTime: 60_000,
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([query.refetch(), showStudios ? studiosQuery.refetch() : Promise.resolve()]);
    } finally {
      setRefreshing(false);
    }
  }, [query, showStudios, studiosQuery]);

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
        showIslandError(
          t("m.common.sign_in_required"),
          t("m.marketplace.sign_in_to_save_favorites")
        );
        return;
      }
      favorite.mutate(id);
    },
    [authStatus, favorite, t]
  );

  const items = (query.data?.items ?? []).filter((item) => !dismissedIds.has(item.id));
  const feedRows = useMemo(() => {
    const rows: Array<{ kind: "studio"; studio: StudioCard } | { kind: "listing"; item: MarketplaceListItem }> = [];
    if (showStudios) {
      for (const studio of studiosQuery.data?.items ?? []) rows.push({ kind: "studio", studio });
    }
    for (const item of items) rows.push({ kind: "listing", item });
    return rows;
  }, [items, showStudios, studiosQuery.data?.items]);

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

  const clearPersonalLane = useCallback(() => {
    if (!hubLane) return;
    if (isTab) setHubLaneLocal(undefined);
    else navigation.setParams({ lane: undefined });
  }, [hubLane, isTab, navigation]);

  const hubMenuCategories = useMemo(() => hubForTrack(scope), [scope]);

  const selectHubCategory = useCallback(
    (id: string) => {
      setBrowse({ source: "hub", id });
      if (id !== HUB_BROWSE_ALL_ID) {
        const picked = findHubCategory(id);
        if (picked?.product) setScope("digital");
        else if (picked?.category) setScope("physical");
      }
      clearPersonalLane();
      setHubOpen(false);
    },
    [clearPersonalLane]
  );

  const onLanePill = useCallback(
    (id: (typeof LANE_PILLS)[number]["id"]) => {
      if (authStatus !== "signedIn" && (id === "purchased" || id === "sales" || id === "favorites")) {
        showIslandError(t("m.common.sign_in_required"), t("m.marketplace.sign_in_to_view_trades"));
        return;
      }
      if (hubLane === id) {
        applyHubLane("all");
        return;
      }
      applyHubLane(id);
    },
    [applyHubLane, authStatus, hubLane, t]
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
              accessibilityLabel={t("nav.more")}
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
                {item.title || t("m.marketplace.listing")}
              </Text>
              <Text style={styles.meta} numberOfLines={1}>
                {[
                  displayUsedRegion(item.region || "", t) || t("m.marketplace.location_tbd"),
                  formatUsedTimeAgo(item.createdAt, t),
                ].join(" · ")}
              </Text>
              <Text style={styles.price}>
                {auction
                  ? `${t("m.marketplace.current")} ${formatUsedPrice(price, item.currency, t)}`
                  : formatUsedPrice(price, item.currency, t)}
              </Text>
              {item.bidResult === "lost" ? (
                <Text style={styles.meta}>{t("m.market.track.transaction_failed")}</Text>
              ) : null}
              {isDigitalListing(item) ? (
                <Text style={styles.meta}>{digitalStepLabel(item.subcultureMeta, t)}</Text>
              ) : null}
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
                accessibilityLabel={
                  on ? t("m.marketplace.remove_favorite") : t("m.marketplace.add_to_favorites")
                }
                onPress={() => toggleFavorite(item.id)}
              >
                <Ionicons name={on ? "heart" : "heart-outline"} size={22} color={on ? colors.like : muted} />
              </Pressable>
            ) : null}
          </View>
        </View>
      );
    },
    [colors.like, liked, muted, openItem, styles, t, toggleFavorite, t, user?.id]
  );

  const renderStudio = useCallback(
    (studio: StudioCard) => {
      const cover = studio.coverUrl
        ? { url: studio.coverUrl, kind: "image" as const }
        : studio.portfolio.find((item) => item.kind !== "video") ?? studio.portfolio[0];
      return (
        <Pressable style={styles.row} onPress={() => navigation.navigate("StudioDetail", { id: studio.id })}>
          <View style={styles.thumbWrap}>
            {cover && cover.kind !== "video" ? (
              <Image source={{ uri: cover.url }} style={StyleSheet.absoluteFill} cachePolicy={IMAGE_CACHE_POLICY} transition={0} />
            ) : (
              <View style={[StyleSheet.absoluteFill, styles.thumbFallback]} />
            )}
          </View>
          <View style={styles.body}>
            <Text style={styles.title} numberOfLines={2}>{studio.title}</Text>
            <Text style={styles.meta} numberOfLines={1}>@{studio.seller.username}</Text>
            <Text style={styles.price}>{t("m.studio.from")} {formatUsedPrice(studio.fromPrice, studio.currency, t)}</Text>
            <Text style={[styles.meta, { color: studio.accepting ? "#1f8a4c" : colors.terracotta }]}>
              {studio.accepting
                ? `${t("m.studio.open")} ${studio.slotsUsed}/${studio.slotCap}`
                : `${t("m.studio.closed")} ${studio.slotsUsed}/${studio.slotCap}`}
            </Text>
          </View>
        </Pressable>
      );
    },
    [colors.terracotta, navigation, styles, t]
  );

  const hubActiveId = isCombined && browse.source === "hub" ? browse.id : null;
  const visibleItems = items;
  const recentTerms = recentQ.slice(0, 3);
  const scopeActive = isCombined ? scope : null;
  const filterBar = (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroller} contentContainerStyle={styles.catRow}>
      {([
        ["physical", "m.market.scope.physical"],
        ["digital", "m.market.scope.digital"],
      ] as const).map(([id, key]) => {
        const active = scopeActive === id;
        return (
          <Pressable
            key={id}
            onPress={() => {
              setScope(id);
              const picked = findHubCategory(browse.id);
              if (id === "physical" && picked?.product) {
                setBrowse({ source: "hub", id: HUB_BROWSE_ALL_ID });
              } else if (id === "digital" && picked?.category) {
                setBrowse({ source: "hub", id: HUB_BROWSE_ALL_ID });
              }
              clearPersonalLane();
            }}
            style={[styles.cat, { backgroundColor: active ? colors.brand : colors.surfaceRaised, borderColor: active ? colors.brand : colors.border }]}
          >
            <Text style={[styles.catText, { color: active ? colors.textOnAccent : colors.brand }]}>{t(key)}</Text>
          </Pressable>
        );
      })}
      {LANE_PILLS.map((item) => {
        const active = hubLane === item.id;
        return (
          <Pressable
            key={item.id}
            onPress={() => onLanePill(item.id)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={[styles.cat, { backgroundColor: active ? colors.brand : colors.surfaceRaised, borderColor: active ? colors.brand : colors.border }]}
          >
            <Text style={[styles.catText, { color: active ? colors.textOnAccent : colors.brand }]}>{t(item.labelKey)}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );

  const listEmpty =
    query.isLoading && !query.data ? (
      <ActivityIndicator style={{ marginTop: 24 }} color={colors.terracotta} />
    ) : query.isError ? (
      <Pressable style={{ padding: 24 }} onPress={() => void query.refetch()}>
        <Text style={styles.empty}>
          {t("m.common.could_not_load_list_tap_to")}
        </Text>
      </Pressable>
    ) : (
      <Text style={styles.empty}>
        {hubLane === "my-bids"
          ? t("m.marketplace.no_active_bids")
          : hubLane === "purchased"
            ? t("m.marketplace.no_purchases_yet")
            : hubLane === "sales"
              ? t("m.marketplace.you_have_no_used_market_listings")
                : hubLane === "favorites"
                  ? t("m.marketplace.no_favorites_yet")
                  : t("m.marketplace.no_listings_match_your_filters")}
      </Text>
    );

  return (
    <Screen>
      <View style={styles.searchRow}>
        <Pressable
          onPress={() => {
            if (isTab) navigation.navigate("Main", { screen: "Home" });
            else navigation.goBack();
          }}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={t("common.back")}
        >
          <Ionicons name="chevron-back" size={26} color={ink} />
        </Pressable>
        <SearchField
          variant="pill"
          value={q}
          onChangeText={setQ}
          onClear={() => setQ("")}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => {
            saveSearch(q);
            setTimeout(() => setSearchFocused(false), 180);
          }}
          onSubmitEditing={() => saveSearch(q)}
          placeholder={t("common.search")}
          containerStyle={{ flex: 1 }}
        />
        <Pressable
          onPress={() => setHubOpen(true)}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={t("m.marketplace.market_menu")}
        >
          <Ionicons name="menu-outline" size={26} color={ink} />
        </Pressable>
      </View>
      {filterBar}
      <View style={styles.listWrap}>
      <FlatList
        data={query.isError ? [] : feedRows}
        keyExtractor={(row) => (row.kind === "studio" ? `studio-${row.studio.id}` : row.item.id)}
        renderItem={({ item: row }) => (row.kind === "studio" ? renderStudio(row.studio) : renderItem({ item: row.item }))}
        ListEmptyComponent={listEmpty}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingBottom: (isTab ? floatingTabClearance(insets.bottom) : insets.bottom) + 88,
          flexGrow: 1,
        }}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        refreshing={refreshing}
        onRefresh={() => void onRefresh()}
      />
      {searchFocused && recentTerms.length > 0 ? (
        <View style={styles.searchPopup}>
          <Pressable style={styles.searchBackdrop} onPress={() => setSearchFocused(false)} />
          <View style={[styles.searchPanel, { backgroundColor: colors.surfaceRaised, borderColor: colors.hairline }]}>
            <View style={[styles.recentHead, { backgroundColor: colors.surface }]}>
              <Text style={[styles.recentRank, { color: colors.textMuted }]}>#</Text>
              <Text style={[styles.recentHeadTitle, { color: colors.text }]}>{t("m.marketplace.recent_searches")}</Text>
            </View>
            {recentTerms.map((term, index) => (
              <Pressable
                key={term}
                onPressIn={() => applySearch(term)}
                style={[styles.recentRow, { borderTopColor: colors.hairline }]}
              >
                <Text style={[styles.recentRank, { color: index === 0 ? "#d63a3a" : colors.textMuted }]}>{index + 1}</Text>
                <Text style={styles.recentTerm} numberOfLines={1}>{term}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}
      </View>

      <Pressable
        style={[
          styles.fab,
          { bottom: (isTab ? floatingTabClearance(insets.bottom) : insets.bottom) + 12 },
        ]}
        onPress={() => setSellOpen((open) => !open)}
        accessibilityRole="button"
        accessibilityLabel={sellOpen ? t("common.back") : t("m.studio.sell")}
      >
        <Ionicons name={sellOpen ? "close" : "add"} size={30} color="#fff" />
      </Pressable>
      <SellChoiceSheet
        visible={sellOpen}
        bottom={(isTab ? floatingTabClearance(insets.bottom) : insets.bottom) + 76}
        onClose={() => setSellOpen(false)}
        onPhysical={() => {
          setSellOpen(false);
          navigation.navigate("UsedCreate");
        }}
        onDigital={() => {
          setSellOpen(false);
          navigation.navigate("StudioEditor");
        }}
      />

      <MarketHubSlidePanel
        visible={hubOpen}
        onClose={() => setHubOpen(false)}
        onSelectCategory={selectHubCategory}
        selectedCategoryId={hubActiveId}
        categories={hubMenuCategories}
      />

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
    listWrap: {
      flex: 1,
    },
    searchPopup: {
      position: "absolute",
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
      zIndex: 50,
    },
    searchBackdrop: {
      ...StyleSheet.absoluteFill,
    },
    searchPanel: {
      marginHorizontal: 10,
      marginTop: 4,
      borderRadius: 10,
      borderWidth: 1,
      overflow: "hidden",
      elevation: 8,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
    },
    recentHead: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    recentRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderTopWidth: 1,
    },
    recentRank: {
      width: 28,
      textAlign: "center",
      fontSize: 12,
      fontWeight: "700",
    },
    recentHeadTitle: {
      flex: 1,
      fontSize: 13,
      fontWeight: "800",
    },
    recentTerm: {
      flex: 1,
      fontSize: 13,
      fontWeight: "700",
      color: "#1a4db3",
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
    chipScroller: { flexGrow: 0 },
    trackRow: { flexDirection: "row", gap: 8, paddingHorizontal: 14, paddingBottom: 8 },
    trackTab: {
      flex: 1,
      minHeight: 48,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.surfaceRaised,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 8,
    },
    trackTabOn: { backgroundColor: colors.brand, borderColor: colors.brand },
    trackText: { fontWeight: "800", fontSize: 14, color: colors.brand, textAlign: "center" },
    trackTextOn: { color: colors.textOnAccent },
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
