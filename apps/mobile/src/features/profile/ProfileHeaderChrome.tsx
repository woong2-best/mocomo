import { useMemo, useState } from "react";
import {
  ActivityIndicator,
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
import { showIslandError } from "@/ui/IslandToast";
import { ProfileBannerMedia } from "@/features/profile/ProfileBannerMedia";
import { useTheme } from "@/theme/ThemeContext";
import { radii, spacing, type ThemeColors } from "@/theme/tokens";
import { useI18n } from "@/i18n/I18nProvider";

export type ProfileTabId = "posts" | "replies" | "media" | "wiki" | "likes";
export type ProfileSortId = "new" | "popular" | "oldest";

const TABS: { id: ProfileTabId; selfOnly?: boolean }[] = [
  { id: "posts" },
  { id: "replies" },
  { id: "media" },
  { id: "wiki" },
  { id: "likes", selfOnly: true },
];

const SORTS: { id: ProfileSortId }[] = [{ id: "new" }, { id: "popular" }, { id: "oldest" }];

function profileTabLabel(id: ProfileTabId, u: (ko: string, en: string) => string): string {
  switch (id) {
    case "posts":
      return u("게시물", "Posts");
    case "replies":
      return u("답글", "Replies");
    case "media":
      return u("미디어", "Media");
    case "wiki":
      return u("위키", "Wiki");
    case "likes":
      return u("좋아요", "Likes");
  }
}

function profileSortLabel(id: ProfileSortId, u: (ko: string, en: string) => string): string {
  switch (id) {
    case "new":
      return u("새로운", "New");
    case "popular":
      return u("인기 순", "Popular");
    case "oldest":
      return u("오래된 순", "Oldest");
  }
}

function formatJoined(iso: string, u: (ko: string, en: string) => string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return u(`${d.getFullYear()}년 ${d.getMonth() + 1}월 가입`, `Joined ${d.toLocaleString("en-US", { month: "short", year: "numeric" })}`);
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
  const { u, t } = useI18n();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors, bannerTopInset), [colors, bannerTopInset]);
  const display = user.name || user.username;
  const joined = formatJoined(user.createdAt, u);
  const visibleTabs = TABS.filter((tabDef) => !tabDef.selfOnly || user.isSelf);
  const [chatBusy, setChatBusy] = useState(false);

  async function startChat() {
    if (chatBusy || !onOpenChat) return;
    setChatBusy(true);
    try {
      const res = await openDm(user.id);
      onOpenChat(res.roomId);
    } catch (e) {
      showIslandError(u("채팅", "Chat"), e instanceof Error ? e.message : u("채팅을 열지 못했습니다.", "Could not open chat."));
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
                    {following ? u("팔로잉", "Following") : u("팔로우", "Follow")}
                  </Text>
                </Pressable>
                {onOpenChat && user.canMessage !== false ? (
                  <Pressable
                    style={styles.chatBtn}
                    onPress={() => void startChat()}
                    disabled={chatBusy}
                    accessibilityRole="button"
                    accessibilityLabel={u("채팅", "Chat")}
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
                accessibilityLabel={u(`팔로잉 ${user.counts.following}명`, `${user.counts.following} following`)}
              >
                <Text style={styles.count}>
                  <Text style={styles.countNum}>{user.counts.following}</Text> {u("팔로잉", "Following")}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => onOpenFollowList?.("followers")}
                disabled={!onOpenFollowList}
                hitSlop={6}
                accessibilityRole="button"
                accessibilityLabel={u(`팔로워 ${user.counts.followers}명`, `${user.counts.followers} followers`)}
              >
                <Text style={styles.count}>
                  <Text style={styles.countNum}>{user.counts.followers}</Text> {u("팔로워", "Followers")}
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
                    <Text style={[styles.sortLabel, active && styles.sortActive]}>{profileSortLabel(s.id, u)}</Text>
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
        {visibleTabs.map((tabDef) => {
          const active = tab === tabDef.id;
          return (
            <Pressable
              key={tabDef.id}
              onPress={() => onTabChange(tabDef.id)}
              style={styles.tabItem}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
            >
              <View style={styles.tabLabelWrap}>
                <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{profileTabLabel(tabDef.id, u)}</Text>
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
