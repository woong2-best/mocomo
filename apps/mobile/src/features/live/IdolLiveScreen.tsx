import { useState } from "react";
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
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
import { IDOL_LIVES, type IdolLiveId } from "@/features/live/ai/idol-lives";
import type { RootStackParamList } from "@/navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "IdolLive">;

export function IdolLiveScreen({ route, navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { t } = useI18n();
  const copy = liveUi(t);
  const { colors } = useTheme();
  const moneyAge = useMoneyAgeGate();
  const [member, setMember] = useState<IdolLiveId>(route.params.member);
  const idol = IDOL_LIVES.find((item) => item.id === member) ?? IDOL_LIVES[0];
  const [menuOpen, setMenuOpen] = useState(false);
  const [videoOpen, setVideoOpen] = useState(false);
  const [sfxOpen, setSfxOpen] = useState(false);
  const stageH = Math.round(width * (9 / 16));

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
      <View style={{ width, height: stageH, backgroundColor: idol.accent }} />
      <View style={styles.meta}>
        <Text style={[styles.name, { color: colors.text }]}>{t(idol.nameKey)}</Text>
        <Text style={[styles.title, { color: colors.textSecondary }]}>{t(idol.titleKey)}</Text>
        <Text style={[styles.sub, { color: colors.textMuted }]}>{t(idol.roleKey)}</Text>
      </View>
      <View style={styles.donateRow}>
        <MocoTipButton onPress={openDonate} size={40} />
      </View>
      <LiveVideoDonationBar channelId={idol.channelId} isHost={false} />
      <View style={styles.tabs}>
        {IDOL_LIVES.map((item) => {
          const active = item.id === idol.id;
          return (
            <Pressable
              key={item.id}
              onPress={() => setMember(item.id)}
              style={[styles.tab, { backgroundColor: active ? "#fff" : "rgba(255,255,255,0.12)" }]}
            >
              <Text style={{ color: active ? "#111" : colors.text, fontWeight: "800" }}>{t(item.nameKey)}</Text>
            </Pressable>
          );
        })}
      </View>
      <LiveMocoDonationMenuSheet
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        hostDisplayName={t(idol.nameKey)}
        onPickVideo={() => setVideoOpen(true)}
        onPickSfx={() => setSfxOpen(true)}
      />
      <LiveMocoVideoDonationSheet
        visible={videoOpen}
        onClose={() => setVideoOpen(false)}
        channelId={idol.channelId}
      />
      <LiveMocoSfxDonationSheet
        visible={sfxOpen}
        onClose={() => setSfxOpen(false)}
        channelId={idol.channelId}
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
  meta: { paddingHorizontal: 16, paddingTop: 14, gap: 4 },
  name: { fontSize: 20, fontWeight: "800" },
  title: { fontSize: 15, fontWeight: "700" },
  sub: { fontSize: 13, fontWeight: "600" },
  donateRow: { paddingHorizontal: 16, paddingTop: 16 },
  tabs: { flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingTop: 18 },
  tab: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
});
