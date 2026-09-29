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
import { fetchMyWtbAlerts } from "@/api/subculture";
import { UsedWtbAlertList } from "@/features/marketplace/UsedWtbAlertList";
import {
  displayUsedRegion,
  formatUsedPrice,
  formatUsedTimeAgo,
  usedStatusLabel,
} from "@/features/marketplace/used-catalog";
import { AppHeader } from "@/ui/AppHeader";
import { FolkButton } from "@/ui/FolkButton";
import { Screen } from "@/ui/Screen";
import { IMAGE_CACHE_POLICY } from "@/perf/image";
import { useI18n } from "@/i18n/I18nProvider";
import { useTheme } from "@/theme/ThemeContext";
import { radii, spacing, type ThemeColors } from "@/theme/tokens";
import type { RootStackParamList } from "@/navigation/types";

export function UsedMyScreen() {
  const { t, u } = useI18n();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const query = useQuery({
    queryKey: ["mobile-marketplace-mine", "sales"],
    queryFn: () =>
      fetchMarketplaceList({
        mine: true,
        take: 48,
      }),
  });

  const wtbQuery = useQuery({
    queryKey: ["mobile-wtb-alerts"],
    queryFn: fetchMyWtbAlerts,
  });

  const items = (query.data?.items ?? []).filter((item) => item.saleType !== "AUCTION");

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
          <Text style={styles.badge}>{usedStatusLabel(item.status, u)}</Text>
          <Text style={styles.title} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={styles.price}>{formatUsedPrice(item.price, item.currency, u)}</Text>
          <Text style={styles.sub}>
            {displayUsedRegion(item.region || "", u) || u("지역 미정", "Location TBD")} ·{" "}
            {formatUsedTimeAgo(item.createdAt, u)}
          </Text>
        </View>
      </Pressable>
    ),
    [navigation, styles, u]
  );

  return (
    <Screen>
      <AppHeader
        title={u("판매내역", "Sales history")}
        leftLabel={t("common.back")}
        onLeftPress={() => navigation.goBack()}
        rightSlot={
          <Pressable onPress={() => navigation.navigate("UsedCreate")}>
            <Text style={{ fontWeight: "800", color: colors.brand }}>{u("글쓰기", "New listing")}</Text>
          </Pressable>
        }
      />
      {query.isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.terracotta} />
      ) : query.isError ? (
        <View style={styles.center}>
          <Text style={styles.error}>{u("내 거래를 불러오지 못했습니다.", "Could not load your listings.")}</Text>
          <FolkButton label={t("toast.retry")} onPress={() => void query.refetch()} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: spacing.md, paddingBottom: 40 }}
          ListHeaderComponent={
            <View style={{ marginBottom: spacing.md }}>
              <>
                <Text style={styles.sectionTitle}>
                  {u("WTB 알림", "WTB alerts")} ({wtbQuery.data?.items.length ?? 0})
                </Text>
                {wtbQuery.isLoading ? (
                  <ActivityIndicator color={colors.terracotta} style={{ marginVertical: 12 }} />
                ) : (
                  <UsedWtbAlertList items={wtbQuery.data?.items ?? []} />
                )}
              </>
              <Text style={[styles.sectionTitle, { marginTop: spacing.lg }]}>
                {u("내 글", "My listings")} ({items.length})
              </Text>
            </View>
          }
          ListEmptyComponent={
            <Text style={styles.muted}>
              {u("등록한 중고거래 글이 없습니다.", "You have no used-market listings yet.")}
            </Text>
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
    sectionTitle: {
      fontSize: 13,
      fontWeight: "800",
      color: colors.textMuted,
      marginBottom: spacing.sm,
    },
  });
}
