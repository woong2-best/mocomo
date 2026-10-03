import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { FlashList } from "@shopify/flash-list";
import { Ionicons } from "@expo/vector-icons";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fetchQnaFeedPage } from "@/api/community";
import { backfillOwnedEmptyQnaPosts } from "@/features/community/publish-qna-post";
import type { FeedItem } from "@/api/feed";
import { FeedPostCard } from "@/features/feed/FeedPostCard";
import { useUserProfileNav, type UserProfileSeed } from "@/features/profile/user-profile-nav";
import {
  QNA_FEED_CATEGORY_TABS,
  QNA_MY_CATEGORY_ID,
  type QnaFeedTabId,
} from "@/features/community/community-labels";
import { ensureQnaNsfwAccess } from "@/features/community/ensure-qna-nsfw-access";
import { useAuth } from "@/auth/AuthContext";
import { showIslandError } from "@/ui/IslandToast";
import { SearchField } from "@/ui/SearchField";
import { Screen } from "@/ui/Screen";
import { useTheme } from "@/theme/ThemeContext";
import { spacing, type ThemeColors } from "@/theme/tokens";
import type { RootStackParamList } from "@/navigation/types";
import { useI18n } from "@/i18n/I18nProvider";
import { localizedCategoryTab } from "@/features/community/community-labels";

export function CommunityListScreen() {
  const { t, locale } = useI18n();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createThemedStyles(colors, isDark), [colors, isDark]);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { open: openUserProfile } = useUserProfileNav();
  const queryClient = useQueryClient();
  const { status: authStatus } = useAuth();
  const searchRef = useRef<TextInput>(null);
  const [tab, setTab] = useState<QnaFeedTabId>("ALL");
  const [searchQ, setSearchQ] = useState("");
  const [searchSubmitted, setSearchSubmitted] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const query = useInfiniteQuery({
    queryKey: ["mobile-qna-feed", tab, searchSubmitted],
    queryFn: ({ pageParam }) =>
      fetchQnaFeedPage({
        cursor: pageParam,
        limit: 12,
        q: searchSubmitted || undefined,
        category: tab,
      }),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    staleTime: 45_000,
  });

  const items = useMemo(() => {
    const list: FeedItem[] = [];
    for (const page of query.data?.pages ?? []) {
      for (const item of page.items) list.push(item);
    }
    return list;
  }, [query.data]);

  const paymentsEnabled = query.data?.pages[0]?.paymentsEnabled ?? false;
  const repairedRef = useRef(false);

  useEffect(() => {
    if (repairedRef.current || !query.isSuccess || tab !== "ALL" || searchSubmitted) return;
    repairedRef.current = true;
    const known = new Set(
      items.flatMap((item) =>
        item.type === "post" && item.data.community?.slug ? [item.data.community.slug] : []
      )
    );
    void (async () => {
      const created = await backfillOwnedEmptyQnaPosts(known);
      if (created > 0) {
        await queryClient.invalidateQueries({ queryKey: ["mobile-qna-feed"] });
      }
    })();
  }, [items, query.isSuccess, queryClient, searchSubmitted, tab]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["mobile-qna-feed", tab, searchSubmitted] });
    setRefreshing(false);
  }, [queryClient, searchSubmitted, tab]);

  const openCreate = useCallback(() => {
    navigation.navigate("CommunityCreate");
  }, [navigation]);

  const selectTab = useCallback(
    (next: QnaFeedTabId) => {
      void (async () => {
        if (next === QNA_MY_CATEGORY_ID && authStatus !== "signedIn") {
          showIslandError(t("m.common.sign_in_required"), t("m.community.sign_in_to_view_your_qna"));
          return;
        }
        const ok = await ensureQnaNsfwAccess(next, locale);
        if (!ok) return;
        setTab(next);
      })();
    },
    [authStatus, locale, t]
  );

  const onPressPost = useCallback(
    (id: string) => navigation.navigate("PostDetail", { id }),
    [navigation]
  );
  const onPressAuthor = useCallback(
    (author: UserProfileSeed) => openUserProfile(author),
    [openUserProfile]
  );
  const onPressCommunity = useCallback(
    (slug: string) => {
      const hit = items.find(
        (item) => item.type === "post" && item.data.community?.slug === slug
      );
      if (hit?.type === "post") {
        navigation.navigate("PostDetail", { id: hit.data.id });
      }
    },
    [items, navigation]
  );

  const renderItem = useCallback(
    ({ item }: { item: FeedItem }) => {
      if (item.type !== "post") return null;
      return (
        <FeedPostCard
          post={item.data}
          paymentsEnabled={paymentsEnabled}
          onPressPost={onPressPost}
          onPressAuthor={onPressAuthor}
          onPressCommunity={onPressCommunity}
        />
      );
    },
    [onPressAuthor, onPressCommunity, onPressPost, paymentsEnabled]
  );

  const listHeader = (
    <View>
      <View style={[styles.topBar, { paddingTop: insets.top + 6 }]}>
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={10}
          style={styles.iconBtn}
          accessibilityRole="button"
          accessibilityLabel={t("m.common.back")}
        >
          <Ionicons name="chevron-back" size={22} color={colors.brand} />
        </Pressable>
        <SearchField
          ref={searchRef}
          variant="pill"
          value={searchQ}
          onChangeText={(t) => {
            setSearchQ(t);
            if (!t.trim()) setSearchSubmitted("");
          }}
          onClear={() => {
            setSearchQ("");
            setSearchSubmitted("");
            searchRef.current?.blur();
          }}
          onSubmitEditing={() => {
            const trimmed = searchQ.trim();
            setSearchSubmitted(trimmed);
          }}
          placeholder={t("m.community.search_qna")}
          containerStyle={{ flex: 1 }}
        />
        <Pressable
          onPress={openCreate}
          hitSlop={10}
          style={styles.iconBtn}
          accessibilityRole="button"
          accessibilityLabel={t("m.community.create_qna")}
        >
          <Ionicons name="add" size={24} color={colors.brand} />
        </Pressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabs}
      >
        {QNA_FEED_CATEGORY_TABS.map((opt) => {
          const active = tab === opt.id;
          const tabOpt = localizedCategoryTab(opt, locale);
          return (
            <Pressable
              key={opt.id}
              onPress={() => selectTab(opt.id)}
              style={[styles.tab, active && styles.tabActive]}
            >
              <View style={styles.tabInner}>
                {opt.emoji ? <Text style={styles.tabEmoji}>{opt.emoji}</Text> : null}
                <Text style={[styles.tabText, active && styles.tabTextActive]} numberOfLines={1}>
                  {tabOpt.shortLabel}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );

  return (
    <Screen safeTop={false}>
      <FlashList
        data={items}
        keyExtractor={(item, index) =>
          item.type === "post" ? item.data.id : `qna-${index}`
        }
        renderItem={renderItem}
        ListHeaderComponent={listHeader}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />
        }
        onEndReachedThreshold={0.4}
        onEndReached={() => {
          if (query.hasNextPage && !query.isFetchingNextPage) {
            void query.fetchNextPage();
          }
        }}
        ListEmptyComponent={
          query.isLoading ? (
            <ActivityIndicator style={{ marginTop: 40 }} color={colors.brand} />
          ) : query.isError ? (
            <Text style={styles.error}>{t("m.community.could_not_load_qna")}</Text>
          ) : (
            <View style={styles.empty}>
              <Text style={styles.muted}>
                {searchSubmitted
                  ? t("m.community.no_qna_matching_searchsubmitted", { searchSubmitted: String(searchSubmitted) })
                  : tab === QNA_MY_CATEGORY_ID
                    ? t("m.community.you_have_not_posted_qna_yet")
                    : tab === "ALL"
                      ? t("m.community.no_qna_yet_be_the_first")
                      : t("m.community.no_qna_in_this_category")}
              </Text>
              <Pressable style={styles.emptyBtn} onPress={openCreate}>
                <Text style={styles.emptyBtnText}>{t("m.community.create_qna")}</Text>
              </Pressable>
            </View>
          )
        }
        ListFooterComponent={
          query.isFetchingNextPage ? (
            <ActivityIndicator style={{ marginVertical: 16 }} color={colors.brand} />
          ) : null
        }
      />
    </Screen>
  );
}

function createThemedStyles(colors: ThemeColors, isDark: boolean) {
  return StyleSheet.create({
    topBar: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingHorizontal: 10,
      paddingBottom: 8,
    },
    iconBtn: {
      width: 36,
      height: 36,
      alignItems: "center",
      justifyContent: "center",
    },
    tabs: {
      paddingHorizontal: 12,
      paddingBottom: 8,
      gap: 6,
      alignItems: "center",
    },
    tab: {
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: isDark ? colors.border : "#d5d5d5",
      backgroundColor: colors.surfaceRaised,
      marginRight: 6,
    },
    tabInner: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    tabEmoji: { fontSize: 12, lineHeight: 16 },
    tabActive: {
      backgroundColor: colors.brand,
      borderColor: colors.brand,
    },
    tabText: {
      fontSize: 12,
      fontWeight: "700",
      color: colors.textMuted,
      flexShrink: 0,
    },
    tabTextActive: { color: "#fff", fontWeight: "800" },
    muted: { color: colors.textMuted, textAlign: "center" },
    error: { color: colors.danger, padding: spacing.lg, textAlign: "center" },
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
