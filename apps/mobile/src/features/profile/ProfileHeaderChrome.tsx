import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { ProfileUser } from "@/api/social";
import { openDm } from "@/api/messages";
import { AVATAR_CACHE_LAYOUT } from "@/perf/image";
import { FolkAvatar } from "@/ui/FolkAvatar";
import { ProfileBannerMedia } from "@/features/profile/ProfileBannerMedia";
import { useTheme } from "@/theme/ThemeContext";
import { radii, spacing, type ThemeColors } from "@/theme/tokens";

export type ProfileTabId = "posts" | "replies" | "media" | "wiki" | "likes";
export type ProfileSortId = "new" | "popular" | "oldest";

const TABS: { id: ProfileTabId; label: string; selfOnly?: boolean }[] = [
  { id: "posts", label: "게시물" },
  { id: "replies", label: "답글" },
  { id: "media", label: "미디어" },
  { id: "wiki", label: "위키" },
  { id: "likes", label: "좋아요", selfOnly: true },
];

const SORTS: { id: ProfileSortId; label: string }[] = [
  { id: "new", label: "새로운" },
  { id: "popular", label: "인기 순" },
  { id: "oldest", label: "오래된 순" },
];

function formatJoined(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 가입`;
}

type Props = {
  user: ProfileUser;
  tab: ProfileTabId;
  sort: ProfileSortId;
  onTabChange: (tab: ProfileTabId) => void;
  onSortChange: (sort: ProfileSortId) => void;
  onCreate?: () => void;
  onFollow?: () => void;
  followLoading?: boolean;
  following?: boolean;
  onOpenChat?: (roomId: string) => void;
  onOpenFollowList?: (tab: "followers" | "following") => void;
  /** Header identity is known; bio, counts, follow, and banner are still loading. */
  pending?: boolean;
  /** Extend banner under the status bar (overlay nav sits on top). */
  bannerTopInset?: number;
};

export function ProfileHeaderChrome({
  user,
  tab,
  sort,
  onTabChange,
  onSortChange,
  onCreate,
  onFollow,
  followLoading,
  following,
  onOpenChat,
  onOpenFollowList,
  pending = false,
  bannerTopInset = 0,
}: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors, bannerTopInset), [colors, bannerTopInset]);
  const display = user.name || user.username;
  const joined = formatJoined(user.createdAt);
  const visibleTabs = TABS.filter((t) => !t.selfOnly || user.isSelf);
  const [chatBusy, setChatBusy] = useState(false);

  async function startChat() {
    if (chatBusy || !onOpenChat) return;
    setChatBusy(true);
    try {
      const res = await openDm(user.id);
      onOpenChat(res.roomId);
    } catch (e) {
      Alert.alert("채팅", e instanceof Error ? e.message : "채팅을 열지 못했습니다.");
    } finally {
      setChatBusy(false);
    }
  }

  return (
    <View style={styles.root}>
      <View style={styles.banner}>
        {pending ? null : (
          <ProfileBannerMedia
            bannerUrl={user.bannerUrl}
            bannerVideoUrl={user.bannerVideoUrl}
            active
          />
        )}
      </View>

      <View style={styles.avatarRow}>
        <FolkAvatar
          uri={user.image}
          name={display}
          size={AVATAR_CACHE_LAYOUT}
          priority="high"
        />
        {!user.isSelf ? (
          <View style={styles.actionRow}>
            {pending ? (
              <>
                <View style={styles.followSkeleton} />
                <View style={styles.chatSkeleton} />
              </>
            ) : (
              <>
                <Pressable
                  style={[styles.outlineBtn, following ? null : styles.followPrimary]}
                  onPress={onFollow}
                  disabled={followLoading}
                >
                  <Text
                    style={[
                      styles.outlineBtnText,
                      following ? null : styles.followPrimaryText,
                    ]}
                  >
                    {following ? "팔로잉" : "팔로우"}
                  </Text>
                </Pressable>
                {onOpenChat ? (
                  <Pressable
                    style={styles.chatBtn}
                    onPress={() => void startChat()}
                    disabled={chatBusy}
                    accessibilityRole="button"
                    accessibilityLabel="채팅"
                  >
                    {chatBusy ? (
                      <ActivityIndicator size="small" color={colors.brand} />
                    ) : (
                      <Ionicons name="chatbubble-outline" size={18} color={colors.brand} />
                    )}
                  </Pressable>
                ) : null}
              </>
            )}
          </View>
        ) : null}
      </View>

      <View style={styles.identity}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>
            {display}
          </Text>
          {user.countryCode ? (
            <Text style={styles.flag}>{countryFlagEmoji(user.countryCode)}</Text>
          ) : null}
        </View>
        <Text style={styles.handle}>@{user.username}</Text>
        {pending ? (
          <>
            <View style={styles.boneWide} />
            <View style={styles.boneMid} />
          </>
        ) : user.bio ? (
          <Text style={styles.bio}>{user.bio}</Text>
        ) : null}
        {pending ? (
          <View style={styles.boneJoined} />
        ) : joined ? (
          <View style={styles.joinedRow}>
            <Ionicons name="calendar-outline" size={14} color={colors.textMuted} />
            <Text style={styles.joined}>{joined}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.countsRow}>
        <View style={styles.counts}>
          {pending ? (
            <>
              <View style={styles.boneCount} />
              <View style={styles.boneCount} />
            </>
          ) : (
            <>
              <Pressable
                onPress={() => onOpenFollowList?.("following")}
                disabled={!onOpenFollowList}
                hitSlop={6}
                accessibilityRole="button"
                accessibilityLabel={`팔로잉 ${user.counts.following}명`}
              >
                <Text style={styles.count}>
                  <Text style={styles.countNum}>{user.counts.following}</Text> 팔로잉
                </Text>
              </Pressable>
              <Pressable
                onPress={() => onOpenFollowList?.("followers")}
                disabled={!onOpenFollowList}
                hitSlop={6}
                accessibilityRole="button"
                accessibilityLabel={`팔로워 ${user.counts.followers}명`}
              >
                <Text style={styles.count}>
                  <Text style={styles.countNum}>{user.counts.followers}</Text> 팔로워
                </Text>
              </Pressable>
            </>
          )}
        </View>
        <View style={styles.feedActions}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.sortRow}>
              {SORTS.map((s) => {
                const active = sort === s.id;
                return (
                  <Pressable key={s.id} onPress={() => onSortChange(s.id)} hitSlop={4}>
                    <Text style={[styles.sortLabel, active && styles.sortActive]}>{s.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
          {user.isSelf && onCreate ? (
            <Pressable style={styles.createBtn} onPress={onCreate}>
              <Text style={styles.createBtnText}>+ Create</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      <View style={styles.tabs}>
        {visibleTabs.map((t) => {
          const active = tab === t.id;
          return (
            <Pressable
              key={t.id}
              onPress={() => onTabChange(t.id)}
              style={styles.tabItem}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
            >
              <View style={styles.tabLabelWrap}>
                <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{t.label}</Text>
                <View style={[styles.tabUnderline, active ? styles.tabUnderlineOn : null]} />
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function countryFlagEmoji(code: string): string {
  const cc = code.trim().toUpperCase();
  if (cc.length !== 2) return "";
  const A = 0x1f1e6;
  return String.fromCodePoint(A + (cc.charCodeAt(0) - 65), A + (cc.charCodeAt(1) - 65));
}

function createStyles(colors: ThemeColors, bannerTopInset: number) {
  return StyleSheet.create({
    root: {
      backgroundColor: colors.background,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.hairline,
    },
    banner: {
      height: 128 + bannerTopInset,
      width: "100%",
      backgroundColor: colors.muted,
      overflow: "hidden",
    },
    avatarRow: {
      flexDirection: "row",
      alignItems: "flex-end",
      justifyContent: "space-between",
      paddingHorizontal: spacing.md,
      marginTop: -40,
    },
    actionRow: {
      flexDirection: "row",
      gap: 8,
      paddingBottom: 4,
      flexWrap: "wrap",
      justifyContent: "flex-end",
      flex: 1,
      marginLeft: 12,
    },
    outlineBtn: {
      borderWidth: 1.5,
      borderColor: colors.brand,
      borderRadius: radii.pill,
      paddingHorizontal: 14,
      paddingVertical: 8,
      backgroundColor: colors.surfaceRaised,
    },
    outlineBtnText: { color: colors.brand, fontWeight: "800", fontSize: 13 },
    followPrimary: {
      backgroundColor: colors.terracotta,
      borderColor: colors.terracotta,
    },
    followPrimaryText: { color: "#fff" },
    chatBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      borderWidth: 1.5,
      borderColor: colors.brand,
      backgroundColor: colors.surfaceRaised,
      alignItems: "center",
      justifyContent: "center",
    },
    identity: {
      paddingHorizontal: spacing.md,
      paddingTop: spacing.sm,
      gap: 4,
    },
    nameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
    name: { fontSize: 22, fontWeight: "800", color: colors.text, maxWidth: "85%" },
    flag: { fontSize: 16 },
    handle: { color: colors.textMuted, fontWeight: "600", fontSize: 15 },
    bio: { color: colors.text, fontSize: 15, lineHeight: 21, marginTop: 4 },
    joinedRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginTop: 6,
    },
    joined: { color: colors.textMuted, fontSize: 13, fontWeight: "600" },
    countsRow: {
      paddingHorizontal: spacing.md,
      paddingTop: spacing.md,
      paddingBottom: spacing.sm,
      gap: 10,
    },
    counts: { flexDirection: "row", gap: 16 },
    count: { color: colors.textMuted, fontWeight: "600", fontSize: 14 },
    countNum: { color: colors.text, fontWeight: "800" },
    feedActions: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8,
    },
    sortRow: { flexDirection: "row", alignItems: "center", gap: 12 },
    sortLabel: { color: colors.textMuted, fontWeight: "700", fontSize: 13 },
    sortActive: { color: colors.brand },
    createBtn: {
      backgroundColor: colors.terracotta,
      borderRadius: radii.pill,
      paddingHorizontal: 12,
      paddingVertical: 7,
    },
    createBtnText: { color: "#fff", fontWeight: "800", fontSize: 13 },
    tabs: {
      flexDirection: "row",
      width: "100%",
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.hairline,
    },
    tabItem: {
      flex: 1,
      alignItems: "center",
      paddingTop: 12,
      paddingBottom: 0,
    },
    tabLabelWrap: {
      alignItems: "center",
    },
    tabLabel: {
      color: colors.textMuted,
      fontWeight: "700",
      fontSize: 14,
    },
    tabLabelActive: { color: colors.text, fontWeight: "800" },
    tabUnderline: {
      marginTop: 10,
      height: 3,
      alignSelf: "stretch",
      borderRadius: 999,
      backgroundColor: "transparent",
      minWidth: 28,
    },
    tabUnderlineOn: {
      backgroundColor: colors.terracotta,
    },
    followSkeleton: {
      width: 88,
      height: 36,
      borderRadius: radii.pill,
      backgroundColor: colors.muted,
    },
    chatSkeleton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.muted,
    },
    boneWide: {
      height: 14,
      width: "86%",
      borderRadius: 6,
      backgroundColor: colors.muted,
      marginTop: 8,
    },
    boneMid: {
      height: 14,
      width: "58%",
      borderRadius: 6,
      backgroundColor: colors.muted,
      marginTop: 6,
    },
    boneJoined: {
      height: 12,
      width: 128,
      borderRadius: 6,
      backgroundColor: colors.muted,
      marginTop: 8,
    },
    boneCount: {
      height: 14,
      width: 76,
      borderRadius: 6,
      backgroundColor: colors.muted,
    },
  });
}
