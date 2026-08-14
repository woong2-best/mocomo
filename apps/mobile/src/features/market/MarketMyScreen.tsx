import { useCallback, useMemo } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
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
import {
  fetchMarketOrderSummary,
  fetchMarketRelatedByTags,
  fetchMarketSponsorAd,
  fetchMeProfile,
} from "@/api/commerce-market";
import type { StarMarketListItem } from "@/api/star-market";
import { API_BASE_URL } from "@/config/env";
import { collectRecentTags, recentListingIds } from "@/lib/market-recently-viewed";
import { Screen } from "@/ui/Screen";
import { FolkAvatar } from "@/ui/FolkAvatar";
import { IMAGE_CACHE_POLICY } from "@/perf/image";
import { floatingTabClearance } from "@/navigation/tab-layout";
import { useTheme } from "@/theme/ThemeContext";
import { radii, shadows, spacing, type ThemeColors } from "@/theme/tokens";
import type { RootStackParamList } from "@/navigation/types";

type QuickAction = {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  route:
    | "MarketOrders"
    | "MarketWishlist"
    | "MarketRecent"
    | "MarketCreatorItems"
    | "MarketCoupons";
};

const QUICK_ACTIONS: QuickAction[] = [
  { key: "orders", label: "주문내역", icon: "receipt-outline", route: "MarketOrders" },
  { key: "wishlist", label: "찜리스트", icon: "heart-outline", route: "MarketWishlist" },
  { key: "recent", label: "최근본상품", icon: "time-outline", route: "MarketRecent" },
  { key: "creators", label: "크리에이터", icon: "people-outline", route: "MarketCreatorItems" },
  { key: "coupons", label: "쿠폰", icon: "ticket-outline", route: "MarketCoupons" },
];

function orderStatusLabel(status: string) {
  switch (status) {
    case "DELIVERED":
    case "CONFIRMED":
    case "SETTLED":
      return { label: "배송완료", color: "success" as const };
    case "SHIPPED":
      return { label: "배송중", color: "success" as const };
    case "PREPARING":
    case "PAID":
      return { label: "준비중", color: "cobalt" as const };
    case "CANCELLED":
    case "REFUNDED":
      return { label: "취소완료", color: "muted" as const };
    default:
      return { label: status, color: "muted" as const };
  }
}

function formatPrice(amount: number, currency: string) {
  if (currency === "KRW" || !currency) return `${amount.toLocaleString("ko-KR")}원`;
  return `${amount.toLocaleString()} ${currency}`;
}

function ProductChip({
  item,
  onPress,
  styles,
}: {
  item: StarMarketListItem;
  onPress: () => void;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <Pressable style={styles.productChip} onPress={onPress}>
      {item.coverUrl ? (
        <Image source={{ uri: item.coverUrl }} style={styles.productImg} cachePolicy={IMAGE_CACHE_POLICY} />
      ) : (
        <View style={[styles.productImg, styles.productImgFallback]} />
      )}
      <Text style={styles.productTitle} numberOfLines={2}>
        {item.title}
      </Text>
      <Text style={styles.productPrice}>{formatPrice(item.priceAmount, item.currency)}</Text>
    </Pressable>
  );
}

export function MarketMyScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const bottomPad = floatingTabClearance(insets.bottom);

  const meQuery = useQuery({
    queryKey: ["mobile-me-profile"],
    queryFn: fetchMeProfile,
  });

  const ordersQuery = useQuery({
    queryKey: ["mobile-market-order-summary"],
    queryFn: fetchMarketOrderSummary,
  });

  const sponsorQuery = useQuery({
    queryKey: ["mobile-market-sponsor-ad"],
    queryFn: fetchMarketSponsorAd,
    staleTime: 30 * 60_000,
  });

  const relatedQuery = useQuery({
    queryKey: ["mobile-market-related"],
    queryFn: async () => {
      const [tags, exclude] = await Promise.all([collectRecentTags(), recentListingIds()]);
      if (tags.length === 0) return { items: [] as StarMarketListItem[] };
      return fetchMarketRelatedByTags(tags, exclude);
    },
  });

  useFocusEffect(
    useCallback(() => {
      void ordersQuery.refetch();
      void relatedQuery.refetch();
    }, [ordersQuery, relatedQuery])
  );

  const nickname = meQuery.data?.user?.name || meQuery.data?.user?.username || "마이";
  const sponsor = sponsorQuery.data?.event;

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: bottomPad + 24 }}>
        <View style={styles.profileRow}>
          <FolkAvatar uri={meQuery.data?.user?.image} name={nickname} size={52} />
          <Text style={styles.nickname}>{nickname}</Text>
          <Pressable
            style={styles.settingsBtn}
            onPress={() => navigation.navigate("Settings")}
            hitSlop={8}
          >
            <Ionicons name="settings-outline" size={24} color={colors.cobalt} />
          </Pressable>
        </View>

        <View style={styles.quickRow}>
          {QUICK_ACTIONS.map((a) => (
            <Pressable
              key={a.key}
              style={styles.quickItem}
              onPress={() => navigation.navigate(a.route)}
            >
              <View style={styles.quickIcon}>
                <Ionicons name={a.icon} size={22} color={colors.cobalt} />
              </View>
              <Text style={styles.quickLabel}>{a.label}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>주문 내역</Text>
            <Pressable onPress={() => navigation.navigate("MarketOrders")}>
              <Text style={styles.sectionLink}>전체 보기 ›</Text>
            </Pressable>
          </View>
          {ordersQuery.isLoading ? (
            <ActivityIndicator color={colors.terracotta} style={{ marginVertical: 16 }} />
          ) : (ordersQuery.data?.orders.length ?? 0) === 0 ? (
            <Text style={styles.emptyLine}>주문 내역이 없습니다.</Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.orderRow}>
              {ordersQuery.data?.orders.map((o) => {
                const st = orderStatusLabel(o.status);
                const statusColor =
                  st.color === "success"
                    ? colors.success
                    : st.color === "cobalt"
                      ? colors.cobalt
                      : colors.textMuted;
                return (
                  <Pressable
                    key={o.id}
                    style={styles.orderCard}
                    onPress={() => navigation.navigate("MarketOrders")}
                  >
                    {o.coverUrl ? (
                      <Image
                        source={{ uri: o.coverUrl }}
                        style={styles.orderImg}
                        cachePolicy={IMAGE_CACHE_POLICY}
                      />
                    ) : (
                      <View style={[styles.orderImg, styles.productImgFallback]} />
                    )}
                    <Text style={[styles.orderStatus, { color: statusColor }]}>{st.label}</Text>
                    <Text style={styles.orderTitle} numberOfLines={2}>
                      {o.title}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
        </View>

        {sponsor ? (
          <Pressable
            style={styles.adBanner}
            onPress={() => void Linking.openURL(`${API_BASE_URL.replace(/\/$/, "")}${sponsor.href}`)}
          >
            <Image
              source={{ uri: sponsor.imageUrl }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              cachePolicy={IMAGE_CACHE_POLICY}
            />
            <View style={styles.adOverlay}>
              <Text style={styles.adBadge}>이벤트 · 광고</Text>
              <Text style={styles.adTitle} numberOfLines={2}>
                {sponsor.title}
              </Text>
            </View>
          </Pressable>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>최근 찾던 상품의 연관 상품</Text>
          <Text style={styles.sectionSub}>판매자 해시태그 기반 추천</Text>
          {relatedQuery.isLoading ? (
            <ActivityIndicator color={colors.terracotta} style={{ marginVertical: 16 }} />
          ) : (relatedQuery.data?.items.length ?? 0) === 0 ? (
            <Text style={styles.emptyLine}>상품을 둘러보면 연관 상품이 표시됩니다.</Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.productRow}>
              {relatedQuery.data?.items.map((item) => (
                <ProductChip
                  key={item.id}
                  item={item}
                  styles={styles}
                  onPress={() => navigation.navigate("StarMarketDetail", { id: item.id })}
                />
              ))}
            </ScrollView>
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    profileRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingHorizontal: spacing.md,
      paddingTop: spacing.md,
      paddingBottom: spacing.sm,
    },
    nickname: { flex: 1, fontSize: 20, fontWeight: "800", color: colors.text },
    settingsBtn: { padding: 4 },
    quickRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: "rgba(27, 74, 140, 0.12)",
    },
    quickItem: { alignItems: "center", width: 64, gap: 6 },
    quickIcon: {
      width: 44,
      height: 44,
      borderRadius: radii.lg,
      borderWidth: 2,
      borderColor: "rgba(27, 74, 140, 0.18)",
      backgroundColor: colors.surfaceRaised,
      alignItems: "center",
      justifyContent: "center",
      ...shadows.folkSm,
    },
    quickLabel: { fontSize: 11, fontWeight: "700", color: colors.text, textAlign: "center" },
    section: { paddingTop: spacing.md, paddingHorizontal: spacing.md, gap: 8 },
    sectionHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    sectionTitle: { fontSize: 17, fontWeight: "800", color: colors.text },
    sectionSub: { fontSize: 12, color: colors.textMuted, marginTop: -4 },
    sectionLink: { fontSize: 13, fontWeight: "700", color: colors.terracotta },
    emptyLine: {
      color: colors.textMuted,
      fontWeight: "600",
      paddingVertical: spacing.md,
      textAlign: "center",
    },
    orderRow: { gap: 10, paddingVertical: spacing.sm },
    orderCard: {
      width: 120,
      borderRadius: radii.lg,
      borderWidth: 2,
      borderColor: "rgba(27, 74, 140, 0.18)",
      backgroundColor: colors.surfaceRaised,
      overflow: "hidden",
      paddingBottom: 8,
    },
    orderImg: { width: "100%", height: 96 },
    orderStatus: { fontSize: 12, fontWeight: "800", marginTop: 6, marginHorizontal: 8 },
    orderTitle: { fontSize: 12, color: colors.text, marginHorizontal: 8, marginTop: 2 },
    adBanner: {
      marginHorizontal: spacing.md,
      marginTop: spacing.md,
      height: 140,
      borderRadius: radii.xl,
      overflow: "hidden",
      borderWidth: 2,
      borderColor: "rgba(27, 74, 140, 0.2)",
    },
    adOverlay: {
      ...StyleSheet.absoluteFill,
      backgroundColor: "rgba(20, 40, 72, 0.35)",
      justifyContent: "flex-end",
      padding: 14,
      gap: 4,
    },
    adBadge: {
      alignSelf: "flex-start",
      backgroundColor: colors.terracotta,
      color: "#fff",
      fontSize: 10,
      fontWeight: "800",
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: radii.pill,
      overflow: "hidden",
    },
    adTitle: { color: "#fff", fontSize: 16, fontWeight: "800" },
    productRow: { gap: 10, paddingVertical: spacing.sm },
    productChip: {
      width: 132,
      borderRadius: radii.lg,
      borderWidth: 2,
      borderColor: "rgba(27, 74, 140, 0.18)",
      backgroundColor: colors.surfaceRaised,
      overflow: "hidden",
      paddingBottom: 8,
    },
    productImg: { width: "100%", height: 132 },
    productImgFallback: { backgroundColor: colors.muted },
    productTitle: {
      fontSize: 12,
      fontWeight: "700",
      color: colors.text,
      marginHorizontal: 8,
      marginTop: 6,
      minHeight: 32,
    },
    productPrice: { fontSize: 13, fontWeight: "800", color: colors.cobalt, marginHorizontal: 8, marginTop: 2 },
  });
}
