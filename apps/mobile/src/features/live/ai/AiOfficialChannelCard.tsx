import { memo } from "react";
import { Image } from "expo-image";
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useI18n } from "@/i18n/I18nProvider";
import { useTheme } from "@/theme/ThemeContext";

const POSTER = require("../../../../assets/moco-live-poster.png");

type Props = {
  onPress: () => void;
};

function AiOfficialChannelCardInner({ onPress }: Props) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const thumbW = Math.round(Math.min(width * 0.42, 188));
  const thumbH = Math.round(thumbW * (9 / 16));

  return (
    <Pressable style={styles.row} onPress={onPress} accessibilityRole="button">
      <View style={[styles.thumb, { width: thumbW, height: thumbH }]}>
        <Image source={POSTER} style={StyleSheet.absoluteFill} contentFit="cover" />
        <View style={styles.badge} pointerEvents="none">
          <Text style={styles.badgeText}>{t("m.live.ai_official_badge")}</Text>
        </View>
      </View>
      <View style={styles.meta}>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
          {t("m.live.ai_card_title")}
        </Text>
        <Text style={[styles.host, { color: colors.textSecondary }]} numberOfLines={1}>
          {t("m.live.ai_host_name")}
        </Text>
        <Text style={[styles.sub, { color: colors.textMuted }]} numberOfLines={1}>
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
    paddingVertical: 8,
  },
  thumb: {
    borderRadius: 6,
    overflow: "hidden",
    backgroundColor: "#241c33",
  },
  badge: {
    position: "absolute",
    top: 6,
    left: 6,
    backgroundColor: "#1a4fa0",
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  badgeText: { color: "#fff", fontSize: 8, fontWeight: "900" },
  meta: { flex: 1, justifyContent: "center", gap: 3 },
  title: { fontWeight: "800", fontSize: 15 },
  host: { fontWeight: "700", fontSize: 13 },
  sub: { fontWeight: "600", fontSize: 12 },
});
