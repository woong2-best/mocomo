import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  fetchCommunityChannels,
  fetchCommunityDetail,
  openCommunityChannel,
  type CommunityChannelItem,
  type CommunityPostPreview,
} from "@/api/community";
import { trackRecentCommunity } from "@/features/community/recent-communities";
import { AppHeader } from "@/ui/AppHeader";
import { Screen } from "@/ui/Screen";
import { useTheme } from "@/theme/ThemeContext";
import { radii, spacing, type ThemeColors } from "@/theme/tokens";
import type { RootStackParamList } from "@/navigation/types";

type PostsTab = "all" | "notice";

const TABS: { id: PostsTab; label: string }[] = [
  { id: "all", label: "전체글" },
  { id: "notice", label: "공지" },
];

function postTitle(post: CommunityPostPreview): string {
  const title = post.title?.trim();
  if (title) return title;
  const line = post.content.trim().split("\n")[0] ?? "";
  return line.length > 80 ? `${line.slice(0, 80)}…` : line || "(제목 없음)";
}

function filterPosts(posts: CommunityPostPreview[], tab: PostsTab): CommunityPostPreview[] {
  if (tab === "notice") return posts.filter((p) => p.isPinned);
  return posts;
}

function channelIcon(type: string): keyof typeof Ionicons.glyphMap {
  if (type === "ANNOUNCEMENT") return "megaphone-outline";
  if (type === "QA") return "help-circle-outline";
  return "chatbubble-outline";
}

export function CommunityServerScreen() {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, "CommunityServer">>();
  const [tab, setTab] = useState<PostsTab>("all");
  const [channelOpen, setChannelOpen] = useState(false);
  const [openingSlug, setOpeningSlug] = useState<string | null>(null);

  const detailQuery = useQuery({
    queryKey: ["mobile-community", route.params.slug],
    queryFn: () => fetchCommunityDetail(route.params.slug),
  });

  const channelsQuery = useQuery({
    queryKey: ["mobile-community-channels", route.params.slug],
    queryFn: () => fetchCommunityChannels(route.params.slug),
    enabled: !!detailQuery.data?.item?.isMember,
  });

  const item = detailQuery.data?.item;
  const textChannels = channelsQuery.data?.items ?? [];

  useEffect(() => {
    if (item?.slug && item?.name) {
      void trackRecentCommunity(item.slug, item.name);
    }
  }, [item?.slug, item?.name]);

  const posts = useMemo(() => {
    const raw = item?.posts ?? [];
    const filtered = filterPosts(raw, tab);
    const pinned = filtered.filter((p) => p.isPinned);
    const rest = filtered.filter((p) => !p.isPinned);
    return [
      ...pinned,
      ...rest.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    ];
  }, [item?.posts, tab]);

  const openTextChannel = useCallback(
    async (channel: CommunityChannelItem) => {
      setOpeningSlug(channel.slug);
      setChannelOpen(false);
      try {
        const res = await openCommunityChannel(route.params.slug, channel.slug);
        navigation.navigate("MessageRoom", { roomId: res.roomId, title: `# ${channel.name}` });
      } catch {
        // stay on server screen
      } finally {
        setOpeningSlug(null);
      }
    },
    [navigation, route.params.slug]
  );

  const renderPost = useCallback(
    ({ item: post, index }: { item: CommunityPostPreview; index: number }) => {
      const displayNo = posts.length - index;
      return (
        <Pressable
          style={styles.postRow}
          onPress={() => navigation.navigate("PostDetail", { id: post.id })}
        >
          <Text style={styles.postNo}>{post.isPinned ? "공지" : displayNo}</Text>
          <View style={styles.postBody}>
            <Text style={styles.postTitle} numberOfLines={2}>
              {postTitle(post)}
            </Text>
            <Text style={styles.postMeta}>
              @{post.author.username} · ♥ {post.likeCount} · 💬 {post.commentCount}
            </Text>
          </View>
        </Pressable>
      );
    },
    [navigation, posts.length, styles]
  );

  return (
    <Screen>
      <AppHeader
        title={item?.name ?? "커뮤니티"}
        leftLabel="뒤로"
        onLeftPress={() => navigation.goBack()}
        rightSlot={
          <Pressable
            onPress={() => navigation.navigate("CommunityDetail", { slug: route.params.slug })}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="커뮤니티 정보"
          >
            <Ionicons name="information-circle-outline" size={24} color={colors.text} />
          </Pressable>
        }
      />

      {detailQuery.isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#c80000" />
      ) : detailQuery.isError || !item ? (
        <Text style={styles.error}>커뮤니티를 불러오지 못했습니다.</Text>
      ) : (
        <>
          <View style={styles.channelHeader}>
            <Ionicons name="chatbox-outline" size={18} color={colors.text} />
            <Text style={styles.channelTitle}>게시글</Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.tabsWrap}
            contentContainerStyle={styles.tabs}
          >
            {TABS.map((t) => {
              const active = tab === t.id;
              return (
                <Pressable
                  key={t.id}
                  onPress={() => setTab(t.id)}
                  style={[styles.tab, active && styles.tabActive]}
                >
                  <Text style={[styles.tabText, active && styles.tabTextActive]}>{t.label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={styles.tableHead}>
            <Text style={[styles.th, styles.thNo]}>번호</Text>
            <Text style={[styles.th, styles.thTitle]}>제목</Text>
          </View>

          <FlatList
            data={posts}
            keyExtractor={(p) => p.id}
            renderItem={renderPost}
            ListEmptyComponent={
              <Text style={styles.empty}>
                {tab === "notice" ? "공지글이 없습니다." : "아직 게시글이 없습니다."}
              </Text>
            }
            contentContainerStyle={{ paddingBottom: insets.bottom + 56 }}
          />

          <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 6 }]}>
            <Pressable style={styles.bottomBtn} onPress={() => setChannelOpen(true)}>
              <Ionicons name="menu" size={20} color={colors.text} />
              <Text style={styles.bottomLabel}>채널</Text>
            </Pressable>
            <Pressable
              style={styles.bottomBtn}
              onPress={() => navigation.navigate("CommunityDetail", { slug: route.params.slug })}
            >
              <Ionicons name="people-outline" size={20} color={colors.text} />
              <Text style={styles.bottomLabel}>정보</Text>
            </Pressable>
          </View>

          <Modal visible={channelOpen} transparent animationType="slide" onRequestClose={() => setChannelOpen(false)}>
            <View style={styles.drawerRoot}>
              <Pressable style={styles.drawerScrim} onPress={() => setChannelOpen(false)} />
              <View
                style={[
                  styles.drawer,
                  { backgroundColor: colors.background, paddingBottom: insets.bottom + 16 },
                ]}
              >
                <View style={[styles.handle, { backgroundColor: colors.border }]} />
                <Text style={[styles.drawerTitle, { color: colors.text }]}>{item.name}</Text>

                <Pressable style={styles.channelRow} onPress={() => setChannelOpen(false)}>
                  <Ionicons name="chatbox-outline" size={20} color="#c80000" />
                  <Text style={[styles.channelName, { color: colors.text }]}>게시글</Text>
                  <Ionicons name="checkmark" size={18} color="#c80000" />
                </Pressable>

                {item.isMember ? (
                  textChannels.map((ch) => (
                    <Pressable
                      key={ch.id}
                      style={styles.channelRow}
                      disabled={openingSlug === ch.slug}
                      onPress={() => void openTextChannel(ch)}
                    >
                      <Ionicons name={channelIcon(ch.type)} size={20} color={colors.textMuted} />
                      <Text style={[styles.channelName, { color: colors.text }]}>
                        {ch.name}
                        {openingSlug === ch.slug ? " · 여는 중…" : ""}
                      </Text>
                    </Pressable>
                  ))
                ) : (
                  <Text style={styles.channelHint}>
                    채팅 채널은 가입 후 이용할 수 있습니다.
                  </Text>
                )}
              </View>
            </View>
          </Modal>
        </>
      )}
    </Screen>
  );
}

function createStyles(colors: ThemeColors, isDark: boolean) {
  return StyleSheet.create({
    error: { color: colors.danger, padding: spacing.lg },
    channelHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingHorizontal: spacing.md,
      paddingVertical: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
      backgroundColor: colors.surfaceRaised,
    },
    channelTitle: { fontSize: 16, fontWeight: "800", color: colors.text },
    tabsWrap: {
      maxHeight: 44,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
      backgroundColor: isDark ? colors.muted : "#f3f3f3",
    },
    tabs: { paddingHorizontal: 8, alignItems: "center" },
    tab: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      marginRight: 4,
      borderRadius: radii.sm,
    },
    tabActive: { backgroundColor: colors.surfaceRaised },
    tabText: { fontSize: 13, fontWeight: "600", color: colors.textMuted },
    tabTextActive: { color: "#1e3a6e", fontWeight: "800" },
    tableHead: {
      flexDirection: "row",
      paddingHorizontal: spacing.md,
      paddingVertical: 8,
      backgroundColor: isDark ? "#1e3a6e" : "#2e4a8e",
    },
    th: { color: "#fff", fontSize: 12, fontWeight: "800" },
    thNo: { width: 44, textAlign: "center" },
    thTitle: { flex: 1 },
    postRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      paddingHorizontal: spacing.md,
      paddingVertical: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
      backgroundColor: colors.surfaceRaised,
    },
    postNo: {
      width: 44,
      textAlign: "center",
      fontSize: 11,
      color: colors.textMuted,
      fontWeight: "700",
    },
    postBody: { flex: 1, minWidth: 0 },
    postTitle: { fontSize: 14, fontWeight: "600", color: colors.text },
    postMeta: { marginTop: 4, fontSize: 11, color: colors.textMuted },
    empty: { padding: spacing.xl, textAlign: "center", color: colors.textMuted },
    bottomBar: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      flexDirection: "row",
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
      backgroundColor: colors.surfaceRaised,
      paddingTop: 8,
    },
    bottomBtn: { flex: 1, alignItems: "center", gap: 2 },
    bottomLabel: { fontSize: 11, fontWeight: "700", color: colors.textMuted },
    drawerRoot: { flex: 1, justifyContent: "flex-end" },
    drawerScrim: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)" },
    drawer: {
      borderTopLeftRadius: 18,
      borderTopRightRadius: 18,
      paddingHorizontal: spacing.md,
      paddingTop: 8,
      maxHeight: "70%",
    },
    handle: {
      alignSelf: "center",
      width: 40,
      height: 4,
      borderRadius: 2,
      marginBottom: 12,
    },
    drawerTitle: { fontSize: 18, fontWeight: "800", marginBottom: 12 },
    channelRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    channelName: { flex: 1, fontSize: 15, fontWeight: "700" },
    channelHint: {
      paddingVertical: 12,
      color: colors.textMuted,
      fontSize: 13,
      fontWeight: "600",
    },
  });
}
