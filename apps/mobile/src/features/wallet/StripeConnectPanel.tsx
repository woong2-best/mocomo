import { useMemo, useState } from "react";
import { ActivityIndicator, Linking, StyleSheet, Text, View } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchStripeConnectDashboard,
  fetchStripeConnectStatus,
  startStripeConnectOnboarding,
} from "@/api/stripe-connect";
import { FolkButton } from "@/ui/FolkButton";
import { useTheme } from "@/theme/ThemeContext";
import { spacing, type ThemeColors } from "@/theme/tokens";

export function StripeConnectPanel({ onConnected }: { onConnected?: () => void }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const queryClient = useQueryClient();
  const statusQuery = useQuery({ queryKey: ["mobile-stripe-connect"], queryFn: fetchStripeConnectStatus });

  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<"onboard" | "dashboard" | null>(null);

  const connected = !!statusQuery.data?.stripeOnboardingCompleted;

  async function connect() {
    setBusy("onboard");
    setError("");
    setMsg("");
    try {
      const res = await startStripeConnectOnboarding();
      if ("error" in res && typeof res.error === "string") {
        setError(res.error);
        return;
      }
      if (res.url) {
        await Linking.openURL(res.url);
        setMsg("Stripe에서 정산 계좌 설정을 완료한 뒤 돌아와 새로고침해 주세요.");
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Stripe 연결에 실패했습니다.");
    } finally {
      setBusy(null);
    }
  }

  async function openDashboard() {
    setBusy("dashboard");
    setError("");
    try {
      const res = await fetchStripeConnectDashboard();
      if ("error" in res && typeof res.error === "string") {
        setError(res.error);
        return;
      }
      if (res.url) await Linking.openURL(res.url);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Stripe 대시보드를 열 수 없습니다.");
    } finally {
      setBusy(null);
    }
  }

  function refresh() {
    void queryClient.invalidateQueries({ queryKey: ["mobile-stripe-connect"] });
    void queryClient.invalidateQueries({ queryKey: ["mobile-wallet"] });
    onConnected?.();
  }

  if (statusQuery.isLoading) {
    return <ActivityIndicator color={colors.terracotta} style={{ marginVertical: spacing.md }} />;
  }

  return (
    <View style={[styles.box, { borderColor: colors.hairline, backgroundColor: colors.surfaceRaised }]}>
      <Text style={[styles.heading, { color: colors.text }]}>수익 정산 계좌 연동</Text>

      {connected ? (
        <>
          <View style={[styles.okBox, { borderColor: colors.success }]}>
            <Text style={[styles.okText, { color: colors.success }]}>✓ Stripe 정산 계좌 연동 완료</Text>
            <Text style={[styles.body, { color: colors.textMuted }]}>
              수익은 Stripe Connect를 통해 등록한 계좌로 정산됩니다.
            </Text>
          </View>
          <FolkButton
            label={busy === "dashboard" ? "열기 중…" : "정산 계좌/내역 관리"}
            onPress={() => void openDashboard()}
            loading={busy === "dashboard"}
          />
        </>
      ) : (
        <>
          <Text style={[styles.body, { color: colors.textMuted }]}>
            Stripe Connect Express로 본인 확인 및 정산 계좌를 등록합니다.
          </Text>
          <FolkButton
            label={busy === "onboard" ? "연결 중…" : "Stripe 정산 계좌 연결하기"}
            onPress={() => void connect()}
            loading={busy === "onboard"}
          />
        </>
      )}

      {msg ? <Text style={[styles.body, { color: colors.textMuted }]}>{msg}</Text> : null}
      {error ? <Text style={[styles.body, { color: colors.danger }]}>{error}</Text> : null}

      <FolkButton label="상태 새로고침" variant="ghost" onPress={refresh} />
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
