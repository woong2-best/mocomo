import { useCallback, useMemo } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";
import { useQuery } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { fetchMarketplaceList, type MarketplaceListItem } from "@/api/marketplace";
import {
  formatUsedPrice,
  formatUsedTimeAgo,
  usedStatusLabel,
} from "@/features/marketplace/used-catalog";
import { AppHeader } from "@/ui/AppHeader";
import { FolkButton } from "@/ui/FolkButton";
import { Screen } from "@/ui/Screen";
import { IMAGE_CACHE_POLICY } from "@/perf/image";
import { useTheme } from "@/theme/ThemeContext";
import { radii, spacing, type ThemeColors } from "@/theme/tokens";
import type { RootStackParamList } from "@/navigation/types";

export function UsedMyScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const query = useQuery({
    queryKey: ["mobile-marketplace-mine"],
    queryFn: () => fetchMarketplaceList({ mine: true, take: 48 }),
  });

  const renderItem = useCallback(
    ({ item }: { item: MarketplaceListItem }) => (
      <Pressable
        style={styles.row}
        onPress={() => navigation.navigate("MarketplaceDetail", { id: item.id })}
      >
        {item.thumbnailUrl ? (
          <Image
            source={{ uri: item.thumbnailUrl }}
            style={styles.thumb}
            cachePolicy={IMAGE_CACHE_POLICY}
            transition={0}
          />
        ) : (
          <View style={[styles.thumb, styles.thumbFallback]} />
        )}
        <View style={styles.meta}>
          <Text style={styles.badge}>{usedStatusLabel(item.status)}</Text>
          <Text style={styles.title} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={styles.price}>{formatUsedPrice(item.price, item.currency)}</Text>
          <Text style={styles.sub}>
            {item.region || "지역 미정"} · {formatUsedTimeAgo(item.createdAt)}
          </Text>
        </View>
      </Pressable>
    ),
    [navigation, styles]
  );

  return (
    <Screen>
      <AppHeader title="내 거래" leftLabel="뒤로" onLeftPress={() => navigation.goBack()} />
      {query.isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.terracotta} />
      ) : query.isError ? (
        <View style={styles.center}>
          <Text style={styles.error}>내 거래를 불러오지 못했습니다.</Text>
          <FolkButton label="다시 시도" onPress={() => void query.refetch()} />
        </View>
      ) : (
        <FlatList
          data={query.data?.items ?? []}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: spacing.md, paddingBottom: 40 }}
          ListEmptyComponent={
            <Text style={styles.muted}>등록한 중고거래 글이 없습니다.</Text>
          }
        />
      )}
    </Screen>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    row: {
      flexDirection: "row",
      gap: 12,
      padding: 12,
      marginBottom: 10,
      borderRadius: radii.lg,
      borderWidth: 1.5,
      borderColor: "rgba(27, 74, 140, 0.18)",
      backgroundColor: colors.surfaceRaised,
    },
    thumb: {
      width: 72,
      height: 72,
      borderRadius: radii.sm,
      backgroundColor: colors.muted,
    },
    thumbFallback: {},
    meta: { flex: 1 },
    badge: {
      alignSelf: "flex-start",
      fontSize: 11,
      fontWeight: "800",
      color: colors.terracotta,
      marginBottom: 2,
    },
    title: { fontWeight: "700", color: colors.brand },
    price: { marginTop: 2, fontWeight: "800", color: colors.brand },
    sub: { marginTop: 2, color: colors.textMuted, fontSize: 12 },
    muted: { color: colors.textMuted, padding: spacing.lg },
    error: { color: colors.danger, marginBottom: 12, fontWeight: "600" },
    center: { padding: spacing.lg, alignItems: "center" },
  });
}
