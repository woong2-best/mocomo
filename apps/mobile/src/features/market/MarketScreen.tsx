import { useCallback, useState, useMemo } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { Image } from "expo-image";
import { useQuery } from "@tanstack/react-query";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  fetchStarMarketList,
  type StarMarketListItem,
  type StarMarketType,
} from "@/api/star-market";
import { floatingTabClearance } from "@/navigation/tab-layout";
import { AppHeader } from "@/ui/AppHeader";
import { FolkButton } from "@/ui/FolkButton";
import { Screen } from "@/ui/Screen";
import { IMAGE_CACHE_POLICY } from "@/perf/image";
import { useTheme } from "@/theme/ThemeContext";
import { radii, shadows, spacing, type ThemeColors } from "@/theme/tokens";
import type { RootStackParamList } from "@/navigation/types";

const FILTERS: { id: StarMarketType; label: string }[] = [
  { id: "ALL", label: "전체" },
  { id: "PHYSICAL", label: "굿즈" },
  { id: "DIGITAL", label: "디지털" },
  { id: "CUSTOM_ORDER", label: "주문제작" },
  { id: "PREORDER", label: "예약" },
];

function formatPrice(amount: number, currency: string) {
  if (currency === "KRW" || !currency) {
    return `${amount.toLocaleString("ko-KR")}원`;
  }
  return `${amount.toLocaleString()} ${currency}`;
}

function typeBadge(type: string) {
  return FILTERS.find((f) => f.id === type)?.label ?? type;
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
  const [filter, setFilter] = useState<StarMarketType>("ALL");
  const [q, setQ] = useState("");
  const [submittedQ, setSubmittedQ] = useState("");

  const colGap = 10;
  const pad = spacing.md;
  const cardW = (width - pad * 2 - colGap) / 2;

  const query = useQuery({
    queryKey: ["mobile-star-market", filter, submittedQ],
    queryFn: () =>
      fetchStarMarketList({
        type: filter,
        q: submittedQ || undefined,
        take: 48,
      }),
    staleTime: 90_000,
    placeholderData: (previous) => previous,
  });
  const loading = query.isLoading && !query.data;

  const onOpen = useCallback(
    (item: StarMarketListItem) => {
      if (item.type === "EMOTICON") return;
      navigation.navigate("StarMarketDetail", { id: item.id });
    },
    [navigation]
  );

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
    [cardW, onOpen]
  );

  return (
    <Screen>
      <AppHeader
        title="마켓"
        leftLabel={isTab ? undefined : "뒤로"}
        onLeftPress={isTab ? undefined : () => navigation.goBack()}
        rightSlot={
          <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
            <Pressable onPress={() => navigation.navigate("SellerListings")} hitSlop={8}>
              <Text style={styles.link}>내 판매</Text>
            </Pressable>
            <Pressable onPress={() => navigation.navigate("Discover")} hitSlop={8}>
              <Text style={styles.link}>탐색</Text>
            </Pressable>
          </View>
        }
      />

      <View style={styles.searchRow}>
        <TextInput
          style={styles.search}
          value={q}
          onChangeText={setQ}
          placeholder="사람, 애니, 상품 검색"
          placeholderTextColor={colors.textMuted}
          returnKeyType="search"
          onSubmitEditing={() => setSubmittedQ(q.trim())}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      <FlatList
        horizontal
        data={FILTERS}
        keyExtractor={(f) => f.id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
        style={styles.chipList}
        renderItem={({ item: f }) => {
          const active = filter === f.id;
          return (
            <Pressable
              onPress={() => setFilter(f.id)}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{f.label}</Text>
            </Pressable>
          );
        }}
      />

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.terracotta} />
      ) : query.isError ? (
        <View style={styles.center}>
          <Text style={styles.error}>마켓을 불러오지 못했습니다.</Text>
          <FolkButton label="다시 시도" onPress={() => void query.refetch()} />
        </View>
      ) : (
        <FlatList
          data={query.data?.items ?? []}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={{ gap: colGap, paddingHorizontal: pad }}
          contentContainerStyle={{ paddingBottom: bottomPad, gap: colGap, paddingTop: spacing.sm }}
          renderItem={renderItem}
          ListEmptyComponent={<Text style={styles.muted}>판매 중인 상품이 없습니다.</Text>}
        />
      )}
    </Screen>
  );
}

function createThemedStyles(colors: ThemeColors) {
  return StyleSheet.create({
  link: { fontSize: 14, fontWeight: "800", color: colors.terracotta },
  searchRow: { paddingHorizontal: spacing.md, paddingTop: spacing.sm },
  search: {
    backgroundColor: colors.muted,
    borderWidth: 2,
    borderColor: "rgba(27, 74, 140, 0.2)",
    borderRadius: radii.pill,
    paddingHorizontal: 16,
    paddingVertical: 11,
    fontSize: 15,
    color: colors.text,
  },
  chipList: { maxHeight: 52, marginTop: spacing.sm },
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
  muted: { color: colors.textMuted, padding: spacing.lg, textAlign: "center", fontWeight: "600" },
});
}

