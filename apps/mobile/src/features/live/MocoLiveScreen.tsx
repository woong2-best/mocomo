import { Image } from "expo-image";
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useI18n } from "@/i18n/I18nProvider";
import { useTheme } from "@/theme/ThemeContext";
import { liveUi } from "@/features/live/live-ui";

const POSTER = require("../../../assets/moco-live-poster.png");

export function MocoLiveScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { t } = useI18n();
  const copy = liveUi(t);
  const { colors } = useTheme();
  const stageW = width;
  const stageH = Math.round(stageW * (9 / 16));

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <Pressable
        onPress={() => navigation.goBack()}
        hitSlop={12}
        style={styles.back}
        accessibilityLabel={copy.back}
      >
        <Ionicons name="chevron-back" size={26} color={colors.text} />
      </Pressable>
      <View style={{ width: stageW, height: stageH, backgroundColor: "#241c33" }}>
        <Image source={POSTER} style={StyleSheet.absoluteFill} contentFit="cover" />
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{t("m.live.ai_official_badge")}</Text>
        </View>
      </View>
      <View style={styles.meta}>
        <Text style={[styles.name, { color: colors.text }]}>{t("m.live.ai_host_name")}</Text>
        <Text style={[styles.title, { color: colors.textSecondary }]}>{t("m.live.ai_card_title")}</Text>
        <Text style={[styles.sub, { color: colors.textMuted }]}>{t("m.live.ai_card_sub")}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  back: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    top: 12,
    left: 12,
    backgroundColor: "#1a4fa0",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeText: { color: "#fff", fontSize: 11, fontWeight: "900" },
  meta: { paddingHorizontal: 16, paddingTop: 14, gap: 4 },
  name: { fontSize: 20, fontWeight: "800" },
  title: { fontSize: 15, fontWeight: "700" },
  sub: { fontSize: 13, fontWeight: "600" },
});
