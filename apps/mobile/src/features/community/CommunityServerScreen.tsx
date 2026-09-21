import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  fetchCommunityChannels,
  fetchCommunityDetail,
  joinCommunity,
  openCommunityChannel,
  type CommunityChannelItem,
  type CommunityPostPreview,
} from "@/api/community";
import { ApiError } from "@/api/client";
import { trackRecentCommunity } from "@/features/community/recent-communities";
import { Screen } from "@/ui/Screen";
import { useTheme } from "@/theme/ThemeContext";
import { useShowLikeCounts } from "@/hooks/use-display-preferences";
import { radii, spacing, type ThemeColors } from "@/theme/tokens";
import type { RootStackParamList } from "@/navigation/types";

type PostsTab = "all" | "notice";
type ActiveView =
  | { kind: "posts" }
  | { kind: "chat"; channelSlug?: string }
  | { kind: "placeholder"; title: string; hint: string };

type RailItem = {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap | "hash";
  view: ActiveView;
  /** Insert channel-menu trigger above this rail item (chat). */
  menuAbove?: boolean;
};

type DrawerChannel = {
  key: string;
  name: string;
  icon: keyof typeof Ionicons.glyphMap | "hash";
  view: ActiveView;
  activeMatch?: "posts" | "chat" | string;
};

type DrawerGroup = {
  id: string;
  title: string;
  items: DrawerChannel[];
};

const TABS: { id: PostsTab; label: string }[] = [
  { id: "all", label: "전체글" },
  { id: "notice", label: "공지" },
];

const RAIL_ITEMS: RailItem[] = [
  {
    key: "posts",
    label: "게시글",
    icon: "chatbubble-outline",
    view: { kind: "posts" },
  },
  {
    key: "chat",
    label: "채팅",
    icon: "hash",
    view: { kind: "chat" },
    menuAbove: true,
  },
  {
    key: "announcements",
    label: "공지",
    icon: "megaphone-outline",
    view: {
      kind: "placeholder",
      title: "공지",
      hint: "공지 채널은 곧 앱에서 열 수 있습니다.",
    },
  },
  {
    key: "qa",
    label: "Q&A",
    icon: "help-circle-outline",
    view: {
      kind: "placeholder",
      title: "Q&A",
      hint: "Q&A 채널은 곧 앱에서 열 수 있습니다.",
    },
  },
  {
    key: "gallery",
    label: "갤러리",
    icon: "images-outline",
    view: {
      kind: "placeholder",
      title: "갤러리",
      hint: "갤러리 채널은 곧 앱에서 열 수 있습니다.",
    },
  },
  {
    key: "files",
    label: "파일",
    icon: "document-outline",
    view: {
      kind: "placeholder",
      title: "파일",
      hint: "파일 채널은 곧 앱에서 열 수 있습니다.",
    },
  },
];

const RAIL_BOTTOM: RailItem[] = [
  {
    key: "events",
    label: "이벤트",
    icon: "calendar-outline",
    view: {
      kind: "placeholder",
      title: "이벤트",
      hint: "이벤트 채널은 곧 앱에서 열 수 있습니다.",
    },
  },
  {
    key: "members",
    label: "멤버",
    icon: "person-outline",
    view: {
      kind: "placeholder",
      title: "멤버",
      hint: "멤버 목록은 정보 화면에서 확인할 수 있습니다.",
    },
  },
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

function apiErrorMessage(err: unknown, fallback: string) {
  if (
    err instanceof ApiError &&
    err.body &&
    typeof err.body === "object" &&
    "error" in err.body &&
    typeof (err.body as { error: unknown }).error === "string"
  ) {
    return (err.body as { error: string }).error;
  }
  return fallback;
}

function channelIcon(type: string): keyof typeof Ionicons.glyphMap | "hash" {
  if (type === "ANNOUNCEMENT") return "megaphone-outline";
  if (type === "QA") return "help-circle-outline";
  if (type === "POSTS") return "chatbubble-outline";
  if (type === "GALLERY") return "images-outline";
  if (type === "FILE") return "document-outline";
  if (type === "EVENT") return "calendar-outline";
  if (type === "MEMBERS") return "person-outline";
  return "hash";
}

function ChannelGlyph({
  name,
  size,
  color,
}: {
  name: keyof typeof Ionicons.glyphMap | "hash";
  size: number;
  color: string;
}) {
  if (name === "hash") {
    return <MaterialCommunityIcons name="pound" size={size} color={color} />;
  }
  return <Ionicons name={name} size={size} color={color} />;
}

function toDrawerChannel(ch: CommunityChannelItem): DrawerChannel {
  return {
    key: ch.id,
    name: ch.name,
    icon: channelIcon(ch.type),
    view: { kind: "chat", channelSlug: ch.slug },
    activeMatch: ch.slug,
  };
}

function buildDrawerGroups(textChannels: CommunityChannelItem[]): DrawerGroup[] {
  const texts = textChannels.filter((ch) => ch.type === "TEXT");
  const announcements = textChannels.filter((ch) => ch.type === "ANNOUNCEMENT");
  const qas = textChannels.filter((ch) => ch.type === "QA");

  const generalItems: DrawerChannel[] = [
    {
      key: "posts",
      name: "게시글",
      icon: "chatbubble-outline",
      view: { kind: "posts" },
      activeMatch: "posts",
    },
    ...(texts.length > 0
      ? texts.map(toDrawerChannel)
      : [
          {
            key: "chat-default",
            name: "채팅",
            icon: "hash" as const,
            view: { kind: "chat" as const },
            activeMatch: "chat",
          },
        ]),
    ...(announcements.length > 0
      ? announcements.map(toDrawerChannel)
      : [
          {
            key: "announcements",
            name: "공지",
            icon: "megaphone-outline" as const,
            view: {
              kind: "placeholder" as const,
              title: "공지",
              hint: "공지 채널은 곧 앱에서 열 수 있습니다.",
            },
          },
        ]),
    ...(qas.length > 0
      ? qas.map(toDrawerChannel)
      : [
          {
            key: "qa",
            name: "Q&A",
            icon: "help-circle-outline" as const,
            view: {
              kind: "placeholder" as const,
              title: "Q&A",
              hint: "Q&A 채널은 곧 앱에서 열 수 있습니다.",
            },
          },
        ]),
    {
      key: "gallery",
      name: "갤러리",
      icon: "images-outline",
      view: {
        kind: "placeholder",
        title: "갤러리",
        hint: "갤러리 채널은 곧 앱에서 열 수 있습니다.",
      },
    },
    {
      key: "files",
      name: "파일",
      icon: "document-outline",
      view: {
        kind: "placeholder",
        title: "파일",
        hint: "파일 채널은 곧 앱에서 열 수 있습니다.",
      },
    },
  ];

  return [
    { id: "general", title: "일반", items: generalItems },
    {
      id: "live",
      title: "라이브",
      items: [
        {
          key: "events",
          name: "이벤트",
          icon: "calendar-outline",
          view: {
            kind: "placeholder",
            title: "이벤트",
            hint: "이벤트 채널은 곧 앱에서 열 수 있습니다.",
          },
        },
      ],
    },
    {
      id: "info",
      title: "정보",
      items: [
        {
          key: "members",
          name: "멤버",
          icon: "person-outline",
          view: {
            kind: "placeholder",
            title: "멤버",
            hint: "멤버 목록은 정보 화면에서 확인할 수 있습니다.",
          },
        },
      ],
    },
  ];
}

function isActiveView(active: ActiveView, item: DrawerChannel | RailItem): boolean {
  if (item.view.kind === "posts") return active.kind === "posts";
  if (item.view.kind === "chat") {
    if (active.kind !== "chat") return false;
    if ("channelSlug" in item.view && item.view.channelSlug) {
      return active.channelSlug === item.view.channelSlug;
    }
    return true;
  }
  if (item.view.kind === "placeholder" && active.kind === "placeholder") {
    return active.title === item.view.title;
  }
  return false;
}

export function CommunityServerScreen() {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, "CommunityServer">>();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<PostsTab>("all");
  const [channelOpen, setChannelOpen] = useState(false);
  const [active, setActive] = useState<ActiveView>({ kind: "posts" });
  const [openingSlug, setOpeningSlug] = useState<string | null>(null);
  const [joinPassword, setJoinPassword] = useState("");
  const [joinMsg, setJoinMsg] = useState<string | null>(null);
  const showLikeCounts = useShowLikeCounts();

  const detailQuery = useQuery({
    queryKey: ["mobile-community", route.params.slug],
    queryFn: () => fetchCommunityDetail(route.params.slug),
  });

  const channelsQuery = useQuery({
    queryKey: ["mobile-community-channels", route.params.slug],
    queryFn: () => fetchCommunityChannels(route.params.slug),
  });

  const item = detailQuery.data?.item;
  const textChannels = channelsQuery.data?.items ?? [];
  const drawerGroups = useMemo(() => buildDrawerGroups(textChannels), [textChannels]);

  useEffect(() => {
    if (item?.slug && item?.name) {
      void trackRecentCommunity(item.slug, item.name);
    }
  }, [item?.slug, item?.name]);

  const join = useMutation({
    mutationFn: () =>
      joinCommunity(
        route.params.slug,
        undefined,
        item?.hasJoinPassword ? joinPassword : undefined
      ),
    onSuccess: async (res) => {
      if (res.pending) setJoinMsg(res.message ?? "가입 요청이 접수되었습니다.");
      else setJoinMsg("가입되었습니다.");
      setJoinPassword("");
      await queryClient.invalidateQueries({
        queryKey: ["mobile-community", route.params.slug],
      });
      await queryClient.invalidateQueries({
        queryKey: ["mobile-community-channels", route.params.slug],
      });
    },
    onError: (err) => setJoinMsg(apiErrorMessage(err, "가입에 실패했습니다.")),
  });

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
    async (channelSlug?: string) => {
      if (!item?.isMember) {
        setActive({
          kind: "placeholder",
          title: "채팅",
          hint: "채팅 채널은 가입 후 이용할 수 있습니다.",
        });
        setChannelOpen(false);
        return;
      }
      const target =
        channelSlug ??
        textChannels.find((c) => c.type === "TEXT")?.slug ??
        textChannels[0]?.slug;
      if (!target) {
        setActive({
          kind: "placeholder",
          title: "채팅",
          hint: "아직 채팅 채널이 없습니다.",
        });
        setChannelOpen(false);
        return;
      }
      setOpeningSlug(target);
      setChannelOpen(false);
      try {
        const res = await openCommunityChannel(route.params.slug, target);
        const ch = textChannels.find((c) => c.slug === target);
        navigation.navigate("MessageRoom", {
          roomId: res.roomId,
          title: `# ${ch?.name ?? "채팅"}`,
        });
      } catch {
        setActive({
          kind: "placeholder",
          title: "채팅",
          hint: "채팅 채널을 열 수 없습니다.",
        });
      } finally {
        setOpeningSlug(null);
      }
    },
    [item?.isMember, navigation, route.params.slug, textChannels]
  );

  const selectView = useCallback(
    (view: ActiveView) => {
      setChannelOpen(false);
      if (view.kind === "chat") {
        void openTextChannel(view.channelSlug);
        return;
      }
      if (view.kind === "placeholder" && view.title === "멤버") {
        navigation.navigate("CommunityDetail", { slug: route.params.slug });
        return;
      }
      setActive(view);
    },
    [navigation, openTextChannel, route.params.slug]
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
              @{post.author.username}
              {showLikeCounts ? ` · ♥ ${post.likeCount}` : ""} · 💬 {post.commentCount}
            </Text>
          </View>
        </Pressable>
      );
    },
    [navigation, posts.length, showLikeCounts, styles]
  );

  const passwordReady = !item?.hasJoinPassword || /^\d{4}$/.test(joinPassword);
  const joinDisabled =
    join.isPending ||
    (item?.joinMode === "INVITE_ONLY") ||
    !passwordReady;

  const joinLabel =
    item?.joinMode === "APPROVE"
      ? "가입 요청하기"
      : item?.joinMode === "INVITE_ONLY"
        ? "초대 필요"
        : "커뮤니티 참여하기";

  const contentTitle =
    active.kind === "posts"
      ? "게시글"
      : active.kind === "placeholder"
        ? active.title
        : "채팅";

  const renderRailButton = (rail: RailItem) => {
    const selected = isActiveView(active, rail);
    return (
      <View key={rail.key}>
        {rail.menuAbove ? (
          <Pressable
            style={styles.railBtn}
            onPress={() => setChannelOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="채널 메뉴"
          >
            <Ionicons name="menu" size={20} color={colors.text} />
          </Pressable>
        ) : null}
        <Pressable
          style={[styles.railBtn, selected && styles.railBtnActive]}
          onPress={() => selectView(rail.view)}
          accessibilityRole="button"
          accessibilityLabel={rail.label}
        >
          <ChannelGlyph
            name={rail.icon}
            size={20}
            color={selected ? "#c80000" : colors.textMuted}
          />
        </Pressable>
      </View>
    );
  };

  return (
    <Screen safeTop={false}>
      {detailQuery.isLoading ? (
        <ActivityIndicator style={{ marginTop: insets.top + 40 }} color="#c80000" />
      ) : detailQuery.isError || !item ? (
        <Text style={[styles.error, { marginTop: insets.top }]}>
          커뮤니티를 불러오지 못했습니다.
        </Text>
      ) : (
        <View style={[styles.root, { paddingTop: insets.top }]}>
          <View style={styles.bodyRow}>
            <View style={[styles.rail, { paddingBottom: insets.bottom + 8 }]}>
              <Pressable
                style={styles.railLogo}
                onPress={() => navigation.goBack()}
                accessibilityRole="button"
                accessibilityLabel="뒤로"
              >
                <Text style={styles.railLogoText}>
                  {(item.name.trim()[0] || "M").toUpperCase()}
                </Text>
              </Pressable>
              <ScrollView
                style={styles.railScroll}
                contentContainerStyle={styles.railScrollContent}
                showsVerticalScrollIndicator={false}
              >
                {RAIL_ITEMS.map(renderRailButton)}
              </ScrollView>
              <View style={styles.railBottom}>
                {RAIL_BOTTOM.map(renderRailButton)}
              </View>
            </View>

            <View style={styles.main}>
              {!item.isMember ? (
                <View style={styles.joinBanner}>
                  <View style={styles.joinBannerText}>
                    <Text style={styles.joinTitle}>커뮤니티 둘러보기 중</Text>
                    <Text style={styles.joinSub}>
                      {item.joinMode === "APPROVE"
                        ? "게시글과 채팅은 읽기 전용입니다. 참여하려면 가입 요청을 보내세요."
                        : item.joinMode === "INVITE_ONLY"
                          ? "초대 링크가 있는 멤버만 참여할 수 있습니다."
                          : "게시글과 채팅은 읽기 전용입니다. 참여하면 글 작성·댓글·채팅을 이용할 수 있어요."}
                      {item.hasJoinPassword ? " 가입 시 4자리 비밀번호가 필요합니다." : ""}
                    </Text>
                    {item.hasJoinPassword ? (
                      <TextInput
                        value={joinPassword}
                        onChangeText={(v) => setJoinPassword(v.replace(/\D/g, "").slice(0, 4))}
                        placeholder="비밀번호 4자리"
                        placeholderTextColor={colors.textMuted}
                        keyboardType="number-pad"
                        maxLength={4}
                        secureTextEntry
                        style={styles.joinPassword}
                      />
                    ) : null}
                    {joinMsg ? <Text style={styles.joinMsg}>{joinMsg}</Text> : null}
                  </View>
                  <Pressable
                    style={[styles.joinBtn, joinDisabled && styles.joinBtnDisabled]}
                    disabled={joinDisabled}
                    onPress={() => join.mutate()}
                  >
                    <Text style={styles.joinBtnText}>
                      {join.isPending ? "처리 중…" : joinLabel}
                    </Text>
                  </Pressable>
                </View>
              ) : null}

              <View style={styles.channelHeader}>
                <Ionicons name="chatbubble-outline" size={18} color={colors.text} />
                <Text style={styles.channelTitle}>{contentTitle}</Text>
                <Pressable
                  style={styles.infoBtn}
                  onPress={() =>
                    navigation.navigate("CommunityDetail", { slug: route.params.slug })
                  }
                  hitSlop={8}
                  accessibilityLabel="커뮤니티 정보"
                >
                  <Ionicons name="information-circle-outline" size={22} color={colors.textMuted} />
                </Pressable>
              </View>

              {active.kind === "posts" ? (
                <>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.tabsWrap}
                    contentContainerStyle={styles.tabs}
                  >
                    {TABS.map((t) => {
                      const selected = tab === t.id;
                      return (
                        <Pressable
                          key={t.id}
                          onPress={() => setTab(t.id)}
                          style={[styles.tab, selected && styles.tabActive]}
                        >
                          <Text style={[styles.tabText, selected && styles.tabTextActive]}>
                            {t.label}
                          </Text>
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
                    contentContainerStyle={{
                      paddingBottom: !item.isMember ? 8 : insets.bottom + 16,
                      flexGrow: 1,
                    }}
                  />
                </>
              ) : (
                <View style={styles.placeholder}>
                  <Text style={styles.placeholderTitle}>
                    {active.kind === "placeholder" ? active.title : "채팅"}
                  </Text>
                  <Text style={styles.placeholderHint}>
                    {active.kind === "placeholder"
                      ? active.hint
                      : openingSlug
                        ? "채널을 여는 중…"
                        : "채팅 채널을 선택하세요."}
                  </Text>
                </View>
              )}

              {!item.isMember ? (
                <View style={[styles.readonlyBar, { paddingBottom: insets.bottom + 8 }]}>
                  <Text style={styles.readonlyText}>
                    읽기 전용입니다. 커뮤니티에 참여하면 글을 작성할 수 있습니다.
                  </Text>
                </View>
              ) : null}
            </View>
          </View>

          <Modal
            visible={channelOpen}
            transparent
            animationType="fade"
            onRequestClose={() => setChannelOpen(false)}
          >
            <View style={styles.drawerRoot}>
              <View
                style={[
                  styles.drawer,
                  {
                    backgroundColor: colors.background,
                    paddingTop: insets.top + 8,
                    paddingBottom: insets.bottom + 12,
                  },
                ]}
              >
                <View style={styles.drawerHeader}>
                  <View style={styles.drawerTitleRow}>
                    <Text style={[styles.drawerTitle, { color: colors.text }]}>채널</Text>
                    <Pressable
                      style={styles.communityMenuBtn}
                      onPress={() => {
                        setChannelOpen(false);
                        navigation.navigate("CommunityList");
                      }}
                      hitSlop={6}
                    >
                      <Text style={styles.communityMenuText}>커뮤니티 메뉴</Text>
                      <Ionicons name="chevron-forward" size={14} color="#c80000" />
                    </Pressable>
                  </View>
                  <Pressable
                    onPress={() => setChannelOpen(false)}
                    hitSlop={10}
                    accessibilityLabel="닫기"
                  >
                    <Ionicons name="close" size={22} color={colors.text} />
                  </Pressable>
                </View>

                <ScrollView contentContainerStyle={styles.drawerScroll}>
                  {drawerGroups.map((group) => (
                    <View key={group.id} style={styles.drawerGroup}>
                      <View style={styles.drawerGroupHead}>
                        <Ionicons name="chevron-down" size={12} color={colors.textMuted} />
                        <Text style={styles.drawerGroupTitle}>{group.title}</Text>
                      </View>
                      {group.items.map((ch) => {
                        const selected = isActiveView(active, ch);
                        return (
                          <Pressable
                            key={ch.key}
                            style={[styles.channelRow, selected && styles.channelRowActive]}
                            disabled={openingSlug != null}
                            onPress={() => selectView(ch.view)}
                          >
                            <ChannelGlyph
                              name={ch.icon}
                              size={18}
                              color={selected ? colors.text : colors.textMuted}
                            />
                            <Text
                              style={[
                                styles.channelName,
                                { color: colors.text },
                                selected && styles.channelNameActive,
                              ]}
                            >
                              {ch.name}
                              {ch.view.kind === "chat" &&
                              ch.view.channelSlug &&
                              openingSlug === ch.view.channelSlug
                                ? " · 여는 중…"
                                : ""}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  ))}
                </ScrollView>
              </View>
              <Pressable style={styles.drawerScrim} onPress={() => setChannelOpen(false)} />
            </View>
          </Modal>
        </View>
      )}
    </Screen>
  );
}

function createStyles(colors: ThemeColors, isDark: boolean) {
  return StyleSheet.create({
    root: { flex: 1 },
    error: { color: colors.danger, padding: spacing.lg },
    bodyRow: { flex: 1, flexDirection: "row", minHeight: 0 },
    rail: {
      width: 52,
      backgroundColor: isDark ? "#121821" : "#e8eaef",
      borderRightWidth: StyleSheet.hairlineWidth,
      borderRightColor: colors.border,
      alignItems: "center",
      paddingTop: 8,
    },
    railLogo: {
      width: 36,
      height: 36,
      borderRadius: 8,
      backgroundColor: isDark ? "#2a3344" : "#fff",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 8,
    },
    railLogoText: { fontSize: 16, fontWeight: "900", color: colors.text },
    railScroll: { flex: 1, width: "100%" },
    railScrollContent: { alignItems: "center", gap: 2, paddingBottom: 8 },
    railBottom: { alignItems: "center", gap: 2, paddingTop: 4 },
    railBtn: {
      width: 40,
      height: 40,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
    },
    railBtnActive: {
      backgroundColor: isDark ? "rgba(200,0,0,0.18)" : "rgba(200,0,0,0.1)",
    },
    main: { flex: 1, minWidth: 0, backgroundColor: colors.background },
    joinBanner: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
      backgroundColor: isDark ? "rgba(200,0,0,0.08)" : "rgba(200,0,0,0.05)",
    },
    joinBannerText: { flex: 1, minWidth: 0 },
    joinTitle: { fontSize: 13, fontWeight: "800", color: colors.text },
    joinSub: { marginTop: 2, fontSize: 11, color: colors.textMuted, lineHeight: 15 },
    joinPassword: {
      marginTop: 8,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 6,
      color: colors.text,
      fontSize: 14,
      letterSpacing: 4,
      maxWidth: 140,
      backgroundColor: colors.surfaceRaised,
    },
    joinMsg: { marginTop: 4, fontSize: 11, color: "#16a34a", fontWeight: "600" },
    joinBtn: {
      backgroundColor: "#e85d04",
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 12,
    },
    joinBtnDisabled: { opacity: 0.5 },
    joinBtnText: { color: "#fff", fontWeight: "800", fontSize: 12 },
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
    channelTitle: { flex: 1, fontSize: 16, fontWeight: "800", color: colors.text },
    infoBtn: { padding: 2 },
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
    tabTextActive: { color: colors.text, fontWeight: "800" },
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
    placeholder: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: spacing.xl,
      gap: 8,
    },
    placeholderTitle: { fontSize: 16, fontWeight: "800", color: colors.text },
    placeholderHint: { fontSize: 13, color: colors.textMuted, textAlign: "center" },
    readonlyBar: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
      paddingHorizontal: 12,
      paddingTop: 8,
      backgroundColor: colors.surfaceRaised,
    },
    readonlyText: { fontSize: 11, color: colors.textMuted, textAlign: "center" },
    drawerRoot: { flex: 1, flexDirection: "row" },
    drawer: {
      width: "78%",
      maxWidth: 300,
      borderRightWidth: StyleSheet.hairlineWidth,
      borderRightColor: colors.border,
    },
    drawerScrim: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
    drawerHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 14,
      paddingBottom: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    drawerTitleRow: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1, minWidth: 0 },
    drawerTitle: { fontSize: 18, fontWeight: "800" },
    communityMenuBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 2,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      backgroundColor: isDark ? "rgba(200,0,0,0.12)" : "rgba(200,0,0,0.08)",
    },
    communityMenuText: { fontSize: 12, fontWeight: "800", color: "#c80000" },
    drawerScroll: { paddingVertical: 10, paddingHorizontal: 8 },
    drawerGroup: { marginBottom: 14 },
    drawerGroupHead: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: 8,
      marginBottom: 4,
    },
    drawerGroupTitle: {
      fontSize: 11,
      fontWeight: "800",
      color: colors.textMuted,
      textTransform: "uppercase",
      letterSpacing: 0.4,
    },
    channelRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingVertical: 10,
      paddingHorizontal: 10,
      borderRadius: 8,
    },
    channelRowActive: {
      backgroundColor: isDark ? "rgba(139,69,19,0.45)" : "rgba(200,0,0,0.12)",
    },
    channelName: { flex: 1, fontSize: 14, fontWeight: "600" },
    channelNameActive: { fontWeight: "800" },
  });
}
