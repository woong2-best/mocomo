import { useEffect, useMemo, useState } from "react";
import { Alert, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import {
  fetchMyCreatorCallSettings,
  updateMyCreatorCallSettings,
} from "@/api/call-bookings";
import { FolkButton } from "@/ui/FolkButton";
import { FolkCard } from "@/ui/FolkCard";
import { useTheme } from "@/theme/ThemeContext";
import { radii, spacing, type ThemeColors } from "@/theme/tokens";

export function CreatorCallSettingsCard() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [isCreator, setIsCreator] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [rateText, setRateText] = useState("30000");

  useEffect(() => {
    void fetchMyCreatorCallSettings()
      .then((s) => {
        setIsCreator(s.isCreator);
        setEnabled(s.enabled);
        if (s.rateKrwPerHour) setRateText(String(s.rateKrwPerHour));
      })
      .catch(() => setIsCreator(false))
      .finally(() => setLoading(false));
  }, []);

  async function save() {
    const rate = parseInt(rateText.replace(/\D/g, ""), 10) || 0;
    if (enabled && rate < 5000) {
      Alert.alert("오류", "시간당 요금은 최소 5,000원 이상이어야 합니다.");
      return;
    }
    setBusy(true);
    try {
      const res = await updateMyCreatorCallSettings({
        enabled,
        rateKrwPerHour: enabled ? rate : null,
      });
      setEnabled(res.enabled);
      if (res.rateKrwPerHour) setRateText(String(res.rateKrwPerHour));
      Alert.alert("저장됨", "통화 예약 설정이 업데이트되었습니다.");
    } catch (e) {
      Alert.alert("오류", e instanceof Error ? e.message : "저장하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }

  if (loading || !isCreator) return null;

  return (
    <FolkCard>
      <Text style={styles.title}>유료 통화 예약</Text>
      <Text style={styles.desc}>
        DM에서 팬이 날짜·금액을 선택해 예약하고 결제합니다. 수락 후 예약 시간에 통화할 수 있어요.
      </Text>

      <View style={styles.row}>
        <Text style={styles.label}>예약 받기</Text>
        <Switch value={enabled} onValueChange={setEnabled} />
      </View>

      {enabled ? (
        <>
          <Text style={styles.label}>시간당 요금 (원)</Text>
          <TextInput
            style={styles.input}
            value={rateText}
            onChangeText={setRateText}
            keyboardType="number-pad"
            placeholder="30000"
            placeholderTextColor={colors.textMuted}
          />
          <Text style={styles.hint}>팬이 입력한 금액 ÷ 시간당 요금으로 통화 시간이 계산됩니다.</Text>
        </>
      ) : null}

      <FolkButton label="통화 예약 설정 저장" loading={busy} onPress={() => void save()} />
    </FolkCard>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    title: { fontSize: 17, fontWeight: "800", color: colors.text },
    desc: { fontSize: 13, color: colors.textMuted, marginTop: 6, marginBottom: spacing.md, lineHeight: 18 },
    row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.sm },
    label: { fontSize: 13, fontWeight: "700", color: colors.textMuted, marginTop: spacing.sm },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.md,
      paddingHorizontal: spacing.md,
      paddingVertical: 10,
      marginTop: 6,
      color: colors.text,
      backgroundColor: colors.background,
    },
    hint: { fontSize: 12, color: colors.textMuted, marginTop: 6, marginBottom: spacing.sm },
  });
}
