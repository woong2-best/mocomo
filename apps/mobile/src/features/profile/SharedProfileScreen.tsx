import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/auth/AuthContext";
import type { FeedPost } from "@/api/feed";
import { fetchUserProfile, toggleFollowUser, type ProfileUser } from "@/api/social";
import {
  FOLLOWING_DM_QUERY_KEY,
  removeFollowingDmUser,
  restoreFollowingDmUsers,
  upsertFollowingDmUser,
} from "@/api/following-dm-cache";
import { FeedPostCard } from "@/features/feed/FeedPostCard";
import {
  ProfileHeaderChrome,
  type ProfileSortId,
  type ProfileTabId,
} from "@/features/profile/ProfileHeaderChrome";
import { ProfileCalendarSheet } from "@/features/profile/ProfileCalendarSheet";
import { ProfileOptionsSheet } from "@/features/profile/ProfileOptionsSheet";
import { ProfileFollowListSheet } from "@/features/profile/ProfileFollowListSheet";
import type { FollowListTab } from "@/api/social";
import {
  USER_PROFILE_STALE_MS,
  useUserProfileNav,
  userProfileQueryKey,
  type UserProfileSeed,
} from "@/features/profile/user-profile-nav";
import { Screen } from "@/ui/Screen";
import { useTheme } from "@/theme/ThemeContext";
import { spacing, type ThemeColors } from "@/theme/tokens";
import type { RootStackParamList } from "@/navigation/types";

type Props = {
  username: string;
  /** Show sticky back affordance (stack profiles). */
  showBack?: boolean;
  /** Avatar, nickname, and handle already known at the tap site. */
  preview?: UserProfileSeed;
  /** Own-profile route. Other users are detected from the signed-in username. */
  self?: boolean;
};

function seedProfileUser(username: string, preview: UserProfileSeed | undefined, isSelf: boolean): ProfileUser {
  return {
    id: "",
    username,
    name: preview?.name ?? null,
    image: preview?.image ?? null,
    bio: null,
    createdAt: "",
    counts: { posts: 0, followers: 0, following: 0 },
    following: false,
    isSelf,
  };
}

function sortPosts(posts: FeedPost[], sort: ProfileSortId): FeedPost[] {
  const list = [...posts];
  if (sort === "oldest") {
    return list.sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  }
  if (sort === "popular") {
    return list.sort((a, b) => (b._count?.likes ?? 0) - (a._count?.likes ?? 0));
  }
  return list.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

function filterByTab(posts: FeedPost[], tab: ProfileTabId): FeedPost[] {
  if (tab === "media") {
    return posts.filter((p) => (p.media?.length ?? 0) > 0);
  }
  if (tab === "posts") return posts;
  // replies / wiki / likes need dedicated APIs — empty for now with message
  return [];
}

export function SharedProfileScreen({ username, showBack = true, preview, self = false }: Props) {
  const handle = username.trim();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { open } = useUserProfileNav();
  const queryClient = useQueryClient();
  const { user: authUser } = useAuth();

  const [tab, setTab] = useState<ProfileTabId>("posts");
  const [sort, setSort] = useState<ProfileSortId>("new");
  const [followingLocal, setFollowingLocal] = useState<boolean | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [followListTab, setFollowListTab] = useState<FollowListTab | null>(null);

  const query = useQuery({
    queryKey: userProfileQueryKey(handle),
    queryFn: () => fetchUserProfile(handle),
    staleTime: USER_PROFILE_STALE_MS,
    enabled: handle.length > 0,
  });

  const followMut = useMutation({
    mutationFn: () => toggleFollowUser(query.data!.user.id),
    onMutate: async () => {
      const profile = query.data?.user;
      const current = followingLocal ?? profile?.following ?? false;
      const next = !current;
      setFollowingLocal(next);
      const snapshot = profile
        ? next
          ? await upsertFollowingDmUser(queryClient, {
              id: profile.id,
              username: profile.username,
              name: profile.name,
              image: profile.image,
            })
          : await removeFollowingDmUser(queryClient, profile.id)
        : null;
      return { snapshot };
    },
    onSuccess: (res) => {
      if (typeof res.following === "boolean") setFollowingLocal(res.following);
      const profile = query.data?.user;
      if (profile && res.following === false) {
        void removeFollowingDmUser(queryClient, profile.id);
      } else if (profile && res.following === true) {
        void upsertFollowingDmUser(queryClient, {
          id: profile.id,
          username: profile.username,
          name: profile.name,
          image: profile.image,
        });
      } else if (profile && res.pending && !res.following) {
        void removeFollowingDmUser(queryClient, profile.id);
      }
      void queryClient.invalidateQueries({ queryKey: userProfileQueryKey(handle) });
      void queryClient.invalidateQueries({ queryKey: FOLLOWING_DM_QUERY_KEY });
    },
    onError: (_err, _vars, ctx) => {
      setFollowingLocal(null);
      if (ctx?.snapshot) restoreFollowingDmUsers(queryClient, ctx.snapshot);
    },
  });

  const user = query.data?.user;
  const pending = !user && query.isPending;
  const knownSelf = self || (!!authUser?.username && authUser.username === handle);
  const headerUser = user ?? seedProfileUser(handle, preview, knownSelf);
  const following = followingLocal ?? user?.following ?? false;

  const feed = useMemo(() => {
    const raw = query.data?.posts ?? [];
    return sortPosts(filterByTab(raw, tab), sort);
  }, [query.data?.posts, sort, tab]);

  const emptyMessage = useMemo(() => {
    if (tab === "replies") return "답글 탭은 곧 지원됩니다.";
    if (tab === "wiki") return "위키 기여가 없습니다.";
    if (tab === "likes") return "좋아요한 게시물이 없습니다.";
    if (tab === "media") return "미디어가 없습니다.";
    return "아직 게시물이 없습니다.";
  }, [tab]);

  const renderItem = useCallback(
    ({ item }: { item: FeedPost }) => (
      <FeedPostCard
        post={{
          ...item,
          subscribedToAuthor: user?.subscribed ?? item.subscribedToAuthor,
          paymentsEnabled: user?.paymentsEnabled ?? item.paymentsEnabled,
        }}
        paymentsEnabled={user?.paymentsEnabled}
        onPurchaseSuccess={() => void query.refetch()}
        onPressPost={(id) => navigation.navigate("PostDetail", { id })}
        onPressAuthor={(author) => open(author)}
        onPressVideo={(postId, mediaId, mediaIndex) =>
          navigation.navigate("Reels", { postId, mediaId, mediaIndex })
        }
      />
    ),
    [navigation, open, query, user?.paymentsEnabled, user?.subscribed]
  );

  const isSelf = user?.isSelf ?? knownSelf;

  return (
    <Screen safeTop={false}>
      <FlatList
        data={user ? feed : []}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        stickyHeaderIndices={undefined}
        ListHeaderComponent={
          <View>
            <View style={styles.headerWrap}>
              <ProfileHeaderChrome
                user={headerUser}
                pending={!user}
                tab={tab}
                sort={sort}
                bannerTopInset={insets.top}
                onTabChange={setTab}
                onSortChange={setSort}
                onCreate={isSelf ? () => navigation.navigate("ComposeModal") : undefined}
                onFollow={user && !user.isSelf ? () => followMut.mutate() : undefined}
                followLoading={followMut.isPending}
                following={following}
                onOpenChat={
                  user && !user.isSelf
                    ? (roomId) =>
                        navigation.navigate("MessageRoom", {
                          roomId,
                          title: user.name || user.username,
                        })
                    : undefined
                }
                onOpenFollowList={
                  user ? (tab) => setFollowListTab(tab) : undefined
                }
              />
              <View
                style={[styles.compactBar, { paddingTop: insets.top + 4 }]}
                pointerEvents="box-none"
              >
                {showBack ? (
                  <Pressable onPress={() => navigation.goBack()} hitSlop={10} style={styles.iconBtn}>
                    <Ionicons name="chevron-back" size={26} color={colors.brand} />
                  </Pressable>
                ) : (
                  <View style={styles.iconBtn} />
                )}
                <View style={styles.compactSpacer} />
                {isSelf ? (
                  <Pressable
                    onPress={() => setCalendarOpen(true)}
                    hitSlop={10}
                    style={styles.iconBtn}
                    accessibilityRole="button"
                    accessibilityLabel="일정 · 메모 달력"
                  >
                    <Ionicons name="calendar-outline" size={22} color={colors.brand} />
                  </Pressable>
                ) : user ? (
                  <Pressable
                    onPress={() => setOptionsOpen(true)}
                    hitSlop={10}
                    style={styles.moreBtn}
                    accessibilityRole="button"
                    accessibilityLabel="프로필 옵션"
                  >
                    <Ionicons name="ellipsis-horizontal" size={18} color={colors.text} />
                  </Pressable>
                ) : (
                  <View style={styles.iconBtn} />
                )}
              </View>
            </View>

            {user ? (
              <ProfileFollowListSheet
                visible={followListTab !== null}
                tab={followListTab ?? "followers"}
                username={user.username}
                onClose={() => setFollowListTab(null)}
              />
            ) : null}

            {isSelf ? (
              <ProfileCalendarSheet
                visible={calendarOpen}
                onClose={() => setCalendarOpen(false)}
                countryCode={user?.countryCode ?? authUser?.countryCode}
                timeZone={authUser?.timeZone}
              />
            ) : user ? (
              <ProfileOptionsSheet
                visible={optionsOpen}
                onClose={() => setOptionsOpen(false)}
                userId={user.id}
                username={user.username}
                onBlocked={() => {
                  setOptionsOpen(false);
                  navigation.goBack();
                }}
              />
            ) : null}
          </View>
        }
        ListEmptyComponent={
          pending ? (
            <View>
              {[0, 1, 2].map((i) => (
                <View key={i} style={styles.postSkel}>
                  <View style={styles.postSkelAvatar} />
                  <View style={styles.postSkelLines}>
                    <View style={styles.postSkelLine} />
                    <View style={styles.postSkelLineShort} />
                  </View>
                </View>
              ))}
            </View>
          ) : !user ? (
            <Pressable onPress={() => void query.refetch()} style={styles.errorWrap}>
              {query.isFetching ? (
                <ActivityIndicator color={colors.terracotta} />
              ) : (
                <Text style={styles.error}>프로필을 불러오지 못했습니다. 탭하여 다시 시도</Text>
              )}
            </Pressable>
          ) : (
            <Text style={styles.muted}>{emptyMessage}</Text>
          )
        }
        contentContainerStyle={{ paddingBottom: spacing.xl + 24 }}
      />
    </Screen>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    errorWrap: { paddingTop: spacing.lg },
    error: {
      color: colors.danger,
      padding: spacing.lg,
      fontWeight: "600",
      textAlign: "center",
    },
    headerWrap: {
      position: "relative",
    },
    postSkel: {
      flexDirection: "row",
      gap: 12,
      paddingHorizontal: spacing.md,
      paddingVertical: 14,
    },
    postSkelAvatar: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: colors.muted,
    },
    postSkelLines: { flex: 1, gap: 8, justifyContent: "center" },
    postSkelLine: {
      height: 12,
      width: "78%",
      borderRadius: 6,
      backgroundColor: colors.muted,
    },
    postSkelLineShort: {
      height: 12,
      width: "46%",
      borderRadius: 6,
      backgroundColor: colors.muted,
    },
    muted: {
      color: colors.textMuted,
      padding: spacing.lg,
      fontWeight: "600",
      textAlign: "center",
    },
    compactBar: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 8,
      paddingBottom: 8,
      backgroundColor: "transparent",
    },
    compactSpacer: { flex: 1 },
    iconBtn: {
      width: 40,
      height: 40,
      alignItems: "center",
      justifyContent: "center",
    },
    moreBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.hairline,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 4,
    },
  });
}
