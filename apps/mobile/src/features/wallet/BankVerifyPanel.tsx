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

const BANKS = [
  { code: "004" },
  { code: "088" },
  { code: "020" },
  { code: "081" },
  { code: "011" },
  { code: "090" },
  { code: "092" },
];

function bankLabel(code: string, u: (ko: string, en: string) => string): string {
  switch (code) {
    case "004":
      return u("KB국민", "KB Kookmin");
    case "088":
      return u("신한", "Shinhan");
    case "020":
      return u("우리", "Woori");
    case "081":
      return u("하나", "Hana");
    case "011":
      return u("NH농협", "NH NongHyup");
    case "090":
      return u("카카오", "Kakao");
    case "092":
      return u("토스", "Toss");
    default:
      return code;
  }
}

export function BankVerifyPanel({ onVerified }: { onVerified?: () => void }) {
  const { u, t } = useI18n();
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
      setMsg(res.message ?? u("1원을 보냈습니다.", "We sent ₩1 to your account."));
      if ("devCode" in res && res.devCode) setCode(res.devCode);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : u("요청에 실패했습니다.", "Request failed."));
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
          ? u(`${res.displayAccount} 인증 완료`, `${res.displayAccount} verified`)
          : u("인증이 완료되었습니다.", "Verification complete.")
      );
      void queryClient.invalidateQueries({ queryKey: ["mobile-bank-status"] });
      void queryClient.invalidateQueries({ queryKey: ["mobile-wallet"] });
      onVerified?.();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : u("인증에 실패했습니다.", "Verification failed."));
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
        <Text style={[styles.heading, { color: colors.text }]}>{u("수익 입금 계좌", "Payout bank account")}</Text>
        <Text style={[styles.body, { color: colors.success }]}>
          ✓ {statusQuery.data?.displayAccount ?? u("인증된 계좌", "Verified account")}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.box, { borderColor: colors.hairline, backgroundColor: colors.surfaceRaised }]}>
      <Text style={[styles.heading, { color: colors.text }]}>{u("수익 입금 계좌 (1원 인증)", "Payout account (₩1 verify)")}</Text>
      <Text style={[styles.body, { color: colors.textMuted }]}>
        {u(
          "계좌로 1원을 보내드립니다. 입금통장메모에 표시된 4자리 숫자를 입력하세요. 계정당 계좌 하나, 인증 후 변경 불가. 하루 3회까지 요청 가능합니다.",
          "We send ₩1 to your account. Enter the 4-digit code from the transfer memo. One account per user, no changes after verify. Up to 3 requests per day."
        )}
      </Text>

      <ScrollBankPicker bankCode={bankCode} onChange={setBankCode} colors={colors} u={u} />

      <TextInput
        value={accountNum}
        onChangeText={setAccountNum}
        placeholder={u("계좌번호 (- 없이)", "Account number (no dashes)")}
        keyboardType="number-pad"
        placeholderTextColor={colors.textMuted}
        style={[styles.input, { borderColor: colors.hairline, color: colors.text }]}
      />

      {!sent ? (
        <FolkButton label={busy ? u("전송 중…", "Sending…") : u("1원 인증 요청", "Send ₩1 verification")} onPress={() => void send()} loading={busy} />
      ) : (
        <>
          <TextInput
            value={code}
            onChangeText={(t) => setCode(t.replace(/\D/g, "").slice(0, 4))}
            placeholder={u("4자리 숫자", "4-digit code")}
            keyboardType="number-pad"
            placeholderTextColor={colors.textMuted}
            style={[styles.input, { borderColor: colors.hairline, color: colors.text }]}
          />
          <FolkButton label={busy ? u("확인 중…", "Verifying…") : u("코드 확인", "Confirm code")} onPress={() => void verify()} loading={busy} />
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
  u,
}: {
  bankCode: string;
  onChange: (code: string) => void;
  colors: ThemeColors;
  u: (ko: string, en: string) => string;
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
          {bankLabel(b.code, u)}
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
