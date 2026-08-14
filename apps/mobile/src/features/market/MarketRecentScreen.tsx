import { useCallback, useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppHeader } from "@/ui/AppHeader";
import { Screen } from "@/ui/Screen";
import { IMAGE_CACHE_POLICY } from "@/perf/image";
import { getRecentMarketViews, type RecentMarketView } from "@/lib/market-recently-viewed";
import { useTheme } from "@/theme/ThemeContext";
import { radii, spacing, type ThemeColors } from "@/theme/tokens";
import type { RootStackParamList } from "@/navigation/types";

export function MarketRecentScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<RecentMarketView[]>([]);

  useFocusEffect(
    useCallback(() => {
      void getRecentMarketViews().then(setItems);
    }, [])
  );

  return (
    <Screen>
      <AppHeader title="최근본상품" leftLabel="뒤로" onLeftPress={() => navigation.goBack()} />
      <FlatList
        data={items}
        keyExtractor={(i) => i.listingId}
        numColumns={2}
        columnWrapperStyle={{ gap: 10, paddingHorizontal: spacing.md }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24, gap: 10, paddingTop: spacing.sm }}
        ListEmptyComponent={<Text style={styles.empty}>최근 본 상품이 없습니다.</Text>}
        renderItem={({ item }) => (
          <Pressable
            style={styles.card}
            onPress={() => navigation.navigate("StarMarketDetail", { id: item.listingId })}
          >
            {item.coverUrl ? (
              <Image source={{ uri: item.coverUrl }} style={styles.img} cachePolicy={IMAGE_CACHE_POLICY} />
            ) : (
              <View style={[styles.img, styles.fallback]} />
            )}
            <Text style={styles.title} numberOfLines={2}>
              {item.title}
            </Text>
          </Pressable>
        )}
      />
    </Screen>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
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
    title: { fontSize: 13, fontWeight: "700", margin: 8, color: colors.text },
    empty: { textAlign: "center", color: colors.textMuted, padding: spacing.xl, fontWeight: "600" },
  });
}
