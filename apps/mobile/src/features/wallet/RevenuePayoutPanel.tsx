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
  const { t } = useI18n();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    const n = Number(amount.replace(/\D/g, ""));
    if (n < MIN_PAYOUT_USD_CENTS) {
      showIslandError(
        t("m.wallet.payout"),
        t("m.wallet.minimum_payout_is_formatusd", { formatUsd: String(formatUsd(MIN_PAYOUT_USD_CENTS)) })
      );
      return;
    }
    if (n > withdrawable) {
      showIslandError(t("m.wallet.payout"), t("m.wallet.amount_exceeds_available_balance"));
      return;
    }
    setBusy(true);
    try {
      await requestWalletPayout(n);
      showIslandSuccess(t("m.wallet.payout_requested"), t("m.wallet.your_payout_request_was_submitted"));
      setAmount("");
      void queryClient.invalidateQueries({ queryKey: ["mobile-wallet"] });
    } catch (e: unknown) {
      showIslandError(t("m.wallet.payout_failed"), e instanceof Error ? e.message : t("m.wallet.could_not_request_payout"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={[styles.box, { borderColor: colors.hairline, backgroundColor: colors.surfaceRaised }]}>
      <Text style={[styles.heading, { color: colors.text }]}>{t("m.wallet.request_payout")}</Text>
      <Text style={[styles.body, { color: colors.textMuted }]}>
        {t("m.wallet.available")} {formatUsd(withdrawable)} · {t("m.common.min")} {formatUsd(MIN_PAYOUT_USD_CENTS)}
      </Text>
        {!bankReady ? (
        <Text style={[styles.body, { color: colors.danger }]}>
          {t("m.wallet.complete_stripe_connect_payout_setup_fir")}
        </Text>
      ) : (
        <>
          <TextInput
            value={amount}
            onChangeText={setAmount}
            placeholder={t("m.wallet.payout_amount")}
            keyboardType="number-pad"
            placeholderTextColor={colors.textMuted}
            style={[styles.input, { borderColor: colors.hairline, color: colors.text }]}
          />
          <FolkButton
            label={busy ? t("m.wallet.submitting") : t("m.wallet.request_payout")}
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
