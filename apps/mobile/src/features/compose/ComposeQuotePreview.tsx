import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { fetchQuotePreview, type QuotePreviewPost } from "@/api/posts";
import { SensitiveContentGate } from "@/ui/SensitiveContentGate";
import { useTheme } from "@/theme/ThemeContext";
import { radii, type ThemeColors } from "@/theme/tokens";
import { useI18n } from "@/i18n/I18nProvider";

function formatDuration(sec: number | null | undefined): string | null {
  if (sec == null || !Number.isFinite(sec) || sec <= 0) return null;
  const total = Math.floor(sec);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

type Props = {
  postId: string;
  onLoaded?: (post: QuotePreviewPost) => void;
};

export function ComposeQuotePreview({ postId, onLoaded }: Props) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [post, setPost] = useState<QuotePreviewPost | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const res = await fetchQuotePreview(postId);
        if (!cancelled) {
          setPost(res.post);
          onLoaded?.(res.post);
        }
      } catch {
        if (!cancelled) setPost(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [onLoaded, postId]);

  if (loading) {
    return (
      <View style={styles.shell}>
        <ActivityIndicator color={colors.terracotta} />
        <Text style={styles.muted}>{t("m.compose.loading_original_post")}</Text>
      </View>
    );
  }

  if (!post) {
    return (
      <View style={styles.shell}>
        <Text style={styles.muted}>{t("m.compose.could_not_load_the_original_post")}</Text>
      </View>
    );
  }

  const cover = post.media?.[0];
  const durationLabel = cover?.type === "VIDEO" ? formatDuration(cover.duration) : null;

  return (
    <View style={styles.card}>
      <View style={styles.textBlock}>
        <Text style={styles.name} numberOfLines={1}>
          {post.author.name || post.author.username}
          <Text style={styles.handle}> @{post.author.username}</Text>
        </Text>
        {post.content ? (
          <Text style={styles.body} numberOfLines={4}>
            {post.content}
          </Text>
        ) : null}
      </View>
      {cover?.url ? (
        <SensitiveContentGate enabled={post.isNsfw} style={styles.mediaWrap}>
          <Image
            source={{ uri: cover.posterUrl || cover.url }}
            style={styles.media}
            contentFit="cover"
          />
          {durationLabel ? (
            <View style={styles.durationBadge} pointerEvents="none">
              <Text style={styles.durationText}>{durationLabel}</Text>
            </View>
          ) : null}
        </SensitiveContentGate>
      ) : null}
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    shell: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingVertical: 12,
    },
    muted: { fontSize: 13, color: colors.textMuted },
    card: {
      borderRadius: radii.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.hairline,
      overflow: "hidden",
      backgroundColor: colors.muted,
    },
    textBlock: { paddingHorizontal: 12, paddingTop: 12, paddingBottom: 8 },
    name: { fontSize: 13, fontWeight: "700", color: colors.text },
    handle: { fontWeight: "400", color: colors.textMuted },
    body: { marginTop: 4, fontSize: 14, lineHeight: 19, color: colors.textMuted },
    mediaWrap: { position: "relative", width: "100%", aspectRatio: 16 / 10, maxHeight: 220 },
    media: { width: "100%", height: "100%" },
    durationBadge: {
      position: "absolute",
      left: 8,
      bottom: 8,
      backgroundColor: "rgba(0,0,0,0.75)",
      borderRadius: 6,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    durationText: {
      fontSize: 11,
      fontWeight: "700",
      color: "#fff",
      fontVariant: ["tabular-nums"],
    },
  });
}
