import { useMemo, useState } from "react";
import { ActivityIndicator, Linking, StyleSheet, Text, View } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchSettlementStatus } from "@/api/settlement";
import { apiRequest } from "@/api/client";
import { FolkButton } from "@/ui/FolkButton";
import { useTheme } from "@/theme/ThemeContext";
import { spacing, type ThemeColors } from "@/theme/tokens";

async function startExpressConnect(requestCardPayments = false) {
  return apiRequest<{ url: string }>("/api/mobile/settlements/connect-account", {
    method: "POST",
    body: { requestCardPayments },
    auth: true,
  });
}

async function openExpressDashboard() {
  return apiRequest<{ url: string }>("/api/mobile/settlements/connect-dashboard", {
    method: "POST",
    auth: true,
  });
}

export function StripeConnectPanel({ onConnected }: { onConnected?: () => void }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const queryClient = useQueryClient();
  const statusQuery = useQuery({ queryKey: ["mobile-settlement"], queryFn: fetchSettlementStatus });

  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const data = statusQuery.data;
  const linked = !!data?.registered || !!data?.payoutsEnabled;
  const connected = !!data?.payoutsEnabled;

  async function openOnboarding() {
    setBusy(true);
    setError("");
    try {
      const res = await startExpressConnect(false);
      await Linking.openURL(res.url);
      onConnected?.();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Stripe 연동을 시작할 수 없습니다.");
    } finally {
      setBusy(false);
    }
  }

  async function openDashboard() {
    setBusy(true);
    setError("");
    try {
      const res = await openExpressDashboard();
      await Linking.openURL(res.url);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Stripe 대시보드를 열 수 없습니다.");
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
      <Text style={[styles.body, { color: colors.textMuted }]}>
        Stripe의 안전한 글로벌 정산망을 통해 본인 명의의 현지 은행 계좌를 연동합니다.
      </Text>

      {connected && data?.profile ? (
        <View style={[styles.okBox, { borderColor: colors.success }]}>
          <Text style={[styles.okText, { color: colors.success }]}>✓ Reward 정산 등록 완료</Text>
          <Text style={[styles.body, { color: colors.textMuted }]}>
            {data.profile.legalName} · ****{data.profile.accountNumberLast4}
          </Text>
        </View>
      ) : linked ? (
        <Text style={[styles.body, { color: colors.cobalt }]}>
          Stripe 온보딩을 이어서 완료해 주세요.
        </Text>
      ) : null}

      <FolkButton
        label={
          busy
            ? "Stripe 열기…"
            : linked
              ? "연동 완료 · 계좌 정보 수정하기"
              : "Stripe 정산 계좌 연동하기"
        }
        onPress={() => void (linked ? openDashboard() : openOnboarding())}
        loading={busy}
      />

      {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}

      <FolkButton
        label="상태 새로고침"
        variant="secondary"
        onPress={() => void queryClient.invalidateQueries({ queryKey: ["mobile-settlement"] })}
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
      gap: spacing.sm,
    },
    heading: { fontSize: 16, fontWeight: "900" },
    body: { fontSize: 13, lineHeight: 18, fontWeight: "600" },
    okBox: { borderWidth: 1, borderRadius: 12, padding: spacing.sm, gap: 4 },
    okText: { fontWeight: "800", fontSize: 14 },
    error: { fontSize: 13, fontWeight: "600" },
  });
}
