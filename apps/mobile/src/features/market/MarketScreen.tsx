import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fetchCommerceMarketList, fetchMarketSellAccess } from "@/api/commerce-market";
import type { StarMarketListItem } from "@/api/star-market";
import { MarketHeroShowcase } from "@/features/market/MarketHeroShowcase";
import { MarketServiceStrip } from "@/features/market/MarketServiceStrip";
import { floatingTabClearance } from "@/navigation/tab-layout";
import { FolkButton } from "@/ui/FolkButton";
import { Screen } from "@/ui/Screen";
import { IMAGE_CACHE_POLICY } from "@/perf/image";
import {
  MARKET_BRAND_FULL,
  MARKET_BRAND_NAME,
  MARKET_LISTING_FILTERS,
  type MarketListingFilterId,
} from "@/lib/market-brand";
import { getMarketplaceCartCount } from "@/lib/marketplace-cart";
import { useTheme } from "@/theme/ThemeContext";
import { radii, shadows, spacing, type ThemeColors } from "@/theme/tokens";
import type { RootStackParamList } from "@/navigation/types";

function formatPrice(amount: number, currency: string) {
  if (currency === "KRW" || !currency) {
    return `${amount.toLocaleString("ko-KR")}원`;
  }
  return `${amount.toLocaleString()} ${currency}`;
}

function typeBadge(type: string) {
  return MARKET_LISTING_FILTERS.find((f) => f.id === type)?.label ?? type;
}

export function MarketScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createThemedStyles(colors), [colors]);

  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const route = useRoute();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const isTab = route.name === "Market";
  const bottomPad = isTab ? floatingTabClearance(insets.bottom) : insets.bottom + 32;

  const [filter, setFilter] = useState<MarketListingFilterId>("ALL");
  const [q, setQ] = useState("");
  const [submittedQ, setSubmittedQ] = useState("");
  const [cartCount, setCartCount] = useState(0);

  const colGap = 10;
  const pad = spacing.md;
  const cardW = (width - pad * 2 - colGap) / 2;

  useFocusEffect(
    useCallback(() => {
      void getMarketplaceCartCount().then(setCartCount);
    }, [])
  );

  const query = useQuery({
    queryKey: ["mobile-commerce-market", filter, submittedQ],
    queryFn: () =>
      fetchCommerceMarketList({
        type: filter === "ALL" ? undefined : filter,
        q: submittedQ || undefined,
        take: 48,
      }),
    staleTime: 90_000,
    placeholderData: (previous) => previous,
  });
  const loading = query.isLoading && !query.data;

  const showHero = !submittedQ && filter === "ALL";

  const onOpen = useCallback(
    (item: StarMarketListItem) => {
      if (item.type === "EMOTICON") return;
      navigation.navigate("StarMarketDetail", { id: item.id });
    },
    [navigation]
  );

  async function onSellRegister() {
    try {
      const gate = await fetchMarketSellAccess();
      if (gate.allowed) {
        navigation.navigate("MarketSellItem");
      } else if (gate.redirectTo === "register") {
        navigation.navigate("SellerRegister");
      } else {
        navigation.navigate("SellerListings");
      }
    } catch {
      navigation.navigate("SellerRegister");
    }
  }

  const renderItem = useCallback(
    ({ item }: { item: StarMarketListItem }) => (
      <Pressable style={[styles.card, { width: cardW }]} onPress={() => onOpen(item)}>
        {item.coverUrl ? (
          <Image
            source={{ uri: item.coverUrl }}
            style={styles.cover}
            cachePolicy={IMAGE_CACHE_POLICY}
            transition={0}
          />
        ) : (
          <View style={[styles.cover, styles.coverFallback]} />
        )}
        <Text style={styles.badge}>{typeBadge(item.type)}</Text>
        <Text style={styles.title} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.price}>{formatPrice(item.priceAmount, item.currency)}</Text>
        {item.seller ? (
          <Text style={styles.seller} numberOfLines={1}>
            {item.seller.displayName || `@${item.seller.username}`}
          </Text>
        ) : null}
      </Pressable>
    ),
    [cardW, onOpen, styles]
  );

  const listHeader = (
    <View>
      <View style={styles.brandHeader}>
        <View style={styles.brandTextWrap}>
          <Text style={styles.brandEyebrow}>{MARKET_BRAND_FULL}</Text>
          <Text style={styles.brandTitle}>{MARKET_BRAND_NAME}</Text>
        </View>
        <Pressable style={styles.sellBtn} onPress={() => void onSellRegister()}>
          <Text style={styles.sellBtnText}>판매 등록</Text>
        </Pressable>
      </View>

      <View style={styles.toolbar}>
        <View style={styles.searchWrap}>
          <Ionicons name="search" size={18} color={colors.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.search}
            value={q}
            onChangeText={setQ}
            placeholder="상품 검색"
            placeholderTextColor={colors.textMuted}
            returnKeyType="search"
            onSubmitEditing={() => setSubmittedQ(q.trim())}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
        <Pressable style={styles.quickBtn} onPress={() => navigation.navigate("MarketOrders")}>
          <Ionicons name="person-outline" size={20} color={colors.cobalt} />
          <Text style={styles.quickLabel}>마이</Text>
        </Pressable>
        <Pressable style={styles.quickBtn} onPress={() => navigation.navigate("MarketCart")}>
          <Ionicons name="cart-outline" size={20} color={colors.cobalt} />
          {cartCount > 0 ? (
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{cartCount > 99 ? "99+" : cartCount}</Text>
            </View>
          ) : null}
          <Text style={styles.quickLabel}>장바구니</Text>
        </Pressable>
      </View>

      <MarketServiceStrip navigation={navigation} onFilter={setFilter} />

      {showHero ? (
        <MarketHeroShowcase navigation={navigation} onFilter={setFilter} />
      ) : null}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
        style={styles.chipList}
      >
        {MARKET_LISTING_FILTERS.map((f) => {
          const active = filter === f.id;
          return (
            <Pressable
              key={f.id}
              onPress={() => setFilter(f.id)}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{f.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>
          {submittedQ
            ? `"${submittedQ}" 검색 결과`
            : filter !== "ALL"
              ? MARKET_LISTING_FILTERS.find((f) => f.id === filter)?.label
              : "오늘의 발견"}
        </Text>
        <Text style={styles.sectionSub}>서브컬처 크리에이터 상품을 한눈에</Text>
      </View>
    </View>
  );

  return (
    <Screen>
      {loading ? (
        <View style={{ flex: 1 }}>
          {listHeader}
          <ActivityIndicator style={{ marginTop: 40 }} color={colors.terracotta} />
        </View>
      ) : query.isError ? (
        <View style={{ flex: 1 }}>
          {listHeader}
          <View style={styles.center}>
            <Text style={styles.error}>마켓을 불러오지 못했습니다.</Text>
            <FolkButton label="다시 시도" onPress={() => void query.refetch()} />
          </View>
        </View>
      ) : (
        <FlatList
          data={query.data?.items ?? []}
          keyExtractor={(item) => item.id}
          numColumns={2}
          ListHeaderComponent={listHeader}
          columnWrapperStyle={{ gap: colGap, paddingHorizontal: pad }}
          contentContainerStyle={{ paddingBottom: bottomPad, gap: colGap, paddingTop: spacing.sm }}
          renderItem={renderItem}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.muted}>아직 등록된 상품이 없습니다</Text>
            </View>
          }
        />
      )}
    </Screen>
  );
}

function createThemedStyles(colors: ThemeColors) {
  return StyleSheet.create({
    brandHeader: {
      flexDirection: "row",
      alignItems: "flex-end",
      justifyContent: "space-between",
      paddingHorizontal: spacing.md,
      paddingTop: spacing.md,
      gap: 12,
    },
    brandTextWrap: { flex: 1, minWidth: 0 },
    brandEyebrow: {
      fontSize: 11,
      fontWeight: "800",
      letterSpacing: 1,
      color: colors.terracotta,
      textTransform: "uppercase",
    },
    brandTitle: {
      fontSize: 22,
      fontWeight: "800",
      color: colors.text,
      marginTop: 2,
    },
    sellBtn: {
      backgroundColor: colors.terracotta,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: radii.lg,
    },
    sellBtnText: { color: "#fff", fontWeight: "800", fontSize: 13 },
    toolbar: {
      flexDirection: "row",
      alignItems: "stretch",
      gap: 8,
      paddingHorizontal: spacing.md,
      paddingTop: spacing.sm,
    },
    searchWrap: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.searchFill,
      borderWidth: 2,
      borderColor: "rgba(27, 74, 140, 0.2)",
      borderRadius: radii.lg,
      paddingHorizontal: 12,
    },
    searchIcon: { marginRight: 6 },
    search: {
      flex: 1,
      paddingVertical: 10,
      fontSize: 15,
      color: colors.text,
    },
    quickBtn: {
      width: 52,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 2,
      borderColor: "rgba(27, 74, 140, 0.15)",
      borderRadius: radii.lg,
      backgroundColor: colors.surfaceRaised,
      paddingVertical: 6,
    },
    quickLabel: { fontSize: 10, fontWeight: "800", color: colors.text, marginTop: 2 },
    cartBadge: {
      position: "absolute",
      top: 4,
      right: 6,
      minWidth: 16,
      height: 16,
      borderRadius: 8,
      backgroundColor: colors.cobalt,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 3,
    },
    cartBadgeText: { color: "#fff", fontSize: 9, fontWeight: "800" },
    chipList: { maxHeight: 52, marginTop: spacing.md },
    chips: { paddingHorizontal: spacing.md, gap: 8, alignItems: "center" },
    chip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: radii.pill,
      backgroundColor: colors.surfaceRaised,
      borderWidth: 2,
      borderColor: "rgba(27, 74, 140, 0.22)",
    },
    chipActive: {
      backgroundColor: colors.terracotta,
      borderColor: "rgba(27, 74, 140, 0.25)",
    },
    chipText: { fontSize: 13, fontWeight: "700", color: colors.cobalt },
    chipTextActive: { color: colors.textOnAccent },
    sectionHead: {
      paddingHorizontal: spacing.md,
      paddingTop: spacing.md,
      paddingBottom: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: "rgba(27, 74, 140, 0.1)",
      marginBottom: spacing.sm,
    },
    sectionTitle: { fontSize: 17, fontWeight: "800", color: colors.text },
    sectionSub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
    card: {
      backgroundColor: colors.surfaceRaised,
      borderRadius: radii.lg,
      overflow: "hidden",
      borderWidth: 2,
      borderColor: "rgba(27, 74, 140, 0.2)",
      paddingBottom: 10,
      ...shadows.folkSm,
    },
    cover: { width: "100%", aspectRatio: 1, backgroundColor: colors.muted },
    coverFallback: {},
    badge: {
      marginTop: 8,
      marginHorizontal: 10,
      fontSize: 11,
      fontWeight: "800",
      color: colors.terracotta,
    },
    title: {
      marginTop: 2,
      marginHorizontal: 10,
      fontSize: 14,
      fontWeight: "800",
      color: colors.text,
      minHeight: 36,
    },
    price: {
      marginTop: 4,
      marginHorizontal: 10,
      fontSize: 14,
      fontWeight: "800",
      color: colors.cobalt,
    },
    seller: {
      marginTop: 2,
      marginHorizontal: 10,
      fontSize: 12,
      color: colors.textMuted,
    },
    center: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.lg, gap: 12 },
    error: { color: colors.danger, fontWeight: "600" },
    emptyBox: {
      marginHorizontal: spacing.md,
      padding: spacing.xl,
      borderWidth: 2,
      borderStyle: "dashed",
      borderColor: "rgba(27, 74, 140, 0.25)",
      borderRadius: radii.lg,
      alignItems: "center",
    },
    muted: { color: colors.textMuted, textAlign: "center", fontWeight: "600" },
  });
}
