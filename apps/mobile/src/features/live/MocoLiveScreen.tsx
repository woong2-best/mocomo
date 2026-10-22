import { Image } from "expo-image";
import { useState } from "react";
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useI18n } from "@/i18n/I18nProvider";
import { useTheme } from "@/theme/ThemeContext";
import { useMoneyAgeGate } from "@/hooks/useMoneyAgeGate";
import { liveUi } from "@/features/live/live-ui";
import { MocoTipButton } from "@/features/live/MocoTipButton";
import { LiveMocoDonationMenuSheet } from "@/features/live/LiveMocoDonationMenuSheet";
import { LiveMocoSfxDonationSheet } from "@/features/live/LiveMocoSfxDonationSheet";
import { LiveMocoVideoDonationSheet } from "@/features/live/LiveMocoVideoDonationSheet";
import { LiveVideoDonationBar } from "@/features/live/LiveVideoDonationBar";

const POSTER = require("../../../assets/moco-live-poster.png");
/** Same row as the website room. Server keeps this channel live. */
const MOCO_CHANNEL_ID = "moco-official";

export function MocoLiveScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { t } = useI18n();
  const copy = liveUi(t);
  const { colors } = useTheme();
  const moneyAge = useMoneyAgeGate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [videoOpen, setVideoOpen] = useState(false);
  const [sfxOpen, setSfxOpen] = useState(false);
  const stageW = width;
  const stageH = Math.round(stageW * (9 / 16));

  const openDonate = () => {
    if (moneyAge.blocked) {
      void moneyAge.ensureMoneyAge();
      return;
    }
    setMenuOpen(true);
  };

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
      <View style={styles.donateRow}>
        <MocoTipButton onPress={openDonate} size={40} />
      </View>
      <LiveVideoDonationBar channelId={MOCO_CHANNEL_ID} isHost={false} />
      <LiveMocoDonationMenuSheet
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        hostDisplayName={t("m.live.ai_host_name")}
        onPickVideo={() => setVideoOpen(true)}
        onPickSfx={() => setSfxOpen(true)}
      />
      <LiveMocoVideoDonationSheet
        visible={videoOpen}
        onClose={() => setVideoOpen(false)}
        channelId={MOCO_CHANNEL_ID}
      />
      <LiveMocoSfxDonationSheet
        visible={sfxOpen}
        onClose={() => setSfxOpen(false)}
        channelId={MOCO_CHANNEL_ID}
      />
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
  donateRow: { paddingHorizontal: 16, paddingTop: 16 },
});
