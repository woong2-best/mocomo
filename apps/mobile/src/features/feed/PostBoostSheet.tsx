import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { boostPost, fetchPostBoostStatus, type BoostPreset } from "@/api/post-boost";
import { KeyboardSheet } from "@/ui/KeyboardSheet";
import { FolkButton } from "@/ui/FolkButton";
import { showIslandError, showIslandSuccess } from "@/ui/IslandToast";
import { useTheme } from "@/theme/ThemeContext";
import { spacing, type ThemeColors } from "@/theme/tokens";
import { useI18n } from "@/i18n/I18nProvider";
import type { RootStackParamList } from "@/navigation/types";

const FALLBACK_PRESETS: BoostPreset[] = [
  { days: 1, moco: 0.5 },
  { days: 3, moco: 1.5 },
  { days: 7, moco: 3.5 },
  { days: 14, moco: 7 },
];

type Props = {
  visible: boolean;
  postId: string;
  onClose: () => void;
  onSuccess?: () => void;
};

export function PostBoostSheet({ visible, postId, onClose, onSuccess }: Props) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [days, setDays] = useState(1);
  const [presets, setPresets] = useState<BoostPreset[]>(FALLBACK_PRESETS);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!visible) return;
    setAgreed(false);
    setError("");
    setDays(1);
    setLoading(true);
    void fetchPostBoostStatus(postId)
      .then((s) => {
        setPresets(s.presets?.length ? s.presets : FALLBACK_PRESETS);
        setBalance(s.purchasedMoco ?? s.purchasedMocoBalance ?? 0);
      })
      .catch((e) => setError(e instanceof Error ? e.message : t("m.boost.load_failed")))
      .finally(() => setLoading(false));
  }, [visible, postId, t]);

  const selected = presets.find((p) => p.days === days) ?? presets[0]!;
  const canAfford = balance + 1e-9 >= selected.moco;

  async function submit() {
    if (busy || !agreed || !canAfford) return;
    setBusy(true);
    setError("");
    try {
      await boostPost(postId, days);
      showIslandSuccess(t("m.boost.success"));
      onSuccess?.();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("m.boost.purchase_failed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardSheet visible={visible} onClose={onClose} sheetStyle={{ backgroundColor: colors.surfaceRaised }}>
      <Text style={styles.title}>{t("m.boost.title")}</Text>
      <Text style={styles.sub}>{t("m.boost.intro")}</Text>

      <View style={styles.dayRow}>
        {presets.map((preset) => {
          const active = preset.days === days;
          return (
            <Pressable
              key={preset.days}
              style={[styles.dayChip, active && styles.dayChipActive]}
              onPress={() => setDays(preset.days)}
            >
              <Text style={[styles.dayText, active && styles.dayTextActive]}>
                {t(preset.days === 1 ? "m.boost.days" : "m.boost.days_plural", {
                  days: String(preset.days),
                  moco: String(preset.moco),
                })}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {loading ? (
        <ActivityIndicator color={colors.cobalt} style={{ marginVertical: spacing.md }} />
      ) : (
        <>
          <Text style={styles.balance}>
            {t("m.boost.balance", { balance: String(balance) })}
          </Text>
          {!canAfford ? (
            <Pressable onPress={() => navigation.navigate("Wallet", undefined)}>
              <Text style={styles.charge}>{t("m.boost.charge")}</Text>
            </Pressable>
          ) : null}
        </>
      )}

      <Pressable style={styles.termsRow} onPress={() => setAgreed((v) => !v)}>
        <View style={[styles.checkbox, agreed && styles.checkboxOn]} />
        <Text style={styles.terms}>{t("m.boost.terms")}</Text>
      </Pressable>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.actions}>
        <FolkButton label={t("m.common.close")} variant="ghost" onPress={onClose} />
        <FolkButton
          label={busy ? t("m.boost.busy") : t("m.boost.submit")}
          onPress={() => void submit()}
          loading={busy}
          disabled={loading || !agreed || !canAfford}
        />
      </View>
    </KeyboardSheet>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    title: { fontSize: 18, fontWeight: "800", color: colors.text, marginBottom: 6 },
    sub: { fontSize: 13, color: colors.textMuted, lineHeight: 18, marginBottom: spacing.md },
    dayRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: spacing.md },
    dayChip: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    dayChipActive: { borderColor: colors.cobalt, backgroundColor: "rgba(30, 64, 175, 0.08)" },
    dayText: { fontSize: 13, fontWeight: "700", color: colors.text },
    dayTextActive: { color: colors.cobalt },
    balance: { fontSize: 14, fontWeight: "700", color: colors.text, marginBottom: 6 },
    charge: { fontSize: 13, fontWeight: "700", color: colors.cobalt, marginBottom: spacing.sm },
    termsRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginVertical: spacing.sm },
    checkbox: {
      width: 18,
      height: 18,
      borderRadius: 4,
      borderWidth: 1.5,
      borderColor: colors.border,
      marginTop: 2,
    },
    checkboxOn: { backgroundColor: colors.cobalt, borderColor: colors.cobalt },
    terms: { flex: 1, fontSize: 12, lineHeight: 17, color: colors.textMuted },
    error: { color: colors.terracotta, fontSize: 13, marginBottom: 8 },
    actions: { flexDirection: "row", justifyContent: "flex-end", gap: 8, marginTop: spacing.sm },
  });
}
