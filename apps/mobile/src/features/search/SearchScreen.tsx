import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp, NativeStackScreenProps } from "@react-navigation/native-stack";
import { searchPage, toggleFollowUser, type SearchPageUser } from "@/api/social";
import type { FeedPost } from "@/api/feed";
import { useAuth } from "@/auth/AuthContext";
import { FeedPostCard } from "@/features/feed/FeedPostCard";
import { useUserProfileNav } from "@/features/profile/user-profile-nav";
import { FolkAvatar } from "@/ui/FolkAvatar";
import { Screen } from "@/ui/Screen";
import { SearchField } from "@/ui/SearchField";
import { AppHeader } from "@/ui/AppHeader";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/theme/ThemeContext";
import { spacing, type ThemeColors } from "@/theme/tokens";
import type { RootStackParamList } from "@/navigation/types";
import { useI18n } from "@/i18n/I18nProvider";

type Filter = "top" | "latest" | "people" | "media";
type SearchRoute = NativeStackScreenProps<RootStackParamList, "Search">["route"];

const TABS: { id: Filter; labelKey: "m.search.tab.top" | "m.search.tab.latest" | "m.search.tab.people" | "m.search.tab.media" }[] = [
  { id: "top", labelKey: "m.search.tab.top" },
  { id: "latest", labelKey: "m.search.tab.latest" },
  { id: "people", labelKey: "m.search.tab.people" },
  { id: "media", labelKey: "m.search.tab.media" },
];

const MEDIA_COLS = 3;
const MEDIA_GAP = 1;

function isVisualMedia(m: FeedPost["media"][number] | null | undefined) {
  if (!m || m.type === "AUDIO") return false;
  return Boolean(m.url || m.posterUrl);
}

function mediaTileUri(m: FeedPost["media"][number]) {
  const raw = m.type === "VIDEO" ? m.posterUrl || m.url : m.url;
  return typeof raw === "string" && raw.length > 0 ? raw : null;
}

function hasVisualMedia(post: FeedPost) {
  return (Array.isArray(post.media) ? post.media : []).some(isVisualMedia);
}

export function SearchScreen() {
  const { t } = useI18n();
  const { colors } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const mediaTileSize = Math.floor((windowWidth - MEDIA_GAP * (MEDIA_COLS - 1)) / MEDIA_COLS);
  const styles = useMemo(() => createThemedStyles(colors), [colors]);
  const { user } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<SearchRoute>();
  const { open: openUserProfile, prefetch: prefetchUserProfile } = useUserProfileNav();

  const paramQ = route.params?.q?.trim() ?? "";
  const [q, setQ] = useState(paramQ);
  const [submitted, setSubmitted] = useState(paramQ);
  const [filter, setFilter] = useState<Filter>("top");

  useEffect(() => {
    const next = route.params?.q?.trim() ?? "";
    setQ(next);
    setSubmitted(next);
    setFilter("top");
  }, [route.params?.q]);

  const query = useQuery({
    queryKey: ["mobile-search-page", submitted],
    queryFn: () => searchPage(submitted),
    enabled: submitted.length > 0,
  });

  const submit = useCallback(
    (raw: string) => {
      const next = raw.trim();
      setQ(next);
      setSubmitted(next);
      setFilter("top");
      navigation.setParams({ q: next || undefined });
    },
    [navigation]
  );

  const users = query.data?.users ?? [];
  const postsTop = query.data?.postsTop ?? [];
  const postsLatest = query.data?.postsLatest ?? [];
  const paymentsEnabled = query.data?.paymentsEnabled ?? false;
  const topPreviewUsers = users.slice(0, 3);

  const mediaPosts = useMemo(() => {
    const seen = new Set<string>();
    return [...postsLatest, ...postsTop].filter((post) => {
      if (!hasVisualMedia(post) || seen.has(post.id)) return false;
      seen.add(post.id);
      return true;
    });
  }, [postsLatest, postsTop]);

  const mediaTiles = useMemo(
    () =>
      mediaPosts.flatMap((post) =>
        (Array.isArray(post.media) ? post.media : [])
          .filter(isVisualMedia)
          .map((media, index) => ({ post, media, index }))
          .filter((tile) => mediaTileUri(tile.media))
      ),
    [mediaPosts]
  );

  const listData = useMemo(() => {
    if (filter === "people") return users.map((u) => ({ kind: "user" as const, user: u }));
    if (filter === "latest") return postsLatest.map((p) => ({ kind: "post" as const, post: p }));
    const rows: Array<{ kind: "user"; user: SearchPageUser } | { kind: "post"; post: FeedPost } | { kind: "more" }> = [];
    for (const u of topPreviewUsers) rows.push({ kind: "user", user: u });
    if (users.length > topPreviewUsers.length) rows.push({ kind: "more" });
    for (const p of postsTop) rows.push({ kind: "post", post: p });
    return rows;
  }, [filter, postsLatest, postsTop, topPreviewUsers, users]);

  const emptyLabel =
    filter === "people"
      ? t("m.search.empty_people")
      : filter === "media"
        ? t("m.search.empty_media")
        : t("m.search.empty_posts");

  return (
    <Screen>
      <AppHeader
        leftLabel={t("m.common.back")}
        onLeftPress={() => navigation.goBack()}
        border={false}
        style={{ backgroundColor: colors.background }}
        centerSlot={
          <SearchField
            value={q}
            onChangeText={setQ}
            onClear={() => submit("")}
            onSubmitEditing={() => submit(q)}
            placeholder={t("common.search")}
            autoFocus={!paramQ}
            variant="pill"
            containerStyle={styles.searchInHeader}
          />
        }
      />

      <View style={styles.tabs}>
        {TABS.map((tab) => {
          const active = filter === tab.id;
          return (
            <Pressable
              key={tab.id}
              onPress={() => setFilter(tab.id)}
              style={[styles.tab, active && styles.tabActive]}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{t(tab.labelKey)}</Text>
            </Pressable>
          );
        })}
      </View>

      {!submitted ? (
        <Text style={styles.hint}>{t("m.search.same_unified_search_as_the_website")}</Text>
      ) : query.isLoading ? (
        <ActivityIndicator style={{ marginTop: 32 }} color={colors.terracotta} />
      ) : query.isError ? (
        <Text style={styles.error}>{t("m.search.search_failed")}</Text>
      ) : (
        filter === "media" ? (
        <FlatList
          key="search-media-grid"
          style={{ flex: 1 }}
          data={mediaTiles}
          numColumns={MEDIA_COLS}
          keyExtractor={(item) => `${item.post.id}-${item.media.id ?? item.index}`}
          contentContainerStyle={
            mediaTiles.length === 0 ? styles.mediaEmptyWrap : { paddingBottom: 40 }
          }
          columnWrapperStyle={mediaTiles.length > 0 ? styles.mediaRow : undefined}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={<Text style={styles.hint}>{emptyLabel}</Text>}
          renderItem={({ item }) => {
            const isVideo = item.media.type === "VIDEO";
            const uri = mediaTileUri(item.media);
            if (!uri) return <View style={{ width: mediaTileSize, height: mediaTileSize }} />;
            return (
              <Pressable
                onPress={() => navigation.navigate("PostDetail", { id: item.post.id })}
                style={[styles.mediaTile, { width: mediaTileSize, height: mediaTileSize }]}
              >
                <Image source={{ uri }} style={StyleSheet.absoluteFillObject} contentFit="cover" />
                {isVideo ? (
                  <View style={styles.mediaDur}>
                    <Ionicons name="play" size={11} color="#fff" />
                    <Text style={styles.mediaDurText}>
                      {formatMediaDuration(item.media.duration)}
                    </Text>
                  </View>
                ) : null}
              </Pressable>
            );
          }}
        />
      ) : (
        <FlatList
          key="search-list"
          style={{ flex: 1 }}
          data={listData}
          keyExtractor={(item, index) =>
            item.kind === "user"
              ? `u-${item.user.id}`
              : item.kind === "post"
                ? `p-${item.post.id}`
                : `more-${index}`
          }
          contentContainerStyle={{ paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={<Text style={styles.hint}>{emptyLabel}</Text>}
          renderItem={({ item }) => {
            if (item.kind === "more") {
              return (
                <Pressable style={styles.moreBtn} onPress={() => setFilter("people")}>
                  <Text style={styles.moreLabel}>{t("m.search.see_all_people")}</Text>
                </Pressable>
              );
            }
            if (item.kind === "user") {
              return (
                <SearchUserRow
                  user={item.user}
                  viewerId={user?.id ?? null}
                  colors={colors}
                  onPressIn={() => prefetchUserProfile(item.user)}
                  onPress={() => openUserProfile(item.user)}
                />
              );
            }
            return (
              <FeedPostCard
                post={item.post}
                paymentsEnabled={paymentsEnabled}
                onPressPost={(id) => navigation.navigate("PostDetail", { id })}
                onPressAuthor={(author) => openUserProfile(author)}
                onPressVideo={(id, mediaId, mediaIndex) =>
                  navigation.navigate("Reels", { postId: id, mediaId, mediaIndex })
                }
              />
            );
          }}
        />
        )
      )}
    </Screen>
  );
}

function formatMediaDuration(sec?: number | null) {
  if (!sec || sec <= 0 || !Number.isFinite(sec)) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function SearchUserRow({
  user,
  viewerId,
  colors,
  onPressIn,
  onPress,
}: {
  user: SearchPageUser;
  viewerId: string | null;
  colors: ThemeColors;
  onPressIn: () => void;
  onPress: () => void;
}) {
  const { t } = useI18n();
  const [following, setFollowing] = useState(!!user.isFollowing);
  const follow = useMutation({
    mutationFn: () => toggleFollowUser(user.id),
    onSuccess: (res) => {
      if (typeof res.following === "boolean") setFollowing(res.following);
      else setFollowing((v) => !v);
    },
  });
  const isSelf = Boolean(viewerId && viewerId === user.id);

  return (
    <Pressable
      onPressIn={onPressIn}
      onPress={onPress}
      style={[stylesUser.row, { borderBottomColor: colors.hairline }]}
    >
      <FolkAvatar uri={user.image} name={user.name || user.username} size={48} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[stylesUser.name, { color: colors.text }]} numberOfLines={1}>
          {user.name || user.username}
        </Text>
        <Text style={[stylesUser.handle, { color: colors.textMuted }]} numberOfLines={1}>
          @{user.username}
        </Text>
        {user.bio ? (
          <Text style={[stylesUser.bio, { color: colors.text }]} numberOfLines={2}>
            {user.bio}
          </Text>
        ) : null}
      </View>
      {!isSelf ? (
        <Pressable
          onPress={() => follow.mutate()}
          disabled={follow.isPending}
          style={[
            stylesUser.follow,
            {
              backgroundColor: following ? "transparent" : colors.cobalt,
              borderColor: colors.cobalt,
            },
          ]}
        >
          <Text style={{ color: following ? colors.text : "#fff", fontWeight: "800", fontSize: 13 }}>
            {following ? t("m.common.following") : t("m.common.follow")}
          </Text>
        </Pressable>
      ) : null}
    </Pressable>
  );
}

const stylesUser = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  name: { fontSize: 15, fontWeight: "800" },
  handle: { fontSize: 13, fontWeight: "600", marginTop: 1 },
  bio: { fontSize: 14, marginTop: 4, lineHeight: 18 },
  follow: {
    borderWidth: 1.5,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
});

function createThemedStyles(colors: ThemeColors) {
  return StyleSheet.create({
    searchInHeader: { flex: 1 },
    tabs: {
      flexDirection: "row",
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.hairline,
    },
    tab: {
      flex: 1,
      alignItems: "center",
      paddingVertical: 14,
      borderBottomWidth: 2,
      borderBottomColor: "transparent",
    },
    tabActive: { borderBottomColor: colors.cobalt },
    tabLabel: { fontSize: 14, fontWeight: "700", color: colors.textMuted },
    tabLabelActive: { color: colors.text },
    hint: {
      color: colors.textMuted,
      padding: spacing.lg,
      fontWeight: "600",
      textAlign: "center",
    },
    error: { color: colors.danger, padding: spacing.lg, fontWeight: "600" },
    moreBtn: { paddingHorizontal: spacing.md, paddingVertical: 14 },
    moreLabel: { color: colors.cobalt, fontWeight: "700", fontSize: 14 },
    mediaEmptyWrap: { flexGrow: 1, justifyContent: "center", paddingBottom: 40 },
    mediaRow: { gap: MEDIA_GAP },
    mediaTile: {
      backgroundColor: "#111",
      overflow: "hidden",
      marginBottom: MEDIA_GAP,
    },
    mediaDur: {
      position: "absolute",
      left: 6,
      bottom: 6,
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
      backgroundColor: "rgba(0,0,0,0.75)",
      borderRadius: 4,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    mediaDurText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  });
}
