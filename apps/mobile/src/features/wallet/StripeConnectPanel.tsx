import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchSettlementStatus } from "@/api/settlement";
import { apiRequest } from "@/api/client";
import { FolkButton } from "@/ui/FolkButton";
import { useTheme } from "@/theme/ThemeContext";
import { spacing, type ThemeColors } from "@/theme/tokens";
import {
  DEFAULT_EXPRESS_PAYOUT_COUNTRY,
  STRIPE_EXPRESS_SUPPORTED_COUNTRIES,
} from "@/lib/stripe-express-countries";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useI18n } from "@/i18n/I18nProvider";

async function startExpressConnect(payoutCountry: string, requestCardPayments = false) {
  return apiRequest<{ url: string }>("/api/mobile/settlements/connect-account", {
    method: "POST",
    body: { requestCardPayments, payoutCountry },
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
  const { u, t } = useI18n();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const queryClient = useQueryClient();
  const statusQuery = useQuery({ queryKey: ["mobile-settlement"], queryFn: fetchSettlementStatus });

  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [payoutCountry, setPayoutCountry] = useState(DEFAULT_EXPRESS_PAYOUT_COUNTRY);
  const [pickerOpen, setPickerOpen] = useState(false);

  const data = statusQuery.data;
  const linked =
    (!!data?.registered || !!data?.payoutsEnabled || !!data?.hasConnectAccount) &&
    !data?.needsExpressMigration;
  const detailsSubmitted = !!data?.payoutDashboard?.detailsSubmitted && !data?.needsExpressMigration;
  const connected = !!data?.payoutsEnabled && !data?.needsExpressMigration && !data?.taxRequirementsDue;

  async function openOnboarding() {
    setBusy(true);
    setError("");
    try {
      const res = await startExpressConnect(payoutCountry, false);
      await Linking.openURL(res.url);
      onConnected?.();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : u("Stripe 연동을 시작할 수 없습니다.", "Could not start Stripe setup."));
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
      setError(e instanceof Error ? e.message : u("Stripe 대시보드를 열 수 없습니다.", "Could not open Stripe dashboard."));
    } finally {
      setBusy(false);
    }
  }

  if (statusQuery.isLoading) {
    return <ActivityIndicator color={colors.terracotta} style={{ marginVertical: spacing.md }} />;
  }

  return (
    <View style={[styles.box, { borderColor: colors.hairline, backgroundColor: colors.surfaceRaised }]}>
      <Text style={[styles.heading, { color: colors.text }]}>{u("Reward 정산 등록", "Reward payout setup")}</Text>
      <Text style={[styles.body, { color: colors.textMuted }]}>
        {u(
          "Stripe Express 온보딩에서 본인 확인·계좌·세무 정보(W-9/W-8BEN)를 등록합니다.",
          "Complete identity, bank, and tax info (W-9/W-8BEN) in Stripe Express."
        )}
      </Text>
      <Text style={[styles.body, { color: colors.textMuted }]}>
        {u(
          "• 해외 Stripe 지원 국가의 은행 계좌를 보유하고 계신 경우 정산 계좌 연동이 가능합니다.",
          "• Link a bank account in a Stripe-supported country."
        )}
      </Text>
      <Text style={[styles.body, { color: colors.textMuted }]}>
        {u(
          "• 정산 계좌(Stripe)를 연동하셔야 팬들로부터 MOCO 후원을 수령할 수 있습니다.",
          "• Connect Stripe to receive MOCO tips from fans."
        )}
      </Text>
      <Pressable onPress={() => void Linking.openURL("https://stripe.com/global")}>
        <Text style={[styles.link, { color: colors.cobalt }]}>
          {u("Stripe 정산 지원 국가 및 계좌 조건 확인하기", "Stripe payout countries & requirements")}
        </Text>
      </Pressable>
      <Text style={[styles.body, { color: data?.payoutsEnabled ? colors.success : colors.cobalt }]}>
        {u("정산 수령", "Payouts")}:{" "}
        {data?.payoutsEnabled
          ? u("가능 (payouts_enabled)", "Enabled (payouts_enabled)")
          : u("불가 — Stripe 연동 미완료", "Disabled — Stripe not complete")}
      </Text>
      {!data?.payoutsEnabled
        ? data?.payoutDashboard?.reasons.map((reason) => (
            <Text key={reason.code} style={[styles.body, { color: colors.cobalt }]}>
              • {reason.message}
            </Text>
          ))
        : null}

      {data?.needsExpressMigration ? (
        <Text style={[styles.body, { color: colors.danger }]}>
          {u(
            "이전 정산 계정은 더 이상 지원되지 않습니다. Express로 다시 연동해 주세요.",
            "Legacy payout accounts are deprecated. Reconnect with Express."
          )}
        </Text>
      ) : null}

      {data?.taxRequirementsDue ? (
        <Text style={[styles.body, { color: colors.cobalt }]}>
          {u("세무 정보가 미비합니다. Stripe에서 W-9/W-8BEN을 완료해 주세요.", "Complete W-9/W-8BEN tax forms in Stripe.")}
        </Text>
      ) : null}

      {!data?.hasConnectAccount || data?.needsExpressMigration ? (
        <View style={{ gap: 6 }}>
          <Text style={[styles.body, { color: colors.text }]}>{u("정산받을 계좌 국가", "Payout bank country")}</Text>
          <Pressable
            onPress={() => setPickerOpen(true)}
            style={[styles.picker, { borderColor: colors.hairline, backgroundColor: colors.surface }]}
          >
            <Text style={[styles.body, { color: colors.text }]}>
              {STRIPE_EXPRESS_SUPPORTED_COUNTRIES.find((country) => country.code === payoutCountry)?.name ??
                payoutCountry}
            </Text>
          </Pressable>
          <Text style={[styles.body, { color: colors.textMuted }]}>
            {u(
              "은행 계좌가 있는 국가를 선택하세요. 한국에 거주해도 미국(US) 등 해외 계좌로 정산받을 수 있습니다.",
              "Choose where your bank account is. You can use US or other overseas accounts while living in Korea."
            )}
          </Text>
        </View>
      ) : null}

      {connected && data?.profile && !data.needsExpressMigration && !data.taxRequirementsDue ? (
        <View style={[styles.okBox, { borderColor: colors.success }]}>
          <Text style={[styles.okText, { color: colors.success }]}>{u("✓ Reward 정산 등록 완료", "✓ Reward payout ready")}</Text>
          <Text style={[styles.body, { color: colors.textMuted }]}>
            {data.profile.legalName} · ****{data.profile.accountNumberLast4}
          </Text>
        </View>
      ) : linked && !data?.needsExpressMigration ? (
        <Text style={[styles.body, { color: colors.cobalt }]}>
          {u("Stripe 온보딩을 이어서 완료해 주세요.", "Finish Stripe onboarding.")}
        </Text>
      ) : null}

      <FolkButton
        label={
          busy
            ? u("Stripe 열기…", "Opening Stripe…")
            : data?.needsExpressMigration
              ? u("Express로 다시 연동하기", "Reconnect with Express")
              : !linked
                ? u("Stripe Express 정산 계좌 연동하기", "Connect Stripe Express payout")
                : detailsSubmitted
                  ? u("연동 완료 · 계좌 정보 수정하기", "Connected · edit payout details")
                  : u("Stripe 온보딩 이어서 진행하기", "Continue Stripe onboarding")
        }
        onPress={() => void (detailsSubmitted ? openDashboard() : openOnboarding())}
        loading={busy}
      />

      {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}

      <Modal visible={pickerOpen} animationType="slide" onRequestClose={() => setPickerOpen(false)}>
        <View
          style={[
            styles.modal,
            {
              backgroundColor: colors.surface,
              paddingTop: insets.top + spacing.md,
              paddingBottom: insets.bottom + spacing.md,
            },
          ]}
        >
          <Text style={[styles.heading, { color: colors.text }]}>{u("정산받을 계좌 국가", "Payout bank country")}</Text>
          <FlatList
            data={STRIPE_EXPRESS_SUPPORTED_COUNTRIES}
            keyExtractor={(item) => item.code}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => {
                  setPayoutCountry(item.code);
                  setPickerOpen(false);
                }}
                style={[styles.countryRow, { borderColor: colors.hairline }]}
              >
                <Text style={[styles.body, { color: item.code === payoutCountry ? colors.cobalt : colors.text }]}>
                  {item.name}
                </Text>
              </Pressable>
            )}
          />
          <FolkButton label={t("common.close")} variant="secondary" onPress={() => setPickerOpen(false)} />
        </View>
      </Modal>

      <FolkButton
        label={u("상태 새로고침", "Refresh status")}
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
    link: { fontSize: 13, fontWeight: "800", textDecorationLine: "underline" },
    okBox: { borderWidth: 1, borderRadius: 12, padding: spacing.sm, gap: 4 },
    okText: { fontWeight: "800", fontSize: 14 },
    error: { fontSize: 13, fontWeight: "600" },
    picker: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
    modal: { flex: 1, padding: spacing.md, paddingTop: spacing.lg, gap: spacing.sm },
    countryRow: { borderBottomWidth: 1, paddingVertical: 12 },
  });
}
