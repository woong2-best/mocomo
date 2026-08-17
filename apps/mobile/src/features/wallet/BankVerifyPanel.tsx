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

const BANKS = [
  { code: "004", label: "KB국민" },
  { code: "088", label: "신한" },
  { code: "020", label: "우리" },
  { code: "081", label: "하나" },
  { code: "011", label: "NH농협" },
  { code: "090", label: "카카오" },
  { code: "092", label: "토스" },
];

export function BankVerifyPanel({ onVerified }: { onVerified?: () => void }) {
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
      setMsg(res.message ?? "1원을 보냈습니다.");
      if ("devCode" in res && res.devCode) setCode(res.devCode);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "요청에 실패했습니다.");
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
      setMsg(res.displayAccount ? `${res.displayAccount} 인증 완료` : "인증이 완료되었습니다.");
      void queryClient.invalidateQueries({ queryKey: ["mobile-bank-status"] });
      void queryClient.invalidateQueries({ queryKey: ["mobile-wallet"] });
      onVerified?.();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "인증에 실패했습니다.");
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
        <Text style={[styles.heading, { color: colors.text }]}>수익 입금 계좌</Text>
        <Text style={[styles.body, { color: colors.success }]}>
          ✓ {statusQuery.data?.displayAccount ?? "인증된 계좌"}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.box, { borderColor: colors.hairline, backgroundColor: colors.surfaceRaised }]}>
      <Text style={[styles.heading, { color: colors.text }]}>수익 입금 계좌 (1원 인증)</Text>
      <Text style={[styles.body, { color: colors.textMuted }]}>
        본인 명의 국내 계좌만 등록할 수 있습니다. 입금통장메모 4자리 코드를 입력하세요.
      </Text>

      <ScrollBankPicker bankCode={bankCode} onChange={setBankCode} colors={colors} />

      <TextInput
        value={accountNum}
        onChangeText={setAccountNum}
        placeholder="계좌번호 (- 없이)"
        keyboardType="number-pad"
        placeholderTextColor={colors.textMuted}
        style={[styles.input, { borderColor: colors.hairline, color: colors.text }]}
      />

      {!sent ? (
        <FolkButton label={busy ? "전송 중…" : "1원 인증 요청"} onPress={() => void send()} loading={busy} />
      ) : (
        <>
          <TextInput
            value={code}
            onChangeText={setCode}
            placeholder="4자리 코드"
            autoCapitalize="characters"
            placeholderTextColor={colors.textMuted}
            style={[styles.input, { borderColor: colors.hairline, color: colors.text }]}
          />
          <FolkButton label={busy ? "확인 중…" : "코드 확인"} onPress={() => void verify()} loading={busy} />
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
}: {
  bankCode: string;
  onChange: (code: string) => void;
  colors: ThemeColors;
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
          {b.label}
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
