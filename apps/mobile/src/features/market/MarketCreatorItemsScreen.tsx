import { useMemo } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { useQuery } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fetchMarketCreatorItems } from "@/api/commerce-market";
import { AppHeader } from "@/ui/AppHeader";
import { Screen } from "@/ui/Screen";
import { IMAGE_CACHE_POLICY } from "@/perf/image";
import { useTheme } from "@/theme/ThemeContext";
import { radii, spacing, type ThemeColors } from "@/theme/tokens";
import type { RootStackParamList } from "@/navigation/types";

export function MarketCreatorItemsScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();

  const query = useQuery({ queryKey: ["mobile-market-creator-items"], queryFn: fetchMarketCreatorItems });

  return (
    <Screen>
      <AppHeader title="크리에이터" leftLabel="뒤로" onLeftPress={() => navigation.goBack()} />
      <Text style={styles.sub}>
        내가 구매한 판매자(크리에이터)의 다른 상품
      </Text>
      {query.isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.terracotta} />
      ) : (
        <FlatList
          data={query.data?.items ?? []}
          keyExtractor={(i) => i.id}
          numColumns={2}
          columnWrapperStyle={{ gap: 10, paddingHorizontal: spacing.md }}
          contentContainerStyle={{ paddingBottom: insets.bottom + 24, gap: 10 }}
          ListEmptyComponent={<Text style={styles.empty}>구매한 크리에이터 상품이 없습니다.</Text>}
          renderItem={({ item }) => (
            <Pressable
              style={styles.card}
              onPress={() => navigation.navigate("StarMarketDetail", { id: item.id })}
            >
              {item.coverUrl ? (
                <Image source={{ uri: item.coverUrl }} style={styles.img} cachePolicy={IMAGE_CACHE_POLICY} />
              ) : (
                <View style={[styles.img, styles.fallback]} />
              )}
              <Text style={styles.title} numberOfLines={2}>
                {item.title}
              </Text>
              {item.seller ? (
                <Text style={styles.seller} numberOfLines={1}>
                  @{item.seller.username}
                </Text>
              ) : null}
            </Pressable>
          )}
        />
      )}
    </Screen>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    sub: {
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.sm,
      color: colors.textMuted,
      fontSize: 13,
      fontWeight: "600",
    },
    card: {
      flex: 1,
      borderRadius: radii.lg,
      borderWidth: 2,
      borderColor: "rgba(27, 74, 140, 0.18)",
      backgroundColor: colors.surfaceRaised,
      overflow: "hidden",
      paddingBottom: 8,
    },
    img: { width: "100%", aspectRatio: 1 },
    fallback: { backgroundColor: colors.muted },
    title: { fontSize: 13, fontWeight: "700", margin: 8, marginBottom: 2, color: colors.text },
    seller: { fontSize: 11, color: colors.textMuted, marginHorizontal: 8 },
    empty: { textAlign: "center", color: colors.textMuted, padding: spacing.xl, fontWeight: "600" },
  });
}
