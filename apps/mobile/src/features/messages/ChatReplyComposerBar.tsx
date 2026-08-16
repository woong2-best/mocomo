import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import type { ChatMessage } from "@/api/messages";
import { getChatReplyPreview } from "@/features/messages/chat-display";
import { IMAGE_CACHE_POLICY } from "@/perf/image";
import { useTheme } from "@/theme/ThemeContext";
import { spacing, type ThemeColors } from "@/theme/tokens";

export function ChatReplyComposerBar({
  target,
  selfUserId,
  onCancel,
}: {
  target: ChatMessage;
  selfUserId?: string;
  onCancel: () => void;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const isSelf = !!selfUserId && target.sender.id === selfUserId;
  const preview = getChatReplyPreview(target);
  const thumb = target.attachments?.find((a) => a.type === "IMAGE" || a.type === "GIF");

  return (
    <View style={styles.wrap}>
      <View style={styles.bar} />
      <View style={styles.body}>
        <Text style={styles.label}>
          <Text style={styles.name}>{isSelf ? "나" : target.sender.username}</Text>
          에 답장
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
      <Pressable onPress={onCancel} hitSlop={10} style={styles.close} accessibilityLabel="답장 취소">
        <Ionicons name="close" size={18} color={colors.textMuted} />
      </Pressable>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    wrap: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingHorizontal: spacing.md,
      paddingVertical: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
      backgroundColor: colors.muted,
    },
    bar: {
      width: 3,
      alignSelf: "stretch",
      minHeight: 36,
      borderRadius: 2,
      backgroundColor: colors.cobalt,
    },
    body: { flex: 1, minWidth: 0 },
    label: { fontSize: 11, color: colors.textMuted },
    name: { color: colors.cobalt, fontWeight: "800" },
    preview: { marginTop: 2, fontSize: 13, color: colors.text, fontWeight: "500" },
    thumb: { width: 36, height: 36, borderRadius: 8 },
    close: {
      width: 32,
      height: 32,
      alignItems: "center",
      justifyContent: "center",
    },
  });
}
