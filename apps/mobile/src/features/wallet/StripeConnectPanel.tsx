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
  const { t } = useI18n();
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
      setError(e instanceof Error ? e.message : t("m.wallet.could_not_start_stripe_setup"));
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
      setError(e instanceof Error ? e.message : t("m.wallet.could_not_open_stripe_dashboard"));
    } finally {
      setBusy(false);
    }
  }

  if (statusQuery.isLoading) {
    return <ActivityIndicator color={colors.terracotta} style={{ marginVertical: spacing.md }} />;
  }

  return (
    <View style={[styles.box, { borderColor: colors.hairline, backgroundColor: colors.surfaceRaised }]}>
      <Text style={[styles.heading, { color: colors.text }]}>{t("m.wallet.reward_payout_setup")}</Text>
      <Text style={[styles.body, { color: colors.textMuted }]}>
        {t("m.wallet.complete_identity_bank_and_tax_info")}
      </Text>
      <Text style={[styles.body, { color: colors.textMuted }]}>
        {t("m.wallet.link_a_bank_account_in_a")}
      </Text>
      <Text style={[styles.body, { color: colors.textMuted }]}>
        {t("m.wallet.connect_stripe_to_receive_moco_tips")}
      </Text>
      <Pressable onPress={() => void Linking.openURL("https://stripe.com/global")}>
        <Text style={[styles.link, { color: colors.cobalt }]}>
          {t("m.wallet.stripe_payout_countries_requirements")}
        </Text>
      </Pressable>
      <Text style={[styles.body, { color: data?.payoutsEnabled ? colors.success : colors.cobalt }]}>
        {t("m.wallet.payouts")}:{" "}
        {data?.payoutsEnabled
          ? t("m.wallet.enabled_payouts_enabled")
          : t("m.wallet.disabled_stripe_not_complete")}
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
          {t("m.wallet.legacy_payout_accounts_are_deprecated_re")}
        </Text>
      ) : null}

      {data?.taxRequirementsDue ? (
        <Text style={[styles.body, { color: colors.cobalt }]}>
          {t("m.wallet.complete_w_9_w_8ben_tax")}
        </Text>
      ) : null}

      {!data?.hasConnectAccount || data?.needsExpressMigration ? (
        <View style={{ gap: 6 }}>
          <Text style={[styles.body, { color: colors.text }]}>{t("m.wallet.payout_bank_country")}</Text>
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
            {t("m.wallet.choose_where_your_bank_account_is")}
          </Text>
        </View>
      ) : null}

      {connected && data?.profile && !data.needsExpressMigration && !data.taxRequirementsDue ? (
        <View style={[styles.okBox, { borderColor: colors.success }]}>
          <Text style={[styles.okText, { color: colors.success }]}>{t("m.wallet.reward_payout_ready")}</Text>
          <Text style={[styles.body, { color: colors.textMuted }]}>
            {data.profile.legalName} · ****{data.profile.accountNumberLast4}
          </Text>
        </View>
      ) : linked && !data?.needsExpressMigration ? (
        <Text style={[styles.body, { color: colors.cobalt }]}>
          {t("m.wallet.finish_stripe_onboarding")}
        </Text>
      ) : null}

      <FolkButton
        label={
          busy
            ? t("m.wallet.opening_stripe")
            : data?.needsExpressMigration
              ? t("m.wallet.reconnect_with_express")
              : !linked
                ? t("m.wallet.connect_stripe_express_payout")
                : detailsSubmitted
                  ? t("m.wallet.connected_edit_payout_details")
                  : t("m.wallet.continue_stripe_onboarding")
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
          <Text style={[styles.heading, { color: colors.text }]}>{t("m.wallet.payout_bank_country")}</Text>
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
        label={t("m.wallet.refresh_status")}
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
