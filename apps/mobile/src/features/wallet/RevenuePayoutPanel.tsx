import { useMemo, useState } from "react";
import { Alert, StyleSheet, Text, TextInput, View } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { requestWalletPayout } from "@/api/checkout-payment";
import { FolkButton } from "@/ui/FolkButton";
import { useTheme } from "@/theme/ThemeContext";
import { spacing, type ThemeColors } from "@/theme/tokens";

const MIN_PAYOUT = 10_000;

type Props = {
  withdrawable: number;
  bankReady: boolean;
};

export function RevenuePayoutPanel({ withdrawable, bankReady }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    const n = Number(amount.replace(/\D/g, ""));
    if (n < MIN_PAYOUT) {
      Alert.alert("출금", `최소 ${MIN_PAYOUT.toLocaleString("ko-KR")}원 이상 신청할 수 있습니다.`);
      return;
    }
    if (n > withdrawable) {
      Alert.alert("출금", "출금 가능 잔액을 초과했습니다.");
      return;
    }
    setBusy(true);
    try {
      await requestWalletPayout(n);
      Alert.alert("출금 신청", "출금 신청이 접수되었습니다.");
      setAmount("");
      void queryClient.invalidateQueries({ queryKey: ["mobile-wallet"] });
    } catch (e: unknown) {
      Alert.alert("출금 실패", e instanceof Error ? e.message : "출금 신청에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={[styles.box, { borderColor: colors.hairline, backgroundColor: colors.surfaceRaised }]}>
      <Text style={[styles.heading, { color: colors.text }]}>출금 신청</Text>
      <Text style={[styles.body, { color: colors.textMuted }]}>
        출금 가능 {withdrawable.toLocaleString("ko-KR")}원 · 최소 {MIN_PAYOUT.toLocaleString("ko-KR")}원
      </Text>
      {!bankReady ? (
        <Text style={[styles.body, { color: colors.danger }]}>먼저 수익 입금 계좌를 1원 인증으로 등록해 주세요.</Text>
      ) : (
        <>
          <TextInput
            value={amount}
            onChangeText={setAmount}
            placeholder="출금 금액"
            keyboardType="number-pad"
            placeholderTextColor={colors.textMuted}
            style={[styles.input, { borderColor: colors.hairline, color: colors.text }]}
          />
          <FolkButton
            label={busy ? "신청 중…" : "출금 신청"}
            onPress={() => void submit()}
            loading={busy}
            disabled={withdrawable < MIN_PAYOUT}
          />
        </>
      )}
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    box: {
      borderWidth: 1,
      borderRadius: 16,
      padding: spacing.md,
      marginHorizontal: spacing.md,
      marginTop: spacing.md,
      gap: spacing.sm,
    },
    heading: { fontSize: 16, fontWeight: "900" },
    body: { fontSize: 12, fontWeight: "600" },
    input: {
      borderWidth: 1,
      borderRadius: 12,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      fontSize: 15,
      fontWeight: "600",
    },
  });
}
