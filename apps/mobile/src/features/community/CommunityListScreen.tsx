import { useCallback, useMemo, useRef, useState } from "react";
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
import type { FeedItem } from "@/api/feed";
import { FeedPostCard } from "@/features/feed/FeedPostCard";
import { useUserProfileNav, type UserProfileSeed } from "@/features/profile/user-profile-nav";
import {
  COMMUNITY_CATEGORY_OPTIONS,
  type CommunityCategoryId,
} from "@/features/community/community-labels";
import { SearchField } from "@/ui/SearchField";
import { Screen } from "@/ui/Screen";
import { useTheme } from "@/theme/ThemeContext";
import { spacing, type ThemeColors } from "@/theme/tokens";
import type { RootStackParamList } from "@/navigation/types";

type TabId = "ALL" | CommunityCategoryId;

export function CommunityListScreen() {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createThemedStyles(colors, isDark), [colors, isDark]);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { open: openUserProfile } = useUserProfileNav();
  const queryClient = useQueryClient();
  const searchRef = useRef<TextInput>(null);
  const [tab, setTab] = useState<TabId>("ALL");
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

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["mobile-qna-feed", tab, searchSubmitted] });
    setRefreshing(false);
  }, [queryClient, searchSubmitted, tab]);

  const openCreate = useCallback(() => {
    navigation.navigate("CommunityCreate");
  }, [navigation]);

  const onPressPost = useCallback(
    (id: string) => navigation.navigate("PostDetail", { id }),
    [navigation]
  );
  const onPressAuthor = useCallback(
    (author: UserProfileSeed) => openUserProfile(author),
    [openUserProfile]
  );
  const onPressCommunity = useCallback(
    (slug: string) => navigation.navigate("CommunityServer", { slug }),
    [navigation]
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
          accessibilityLabel="뒤로"
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
          placeholder="QnA 검색"
          containerStyle={{ flex: 1 }}
        />
        <Pressable
          onPress={openCreate}
          hitSlop={10}
          style={styles.iconBtn}
          accessibilityRole="button"
          accessibilityLabel="QnA 만들기"
        >
          <Ionicons name="add" size={24} color={colors.brand} />
        </Pressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabs}
      >
        {COMMUNITY_CATEGORY_OPTIONS.map((opt) => {
          const active = tab === opt.id;
          return (
            <Pressable
              key={opt.id}
              onPress={() => setTab(opt.id)}
              style={[styles.tab, active && styles.tabActive]}
            >
              <Text style={[styles.tabText, active && styles.tabTextActive]}>
                {opt.emoji ? `${opt.emoji} ` : ""}
                {opt.shortLabel}
              </Text>
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
            <Text style={styles.error}>QnA를 불러오지 못했습니다.</Text>
          ) : (
            <View style={styles.empty}>
              <Text style={styles.muted}>
                {searchSubmitted
                  ? `"${searchSubmitted}"에 맞는 QnA가 없습니다.`
                  : tab === "ALL"
                    ? "아직 QnA가 없습니다. 첫 글을 남겨보세요!"
                    : "이 카테고리에 QnA가 없습니다."}
              </Text>
              <Pressable style={styles.emptyBtn} onPress={openCreate}>
                <Text style={styles.emptyBtnText}>QnA 만들기</Text>
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
    tabActive: {
      backgroundColor: colors.brand,
      borderColor: colors.brand,
    },
    tabText: { fontSize: 12, fontWeight: "700", color: colors.textMuted },
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
