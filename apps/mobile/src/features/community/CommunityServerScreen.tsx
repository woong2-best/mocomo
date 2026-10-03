import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { showIslandError } from "@/ui/IslandToast";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  fetchCommunityDetail,
  joinCommunity,
  type CommunityPostPreview,
} from "@/api/community";
import { ApiError } from "@/api/client";
import {
  COMMUNITY_CONCEPT_LIKE_MIN,
  galleryAuthorLabel,
} from "@/features/community/community-labels";
import { trackRecentCommunity } from "@/features/community/recent-communities";
import { useScrollFieldAboveKeyboard } from "@/lib/use-scroll-field-above-keyboard";
import { Screen } from "@/ui/Screen";
import { createPost } from "@/api/posts";
import { uploadLocalFile } from "@/api/upload-file";
import { useTheme } from "@/theme/ThemeContext";
import { spacing, type ThemeColors } from "@/theme/tokens";
import type { RootStackParamList } from "@/navigation/types";
import { useI18n } from "@/i18n/I18nProvider";
import { communityUi } from "@/features/community/community-ui";

type PostsTab = "all" | "concept" | "notice";

function postTitle(post: CommunityPostPreview, noTitle: string): string {
  const title = post.title?.trim();
  if (title) return title;
  const line = post.content.trim().split("\n")[0] ?? "";
  return line.length > 80 ? `${line.slice(0, 80)}…` : line || noTitle;
}

function formatBoardDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const now = new Date();
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  if (sameDay) {
    return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  }
  if (date.getFullYear() === now.getFullYear()) {
    return `${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;
  }
  return `${String(date.getFullYear()).slice(-2)}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;
}

function filterPosts(posts: CommunityPostPreview[], tab: PostsTab): CommunityPostPreview[] {
  if (tab === "notice") return posts.filter((p) => p.isPinned);
  if (tab === "concept") return posts.filter((p) => p.likeCount >= COMMUNITY_CONCEPT_LIKE_MIN);
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

export function CommunityServerScreen() {
  const { t } = useI18n();
  const copy = useMemo(() => communityUi(t), [t]);
  const tabs = useMemo(
    (): { id: PostsTab; label: string }[] => [
      { id: "all", label: copy.tabAllPosts },
      { id: "notice", label: copy.tabNotice },
    ],
    [copy]
  );
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, "CommunityServer">>();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<PostsTab>("all");
  const [joinPassword, setJoinPassword] = useState("");
  const [joinMsg, setJoinMsg] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);
  const { frameRef, keyboardLift } = useScrollFieldAboveKeyboard();

  const detailQuery = useQuery({
    queryKey: ["mobile-community", route.params.slug],
    queryFn: () => fetchCommunityDetail(route.params.slug),
  });

  const item = detailQuery.data?.item;

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
      if (res.pending) setJoinMsg(res.message ?? copy.joinPending);
      else setJoinMsg(copy.joined);
      setJoinPassword("");
      await queryClient.invalidateQueries({
        queryKey: ["mobile-community", route.params.slug],
      });
    },
    onError: (err) => setJoinMsg(apiErrorMessage(err, copy.joinFail)),
  });

  const publishQna = useCallback(
    async (media?: { url: string; type: "IMAGE" | "VIDEO" }) => {
      if (!item?.id || !item.isMember || posting) return;
      const content = draft.trim();
      if (!content && !media) {
        showIslandError(copy.postTitle, copy.postNeedContent);
        return;
      }
      setPosting(true);
      try {
        await createPost({
          content,
          media: media ? [media] : [],
          communityId: item.id,
          isAnonymous: true,
        });
        setDraft("");
        await queryClient.invalidateQueries({
          queryKey: ["mobile-community", route.params.slug],
        });
        await queryClient.invalidateQueries({ queryKey: ["mobile-qna-feed"] });
      } catch (err) {
        showIslandError(copy.publishFailTitle, err instanceof Error ? err.message : copy.publishFail);
      } finally {
        setPosting(false);
      }
    },
    [copy, draft, item?.id, item?.isMember, posting, queryClient, route.params.slug]
  );

  const pickQnaMedia = useCallback(
    async (kind: "image" | "video") => {
      if (!item?.id || !item.isMember || posting) return;
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        showIslandError(copy.permTitle, copy.mediaPerm);
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: kind === "video" ? ["videos"] : ["images"],
        quality: 0.85,
      });
      if (result.canceled || !result.assets[0]) return;
      const asset = result.assets[0];
      const filename =
        asset.fileName ||
        (kind === "video" ? `qna-${Date.now()}.mp4` : `qna-${Date.now()}.jpg`);
      const contentType =
        asset.mimeType || (kind === "video" ? "video/mp4" : "image/jpeg");
      setPosting(true);
      try {
        const url = await uploadLocalFile({
          uri: asset.uri,
          filename,
          contentType,
          category: kind === "video" ? "video" : "image",
        });
        await createPost({
          content: draft.trim(),
          media: [{ url, type: kind === "video" ? "VIDEO" : "IMAGE" }],
          communityId: item.id,
          isAnonymous: true,
        });
        setDraft("");
        await queryClient.invalidateQueries({
          queryKey: ["mobile-community", route.params.slug],
        });
        await queryClient.invalidateQueries({ queryKey: ["mobile-qna-feed"] });
      } catch (err) {
        showIslandError(copy.uploadFailTitle, err instanceof Error ? err.message : copy.fileUploadFail);
      } finally {
        setPosting(false);
      }
    },
    [copy, draft, item?.id, item?.isMember, posting, queryClient, route.params.slug]
  );

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

  const renderPost = useCallback(
    ({ item: post, index }: { item: CommunityPostPreview; index: number }) => {
      const regularBefore = posts.slice(0, index + 1).filter((p) => !p.isPinned).length;
      const regularTotal = posts.filter((p) => !p.isPinned).length;
      const displayNo = post.isPinned ? copy.noticeNo : String(regularTotal - regularBefore + 1);
      const writer = galleryAuthorLabel(post.author.name, post.author.username, true);
      return (
        <Pressable
          style={styles.postRow}
          onPress={() => navigation.navigate("PostDetail", { id: post.id })}
        >
          <Text style={[styles.postNo, post.isPinned && styles.postNoNotice]}>{displayNo}</Text>
          <View style={styles.postBody}>
            <Text style={styles.postTitle} numberOfLines={2}>
              {postTitle(post, copy.noTitle)}
              {post.commentCount > 0 ? ` [${post.commentCount}]` : ""}
            </Text>
            <Text style={styles.postMeta} numberOfLines={1}>
              {writer} · {formatBoardDate(post.createdAt)}
              {post.viewCount != null ? ` · ${copy.views(post.viewCount)}` : ""}
            </Text>
          </View>
        </Pressable>
      );
    },
    [copy, navigation, posts, styles]
  );

  const passwordReady = !item?.hasJoinPassword || /^\d{4}$/.test(joinPassword);
  const joinDisabled =
    join.isPending || item?.joinMode === "INVITE_ONLY" || !passwordReady;
  const joinLabel =
    item?.joinMode === "APPROVE"
      ? copy.joinRequestBtn
      : item?.joinMode === "INVITE_ONLY"
        ? copy.inviteOnly
        : copy.joinGallery;

  return (
    <Screen safeTop={false}>
      {detailQuery.isLoading ? (
        <ActivityIndicator style={{ marginTop: insets.top + 40 }} color="#3b4890" />
      ) : detailQuery.isError || !item ? (
        <Text style={[styles.error, { marginTop: insets.top }]}>
          {copy.loadGalleryError}
        </Text>
      ) : (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
        <View
          ref={frameRef}
          style={[styles.root, { paddingTop: insets.top, marginBottom: keyboardLift }]}
        >
          <View style={styles.header}>
            <Pressable onPress={() => navigation.goBack()} hitSlop={10} style={styles.headerBtn}>
              <Ionicons name="chevron-back" size={24} color="#fff" />
            </Pressable>
            <View style={styles.headerText}>
              <Text style={styles.headerKicker}>GALLERY</Text>
              <Text style={styles.headerTitle} numberOfLines={1}>
                {item.name}
              </Text>
            </View>
            <Pressable
              onPress={() => navigation.navigate("CommunityDetail", { slug: route.params.slug })}
              hitSlop={10}
              style={styles.headerBtn}
              accessibilityLabel={copy.galleryInfoA11y}
            >
              <Ionicons name="information-circle-outline" size={22} color="#fff" />
            </Pressable>
          </View>

          {!item.isMember ? (
            <View style={styles.joinBanner}>
              <Text style={styles.joinTitle}>{copy.browsingGallery}</Text>
              <Text style={styles.joinSub}>
                {item.joinMode === "APPROVE"
                  ? copy.browseApproveHint
                  : item.joinMode === "INVITE_ONLY"
                    ? copy.browseInviteHint
                    : copy.browseOpenHint}
                {item.hasJoinPassword ? copy.joinPasswordSuffix : ""}
              </Text>
              {item.hasJoinPassword ? (
                <TextInput
                  value={joinPassword}
                  onChangeText={(v) => setJoinPassword(v.replace(/\D/g, "").slice(0, 4))}
                  placeholder={copy.passwordPh}
                  placeholderTextColor={colors.textMuted}
                  keyboardType="number-pad"
                  maxLength={4}
                  secureTextEntry
                  style={styles.joinPassword}
                />
              ) : null}
              {joinMsg ? <Text style={styles.joinMsg}>{joinMsg}</Text> : null}
              <Pressable
                style={[styles.joinBtn, joinDisabled && styles.joinBtnDisabled]}
                disabled={joinDisabled}
                onPress={() => join.mutate()}
              >
                <Text style={styles.joinBtnText}>{join.isPending ? copy.processing : joinLabel}</Text>
              </Pressable>
            </View>
          ) : null}

          <View style={styles.tabRow}>
            {tabs.map((t) => {
              const active = tab === t.id;
              return (
                <Pressable
                  key={t.id}
                  style={[styles.tab, active && styles.tabActive]}
                  onPress={() => setTab(t.id)}
                >
                  <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{t.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.tableHead}>
            <Text style={[styles.colNo, styles.headText]}>{copy.colNo}</Text>
            <Text style={[styles.colTitle, styles.headText]}>{copy.colTitle}</Text>
          </View>

          <FlatList
            data={posts}
            keyExtractor={(p) => p.id}
            renderItem={renderPost}
            style={styles.flex}
            contentContainerStyle={{ paddingBottom: insets.bottom + 24 + keyboardLift }}
            ListEmptyComponent={
              <Text style={styles.empty}>
                {tab === "concept"
                  ? copy.emptyConcept
                  : tab === "notice"
                    ? copy.emptyNotice
                    : copy.emptyPosts}
              </Text>
            }
          />
          {item.isMember ? (
            <View style={styles.composer}>
              <TextInput
                value={draft}
                onChangeText={setDraft}
                placeholder={copy.composerPh}
                placeholderTextColor={colors.textMuted}
                style={styles.composerInput}
                editable={!posting}
                multiline
              />
              <View style={styles.composerActions}>
                <Pressable
                  onPress={() => void pickQnaMedia("image")}
                  disabled={posting}
                  hitSlop={8}
                  accessibilityLabel={copy.addPhotoA11y}
                >
                  <Ionicons name="image-outline" size={22} color="#3b4890" />
                </Pressable>
                <Pressable
                  onPress={() => void pickQnaMedia("video")}
                  disabled={posting}
                  hitSlop={8}
                  accessibilityLabel={copy.addVideoA11y}
                >
                  <Ionicons name="videocam-outline" size={22} color="#3b4890" />
                </Pressable>
                <Pressable
                  onPress={() => void publishQna()}
                  disabled={posting || !draft.trim()}
                  style={styles.composerSend}
                >
                  <Text style={styles.composerSendText}>{posting ? copy.posting : copy.submitPost}</Text>
                </Pressable>
              </View>
            </View>
          ) : null}
        </View>
        </KeyboardAvoidingView>
      )}
    </Screen>
  );
}

function createStyles(colors: ThemeColors, isDark: boolean) {
  const navy = "#3b4890";
  return StyleSheet.create({
    flex: { flex: 1 },
    composer: {
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.surface,
      paddingHorizontal: 12,
      paddingTop: 8,
      paddingBottom: 8,
      gap: 8,
    },
    composerInput: {
      minHeight: 40,
      maxHeight: 96,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      color: colors.text,
      backgroundColor: colors.background,
    },
    composerActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: 16,
    },
    composerSend: {
      marginLeft: "auto",
      backgroundColor: "#3b4890",
      borderRadius: 8,
      paddingHorizontal: 14,
      paddingVertical: 8,
    },
    composerSendText: { color: "#fff", fontWeight: "800", fontSize: 13 },
    root: { flex: 1, backgroundColor: isDark ? colors.background : "#efeff3" },
    error: { padding: spacing.lg, color: colors.danger, fontWeight: "700" },
    header: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: navy,
      paddingHorizontal: 4,
      paddingBottom: 10,
      gap: 4,
    },
    headerBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
    headerText: { flex: 1, minWidth: 0 },
    headerKicker: { color: "rgba(255,255,255,0.7)", fontSize: 10, fontWeight: "800", letterSpacing: 1 },
    headerTitle: { color: "#fff", fontSize: 18, fontWeight: "900" },
    joinBanner: {
      margin: 10,
      padding: 12,
      borderRadius: 12,
      backgroundColor: colors.surfaceRaised,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      gap: 6,
    },
    joinTitle: { fontWeight: "800", color: colors.text },
    joinSub: { fontSize: 12, color: colors.textMuted, fontWeight: "600", lineHeight: 18 },
    joinPassword: {
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 8,
      color: colors.text,
    },
    joinMsg: { fontSize: 12, fontWeight: "700", color: colors.cobalt },
    joinBtn: {
      marginTop: 4,
      backgroundColor: navy,
      borderRadius: 10,
      paddingVertical: 10,
      alignItems: "center",
    },
    joinBtnDisabled: { opacity: 0.5 },
    joinBtnText: { color: "#fff", fontWeight: "800" },
    tabRow: { flexDirection: "row", gap: 6, paddingHorizontal: 10, paddingVertical: 8 },
    tab: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8 },
    tabActive: { backgroundColor: navy },
    tabLabel: { fontWeight: "800", fontSize: 13, color: navy },
    tabLabelActive: { color: "#fff" },
    tableHead: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: navy,
      paddingVertical: 8,
      paddingHorizontal: 10,
    },
    headText: { color: "#fff", fontSize: 11, fontWeight: "800" },
    colNo: { width: 44, textAlign: "center" },
    colTitle: { flex: 1 },
    postRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 8,
      paddingHorizontal: 10,
      paddingVertical: 10,
      backgroundColor: isDark ? colors.surface : "#fff",
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    postNo: {
      width: 44,
      textAlign: "center",
      fontSize: 11,
      color: colors.textMuted,
      fontWeight: "700",
      marginTop: 2,
    },
    postNoNotice: { color: "#c0392b", fontWeight: "900" },
    postBody: { flex: 1, minWidth: 0 },
    postTitle: { fontSize: 14, fontWeight: "700", color: colors.text },
    postMeta: { fontSize: 11, color: colors.textMuted, marginTop: 4, fontWeight: "600" },
    empty: { textAlign: "center", color: colors.textMuted, marginTop: 48, fontWeight: "600" },
  });
}
