import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { KeyboardSheet } from "@/ui/KeyboardSheet";
import { useTheme } from "@/theme/ThemeContext";
import { radii, spacing, type ThemeColors } from "@/theme/tokens";
import { useI18n } from "@/i18n/I18nProvider";

type Props = {
  visible: boolean;
  onClose: () => void;
  onPickVideo: () => void;
  onPickSfx: () => void;
  hostDisplayName?: string;
};

export function LiveMocoDonationMenuSheet({
  visible,
  onClose,
  onPickVideo,
  onPickSfx,
  hostDisplayName,
}: Props) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <KeyboardSheet visible={visible} onClose={onClose} maxHeight="42%" sheetStyle={{ backgroundColor: colors.surface }}>
      <Text style={styles.title}>{t("m.live.moco_tip")}</Text>
      <Text style={styles.sub}>
        {hostDisplayName ? `${hostDisplayName} · ` : ""}
        {t("m.live.your_tip_shows_on_the_stream")}
      </Text>

      <Pressable
        style={styles.row}
        onPress={() => {
          onClose();
          onPickVideo();
        }}
      >
        <View style={[styles.iconWrap, { backgroundColor: "#0d4d2c22" }]}>
          <Ionicons name="logo-youtube" size={22} color="#0d4d2c" />
        </View>
        <View style={styles.rowText}>
          <Text style={styles.rowTitle}>{t("m.live.youtube_video_tip")}</Text>
          <Text style={styles.rowSub}>{t("m.live.url_play_range_moco_calculated_automatic")}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </Pressable>

      <Pressable
        style={styles.row}
        onPress={() => {
          onClose();
          onPickSfx();
        }}
      >
        <View style={[styles.iconWrap, { backgroundColor: "#E85D0418" }]}>
          <Ionicons name="musical-notes" size={22} color="#E85D04" />
        </View>
        <View style={styles.rowText}>
          <Text style={styles.rowTitle}>{t("m.live.sound_effect_tip")}</Text>
          <Text style={styles.rowSub}>{t("m.live.sound_moco_on_screen_message_required")}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </Pressable>
    </KeyboardSheet>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    title: { fontSize: 18, fontWeight: "900", color: colors.text },
    sub: { marginTop: 4, fontSize: 12, fontWeight: "600", color: colors.textMuted, marginBottom: spacing.md },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingVertical: 14,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    iconWrap: {
      width: 44,
      height: 44,
      borderRadius: radii.md,
      alignItems: "center",
      justifyContent: "center",
    },
    rowText: { flex: 1, minWidth: 0 },
    rowTitle: { fontSize: 15, fontWeight: "800", color: colors.text },
    rowSub: { marginTop: 2, fontSize: 11, fontWeight: "600", color: colors.textMuted },
  });
}
