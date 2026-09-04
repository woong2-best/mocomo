import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  fetchCommunityChannels,
  fetchCommunityDetail,
  joinCommunity,
  openCommunityChannel,
  updateCommunityBranding,
} from "@/api/community";
import { ApiError } from "@/api/client";
import { uploadLocalFile } from "@/api/upload-file";
import { resolveCommunityCategoryDisplay } from "@/features/community/community-labels";
import { trackRecentCommunity } from "@/features/community/recent-communities";
import { IMAGE_CACHE_POLICY } from "@/perf/image";
import { AppHeader } from "@/ui/AppHeader";
import { Screen } from "@/ui/Screen";
import { useTheme } from "@/theme/ThemeContext";
import { radii, spacing, type ThemeColors } from "@/theme/tokens";
import type { RootStackParamList } from "@/navigation/types";

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

async function uploadPickedImage(asset: ImagePicker.ImagePickerAsset) {
  const mime = asset.mimeType || "image/jpeg";
  const filename = asset.fileName || `community-${Date.now()}.jpg`;
  return uploadLocalFile({
    uri: asset.uri,
    filename,
    contentType: mime,
    category: "image",
  });
}

export function CommunityDetailScreen() {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createThemedStyles(colors, isDark), [colors, isDark]);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, "CommunityDetail">>();
  const queryClient = useQueryClient();
  const [joinMsg, setJoinMsg] = useState<string | null>(null);
  const [openingSlug, setOpeningSlug] = useState<string | null>(null);
  const [uploadingKind, setUploadingKind] = useState<"icon" | "banner" | null>(null);

  const query = useQuery({
    queryKey: ["mobile-community", route.params.slug],
    queryFn: () => fetchCommunityDetail(route.params.slug),
  });
  const item = query.data?.item;
  const meta = item
    ? resolveCommunityCategoryDisplay(item.category, item.customCategoryLabel)
    : null;

  useEffect(() => {
    if (item?.slug && item?.name) {
      void trackRecentCommunity(item.slug, item.name);
    }
  }, [item?.slug, item?.name]);

  const channelsQuery = useQuery({
    queryKey: ["mobile-community-channels", route.params.slug],
    queryFn: () => fetchCommunityChannels(route.params.slug),
    enabled: !!item?.isMember,
  });

  const join = useMutation({
    mutationFn: () => joinCommunity(route.params.slug),
    onSuccess: async (res) => {
      if (res.pending) setJoinMsg(res.message ?? "가입 요청이 접수되었습니다.");
      else setJoinMsg("가입되었습니다.");
      await queryClient.invalidateQueries({
        queryKey: ["mobile-community", route.params.slug],
      });
      await queryClient.invalidateQueries({
        queryKey: ["mobile-community-channels", route.params.slug],
      });
    },
    onError: (err) => setJoinMsg(apiErrorMessage(err, "가입에 실패했습니다.")),
  });

  const openChannel = async (channelSlug: string, name: string) => {
    setOpeningSlug(channelSlug);
    try {
      const res = await openCommunityChannel(route.params.slug, channelSlug);
      navigation.navigate("MessageRoom", { roomId: res.roomId, title: `# ${name}` });
    } catch (err) {
      setJoinMsg(apiErrorMessage(err, "채널을 열 수 없습니다."));
    } finally {
      setOpeningSlug(null);
    }
  };

  const pickAndUpload = async (kind: "icon" | "banner") => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("권한 필요", "사진 접근 권한이 필요합니다.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.9,
      allowsEditing: true,
      aspect: kind === "icon" ? [1, 1] : [3, 1],
    });
    if (result.canceled || !result.assets[0]) return;

    setUploadingKind(kind);
    try {
      const url = await uploadPickedImage(result.assets[0]);
      await updateCommunityBranding(route.params.slug, {
        ...(kind === "icon" ? { iconUrl: url } : { bannerUrl: url }),
      });
      await queryClient.invalidateQueries({
        queryKey: ["mobile-community", route.params.slug],
      });
      await queryClient.invalidateQueries({ queryKey: ["mobile-community"] });
      Alert.alert("저장됨", kind === "icon" ? "대표 이미지를 변경했습니다." : "배너를 변경했습니다.");
    } catch (err) {
      Alert.alert("업로드 실패", err instanceof Error ? err.message : "이미지 변경에 실패했습니다.");
    } finally {
      setUploadingKind(null);
    }
  };

  return (
    <Screen>
      <AppHeader title="커뮤니티" leftLabel="뒤로" onLeftPress={() => navigation.goBack()} />
      {query.isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#c80000" />
      ) : query.isError || !item ? (
        <Text style={styles.error}>커뮤니티를 불러오지 못했습니다.</Text>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>
          <Pressable
            disabled={!item.canEditBanner || uploadingKind !== null}
            onPress={() => void pickAndUpload("banner")}
          >
            {item.bannerUrl ? (
              <Image
                source={{ uri: item.bannerUrl }}
                style={styles.banner}
                cachePolicy={IMAGE_CACHE_POLICY}
                transition={0}
              />
            ) : (
              <View style={[styles.banner, styles.bannerEmpty]}>
                <Text style={styles.bannerEmptyText}>
                  {item.canEditBanner ? "탭해서 배너 설정" : meta?.emoji ?? "🏠"}
                </Text>
              </View>
            )}
            {item.canEditBanner ? (
              <View style={styles.bannerEditBadge}>
                <Ionicons name="camera-outline" size={14} color="#fff" />
                <Text style={styles.bannerEditText}>
                  {uploadingKind === "banner" ? "업로드 중…" : "배너"}
                </Text>
              </View>
            ) : null}
          </Pressable>

          <View style={styles.body}>
            <View style={styles.identityRow}>
              <Pressable
                disabled={!item.canEditIcon || uploadingKind !== null}
                onPress={() => void pickAndUpload("icon")}
                style={styles.iconWrap}
              >
                {item.iconUrl ? (
                  <Image
                    source={{ uri: item.iconUrl }}
                    style={styles.icon}
                    cachePolicy={IMAGE_CACHE_POLICY}
                    transition={0}
                  />
                ) : (
                  <View style={[styles.icon, styles.iconFallback]}>
                    <Text style={styles.iconEmoji}>{meta?.emoji ?? item.name.slice(0, 1)}</Text>
                  </View>
                )}
                {item.canEditIcon ? (
                  <View style={styles.iconCam}>
                    {uploadingKind === "icon" ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Ionicons name="camera" size={12} color="#fff" />
                    )}
                  </View>
                ) : null}
              </Pressable>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.title}>{item.name}</Text>
                <Text style={styles.sub}>
                  {`${meta.emoji} ${meta.label}`}
                  {" · "}
                  {item.memberCount.toLocaleString("ko-KR")}명
                  {item.isNsfw ? " · NSFW" : ""}
                </Text>
              </View>
            </View>

            {item.description ? <Text style={styles.desc}>{item.description}</Text> : null}

            {(item.canEditIcon || item.canEditBanner) && (
              <View style={styles.brandingCard}>
                <Text style={styles.brandingTitle}>대표 이미지 / 배너</Text>
                <Text style={styles.brandingHint}>
                  권한이 있는 멤버만 변경할 수 있습니다. 이미지를 탭하거나 아래 버튼을 사용하세요.
                </Text>
                <View style={styles.brandingActions}>
                  {item.canEditIcon ? (
                    <Pressable
                      style={styles.brandingBtn}
                      disabled={uploadingKind !== null}
                      onPress={() => void pickAndUpload("icon")}
                    >
                      <Text style={styles.brandingBtnText}>대표 이미지</Text>
                    </Pressable>
                  ) : null}
                  {item.canEditBanner ? (
                    <Pressable
                      style={styles.brandingBtn}
                      disabled={uploadingKind !== null}
                      onPress={() => void pickAndUpload("banner")}
                    >
                      <Text style={styles.brandingBtnText}>배너</Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            )}

            {!item.isMember ? (
              <>
                <Pressable
                  style={[styles.btn, join.isPending && styles.btnDisabled]}
                  disabled={join.isPending}
                  onPress={() => join.mutate()}
                >
                  <Text style={styles.btnText}>
                    {item.joinMode === "APPROVE" ? "가입 요청" : "가입하기"}
                  </Text>
                </Pressable>
                <Pressable
                  style={styles.enterBtnOutline}
                  onPress={() =>
                    navigation.navigate("CommunityServer", { slug: route.params.slug })
                  }
                >
                  <Ionicons name="arrow-forward-circle-outline" size={18} color="#c80000" />
                  <Text style={styles.enterBtnOutlineText}>커뮤니티 들어가기</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Text style={styles.joined}>
                  가입됨{item.role ? ` · ${item.role}` : ""}
                  {item.isOwner ? " · owner" : ""}
                </Text>
                <Pressable
                  style={styles.enterBtn}
                  onPress={() =>
                    navigation.navigate("CommunityServer", { slug: route.params.slug })
                  }
                >
                  <Ionicons name="arrow-forward-circle-outline" size={18} color="#fff" />
                  <Text style={styles.enterBtnText}>커뮤니티 들어가기</Text>
                </Pressable>
              </>
            )}
            {joinMsg ? <Text style={styles.note}>{joinMsg}</Text> : null}

            {item.isMember ? (
              <>
                <Text style={styles.section}>채널</Text>
                {channelsQuery.isLoading ? (
                  <ActivityIndicator color={colors.brand} />
                ) : (channelsQuery.data?.items ?? []).length === 0 ? (
                  <Text style={styles.muted}>텍스트 채널이 없습니다.</Text>
                ) : (
                  <>
                    {channelsQuery.data!.items.map((ch) => (
                      <Pressable
                        key={ch.id}
                        style={styles.channel}
                        disabled={openingSlug === ch.slug}
                        onPress={() => void openChannel(ch.slug, ch.name)}
                      >
                        <Text style={styles.channelName}># {ch.name}</Text>
                        <Text style={styles.channelMeta}>
                          {ch.categoryName ?? ch.type}
                          {openingSlug === ch.slug ? " · 여는 중…" : ""}
                        </Text>
                      </Pressable>
                    ))}
                  </>
                )}
              </>
            ) : null}

            <Text style={styles.section}>최근 글</Text>
            {item.posts.length === 0 ? (
              <Text style={styles.muted}>아직 글이 없습니다.</Text>
            ) : (
              item.posts.map((p) => (
                <Pressable
                  key={p.id}
                  style={styles.post}
                  onPress={() => navigation.navigate("PostDetail", { id: p.id })}
                >
                  <Text style={styles.postTitle} numberOfLines={2}>
                    {p.title || p.content}
                  </Text>
                  <Text style={styles.postMeta}>
                    @{p.author.username} · ♥ {p.likeCount} · 💬 {p.commentCount}
                  </Text>
                </Pressable>
              ))
            )}
          </View>
        </ScrollView>
      )}
    </Screen>
  );
}

function createThemedStyles(colors: ThemeColors, isDark: boolean) {
  return StyleSheet.create({
    banner: { width: "100%", height: 140, backgroundColor: "#2b3038" },
    bannerEmpty: { alignItems: "center", justifyContent: "center" },
    bannerEmptyText: { color: "rgba(255,255,255,0.75)", fontWeight: "700" },
    bannerEditBadge: {
      position: "absolute",
      right: 12,
      bottom: 12,
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: "rgba(0,0,0,0.55)",
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
    },
    bannerEditText: { color: "#fff", fontSize: 11, fontWeight: "700" },
    body: { padding: spacing.md, backgroundColor: colors.surface },
    identityRow: { flexDirection: "row", alignItems: "center", gap: 12 },
    iconWrap: { position: "relative" },
    icon: {
      width: 64,
      height: 64,
      borderRadius: 10,
      backgroundColor: "#3d4450",
      marginTop: -28,
      borderWidth: 3,
      borderColor: colors.surface,
    },
    iconFallback: { alignItems: "center", justifyContent: "center" },
    iconEmoji: { fontSize: 26 },
    iconCam: {
      position: "absolute",
      right: -2,
      bottom: -2,
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: "#c80000",
      alignItems: "center",
      justifyContent: "center",
    },
    title: { fontSize: 22, fontWeight: "800", color: colors.text },
    sub: { marginTop: 4, color: colors.textMuted, fontWeight: "600" },
    desc: { marginTop: spacing.md, color: colors.text, lineHeight: 22 },
    brandingCard: {
      marginTop: spacing.md,
      padding: 12,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: isDark ? colors.border : "#d5d5d5",
      backgroundColor: isDark ? colors.muted : "#f7f7f7",
      gap: 8,
    },
    brandingTitle: { fontWeight: "800", color: colors.text, fontSize: 14 },
    brandingHint: { fontSize: 12, color: colors.textMuted, lineHeight: 18 },
    brandingActions: { flexDirection: "row", gap: 8 },
    brandingBtn: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      backgroundColor: "#c80000",
    },
    brandingBtnText: { color: "#fff", fontWeight: "800", fontSize: 12 },
    btn: {
      marginTop: spacing.md,
      backgroundColor: "#c80000",
      borderRadius: 10,
      paddingVertical: 12,
      alignItems: "center",
    },
    btnDisabled: { opacity: 0.6 },
    btnText: { color: "#fff", fontWeight: "700" },
    enterBtn: {
      marginTop: spacing.md,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      backgroundColor: "#c80000",
      borderRadius: 10,
      paddingVertical: 12,
    },
    enterBtnText: { color: "#fff", fontWeight: "800", fontSize: 15 },
    enterBtnOutline: {
      marginTop: spacing.sm,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      borderWidth: 1.5,
      borderColor: "#c80000",
      borderRadius: 10,
      paddingVertical: 12,
    },
    enterBtnOutlineText: { color: "#c80000", fontWeight: "800", fontSize: 15 },
    joined: { marginTop: spacing.md, fontWeight: "700", color: colors.text },
    note: { marginTop: spacing.sm, color: colors.textMuted },
    section: {
      marginTop: spacing.lg,
      marginBottom: spacing.sm,
      fontWeight: "800",
      color: colors.text,
    },
    channel: {
      paddingVertical: 12,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    channelName: { fontWeight: "700", color: colors.text },
    channelMeta: { marginTop: 2, color: colors.textMuted, fontSize: 12 },
    post: {
      paddingVertical: 10,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    postTitle: { color: colors.text, fontWeight: "600" },
    postMeta: { marginTop: 4, color: colors.textMuted, fontSize: 12 },
    muted: { color: colors.textMuted },
    error: { color: colors.danger, padding: spacing.lg },
  });
}
