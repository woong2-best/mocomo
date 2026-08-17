import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import { fetchUserProfile, toggleFollowUser } from "@/api/social";
import { FeedPostCard } from "@/features/feed/FeedPostCard";
import {
  ProfileHeaderChrome,
  type ProfileSortId,
  type ProfileTabId,
} from "@/features/profile/ProfileHeaderChrome";
import { ProfileCalendarSheet } from "@/features/profile/ProfileCalendarSheet";
import { Screen } from "@/ui/Screen";
import { useTheme } from "@/theme/ThemeContext";
import { spacing, type ThemeColors } from "@/theme/tokens";
import type { RootStackParamList } from "@/navigation/types";
import { TipCreatorSheet } from "@/payments/TipCreatorSheet";
import { PayButton } from "@/payments/PayButton";
import { FolkButton } from "@/ui/FolkButton";

type Props = {
  username: string;
  /** Show sticky back affordance (stack profiles). */
  showBack?: boolean;
};

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

export function SharedProfileScreen({ username, showBack = true }: Props) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const queryClient = useQueryClient();
  const { user: authUser } = useAuth();

  const [tab, setTab] = useState<ProfileTabId>("posts");
  const [sort, setSort] = useState<ProfileSortId>("new");
  const [followingLocal, setFollowingLocal] = useState<boolean | null>(null);
  const [tipOpen, setTipOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const query = useQuery({
    queryKey: ["mobile-user", username],
    queryFn: () => fetchUserProfile(username),
  });

  const followMut = useMutation({
    mutationFn: () => toggleFollowUser(query.data!.user.id),
    onMutate: () => {
      const current = followingLocal ?? query.data?.user.following ?? false;
      setFollowingLocal(!current);
    },
    onSuccess: (res) => {
      if (typeof res.following === "boolean") setFollowingLocal(res.following);
      void queryClient.invalidateQueries({ queryKey: ["mobile-user", username] });
    },
    onError: () => setFollowingLocal(null),
  });

  const user = query.data?.user;
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
        onPressAuthor={(u) => navigation.navigate("UserProfile", { username: u })}
        onPressVideo={(postId, mediaId, mediaIndex) =>
          navigation.navigate("Reels", { postId, mediaId, mediaIndex })
        }
      />
    ),
    [navigation, query, user?.paymentsEnabled, user?.subscribed]
  );

  if (query.isLoading) {
    return (
      <Screen safeTop={false}>
        <View style={styles.center}>
          <ActivityIndicator color={colors.terracotta} />
        </View>
      </Screen>
    );
  }

  if (query.isError || !user) {
    return (
      <Screen safeTop={false}>
        {showBack ? (
          <Pressable
            style={[styles.backFloat, { top: insets.top + 8 }]}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="chevron-back" size={24} color={colors.brand} />
          </Pressable>
        ) : null}
        <Text style={styles.error}>프로필을 불러오지 못했습니다.</Text>
      </Screen>
    );
  }

  return (
    <Screen safeTop={false}>
      <FlatList
        data={feed}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        stickyHeaderIndices={undefined}
        ListHeaderComponent={
          <View>
            {/* Compact top bar like web sticky header */}
            <View style={[styles.compactBar, { paddingTop: insets.top + 4 }]}>
              {showBack ? (
                <Pressable onPress={() => navigation.goBack()} hitSlop={10} style={styles.iconBtn}>
                  <Ionicons name="chevron-back" size={26} color={colors.brand} />
                </Pressable>
              ) : (
                <View style={styles.iconBtn} />
              )}
              <View style={styles.compactCenter}>
                <Text style={styles.compactName} numberOfLines={1}>
                  {user.name || user.username}
                </Text>
                <Text style={styles.compactPosts}>{user.counts.posts}개 게시물</Text>
              </View>
              {user.isSelf ? (
                <Pressable
                  onPress={() => setCalendarOpen(true)}
                  hitSlop={10}
                  style={styles.iconBtn}
                  accessibilityRole="button"
                  accessibilityLabel="일정 · 메모 달력"
                >
                  <Ionicons name="calendar-outline" size={22} color={colors.brand} />
                </Pressable>
              ) : (
                <View style={styles.iconBtn} />
              )}
            </View>

            <ProfileHeaderChrome
              user={user}
              tab={tab}
              sort={sort}
              onTabChange={setTab}
              onSortChange={setSort}
              onCreate={() => navigation.navigate("ComposeModal")}
              onFollow={() => followMut.mutate()}
              followLoading={followMut.isPending}
              following={following}
            />

            {!user.isSelf && user.paymentsEnabled ? (
              <View style={styles.monetizationRow}>
                {user.subscribed ? (
                  <FolkButton label="구독 중" variant="secondary" disabled />
                ) : user.creatorSubscriptionPriceKrw && user.creatorSubscriptionPriceKrw > 0 ? (
                  <PayButton
                    type="CREATOR_SUBSCRIPTION"
                    amount={user.creatorSubscriptionPriceKrw}
                    orderName={`@${user.username} 구독`}
                    metadata={{
                      creatorId: user.id,
                      username: user.username,
                    }}
                    label={`${user.creatorSubscriptionPriceKrw.toLocaleString()}원/월 구독`}
                    variant="secondary"
                    onSuccess={() => void query.refetch()}
                  />
                ) : null}
                <FolkButton
                  label="후원"
                  onPress={() => setTipOpen(true)}
                  style={styles.tipBtn}
                />
              </View>
            ) : null}

            <TipCreatorSheet
              visible={tipOpen}
              onClose={() => setTipOpen(false)}
              creatorId={user.id}
              username={user.username}
              displayName={user.name || user.username}
              onSuccess={() => {
                Alert.alert("후원 완료", "후원이 완료되었습니다.");
                void query.refetch();
              }}
            />

            {user.isSelf ? (
              <ProfileCalendarSheet
                visible={calendarOpen}
                onClose={() => setCalendarOpen(false)}
                countryCode={user.countryCode ?? authUser?.countryCode}
                timeZone={authUser?.timeZone}
              />
            ) : null}
          </View>
        }
        ListEmptyComponent={
          <Text style={styles.muted}>{emptyMessage}</Text>
        }
        contentContainerStyle={{ paddingBottom: spacing.xl + 24 }}
      />
    </Screen>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    center: { flex: 1, alignItems: "center", justifyContent: "center" },
    error: {
      color: colors.danger,
      padding: spacing.lg,
      fontWeight: "600",
      textAlign: "center",
      marginTop: 80,
    },
    muted: {
      color: colors.textMuted,
      padding: spacing.lg,
      fontWeight: "600",
      textAlign: "center",
    },
    compactBar: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 8,
      paddingBottom: 8,
      backgroundColor: colors.background,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.hairline,
    },
    compactCenter: { flex: 1, alignItems: "flex-start", minWidth: 0 },
    compactName: { fontSize: 16, fontWeight: "800", color: colors.text },
    compactPosts: { fontSize: 12, color: colors.textMuted, fontWeight: "600", marginTop: 1 },
    iconBtn: {
      width: 40,
      height: 40,
      alignItems: "center",
      justifyContent: "center",
    },
    backFloat: {
      position: "absolute",
      left: 8,
      zIndex: 2,
      width: 40,
      height: 40,
      alignItems: "center",
      justifyContent: "center",
    },
    monetizationRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.sm,
    },
    tipBtn: { minWidth: 96 },
  });
}
