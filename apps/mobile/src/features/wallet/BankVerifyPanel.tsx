import { useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchBankStatus,
  sendBankVerification,
  verifyBankCode,
} from "@/api/checkout-payment";
import { FolkButton } from "@/ui/FolkButton";
import { useTheme } from "@/theme/ThemeContext";
import { spacing, type ThemeColors } from "@/theme/tokens";
import { useI18n } from "@/i18n/I18nProvider";
import type { TFn } from "@/i18n/types";

const BANKS = [
  { code: "004" },
  { code: "088" },
  { code: "020" },
  { code: "081" },
  { code: "011" },
  { code: "090" },
  { code: "092" },
];

function bankLabel(code: string, t: TFn): string {
  switch (code) {
    case "004":
      return t("m.wallet.kb_kookmin");
    case "088":
      return t("m.wallet.shinhan");
    case "020":
      return t("m.wallet.woori");
    case "081":
      return t("m.wallet.hana");
    case "011":
      return t("m.wallet.nh_nonghyup");
    case "090":
      return t("m.wallet.kakao");
    case "092":
      return t("m.wallet.toss");
    default:
      return code;
  }
}

export function BankVerifyPanel({ onVerified }: { onVerified?: () => void }) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const queryClient = useQueryClient();
  const statusQuery = useQuery({ queryKey: ["mobile-bank-status"], queryFn: fetchBankStatus });

  const [bankCode, setBankCode] = useState("004");
  const [accountNum, setAccountNum] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const verified = statusQuery.data?.bankVerified;

  async function send() {
    setBusy(true);
    setError("");
    setMsg("");
    try {
      const res = await sendBankVerification(bankCode, accountNum.replace(/\D/g, ""));
      if ("error" in res && typeof res.error === "string") {
        setError(res.error);
        return;
      }
      setSent(true);
      setMsg(res.message ?? t("m.wallet.we_sent_1_to_your_account"));
      if ("devCode" in res && res.devCode) setCode(res.devCode);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t("m.common.request_failed"));
    } finally {
      setBusy(false);
    }
  }

  async function verify() {
    setBusy(true);
    setError("");
    try {
      const res = await verifyBankCode(bankCode, accountNum.replace(/\D/g, ""), code.trim());
      if ("error" in res && typeof res.error === "string") {
        setError(res.error);
        return;
      }
      setMsg(
        res.displayAccount
          ? t("m.wallet.displayaccount_verified", { displayAccount: String(res.displayAccount) })
          : t("m.wallet.verification_complete")
      );
      void queryClient.invalidateQueries({ queryKey: ["mobile-bank-status"] });
      void queryClient.invalidateQueries({ queryKey: ["mobile-wallet"] });
      onVerified?.();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t("m.common.verification_failed"));
    } finally {
      setBusy(false);
    }
  }

  if (statusQuery.isLoading) {
    return <ActivityIndicator color={colors.terracotta} style={{ marginVertical: spacing.md }} />;
  }

  if (verified) {
    return (
      <View style={[styles.box, { borderColor: colors.hairline, backgroundColor: colors.surfaceRaised }]}>
        <Text style={[styles.heading, { color: colors.text }]}>{t("m.wallet.payout_bank_account")}</Text>
        <Text style={[styles.body, { color: colors.success }]}>
          ✓ {statusQuery.data?.displayAccount ?? t("m.wallet.verified_account")}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.box, { borderColor: colors.hairline, backgroundColor: colors.surfaceRaised }]}>
      <Text style={[styles.heading, { color: colors.text }]}>{t("m.wallet.payout_account_1_verify")}</Text>
      <Text style={[styles.body, { color: colors.textMuted }]}>
        {t("m.wallet.we_send_1_to_your_account")}
      </Text>

      <ScrollBankPicker bankCode={bankCode} onChange={setBankCode} colors={colors} t={t} />

      <TextInput
        value={accountNum}
        onChangeText={setAccountNum}
        placeholder={t("m.wallet.account_number_no_dashes")}
        keyboardType="number-pad"
        placeholderTextColor={colors.textMuted}
        style={[styles.input, { borderColor: colors.hairline, color: colors.text }]}
      />

      {!sent ? (
        <FolkButton label={busy ? t("m.common.sending") : t("m.wallet.send_1_verification")} onPress={() => void send()} loading={busy} />
      ) : (
        <>
          <TextInput
            value={code}
            onChangeText={(t) => setCode(t.replace(/\D/g, "").slice(0, 4))}
            placeholder={t("m.wallet.4_digit_code")}
            keyboardType="number-pad"
            placeholderTextColor={colors.textMuted}
            style={[styles.input, { borderColor: colors.hairline, color: colors.text }]}
          />
          <FolkButton label={busy ? t("m.wallet.verifying") : t("m.wallet.confirm_code")} onPress={() => void verify()} loading={busy} />
        </>
      )}

      {msg ? <Text style={[styles.msg, { color: colors.textMuted }]}>{msg}</Text> : null}
      {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
    </View>
  );
}

function ScrollBankPicker({
  bankCode,
  onChange,
  colors,
  t,
}: {
  bankCode: string;
  onChange: (code: string) => void;
  colors: ThemeColors;
  t: TFn;
}) {
  return (
    <View style={stylesBank.row}>
      {BANKS.map((b) => (
        <Text
          key={b.code}
          onPress={() => onChange(b.code)}
          style={[
            stylesBank.chip,
            {
              borderColor: bankCode === b.code ? colors.cobalt : colors.hairline,
              color: bankCode === b.code ? colors.cobalt : colors.textMuted,
            },
          ]}
        >
          {bankLabel(b.code, t)}
        </Text>
      ))}
    </View>
  );
}

const stylesBank = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: spacing.sm },
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12,
    fontWeight: "700",
  },
});

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
    body: { fontSize: 12, fontWeight: "600", lineHeight: 18 },
    input: {
      borderWidth: 1,
      borderRadius: 12,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      fontSize: 15,
      fontWeight: "600",
    },
    msg: { fontSize: 12, fontWeight: "600" },
    error: { fontSize: 12, fontWeight: "700" },
  });
}
