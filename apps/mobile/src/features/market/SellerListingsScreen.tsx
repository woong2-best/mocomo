import { useMemo } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { useQuery } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { fetchStarMarketMine } from "@/api/marketplace";
import { AppHeader } from "@/ui/AppHeader";
import { FolkButton } from "@/ui/FolkButton";
import { Screen } from "@/ui/Screen";
import { IMAGE_CACHE_POLICY } from "@/perf/image";
import { useTheme } from "@/theme/ThemeContext";
import { radii, shadows, spacing, type ThemeColors } from "@/theme/tokens";
import type { RootStackParamList } from "@/navigation/types";

export function SellerListingsScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createThemedStyles(colors), [colors]);

  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const query = useQuery({
    queryKey: ["mobile-star-market-mine"],
    queryFn: () => fetchStarMarketMine(),
  });

  return (
    <Screen>
      <AppHeader title="내 STAR 판매" leftLabel="뒤로" onLeftPress={() => navigation.goBack()} />
      {query.isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.terracotta} />
      ) : query.isError ? (
        <View style={styles.center}>
          <Text style={styles.error}>목록을 불러오지 못했습니다.</Text>
          <FolkButton label="다시 시도" onPress={() => void query.refetch()} />
        </View>
      ) : (
        <FlatList
          data={query.data?.items ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 40, paddingTop: spacing.sm }}
          ListEmptyComponent={
            <Text style={styles.muted}>판매 중인 STAR 상품이 없습니다. 등록은 웹에서 가능합니다.</Text>
          }
          renderItem={({ item }) => (
            <Pressable
              style={styles.row}
              onPress={() => navigation.navigate("StarMarketDetail", { id: item.id })}
            >
              {item.coverUrl ? (
                <Image
                  source={{ uri: item.coverUrl }}
                  style={styles.thumb}
                  cachePolicy={IMAGE_CACHE_POLICY}
                />
              ) : (
                <View style={[styles.thumb, styles.thumbFallback]} />
              )}
              <View style={styles.meta}>
                <Text style={styles.title} numberOfLines={2}>
                  {item.title}
                </Text>
                <Text style={styles.price}>
                  {item.priceAmount.toLocaleString("ko-KR")}
                  {item.currency === "KRW" || !item.currency ? "원" : ` ${item.currency}`}
                </Text>
                <Text style={styles.sub}>
                  {item.status} · 판매 {item.salesCount}
                </Text>
              </View>
            </Pressable>
          )}
        />
      )}
    </Screen>
  );
}

function createThemedStyles(colors: ThemeColors) {
  return StyleSheet.create({
  row: {
    flexDirection: "row",
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    padding: spacing.sm,
    borderRadius: radii.lg,
    borderWidth: 2,
    borderColor: "rgba(27, 74, 140, 0.2)",
    backgroundColor: colors.surfaceRaised,
    ...shadows.folkSm,
  },
  thumb: {
    width: 64,
    height: 64,
    borderRadius: radii.sm,
    backgroundColor: colors.muted,
  },
  thumbFallback: {},
  meta: { flex: 1, marginLeft: spacing.sm, justifyContent: "center" },
  title: { fontWeight: "800", color: colors.text },
  price: { marginTop: 4, fontWeight: "800", color: colors.terracotta },
  sub: { marginTop: 2, color: colors.textMuted, fontSize: 13, fontWeight: "600" },
  muted: { color: colors.textMuted, padding: spacing.lg, fontWeight: "600" },
  center: { padding: spacing.lg, alignItems: "center", gap: spacing.sm },
  error: { color: colors.danger, fontWeight: "700" },
});
}

