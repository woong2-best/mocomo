import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import type { ChatReplyTo } from "@/api/messages";
import { getChatReplyPreview } from "@/features/messages/chat-display";
import { IMAGE_CACHE_POLICY } from "@/perf/image";
import { useTheme } from "@/theme/ThemeContext";
import { type ThemeColors } from "@/theme/tokens";

export function ChatReplyQuote({
  replyTo,
  mine,
  selfUserId,
}: {
  replyTo: ChatReplyTo;
  mine: boolean;
  selfUserId?: string;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors, mine), [colors, mine]);
  const isSelf = !!selfUserId && replyTo.sender.id === selfUserId;
  const preview = getChatReplyPreview(replyTo);
  // Paid media never renders outside the forensic canvas, not even as a
  // reply thumbnail.
  const thumb = replyTo.attachments?.find(
    (a) => (a.type === "IMAGE" || a.type === "GIF") && !(a.priceKrw ?? 0) && Boolean(a.url)
  );

  return (
    <View style={styles.wrap}>
      <View style={[styles.bar, isSelf ? styles.barSelf : styles.barOther]} />
      <View style={styles.body}>
        <Text style={[styles.author, isSelf ? styles.authorSelf : styles.authorOther]} numberOfLines={1}>
          {isSelf ? "나" : replyTo.sender.username}
        </Text>
        <Text style={styles.preview} numberOfLines={1}>
          {preview}
        </Text>
      </View>
      {thumb?.url ? (
        <Image
          source={{ uri: thumb.url }}
          style={styles.thumb}
          contentFit="cover"
          cachePolicy={IMAGE_CACHE_POLICY}
          transition={0}
        />
      ) : null}
    </View>
  );
}

function createStyles(colors: ThemeColors, mine: boolean) {
  return StyleSheet.create({
    wrap: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginBottom: 6,
      paddingBottom: 6,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: mine ? "rgba(255,255,255,0.28)" : colors.hairline,
    },
    bar: { width: 2, alignSelf: "stretch", minHeight: 28, borderRadius: 1 },
    barSelf: { backgroundColor: mine ? "rgba(255,255,255,0.55)" : "rgba(90,106,130,0.45)" },
    barOther: { backgroundColor: mine ? "rgba(255,255,255,0.75)" : colors.cobalt },
    body: { flex: 1, minWidth: 0 },
    author: { fontSize: 11, fontWeight: "700" },
    authorSelf: { color: mine ? "rgba(255,255,255,0.85)" : colors.textMuted },
    authorOther: { color: mine ? "#fff" : colors.cobalt },
    preview: {
      fontSize: 12,
      lineHeight: 16,
      color: mine ? "rgba(255,255,255,0.78)" : colors.textMuted,
    },
    thumb: { width: 36, height: 36, borderRadius: 6 },
  });
}
