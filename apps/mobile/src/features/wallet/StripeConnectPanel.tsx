import { useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchSettlementStatus, registerSettlement } from "@/api/settlement";
import { FolkButton } from "@/ui/FolkButton";
import { useTheme } from "@/theme/ThemeContext";
import { spacing, type ThemeColors } from "@/theme/tokens";

export function StripeConnectPanel({ onConnected }: { onConnected?: () => void }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const queryClient = useQueryClient();
  const statusQuery = useQuery({ queryKey: ["mobile-settlement"], queryFn: fetchSettlementStatus });

  const [legalName, setLegalName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountHolderName, setAccountHolderName] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [bankCode, setBankCode] = useState("004");
  const [taxAccepted, setTaxAccepted] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const connected = !!statusQuery.data?.payoutsEnabled;

  async function submit() {
    setBusy(true);
    setError("");
    setMsg("");
    try {
      const res = await registerSettlement({
        countryCode: "KR",
        legalName,
        birthYear: 1990,
        birthMonth: 1,
        birthDay: 1,
        addressLine1,
        city,
        postalCode,
        accountNumber,
        accountHolderName,
        bankCode,
        taxAttestationAccepted: true,
      });
      if ("error" in res && typeof res.error === "string") {
        setError(res.error);
        return;
      }
      setMsg("Reward 정산 등록이 완료되었습니다.");
      void queryClient.invalidateQueries({ queryKey: ["mobile-settlement"] });
      onConnected?.();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "정산 등록에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  if (statusQuery.isLoading) {
    return <ActivityIndicator color={colors.terracotta} style={{ marginVertical: spacing.md }} />;
  }

  return (
    <View style={[styles.box, { borderColor: colors.hairline, backgroundColor: colors.surfaceRaised }]}>
      <Text style={[styles.heading, { color: colors.text }]}>Reward 정산 등록</Text>

      {connected && statusQuery.data?.profile ? (
        <View style={[styles.okBox, { borderColor: colors.success }]}>
          <Text style={[styles.okText, { color: colors.success }]}>✓ Reward 정산 등록 완료</Text>
          <Text style={[styles.body, { color: colors.textMuted }]}>
            {statusQuery.data.profile.legalName} · ****{statusQuery.data.profile.accountNumberLast4}
          </Text>
          <Text style={[styles.body, { color: colors.textMuted }]}>
            정산 MOCO {statusQuery.data.settlementMocoPoints.toLocaleString()} · 월말 자동 지급
          </Text>
        </View>
      ) : (
        <>
          <Text style={[styles.body, { color: colors.textMuted }]}>
            Stripe 방문 없이 계좌·본인 정보를 입력하면 Reward 정산이 등록됩니다.
          </Text>
          <Field label="실명" value={legalName} onChangeText={setLegalName} colors={colors} />
          <Field label="주소" value={addressLine1} onChangeText={setAddressLine1} colors={colors} />
          <Field label="도시" value={city} onChangeText={setCity} colors={colors} />
          <Field label="우편번호" value={postalCode} onChangeText={setPostalCode} colors={colors} />
          <Field label="은행코드" value={bankCode} onChangeText={setBankCode} colors={colors} />
          <Field label="계좌번호" value={accountNumber} onChangeText={setAccountNumber} colors={colors} />
          <Field label="예금주" value={accountHolderName} onChangeText={setAccountHolderName} colors={colors} />
          <FolkButton
            label={taxAccepted ? "W-8BEN 동의됨" : "W-8BEN 동의 (미국 거주자 아님)"}
            variant="ghost"
            onPress={() => setTaxAccepted((v) => !v)}
          />
          <FolkButton label={busy ? "등록 중…" : "Reward 정산 등록"} onPress={() => void submit()} loading={busy} disabled={!taxAccepted} />
        </>
      )}

      {msg ? <Text style={[styles.body, { color: colors.textMuted }]}>{msg}</Text> : null}
      {error ? <Text style={[styles.body, { color: colors.danger }]}>{error}</Text> : null}
    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
  colors,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  colors: ThemeColors;
}) {
  return (
    <View style={{ gap: 4 }}>
      <Text style={{ fontSize: 12, fontWeight: "700", color: colors.textMuted }}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        style={{
          borderWidth: 1,
          borderColor: colors.hairline,
          borderRadius: 10,
          paddingHorizontal: 12,
          paddingVertical: 10,
          color: colors.text,
          backgroundColor: colors.surface,
        }}
      />
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
    body: { fontSize: 12, fontWeight: "600", lineHeight: 18 },
    okBox: {
      borderWidth: 1,
      borderRadius: 12,
      padding: spacing.sm,
      gap: 4,
    },
    okText: { fontSize: 13, fontWeight: "800" },
  });
}
