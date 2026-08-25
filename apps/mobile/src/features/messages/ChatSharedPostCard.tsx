import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { PostShareCard } from "@/api/messages";
import {
  getCachedPostShareCard,
  loadPostShareCard,
} from "@/features/messages/share-card-cache";
import { FolkAvatar } from "@/ui/FolkAvatar";
import { IMAGE_CACHE_POLICY } from "@/perf/image";
import { useTheme } from "@/theme/ThemeContext";
import { radii, spacing, type ThemeColors } from "@/theme/tokens";
import type { RootStackParamList } from "@/navigation/types";

export function ChatSharedPostCard({
  postId,
  mine,
  onOpenImage,
  onLongPress,
}: {
  postId: string;
  mine?: boolean;
  onOpenImage?: (url: string, id: string) => void;
  onLongPress?: () => void;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors, !!mine), [colors, mine]);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const cached = getCachedPostShareCard(postId);
  const [post, setPost] = useState<PostShareCard | null>(
    cached && cached !== "fail" ? cached : null
  );
  const [failed, setFailed] = useState(cached === "fail");
  const [loading, setLoading] = useState(!cached);

  useEffect(() => {
    const hit = getCachedPostShareCard(postId);
    if (hit === "fail") {
      setFailed(true);
      setPost(null);
      setLoading(false);
      return;
    }
    if (hit) {
      setPost(hit);
      setFailed(false);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const ac = new AbortController();
    setLoading(true);
    setFailed(false);
    void loadPostShareCard(postId, ac.signal).then((next) => {
      if (cancelled) return;
      if (next) {
        setPost(next);
        setFailed(false);
      } else {
        setPost(null);
        setFailed(true);
      }
      setLoading(false);
    });

    return () => {
      cancelled = true;
      ac.abort();
    };
  }, [postId]);

  if (loading && !post) {
    return (
      <Pressable
        style={styles.card}
        onPress={() => navigation.navigate("PostDetail", { id: postId })}
        onLongPress={onLongPress}
        delayLongPress={280}
      >
        <Text style={styles.title}>게시물</Text>
        <Text style={styles.muted}>불러오는 중… 탭하면 바로 열기</Text>
      </Pressable>
    );
  }

  if (failed || !post) {
    return (
      <Pressable
        style={styles.card}
        onPress={() => {
          setLoading(true);
          setFailed(false);
          void loadPostShareCard(postId).then((next) => {
            if (next) {
              setPost(next);
              setFailed(false);
              setLoading(false);
              return;
            }
            setFailed(true);
            setLoading(false);
            navigation.navigate("PostDetail", { id: postId });
          });
        }}
        onLongPress={onLongPress}
        delayLongPress={280}
      >
        <Text style={styles.title}>게시물 보기</Text>
        <Text style={styles.muted}>카드를 불러오지 못했습니다 · 탭하여 다시 시도</Text>
      </Pressable>
    );
  }

  const previewUri =
    post.media?.type === "VIDEO"
      ? post.media.posterUrl?.trim() || null
      : post.media?.url ?? null;
  const isVideo = post.media?.type === "VIDEO";

  return (
    <Pressable
      style={styles.card}
      onLongPress={onLongPress}
      delayLongPress={280}
    >
      <Pressable onPress={() => navigation.navigate("PostDetail", { id: post.id })}>
        <View style={styles.authorRow}>
          <FolkAvatar uri={post.author.image} name={post.author.displayName} size={28} />
          <Text style={styles.author} numberOfLines={1}>
            {post.author.displayName}
          </Text>
        </View>
      </Pressable>
      {post.media ? (
        <View style={styles.mediaWrap}>
          {previewUri ? (
            <Image
              source={{ uri: previewUri }}
              style={styles.media}
              contentFit="cover"
              cachePolicy={IMAGE_CACHE_POLICY}
              transition={0}
              pointerEvents="none"
            />
          ) : (
            <View style={[styles.media, styles.mediaPlaceholder]}>
              <Ionicons
                name={isVideo ? "play-circle-outline" : "image-outline"}
                size={40}
                color={colors.textMuted}
              />
            </View>
          )}
          {isVideo ? (
            <View style={styles.videoBadge}>
              <Text style={styles.videoBadgeText}>동영상</Text>
            </View>
          ) : null}
          {!isVideo && previewUri ? (
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={() => onOpenImage?.(previewUri, post.id)}
              accessibilityRole="button"
              accessibilityLabel="사진 크게 보기"
            />
          ) : null}
        </View>
      ) : null}
      <Pressable onPress={() => navigation.navigate("PostDetail", { id: post.id })}>
        <Text style={styles.body} numberOfLines={3}>
          {post.title?.trim() || post.content}
        </Text>
        <Text style={styles.link}>게시물 열기</Text>
      </Pressable>
    </Pressable>
  );
}

function createStyles(colors: ThemeColors, mine: boolean) {
  return StyleSheet.create({
    card: {
      width: 260,
      maxWidth: "100%",
      borderRadius: radii.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: mine ? "rgba(197,82,42,0.35)" : colors.border,
      backgroundColor: colors.surfaceRaised,
      padding: spacing.sm,
      gap: 8,
      marginTop: 4,
    },
    authorRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    author: { flex: 1, fontWeight: "700", color: colors.cobalt, fontSize: 13 },
    mediaWrap: {
      width: "100%",
      height: 140,
      borderRadius: radii.md,
      overflow: "hidden",
    },
    media: { width: "100%", height: "100%" },
    mediaPlaceholder: {
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surface,
    },
    videoBadge: {
      position: "absolute",
      left: 6,
      bottom: 6,
      borderRadius: 6,
      backgroundColor: "rgba(0,0,0,0.65)",
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    videoBadgeText: {
      fontSize: 10,
      fontWeight: "700",
      color: "#fff",
    },
    body: { fontSize: 13, lineHeight: 18, color: colors.text },
    title: { fontWeight: "800", color: colors.text },
    muted: { fontSize: 12, color: colors.textMuted },
    link: { fontSize: 12, fontWeight: "700", color: colors.terracotta },
  });
}
