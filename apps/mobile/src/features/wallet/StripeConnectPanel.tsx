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
  const linked =
    (!!data?.registered || !!data?.payoutsEnabled || !!data?.hasConnectAccount) &&
    !data?.needsExpressMigration;
  const connected = !!data?.payoutsEnabled && !data?.needsExpressMigration && !data?.taxRequirementsDue;

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
        Stripe Express 온보딩에서 본인 확인·계좌·세무 정보(W-9/W-8BEN)를 등록합니다.
      </Text>

      {data?.needsExpressMigration ? (
        <Text style={[styles.body, { color: colors.danger }]}>
          이전 정산 계정은 더 이상 지원되지 않습니다. Express로 다시 연동해 주세요.
        </Text>
      ) : null}

      {data?.taxRequirementsDue ? (
        <Text style={[styles.body, { color: colors.cobalt }]}>
          세무 정보가 미비합니다. Stripe에서 W-9/W-8BEN을 완료해 주세요.
        </Text>
      ) : null}

      {connected && data?.profile && !data.needsExpressMigration && !data.taxRequirementsDue ? (
        <View style={[styles.okBox, { borderColor: colors.success }]}>
          <Text style={[styles.okText, { color: colors.success }]}>✓ Reward 정산 등록 완료</Text>
          <Text style={[styles.body, { color: colors.textMuted }]}>
            {data.profile.legalName} · ****{data.profile.accountNumberLast4}
          </Text>
        </View>
      ) : linked && !data?.needsExpressMigration ? (
        <Text style={[styles.body, { color: colors.cobalt }]}>
          Stripe 온보딩을 이어서 완료해 주세요.
        </Text>
      ) : null}

      <FolkButton
        label={
          busy
            ? "Stripe 열기…"
            : data?.needsExpressMigration
              ? "Express로 다시 연동하기"
              : linked && !data?.taxRequirementsDue
                ? "연동 완료 · 계좌 정보 수정하기"
                : "Stripe Express 정산 계좌 연동하기"
        }
        onPress={() =>
          void (
            linked && !data?.needsExpressMigration && !data?.taxRequirementsDue
              ? openDashboard()
              : openOnboarding()
          )
        }
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
