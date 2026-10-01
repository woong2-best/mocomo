import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import type { ChatReplyTo } from "@/api/messages";
import { getQuotedMessageBody, getReplyToHeading } from "@/features/messages/chat-display";
import { useI18n } from "@/i18n/I18nProvider";
import { IMAGE_CACHE_POLICY } from "@/perf/image";
import { useTheme } from "@/theme/ThemeContext";
import { type ThemeColors } from "@/theme/tokens";

export function ChatReplyQuote({
  replyTo,
  mine,
  selfUserId,
  selfUsername,
  onJumpToOriginal,
}: {
  replyTo: ChatReplyTo;
  mine: boolean;
  selfUserId?: string;
  selfUsername: string;
  onJumpToOriginal?: (messageId: string) => void;
}) {
  const { locale } = useI18n();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors, mine), [colors, mine]);
  const heading = getReplyToHeading(replyTo, {
    selfUserId,
    selfUsername,
    bubbleIsMine: mine,
    locale,
  });
  const body = getQuotedMessageBody(replyTo, locale);
  const clickable = Boolean(onJumpToOriginal && replyTo.id);

  const content = (
    <>
      <Text style={styles.heading} numberOfLines={1}>
        {heading}
      </Text>
      {body.kind === "text" ? (
        <Text style={styles.previewText} numberOfLines={2} ellipsizeMode="tail">
          {body.text}
        </Text>
      ) : (
        <View style={styles.mediaRow}>
          {body.thumbUrl ? (
            <Image
              source={{ uri: body.thumbUrl }}
              style={styles.thumb}
              contentFit="cover"
              cachePolicy={IMAGE_CACHE_POLICY}
              transition={0}
            />
          ) : (
            <View style={[styles.thumb, styles.thumbPlaceholder]} />
          )}
          <Text style={styles.mediaLabel} numberOfLines={1}>
            {body.label}
          </Text>
        </View>
      )}
    </>
  );

  if (clickable) {
    return (
      <Pressable
        onPress={() => onJumpToOriginal?.(replyTo.id)}
        style={({ pressed }) => [styles.wrap, pressed && styles.wrapPressed]}
        accessibilityRole="button"
        accessibilityLabel={heading}
      >
        {content}
      </Pressable>
    );
  }

  return <View style={styles.wrap}>{content}</View>;
}

function createStyles(colors: ThemeColors, mine: boolean) {
  return StyleSheet.create({
    wrap: {
      paddingBottom: 8,
      marginBottom: 8,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: mine ? "rgba(255,255,255,0.28)" : colors.hairline,
    },
    wrapPressed: {
      opacity: 0.92,
    },
    heading: {
      fontSize: 11,
      lineHeight: 14,
      marginBottom: 4,
      color: mine ? "rgba(255,255,255,0.62)" : colors.textMuted,
    },
    previewText: {
      fontSize: 12,
      lineHeight: 16,
      color: mine ? "rgba(255,255,255,0.88)" : colors.text,
      flexShrink: 1,
      width: "100%",
    },
    mediaRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      minWidth: 0,
    },
    thumb: { width: 36, height: 36, borderRadius: 6 },
    thumbPlaceholder: {
      backgroundColor: mine ? "rgba(255,255,255,0.2)" : colors.muted,
    },
    mediaLabel: {
      flex: 1,
      fontSize: 12,
      fontWeight: "600",
      color: mine ? "rgba(255,255,255,0.88)" : colors.text,
    },
  });
}
