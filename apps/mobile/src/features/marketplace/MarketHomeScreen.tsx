import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
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
import { fetchMarketplaceList, type MarketplaceListItem } from "@/api/marketplace";
import { loadRecentViews } from "@/features/marketplace/market-memory";
import { type HubCategory } from "@/features/marketplace/market-browse";
import { floatingTabClearance } from "@/navigation/tab-layout";
import type { RootStackParamList } from "@/navigation/types";
import { IMAGE_CACHE_POLICY } from "@/perf/image";
import { Screen } from "@/ui/Screen";
import { useI18n } from "@/i18n/I18nProvider";
import { useTheme } from "@/theme/ThemeContext";
import { radii, spacing, type ThemeColors } from "@/theme/tokens";

export type MarketHubLane = "all" | "recommend" | "purchased" | "favorites" | "disputes" | "my-bids";

type MarketHomeProps = {
  /** Right-side slide hub above the list. */
  embedded?: boolean;
  onClose?: () => void;
  onSelectCategory?: (id: string) => void;
  selectedCategoryId?: string | null;
  categories?: HubCategory[];
};

const RAIL_TAKE = 2;

export function MarketHomeScreen(props: MarketHomeProps = {}) {
  const { embedded = false, onClose, onSelectCategory, selectedCategoryId, categories = [] } = props;
  const { t } = useI18n();
  const { colors, isDark } = useTheme();
  const icon = isDark ? colors.text : colors.brand;
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [recentIds, setRecentIds] = useState<string[]>([]);
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      void loadRecentViews().then((ids) => {
        if (!alive) return;
        setRecentIds(ids);
      });
      return () => {
        alive = false;
      };
    }, [])
  );

  const recommend = useQuery({
    queryKey: ["mobile-marketplace", "recommend"],
    queryFn: async () => {
      const rec = await fetchMarketplaceList({ lane: "recommend", take: RAIL_TAKE });
      if (rec.items.length > 0) return rec;
      const fixed = await fetchMarketplaceList({ take: 12, mode: "fixed" });
      return { items: fixed.items.slice(0, RAIL_TAKE) };
    },
    staleTime: 60_000,
  });
  const recent = useQuery({
    queryKey: ["mobile-marketplace", "recent-ids", recentIds.slice(0, RAIL_TAKE)],
    queryFn: () => fetchMarketplaceList({ ids: recentIds.slice(0, RAIL_TAKE), take: RAIL_TAKE }),
    enabled: recentIds.length > 0,
    staleTime: 30_000,
  });

  const openItem = useCallback(
    (id: string) => {
      if (embedded) onClose?.();
      navigation.navigate("MarketplaceDetail", { id });
    },
    [embedded, navigation, onClose]
  );

  const refreshing = recommend.isFetching || recent.isFetching;
  const categoryNodes = (
    <View style={styles.catList}>
      {categories.map((item) => {
        const selected = selectedCategoryId === item.id;
        return (
          <Pressable
            key={item.id}
            onPress={() => onSelectCategory?.(item.id)}
            style={[styles.catItem, selected && styles.catItemOn]}
            accessibilityRole="button"
            accessibilityState={{ selected }}
          >
            <Text style={[styles.catItemText, selected && styles.catItemTextOn]}>{t(item.labelKey)}</Text>
          </Pressable>
        );
      })}
    </View>
  );
  const rails = (
    <>
      <ProductRail
        title={t("m.common.recently_viewed")}
        items={recent.data?.items ?? []}
        loading={recent.isLoading && recentIds.length > 0}
        onOpen={openItem}
        styles={styles}
      />
      <ProductRail
        title={t("m.common.recommended")}
        items={recommend.data?.items ?? []}
        loading={recommend.isLoading}
        onOpen={openItem}
        styles={styles}
      />
    </>
  );

  return (
    <Screen safeTop={!embedded}>
      {embedded ? (
        <View style={styles.embeddedBody}>
          <ScrollView
            style={styles.embeddedScroll}
            contentContainerStyle={styles.embeddedScrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {categoryNodes}
          </ScrollView>
          <View style={styles.railDock}>{rails}</View>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{
            paddingBottom: floatingTabClearance(insets.bottom) + 72,
          }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing && !recommend.isLoading}
              onRefresh={() => {
                void recommend.refetch();
                void recent.refetch();
              }}
              tintColor={colors.terracotta}
            />
          }
        >
          <View style={styles.topRow}>
            <Pressable
              onPress={() => navigation.navigate("Main", { screen: "Home" })}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={t("common.back")}
            >
              <Ionicons name="chevron-back" size={26} color={icon} />
            </Pressable>
          </View>
          {categoryNodes}
          {rails}
        </ScrollView>
      )}
    </Screen>
  );
}

function ProductRail({
  title,
  items,
  loading,
  onOpen,
  styles,
}: {
  title: string;
  items: MarketplaceListItem[];
  loading: boolean;
  onOpen: (id: string) => void;
  styles: ReturnType<typeof createStyles>;
}) {
  const { t } = useI18n();
  const shown = items.slice(0, RAIL_TAKE);
  return (
    <View style={styles.rail}>
      <View style={styles.sectionHead}>
        <Text style={styles.railTitle}>{title}</Text>
      </View>
      {loading ? (
        <ActivityIndicator color={styles.railTitle.color} style={{ marginVertical: 16 }} />
      ) : shown.length === 0 ? (
        <Text style={styles.muted}>{t("m.common.no_listings_yet")}</Text>
      ) : (
        <View style={styles.grid}>
          {shown.map((item) => (
            <Pressable key={item.id} style={styles.card} onPress={() => onOpen(item.id)}>
              {item.thumbnailUrl ? (
                <Image
                  source={{ uri: item.thumbnailUrl }}
                  style={styles.photo}
                  cachePolicy={IMAGE_CACHE_POLICY}
                  transition={0}
                />
              ) : (
                <View style={[styles.photo, styles.photoEmpty]} />
              )}
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    embeddedBody: {
      flex: 1,
    },
    embeddedScroll: {
      flex: 1,
      minHeight: 0,
    },
    embeddedScrollContent: {
      paddingTop: spacing.sm,
      paddingBottom: spacing.sm,
    },
    railDock: {
      paddingBottom: spacing.sm,
    },
    topRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: spacing.md,
      paddingTop: spacing.sm,
      minHeight: 42,
    },
    catList: {
      paddingHorizontal: spacing.md,
    },
    catItem: {
      paddingVertical: 13,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.hairline,
    },
    catItemOn: {
      backgroundColor: colors.surfaceRaised,
      marginHorizontal: -spacing.md,
      paddingHorizontal: spacing.md,
    },
    catItemText: {
      fontSize: 17,
      fontWeight: "800",
      color: colors.brand,
    },
    catItemTextOn: {
      color: colors.brand,
    },
    sectionHead: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: spacing.md,
      marginTop: 8,
      marginBottom: 8,
    },
    rail: { marginTop: 2 },
    railTitle: { fontSize: 18, fontWeight: "800", color: colors.brand },
    grid: {
      paddingHorizontal: spacing.md,
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 12,
    },
    card: {
      width: "48%",
      borderRadius: radii.md,
      overflow: "hidden",
      backgroundColor: colors.surfaceRaised,
      borderWidth: 1,
      borderColor: colors.hairline,
    },
    photo: { width: "100%", aspectRatio: 1, backgroundColor: colors.muted },
    photoEmpty: { alignItems: "center", justifyContent: "center" },
    muted: { color: colors.textMuted, paddingHorizontal: spacing.md, fontWeight: "600", marginBottom: 8 },
  });
}
