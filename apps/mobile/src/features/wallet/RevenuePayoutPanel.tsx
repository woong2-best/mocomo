import { useMemo, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { requestWalletPayout } from "@/api/checkout-payment";
import { FolkButton } from "@/ui/FolkButton";
import { useTheme } from "@/theme/ThemeContext";
import { spacing, type ThemeColors } from "@/theme/tokens";
import { useI18n } from "@/i18n/I18nProvider";
import { showIslandError, showIslandSuccess } from "@/ui/IslandToast";

import { formatUsd, MIN_PAYOUT_USD_CENTS } from "@/lib/money";

type Props = {
  withdrawable: number;
  bankReady: boolean;
};

export function RevenuePayoutPanel({ withdrawable, bankReady }: Props) {
  const { u } = useI18n();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    const n = Number(amount.replace(/\D/g, ""));
    if (n < MIN_PAYOUT_USD_CENTS) {
      showIslandError(
        u("출금", "Payout"),
        u(`최소 ${formatUsd(MIN_PAYOUT_USD_CENTS)} 이상 신청할 수 있습니다.`, `Minimum payout is ${formatUsd(MIN_PAYOUT_USD_CENTS)}.`)
      );
      return;
    }
    if (n > withdrawable) {
      showIslandError(u("출금", "Payout"), u("출금 가능 잔액을 초과했습니다.", "Amount exceeds available balance."));
      return;
    }
    setBusy(true);
    try {
      await requestWalletPayout(n);
      showIslandSuccess(u("출금 신청", "Payout requested"), u("출금 신청이 접수되었습니다.", "Your payout request was submitted."));
      setAmount("");
      void queryClient.invalidateQueries({ queryKey: ["mobile-wallet"] });
    } catch (e: unknown) {
      showIslandError(u("출금 실패", "Payout failed"), e instanceof Error ? e.message : u("출금 신청에 실패했습니다.", "Could not request payout."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={[styles.box, { borderColor: colors.hairline, backgroundColor: colors.surfaceRaised }]}>
      <Text style={[styles.heading, { color: colors.text }]}>{u("출금 신청", "Request payout")}</Text>
      <Text style={[styles.body, { color: colors.textMuted }]}>
        {u("출금 가능", "Available")} {formatUsd(withdrawable)} · {u("최소", "Min")} {formatUsd(MIN_PAYOUT_USD_CENTS)}
      </Text>
        {!bankReady ? (
        <Text style={[styles.body, { color: colors.danger }]}>
          {u("먼저 Stripe Connect 정산 계좌 연동을 완료해 주세요.", "Complete Stripe Connect payout setup first.")}
        </Text>
      ) : (
        <>
          <TextInput
            value={amount}
            onChangeText={setAmount}
            placeholder={u("출금 금액", "Payout amount")}
            keyboardType="number-pad"
            placeholderTextColor={colors.textMuted}
            style={[styles.input, { borderColor: colors.hairline, color: colors.text }]}
          />
          <FolkButton
            label={busy ? u("신청 중…", "Submitting…") : u("출금 신청", "Request payout")}
            onPress={() => void submit()}
            loading={busy}
            disabled={withdrawable < MIN_PAYOUT_USD_CENTS}
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
