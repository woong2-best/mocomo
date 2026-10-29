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
  displayUsedRegion,
  formatUsedPrice,
  formatUsedTimeAgo,
  usedStatusLabel,
} from "@/features/marketplace/used-catalog";
import { isDigitalListing } from "@/features/marketplace/market-browse";
import { AppHeader } from "@/ui/AppHeader";
import { FolkButton } from "@/ui/FolkButton";
import { Screen } from "@/ui/Screen";
import { IMAGE_CACHE_POLICY } from "@/perf/image";
import { useI18n } from "@/i18n/I18nProvider";
import { useTheme } from "@/theme/ThemeContext";
import { radii, spacing, type ThemeColors } from "@/theme/tokens";
import type { RootStackParamList } from "@/navigation/types";

function digitalSalesStep(meta: unknown, t: (key: string) => string) {
  const status =
    meta && typeof meta === "object" && !Array.isArray(meta)
      ? (meta as { digitalDelivery?: { status?: string } }).digitalDelivery?.status
      : undefined;
  const steps = [
    t("m.market.track.payment_held"),
    t("m.market.track.in_progress"),
    t("m.market.track.file_uploaded"),
    t("m.market.track.completed"),
  ];
  const index = status === "progress" ? 1 : status === "uploaded" ? 2 : status === "completed" ? 3 : 0;
  return steps.slice(0, index + 1).join(" → ");
}

export function UsedMyScreen() {
  const { t } = useI18n();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const query = useQuery({
    queryKey: ["mobile-marketplace", "my"],
    queryFn: () => fetchMarketplaceList({ lane: "my", take: 48 }),
  });

  const items = query.data?.items ?? [];

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
          <Text style={styles.badge}>{usedStatusLabel(item.status, t)}</Text>
          <Text style={styles.title} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={styles.price}>{formatUsedPrice(item.price, item.currency, t)}</Text>
          {isDigitalListing(item) ? (
            <Text style={styles.sub}>
              {digitalSalesStep(item.subcultureMeta, t)} · {formatUsedTimeAgo(item.createdAt, t)}
            </Text>
          ) : (
            <Text style={styles.sub}>
              {displayUsedRegion(item.region || "", t) || t("m.marketplace.location_tbd")} ·{" "}
              {formatUsedTimeAgo(item.createdAt, t)}
            </Text>
          )}
        </View>
      </Pressable>
    ),
    [navigation, styles, t]
  );

  return (
    <Screen>
      <AppHeader
        title={t("m.marketplace.my_tab")}
        leftLabel={t("common.back")}
        onLeftPress={() => navigation.goBack()}
        rightSlot={
          <View style={{ flexDirection: "row", gap: 12 }}>
            <Pressable onPress={() => navigation.navigate("CommissionInbox")}>
              <Text style={{ fontWeight: "800", color: colors.brand }}>{t("m.commission.inbox")}</Text>
            </Pressable>
            <Pressable onPress={() => navigation.navigate("UsedCreate")}>
              <Text style={{ fontWeight: "800", color: colors.brand }}>{t("m.common.new_listing")}</Text>
            </Pressable>
          </View>
        }
      />
      {query.isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.terracotta} />
      ) : query.isError ? (
        <View style={styles.center}>
          <Text style={styles.error}>{t("m.marketplace.could_not_load_your_listings")}</Text>
          <FolkButton label={t("toast.retry")} onPress={() => void query.refetch()} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: spacing.md, paddingBottom: 40 }}
          ListEmptyComponent={
            <Text style={styles.muted}>{t("m.marketplace.you_have_no_used_market_listings")}</Text>
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
