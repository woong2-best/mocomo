import { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useI18n } from "@/i18n/I18nProvider";
import { useTheme } from "@/theme/ThemeContext";

type Props = {
  onPress: () => void;
};

function AiOfficialChannelCardInner({ onPress }: Props) {
  const { t } = useI18n();
  const { colors } = useTheme();
  return (
    <Pressable style={styles.row} onPress={onPress} accessibilityRole="button">
      <View style={styles.thumb}>
        <View style={styles.badge}>
          <Ionicons name="radio" size={12} color="#fff" />
          <Text style={styles.badgeText}>{t("m.live.ai_official_badge")}</Text>
        </View>
        <Text style={styles.thumbName}>{t("m.live.ai_host_name")}</Text>
      </View>
      <View style={styles.meta}>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
          {t("m.live.ai_card_title")}
        </Text>
        <Text style={[styles.sub, { color: colors.textMuted }]} numberOfLines={2}>
          {t("m.live.ai_card_sub")}
        </Text>
      </View>
    </Pressable>
  );
}

export const AiOfficialChannelCard = memo(AiOfficialChannelCardInner);

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  thumb: {
    width: 148,
    aspectRatio: 16 / 9,
    borderRadius: 10,
    backgroundColor: "#1a120f",
    overflow: "hidden",
    justifyContent: "flex-end",
    padding: 8,
  },
  badge: {
    position: "absolute",
    top: 6,
    left: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#1a4fa0",
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: { color: "#fff", fontSize: 9, fontWeight: "900" },
  thumbName: { color: "#fff", fontWeight: "900", fontSize: 13 },
  meta: { flex: 1, justifyContent: "center", gap: 4 },
  title: { fontWeight: "800", fontSize: 15 },
  sub: { fontWeight: "600", fontSize: 12 },
});
