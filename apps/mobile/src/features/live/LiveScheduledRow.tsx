import { memo, useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { LiveScheduledItem } from "@/api/live";
import { liveCategoryLabel } from "@/features/live/live-categories";
import { liveUi } from "@/features/live/live-ui";
import { useI18n } from "@/i18n/I18nProvider";
import { useTheme } from "@/theme/ThemeContext";
import { radii, spacing, type ThemeColors } from "@/theme/tokens";

type Props = {
  item: LiveScheduledItem;
  onPress: () => void;
};

function formatWhen(iso: string | null, locale: string, scheduledLabel: string): string {
  if (!iso) return scheduledLabel;
  try {
    return new Date(iso).toLocaleString(locale === "ko" ? "ko-KR" : "en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return scheduledLabel;
  }
}

function LiveScheduledRowInner({ item, onPress }: Props) {
  const { locale, t } = useI18n();
  const copy = useMemo(() => liveUi(t), [t]);
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Pressable style={styles.row} onPress={onPress}>
      <View style={styles.iconWrap}>
        <Ionicons name="calendar" size={18} color={colors.terracotta} />
      </View>
      <View style={styles.meta}>
        <Text style={styles.title} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.when}>{formatWhen(item.scheduledAt, locale, copy.scheduled)}</Text>
        <View style={styles.tag}>
          <Text style={styles.tagText}>{liveCategoryLabel(item.category, locale)}</Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </Pressable>
  );
}

export const LiveScheduledRow = memo(LiveScheduledRowInner);

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    row: {
      marginHorizontal: spacing.md,
      marginBottom: 8,
      padding: 12,
      borderRadius: radii.md,
      backgroundColor: colors.surfaceRaised,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    iconWrap: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: colors.muted,
      alignItems: "center",
      justifyContent: "center",
    },
    meta: { flex: 1, minWidth: 0, gap: 4 },
    title: { fontSize: 14, fontWeight: "800", color: colors.text },
    when: { fontSize: 12, fontWeight: "600", color: colors.textMuted },
    tag: {
      alignSelf: "flex-start",
      marginTop: 2,
      backgroundColor: colors.muted,
      borderRadius: 5,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    tagText: { fontSize: 10, fontWeight: "600", color: colors.textMuted },
  });
}
