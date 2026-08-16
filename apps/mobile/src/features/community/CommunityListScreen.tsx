import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fetchCommunityList, type CommunityListItem } from "@/api/community";
import {
  COMMUNITY_CATEGORY_OPTIONS,
  communityCategoryMeta,
} from "@/features/community/community-labels";
import {
  getRecentCommunities,
  removeRecentCommunity,
  type RecentCommunity,
} from "@/features/community/recent-communities";
import { IMAGE_CACHE_POLICY } from "@/perf/image";
import { AppHeader } from "@/ui/AppHeader";
import { Screen } from "@/ui/Screen";
import { useTheme } from "@/theme/ThemeContext";
import { spacing, type ThemeColors } from "@/theme/tokens";
import type { RootStackParamList } from "@/navigation/types";

type TabId = (typeof COMMUNITY_CATEGORY_OPTIONS)[number]["id"];

function CommunityThumb({
  community,
  size,
}: {
  community: CommunityListItem;
  size: number;
}) {
  const meta = communityCategoryMeta(community.category);
  const uri = community.iconUrl || community.bannerUrl;
  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size }}
        cachePolicy={IMAGE_CACHE_POLICY}
        transition={0}
      />
    );
  }
  return (
    <View style={[stylesShared.thumbFallback, { width: size, height: size }]}>
      <Text style={stylesShared.thumbEmoji}>{meta?.emoji ?? community.name.slice(0, 1)}</Text>
    </View>
  );
}

function FeaturedCard({
  community,
  width,
  onPress,
}: {
  community: CommunityListItem;
  width: number;
  onPress: () => void;
}) {
  const meta = communityCategoryMeta(community.category);
  const cover = community.bannerUrl || community.iconUrl;
  return (
    <Pressable style={[stylesShared.featuredCard, { width }]} onPress={onPress}>
      {cover ? (
        <Image
          source={{ uri: cover }}
          style={StyleSheet.absoluteFill}
          cachePolicy={IMAGE_CACHE_POLICY}
          transition={0}
        />
      ) : (
        <View style={stylesShared.featuredFallback}>
          <Text style={stylesShared.featuredEmoji}>{meta?.emoji ?? "🏠"}</Text>
          <Text style={stylesShared.featuredFallbackName} numberOfLines={2}>
            {community.name}
          </Text>
        </View>
      )}
      <View style={stylesShared.featuredScrim}>
        <Text style={stylesShared.featuredName} numberOfLines={2}>
          {community.name}
        </Text>
        <Text style={stylesShared.featuredMeta}>
          {meta ? `${meta.emoji} ${meta.shortLabel}` : community.category}
          {" · "}
          {community.memberCount}명
        </Text>
      </View>
    </Pressable>
  );
}

export function CommunityListScreen() {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createThemedStyles(colors, isDark), [colors, isDark]);
  const insets = useSafeAreaInsets();
  const { width: winW } = useWindowDimensions();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [tab, setTab] = useState<TabId>("ALL");
  const [recent, setRecent] = useState<RecentCommunity[]>([]);

  const query = useQuery({
    queryKey: ["mobile-community"],
    queryFn: () => fetchCommunityList(),
  });

  const refreshRecent = useCallback(() => {
    void getRecentCommunities().then(setRecent);
  }, []);

  useFocusEffect(
    useCallback(() => {
      refreshRecent();
    }, [refreshRecent])
  );

  useEffect(() => {
    refreshRecent();
  }, [refreshRecent]);

  const items = query.data?.items ?? [];

  const filtered = useMemo(() => {
    if (tab === "ALL") return items;
    return items.filter((c) => c.category === tab);
  }, [items, tab]);

  const featured = useMemo(() => filtered.slice(0, 4), [filtered]);
  const cardW = Math.floor((winW - 24) / 2);

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    map.set("ALL", items.length);
    for (const opt of COMMUNITY_CATEGORY_OPTIONS) {
      if (opt.id === "ALL") continue;
      map.set(opt.id, items.filter((c) => c.category === opt.id).length);
    }
    return map;
  }, [items]);

  const openCreate = useCallback(() => {
    navigation.navigate("CommunityCreate");
  }, [navigation]);

  const openCommunity = useCallback(
    (slug: string) => {
      navigation.navigate("CommunityDetail", { slug });
    },
    [navigation]
  );

  const renderItem = useCallback(
    ({ item }: { item: CommunityListItem }) => (
      <Pressable style={styles.row} onPress={() => openCommunity(item.slug)}>
        <View style={styles.thumbWrap}>
          <CommunityThumb community={item} size={52} />
        </View>
        <View style={styles.meta}>
          <View style={styles.titleRow}>
            <Text style={styles.title} numberOfLines={1}>
              {item.name}
            </Text>
            {item.isNsfw ? <Text style={styles.nsfw}>NSFW</Text> : null}
          </View>
          <Text style={styles.sub} numberOfLines={1}>
            {item.description?.trim() || "소개가 아직 없습니다."}
          </Text>
        </View>
        <View style={styles.members}>
          <Ionicons name="people-outline" size={12} color={colors.textMuted} />
          <Text style={styles.memberCount}>{item.memberCount}</Text>
        </View>
      </Pressable>
    ),
    [colors.textMuted, openCommunity, styles]
  );

  const listHeader = (
    <View>
      {recent.length > 0 ? (
        <View style={styles.recentBar}>
          <Text style={styles.recentLabel}>최근 방문</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recentChips}>
            {recent.map((r) => (
              <View key={r.slug} style={styles.recentChip}>
                <Pressable onPress={() => openCommunity(r.slug)} hitSlop={4}>
                  <Text style={styles.recentName} numberOfLines={1}>
                    {r.name}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    void removeRecentCommunity(r.slug).then(refreshRecent);
                  }}
                  hitSlop={8}
                  accessibilityLabel={`${r.name} 최근 방문에서 제거`}
                >
                  <Ionicons name="close" size={12} color={colors.textMuted} />
                </Pressable>
              </View>
            ))}
          </ScrollView>
        </View>
      ) : null}

      <View style={styles.hubCard}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabs}
          style={styles.tabsWrap}
        >
          {COMMUNITY_CATEGORY_OPTIONS.map((opt) => {
            const active = tab === opt.id;
            const count = counts.get(opt.id) ?? 0;
            return (
              <Pressable
                key={opt.id}
                onPress={() => setTab(opt.id)}
                style={[styles.tab, active && styles.tabActive]}
              >
                <Text style={[styles.tabText, active && styles.tabTextActive]}>
                  {opt.emoji ? `${opt.emoji} ` : ""}
                  {opt.shortLabel}
                  <Text style={styles.tabCount}> {count}</Text>
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.sectionHead}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={styles.sectionTitleRow}>
              <View style={styles.accentDot} />
              <Text style={styles.sectionTitle}>
                {tab === "ALL"
                  ? "커뮤니티"
                  : `${communityCategoryMeta(tab)?.emoji ?? ""} ${
                      communityCategoryMeta(tab)?.label ?? tab
                    }`}
              </Text>
            </View>
            <Text style={styles.sectionDesc}>관심 주제를 골라 커뮤니티에 들어가세요</Text>
          </View>
          <Pressable onPress={openCreate} hitSlop={8} style={styles.createBtn}>
            <Ionicons name="add" size={16} color="#c80000" />
            <Text style={styles.createText}>만들기</Text>
          </Pressable>
        </View>

        {featured.length > 0 ? (
          <View style={styles.featuredGrid}>
            {featured.map((c) => (
              <FeaturedCard
                key={c.id}
                community={c}
                width={cardW}
                onPress={() => openCommunity(c.slug)}
              />
            ))}
          </View>
        ) : null}
      </View>
    </View>
  );

  return (
    <Screen>
      <AppHeader title="커뮤니티" leftLabel="뒤로" onLeftPress={() => navigation.goBack()} />
      {query.isLoading && !query.data ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#c80000" />
      ) : query.isError && !query.data ? (
        <Text style={styles.error}>커뮤니티 목록을 불러오지 못했습니다.</Text>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListHeaderComponent={listHeader}
          contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.muted}>
                {tab === "ALL"
                  ? "아직 커뮤니티가 없습니다. 첫 커뮤니티를 만들어보세요!"
                  : "이 카테고리에 커뮤니티가 없습니다."}
              </Text>
              <Pressable style={styles.emptyBtn} onPress={openCreate}>
                <Text style={styles.emptyBtnText}>커뮤니티 만들기</Text>
              </Pressable>
            </View>
          }
        />
      )}
    </Screen>
  );
}

const stylesShared = StyleSheet.create({
  thumbFallback: {
    backgroundColor: "#3d4450",
    alignItems: "center",
    justifyContent: "center",
  },
  thumbEmoji: { fontSize: 20 },
  featuredCard: {
    aspectRatio: 4 / 3,
    backgroundColor: "#2b3038",
    overflow: "hidden",
  },
  featuredFallback: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    backgroundColor: "#2a3140",
    paddingHorizontal: 8,
  },
  featuredEmoji: { fontSize: 28 },
  featuredFallbackName: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 11,
    fontWeight: "600",
    textAlign: "center",
  },
  featuredScrim: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 8,
    paddingBottom: 6,
    paddingTop: 28,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  featuredName: { color: "#fff", fontSize: 12, fontWeight: "700" },
  featuredMeta: { color: "rgba(255,255,255,0.7)", fontSize: 10, marginTop: 2 },
});

function createThemedStyles(colors: ThemeColors, isDark: boolean) {
  return StyleSheet.create({
    recentBar: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginHorizontal: 12,
      marginTop: 10,
      marginBottom: 8,
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderRadius: 8,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      backgroundColor: isDark ? colors.muted : "rgba(0,0,0,0.03)",
    },
    recentLabel: { fontSize: 12, fontWeight: "800", color: colors.textMuted },
    recentChips: { flexDirection: "row", alignItems: "center", gap: 6 },
    recentChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingLeft: 8,
      paddingRight: 4,
      paddingVertical: 4,
      borderRadius: 4,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      backgroundColor: colors.surfaceRaised,
    },
    recentName: { maxWidth: 112, fontSize: 12, fontWeight: "600", color: colors.text },
    hubCard: {
      marginHorizontal: 12,
      marginBottom: 8,
      borderRadius: 4,
      borderWidth: 1,
      borderColor: isDark ? colors.border : "#d5d5d5",
      backgroundColor: colors.surfaceRaised,
      overflow: "hidden",
    },
    tabsWrap: {
      backgroundColor: isDark ? colors.muted : "#f3f3f3",
      borderBottomWidth: 1,
      borderBottomColor: isDark ? colors.border : "#d5d5d5",
    },
    tabs: {
      paddingHorizontal: 6,
      paddingVertical: 8,
      gap: 2,
      alignItems: "center",
    },
    tab: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderWidth: 1,
      borderColor: "transparent",
      marginRight: 2,
    },
    tabActive: {
      backgroundColor: colors.surfaceRaised,
      borderColor: "#c80000",
    },
    tabText: { fontSize: 12, fontWeight: "600", color: colors.textMuted },
    tabTextActive: { color: "#c80000", fontWeight: "800" },
    tabCount: { opacity: 0.65, fontWeight: "600" },
    sectionHead: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? colors.border : "#d5d5d5",
      backgroundColor: colors.surfaceRaised,
    },
    sectionTitleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
    accentDot: { width: 12, height: 12, borderRadius: 2, backgroundColor: "#c80000" },
    sectionTitle: { fontSize: 14, fontWeight: "800", color: colors.text },
    sectionDesc: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
    createBtn: { flexDirection: "row", alignItems: "center", gap: 2 },
    createText: { fontWeight: "800", fontSize: 13, color: "#c80000" },
    featuredGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      marginHorizontal: 12,
      paddingHorizontal: 10,
      paddingVertical: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: isDark ? colors.border : "#e6e6e6",
      backgroundColor: colors.surfaceRaised,
      gap: 10,
    },
    thumbWrap: { width: 52, height: 52, overflow: "hidden", backgroundColor: "#eee" },
    meta: { flex: 1, minWidth: 0 },
    titleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
    title: { flexShrink: 1, fontWeight: "700", color: colors.text, fontSize: 14 },
    nsfw: { color: "#c80000", fontSize: 10, fontWeight: "800" },
    sub: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
    members: { flexDirection: "row", alignItems: "center", gap: 3, minWidth: 36 },
    memberCount: { color: colors.textMuted, fontSize: 12, fontWeight: "600" },
    muted: { color: colors.textMuted, textAlign: "center" },
    error: { color: colors.danger, padding: spacing.lg },
    empty: { padding: spacing.xl, alignItems: "center", gap: 12 },
    emptyBtn: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 8,
      backgroundColor: colors.brand,
    },
    emptyBtnText: { color: "#fff", fontWeight: "800" },
  });
}
