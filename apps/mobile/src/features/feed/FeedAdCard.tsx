import { memo, useMemo } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { IMAGE_CACHE_POLICY } from "@/perf/image";
import { useTheme } from "@/theme/ThemeContext";
import { spacing, type ThemeColors } from "@/theme/tokens";

export type FeedAd = {
  id: string;
  title: string;
  imageUrl: string;
  linkUrl: string;
  sponsorName?: string | null;
  ctaLabel?: string | null;
  adCategory?: string | null;
};

function sponsorHandle(name: string | null | undefined): string {
  const base = (name || "MoCoMo").replace(/\s+/g, "").slice(0, 15);
  return `@${base.toLowerCase()}`;
}

function sourceLabel(url: string): string | null {
  try {
    if (!url.startsWith("http")) return null;
    const host = new URL(url).hostname.replace(/^www\./, "");
    return host || null;
  } catch {
    return null;
  }
}

function FeedAdCardInner({ ad }: { ad: FeedAd }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const sponsor = ad.sponsorName?.trim() || "MoCoMo";
  const source = sourceLabel(ad.linkUrl);

  const onPress = () => {
    const url = ad.linkUrl.startsWith("http")
      ? ad.linkUrl
      : `https://mocomo.net${ad.linkUrl.startsWith("/") ? ad.linkUrl : `/${ad.linkUrl}`}`;
    void Linking.openURL(url);
  };

  return (
    <Pressable style={styles.root} onPress={onPress}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{sponsor.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.headerMeta}>
          <View style={styles.nameRow}>
            <Text style={styles.sponsor} numberOfLines={1}>
              {sponsor}
            </Text>
            <Text style={styles.handle} numberOfLines={1}>
              {sponsorHandle(ad.sponsorName)}
            </Text>
          </View>
        </View>
        <Text style={styles.adLabel}>{ad.adCategory || "광고"}</Text>
      </View>

      <Text style={styles.title}>{ad.title}</Text>

      <Image
        source={{ uri: ad.imageUrl }}
        style={styles.media}
        contentFit="cover"
        cachePolicy={IMAGE_CACHE_POLICY}
        transition={0}
      />

      {source ? <Text style={styles.source}>출처: {source}</Text> : null}

      <View style={styles.actions}>
        <View style={styles.actionGroup}>
          <Ionicons name="chatbubble-outline" size={18} color={colors.textMuted} />
          <Ionicons name="heart-outline" size={18} color={colors.textMuted} />
          <Ionicons name="stats-chart-outline" size={18} color={colors.textMuted} />
        </View>
        <View style={styles.actionGroup}>
          <Text style={styles.cta}>{ad.ctaLabel || "자세히 보기"}</Text>
          <Ionicons name="bookmark-outline" size={18} color={colors.textMuted} />
          <Ionicons name="share-outline" size={18} color={colors.textMuted} />
        </View>
      </View>
    </Pressable>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    root: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.hairline,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      marginBottom: spacing.xs,
    },
    avatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: "rgba(168, 85, 247, 0.15)",
      borderWidth: 1,
      borderColor: "rgba(168, 85, 247, 0.3)",
      alignItems: "center",
      justifyContent: "center",
    },
    avatarText: {
      color: "#A855F7",
      fontWeight: "800",
      fontSize: 16,
    },
    headerMeta: { flex: 1, minWidth: 0 },
    nameRow: { flexDirection: "row", alignItems: "center", gap: 4, flexWrap: "wrap" },
    sponsor: { fontWeight: "800", fontSize: 15, color: colors.text },
    handle: { fontSize: 14, color: colors.textMuted },
    adLabel: { fontSize: 12, color: colors.textMuted, fontWeight: "600" },
    title: {
      fontSize: 15,
      lineHeight: 21,
      color: colors.text,
      marginBottom: spacing.sm,
    },
    media: {
      width: "100%",
      aspectRatio: 16 / 9,
      borderRadius: 14,
      backgroundColor: colors.border,
      marginBottom: spacing.xs,
    },
    source: {
      fontSize: 12,
      color: colors.textMuted,
      marginBottom: spacing.xs,
    },
    actions: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingTop: spacing.xs,
    },
    actionGroup: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
    },
    cta: {
      fontSize: 12,
      fontWeight: "700",
      color: "#A855F7",
    },
  });
}

export const FeedAdCard = memo(FeedAdCardInner);
