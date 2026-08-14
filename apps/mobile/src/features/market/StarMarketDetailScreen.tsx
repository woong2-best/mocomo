import { useState, useMemo, useEffect } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { Image } from "expo-image";
import { useQuery } from "@tanstack/react-query";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fetchStarMarketDetail } from "@/api/star-market";
import { toggleMarketFavorite } from "@/api/commerce-market";
import { StarMarketBuySheet } from "@/features/market/StarMarketBuySheet";
import { addToMarketplaceCart } from "@/lib/marketplace-cart";
import { recordRecentMarketView } from "@/lib/market-recently-viewed";
import { FolkButton } from "@/ui/FolkButton";
import { IMAGE_CACHE_POLICY } from "@/perf/image";
import { useTheme } from "@/theme/ThemeContext";
import { spacing, type ThemeColors } from "@/theme/tokens";
import type { RootStackParamList } from "@/navigation/types";

function formatPrice(amount: number, currency: string) {
  if (currency === "KRW" || !currency) {
    return `${amount.toLocaleString("ko-KR")}원`;
  }
  return `${amount.toLocaleString()} ${currency}`;
}

export function StarMarketDetailScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createThemedStyles(colors), [colors]);

  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, "StarMarketDetail">>();
  const [imageIndex, setImageIndex] = useState(0);
  const [buyOpen, setBuyOpen] = useState(false);

  const query = useQuery({
    queryKey: ["mobile-star-market-detail", route.params.id],
    queryFn: () => fetchStarMarketDetail(route.params.id),
  });

  const item = query.data?.item;
  const images = item?.images?.length ? item.images : item?.coverUrl ? [item.coverUrl] : [];

  useEffect(() => {
    if (!item) return;
    void recordRecentMarketView({
      listingId: item.id,
      title: item.title,
      coverUrl: item.coverUrl,
      tags: item.tags ?? [],
    });
  }, [item?.id]);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
          <Text style={styles.back}>뒤로</Text>
        </Pressable>
        <Text style={styles.heading} numberOfLines={1}>
          상품
        </Text>
      </View>

      {query.isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.accent} />
      ) : query.isError || !item ? (
        <Text style={styles.error}>상품을 불러오지 못했습니다.</Text>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>
          {images[imageIndex] ? (
            <Image
              source={{ uri: images[imageIndex] }}
              style={{ width, height: width }}
              cachePolicy={IMAGE_CACHE_POLICY}
              transition={0}
            />
          ) : (
            <View style={{ width, height: width, backgroundColor: colors.border }} />
          )}
          {images.length > 1 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.thumbs}
            >
              {images.map((uri, i) => (
                <Pressable key={`${uri}-${i}`} onPress={() => setImageIndex(i)}>
                  <Image
                    source={{ uri }}
                    style={[styles.thumb, i === imageIndex && styles.thumbActive]}
                    cachePolicy={IMAGE_CACHE_POLICY}
                  />
                </Pressable>
              ))}
            </ScrollView>
          ) : null}

          <View style={styles.body}>
            <Text style={styles.type}>{item.typeLabel}</Text>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.price}>{formatPrice(item.priceAmount, item.currency)}</Text>
            {item.seller ? (
              <Text style={styles.seller}>
                {item.seller.displayName || item.seller.name || `@${item.seller.username}`}
              </Text>
            ) : null}
            {item.category ? <Text style={styles.meta}>카테고리 · {item.category}</Text> : null}
            {item.stock != null ? <Text style={styles.meta}>재고 · {item.stock}</Text> : null}
            {item.description ? <Text style={styles.desc}>{item.description}</Text> : null}
            {item.tags?.length ? (
              <View style={styles.tagRow}>
                {item.tags.map((tag) => (
                  <Text key={tag} style={styles.tag}>
                    #{tag}
                  </Text>
                ))}
              </View>
            ) : null}
            {!item.isOwner && item.paymentsEnabled ? (
              <View style={{ gap: 10, marginTop: spacing.md }}>
                <FolkButton
                  label={`${formatPrice(item.priceAmount, item.currency)} 구매하기`}
                  onPress={() => setBuyOpen(true)}
                />
                <FolkButton
                  label="장바구니 담기"
                  variant="secondary"
                  onPress={() => {
                    void addToMarketplaceCart({
                      listingId: item.id,
                      title: item.title,
                      priceAmount: item.priceAmount,
                      currency: item.currency,
                      coverUrl: item.coverUrl,
                    }).then(() => Alert.alert("장바구니", "상품을 담았습니다."));
                  }}
                />
                <FolkButton
                  label="찜하기"
                  variant="secondary"
                  onPress={() => {
                    void toggleMarketFavorite(item.id).then((r) =>
                      Alert.alert("찜", r.favorited ? "찜 목록에 추가했습니다." : "찜을 해제했습니다.")
                    );
                  }}
                />
              </View>
            ) : !item.paymentsEnabled ? (
              <Text style={styles.meta}>결제 연동 후 구매할 수 있습니다.</Text>
            ) : null}
          </View>
          {item ? (
            <StarMarketBuySheet
              visible={buyOpen}
              onClose={() => setBuyOpen(false)}
              item={item}
              onSuccess={() => Alert.alert("구매 완료", "주문이 접수되었습니다.")}
            />
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}

function createThemedStyles(colors: ThemeColors) {
  return StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  back: { color: colors.accent, fontWeight: "600" },
  heading: { flex: 1, fontSize: 18, fontWeight: "800", color: colors.text },
  thumbs: { padding: spacing.sm, gap: 8 },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "transparent",
  },
  thumbActive: { borderColor: colors.accent },
  body: { padding: spacing.md, gap: 6 },
  type: { fontSize: 12, fontWeight: "700", color: colors.textMuted },
  title: { fontSize: 22, fontWeight: "800", color: colors.text },
  price: { fontSize: 20, fontWeight: "800", color: colors.text, marginTop: 4 },
  seller: { fontSize: 14, color: colors.textMuted, marginTop: 4 },
  meta: { fontSize: 13, color: colors.textMuted },
  desc: { marginTop: spacing.md, fontSize: 15, lineHeight: 22, color: colors.text },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 4 },
  tag: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.terracotta,
    backgroundColor: "rgba(197, 82, 42, 0.1)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  error: { color: colors.danger, padding: spacing.lg },
});
}

