import { useMemo } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { ProfileUser } from "@/api/social";
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
  onEditProfile?: () => void;
  onRevenueSettings?: () => void;
  onCreate?: () => void;
  onFollow?: () => void;
  followLoading?: boolean;
  following?: boolean;
};

export function ProfileHeaderChrome({
  user,
  tab,
  sort,
  onTabChange,
  onSortChange,
  onEditProfile,
  onRevenueSettings,
  onCreate,
  onFollow,
  followLoading,
  following,
}: Props) {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const display = user.name || user.username;
  const joined = formatJoined(user.createdAt);
  const visibleTabs = TABS.filter((t) => !t.selfOnly || user.isSelf);

  return (
    <View style={styles.root}>
      {/* Banner */}
      <View style={styles.banner}>
        <ProfileBannerMedia
          bannerUrl={user.bannerUrl}
          bannerVideoUrl={user.bannerVideoUrl}
          active
        />
      </View>

      {/* Avatar + action buttons */}
      <View style={styles.avatarRow}>
        <FolkAvatar uri={user.image} name={display} size={88} />
        <View style={styles.actionRow}>
          {user.isSelf ? (
            <>
              <Pressable style={styles.outlineBtn} onPress={onEditProfile}>
                <Text style={styles.outlineBtnText}>프로필 수정</Text>
              </Pressable>
              <Pressable style={styles.outlineBtn} onPress={onRevenueSettings}>
                <Text style={styles.outlineBtnText}>수익 설정</Text>
              </Pressable>
            </>
          ) : (
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
          )}
        </View>
      </View>

      {/* Identity */}
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
        {user.bio ? <Text style={styles.bio}>{user.bio}</Text> : null}
        {joined ? (
          <View style={styles.joinedRow}>
            <Ionicons name="calendar-outline" size={14} color={colors.textMuted} />
            <Text style={styles.joined}>{joined}</Text>
          </View>
        ) : null}
      </View>

      {/* Counts + sort + create */}
      <View style={styles.countsRow}>
        <View style={styles.counts}>
          <Text style={styles.count}>
            <Text style={styles.countNum}>{user.counts.following}</Text> 팔로잉
          </Text>
          <Text style={styles.count}>
            <Text style={styles.countNum}>{user.counts.followers}</Text> 팔로워
          </Text>
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

      {/* Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsScroll}
        contentContainerStyle={styles.tabs}
      >
        {visibleTabs.map((t) => {
          const active = tab === t.id;
          return (
            <Pressable key={t.id} onPress={() => onTabChange(t.id)} style={styles.tabItem}>
              <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{t.label}</Text>
              {active ? <View style={styles.tabUnderline} /> : null}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

function countryFlagEmoji(code: string): string {
  const cc = code.trim().toUpperCase();
  if (cc.length !== 2) return "";
  const A = 0x1f1e6;
  return String.fromCodePoint(A + (cc.charCodeAt(0) - 65), A + (cc.charCodeAt(1) - 65));
}

function createStyles(colors: ThemeColors, isDark: boolean) {
  return StyleSheet.create({
    root: {
      backgroundColor: colors.background,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.hairline,
    },
    banner: {
      height: 128,
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
    tabsScroll: { marginTop: 4 },
    tabs: {
      paddingHorizontal: spacing.md,
      gap: 18,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.hairline,
    },
    tabItem: {
      paddingVertical: 12,
      alignItems: "center",
      minWidth: 48,
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
      width: "100%",
      borderRadius: 2,
      backgroundColor: colors.terracotta,
    },
  });
}
