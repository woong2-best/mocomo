import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  fetchUserConnections,
  toggleFollowUser,
  type ConnectionListUser,
  type FollowListTab,
} from "@/api/social";
import {
  FOLLOWING_DM_QUERY_KEY,
  removeFollowingDmUser,
  upsertFollowingDmUser,
} from "@/api/following-dm-cache";
import { useAuth } from "@/auth/AuthContext";
import { useUserProfileNav } from "@/features/profile/user-profile-nav";
import { FolkAvatar } from "@/ui/FolkAvatar";
import { useTheme } from "@/theme/ThemeContext";
import { radii, spacing, type ThemeColors } from "@/theme/tokens";

type Props = {
  visible: boolean;
  onClose: () => void;
  username: string;
  tab: FollowListTab;
};

function tabTitle(tab: FollowListTab): string {
  return tab === "followers" ? "팔로워" : "팔로잉";
}

export function ProfileFollowListSheet({ visible, onClose, username, tab }: Props) {
  const { colors, mode } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { user: authUser } = useAuth();
  const { open: openProfile } = useUserProfileNav();
  const [followOverrides, setFollowOverrides] = useState<Record<string, boolean>>({});

  const listQuery = useInfiniteQuery({
    queryKey: ["mobile-user-connections", username, tab],
    queryFn: ({ pageParam }) =>
      fetchUserConnections(username, tab, typeof pageParam === "string" ? pageParam : undefined),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled: visible && username.length > 0,
    staleTime: 30_000,
  });

  useEffect(() => {
    if (!visible) setFollowOverrides({});
  }, [visible, tab, username]);

  const users = useMemo(() => {
    const merged: ConnectionListUser[] = [];
    const seen = new Set<string>();
    for (const page of listQuery.data?.pages ?? []) {
      for (const u of page.users) {
        if (seen.has(u.id)) continue;
        seen.add(u.id);
        merged.push({
          ...u,
          viewerFollows: followOverrides[u.id] ?? u.viewerFollows,
        });
      }
    }
    return merged;
  }, [followOverrides, listQuery.data?.pages]);

  const followMut = useMutation({
    mutationFn: (target: ConnectionListUser) => toggleFollowUser(target.id),
    onMutate: async (target) => {
      const current = followOverrides[target.id] ?? target.viewerFollows;
      const next = !current;
      setFollowOverrides((prev) => ({ ...prev, [target.id]: next }));
      if (next) {
        await upsertFollowingDmUser(queryClient, {
          id: target.id,
          username: target.username,
          name: target.name,
          image: target.image,
        });
      } else {
        await removeFollowingDmUser(queryClient, target.id);
      }
      return { prev: current };
    },
    onSuccess: (res, target) => {
      if (typeof res.following === "boolean") {
        setFollowOverrides((prev) => ({ ...prev, [target.id]: res.following! }));
        if (res.following) {
          void upsertFollowingDmUser(queryClient, {
            id: target.id,
            username: target.username,
            name: target.name,
            image: target.image,
          });
        } else {
          void removeFollowingDmUser(queryClient, target.id);
        }
      } else if (res.pending && !res.following) {
        setFollowOverrides((prev) => ({ ...prev, [target.id]: false }));
        void removeFollowingDmUser(queryClient, target.id);
      }
      void queryClient.invalidateQueries({ queryKey: FOLLOWING_DM_QUERY_KEY });
    },
    onError: (_err, target, ctx) => {
      if (ctx?.prev !== undefined) {
        setFollowOverrides((prev) => ({ ...prev, [target.id]: ctx.prev }));
      }
    },
  });

  const blurTint = mode === "dark" ? "dark" : "light";

  const renderRow = useCallback(
    ({ item }: { item: ConnectionListUser }) => {
      const display = item.name?.trim() || item.username;
      const isSelf = authUser?.id === item.id;
      const following = item.viewerFollows;

      return (
        <View style={styles.row}>
          <Pressable
            style={styles.rowMain}
            onPress={() => {
              onClose();
              openProfile({ username: item.username, name: item.name, image: item.image });
            }}
            accessibilityRole="button"
          >
            <FolkAvatar uri={item.image} name={display} size={44} />
            <View style={styles.rowText}>
              <Text style={styles.rowName} numberOfLines={1}>
                {display}
              </Text>
              <Text style={styles.rowHandle} numberOfLines={1}>
                @{item.username}
              </Text>
            </View>
          </Pressable>
          {!isSelf ? (
            <Pressable
              style={[styles.followBtn, following ? null : styles.followBtnPrimary]}
              onPress={() => followMut.mutate(item)}
              disabled={followMut.isPending}
              accessibilityRole="button"
              accessibilityLabel={following ? "팔로잉" : "팔로우"}
            >
              <Text style={[styles.followBtnText, following ? null : styles.followBtnTextPrimary]}>
                {following ? "팔로잉" : "팔로우"}
              </Text>
            </Pressable>
          ) : null}
        </View>
      );
    },
    [authUser?.id, followMut, onClose, openProfile, styles]
  );

  const empty =
    !listQuery.isPending && !listQuery.isError && users.length === 0 ? (
      <Text style={styles.empty}>
        {tab === "followers" ? "팔로워가 없습니다." : "팔로잉한 사용자가 없습니다."}
      </Text>
    ) : null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button">
          <BlurView
            intensity={Platform.OS === "android" ? 48 : 32}
            tint={blurTint}
            style={StyleSheet.absoluteFill}
            experimentalBlurMethod={Platform.OS === "android" ? "dimezisBlurView" : undefined}
          />
          <View style={styles.dim} pointerEvents="none" />
        </Pressable>

        <View
          style={[
            styles.panel,
            { marginTop: insets.top + 48, marginBottom: insets.bottom + 24 },
          ]}
        >
          <View style={styles.panelHeader}>
            <Text style={styles.panelTitle}>{tabTitle(tab)}</Text>
            <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel="닫기">
              <Ionicons name="close" size={24} color={colors.text} />
            </Pressable>
          </View>

          {listQuery.isPending && users.length === 0 ? (
            <View style={styles.loaderWrap}>
              <ActivityIndicator color={colors.brand} />
            </View>
          ) : listQuery.isError ? (
            <Pressable onPress={() => void listQuery.refetch()} style={styles.loaderWrap}>
              <Text style={styles.error}>목록을 불러오지 못했습니다. 탭하여 다시 시도</Text>
            </Pressable>
          ) : (
            <FlatList
              data={users}
              keyExtractor={(item) => item.id}
              renderItem={renderRow}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={empty}
              onEndReached={() => {
                if (listQuery.hasNextPage && !listQuery.isFetchingNextPage) {
                  void listQuery.fetchNextPage();
                }
              }}
              onEndReachedThreshold={0.4}
              ListFooterComponent={
                listQuery.isFetchingNextPage ? (
                  <ActivityIndicator style={styles.footerLoader} color={colors.brand} />
                ) : null
              }
              keyboardShouldPersistTaps="handled"
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    root: {
      flex: 1,
      justifyContent: "center",
      paddingHorizontal: spacing.md,
    },
    dim: {
      ...StyleSheet.absoluteFill,
      backgroundColor: "rgba(0,0,0,0.35)",
    },
    panel: {
      flex: 1,
      maxHeight: "78%",
      backgroundColor: colors.surfaceRaised,
      borderRadius: radii.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.hairline,
      overflow: "hidden",
    },
    panelHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: spacing.md,
      paddingVertical: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.hairline,
    },
    panelTitle: {
      fontSize: 18,
      fontWeight: "800",
      color: colors.text,
    },
    listContent: {
      paddingBottom: spacing.lg,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: spacing.md,
      paddingVertical: 12,
      gap: 10,
    },
    rowMain: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      minWidth: 0,
    },
    rowText: {
      flex: 1,
      minWidth: 0,
      gap: 2,
    },
    rowName: {
      fontSize: 16,
      fontWeight: "800",
      color: colors.text,
    },
    rowHandle: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.textMuted,
    },
    followBtn: {
      borderWidth: 1.5,
      borderColor: colors.brand,
      borderRadius: radii.pill,
      paddingHorizontal: 14,
      paddingVertical: 7,
      backgroundColor: colors.surfaceRaised,
    },
    followBtnPrimary: {
      backgroundColor: colors.terracotta,
      borderColor: colors.terracotta,
    },
    followBtnText: {
      color: colors.brand,
      fontWeight: "800",
      fontSize: 13,
    },
    followBtnTextPrimary: {
      color: "#fff",
    },
    loaderWrap: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: spacing.xl,
    },
    footerLoader: {
      paddingVertical: 16,
    },
    empty: {
      textAlign: "center",
      color: colors.textMuted,
      fontWeight: "600",
      paddingTop: 32,
      paddingHorizontal: spacing.md,
    },
    error: {
      textAlign: "center",
      color: colors.terracotta,
      fontWeight: "600",
    },
  });
}
