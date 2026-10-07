import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import type { CheckoutBody } from "@/api/checkout";
import { confirmCheckout } from "@/api/checkout";
import {
  finalizeCheckoutPayment,
  payCheckoutWithSavedCard,
  prepareCheckoutPayment,
  startCheckoutRedirect,
} from "@/api/checkout-payment";
import type { PaymentMethodItem } from "@/features/wallet/wallet-card-builders";
import { FolkButton } from "@/ui/FolkButton";
import { useTheme } from "@/theme/ThemeContext";
import { spacing, type ThemeColors } from "@/theme/tokens";
import { formatUsd } from "@/lib/money";
import { STRIPE_OVERSEAS_PAYMENT_NOTICE } from "@/lib/stripe-payment-notice";
import {
  PAID_CONTENT_USAGE_NOTICE_BODY,
  PAID_CONTENT_USAGE_NOTICE_TITLE,
  requiresPaidContentUsageNotice,
} from "@/lib/paid-content-usage-notice";
import { openSubscriptionCheckout } from "@/api/subscriptions";
import {
  RECURRING_DONATION_CHECKBOX_LABEL_KO,
  RECURRING_DONATION_CHECKOUT_NOTICE_KO,
} from "@/lib/recurring-donation-terms";
import {
  PURCHASE_CHARGEBACK_TERMS_BULLETS,
  PURCHASE_CHARGEBACK_TERMS_CHECKBOX_LABEL,
  PURCHASE_CHARGEBACK_TERMS_TITLE,
  PURCHASE_CHARGEBACK_TERMS_VERSION,
} from "@/lib/purchase-chargeback-terms";
import { useI18n } from "@/i18n/I18nProvider";
import { useMoneyAgeGate } from "@/hooks/useMoneyAgeGate";

const RETURN_PREFIX = Linking.createURL("payment/success");

type Props = {
  visible: boolean;
  body: CheckoutBody;
  onClose: () => void;
  onSuccess: (result: { type: string; alreadyPaid?: boolean }) => void;
};

function formatAmount(_type: CheckoutBody["type"], amount: number) {
  return formatUsd(amount);
}

export function PaymentCheckoutSheet({ visible, body, onClose, onSuccess }: Props) {
  const { t, locale } = useI18n();
  const { colors } = useTheme();
  const moneyAge = useMoneyAgeGate();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [loading, setLoading] = useState(false);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");
  const [orderId, setOrderId] = useState<string | null>(null);
  const [methods, setMethods] = useState<PaymentMethodItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [purchaseTermsAccepted, setPurchaseTermsAccepted] = useState(false);
  const [recurringDonationTermsAccepted, setRecurringDonationTermsAccepted] = useState(false);
  const isGemTopup = body.type === "GEM_TOPUP";
  const isRecurringSubscription = body.type === "CREATOR_SUBSCRIPTION";

  const checkoutKey = useMemo(
    () =>
      JSON.stringify({
        type: body.type,
        amount: body.amount,
        orderName: body.orderName,
        metadata: body.metadata,
      }),
    [body.amount, body.metadata, body.orderName, body.type]
  );

  useEffect(() => {
    if (!visible) return;
    setPurchaseTermsAccepted(false);
    setRecurringDonationTermsAccepted(false);
    setError("");
    if (isRecurringSubscription) {
      setError(t("m.payments.creator_subscriptions_are_no_longer_avai"));
      setLoading(false);
      return;
    }
    setLoading(true);
    void prepareCheckoutPayment(body)
      .then((res) => {
        setOrderId(res.orderId);
        setMethods(res.methods ?? []);
        const def = res.methods.find((m) => m.isDefault) ?? res.methods[0];
        setSelectedId(def?.id ?? null);
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : t("m.payments.could_not_prepare_payment"));
      })
      .finally(() => setLoading(false));
  }, [visible, checkoutKey, body, isRecurringSubscription, t]);

  async function startRecurringSubscription() {
    if (!(await moneyAge.ensureMoneyAge())) return;
    if (!purchaseTermsAccepted) {
      setError(t("m.payments.accept_the_terms_before_paying"));
      return;
    }
    if (!recurringDonationTermsAccepted) {
      setError(t("m.payments.accept_the_subscription_terms"));
      return;
    }
    setPaying(true);
    setError("");
    try {
      const creatorId = String(body.metadata.creatorId ?? "");
      const username = String(body.metadata.username ?? "");
      await openSubscriptionCheckout({ creatorId, username, amount: body.amount });
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t("m.payments.could_not_start_subscription"));
    } finally {
      setPaying(false);
    }
  }

  async function openAuthenticate(authenticateUrl: string, oid: string) {
    const result = await WebBrowser.openAuthSessionAsync(authenticateUrl, RETURN_PREFIX, {
      preferEphemeralSession: false,
      showInRecents: true,
    });
    if (result.type !== "success" || !result.url) {
      throw new Error(t("m.payments.card_verification_was_canceled"));
    }
    const parsed = new URL(result.url);
    const returnedOrderId = parsed.searchParams.get("order_id") ?? oid;
    const finalized = await finalizeCheckoutPayment(returnedOrderId);
    if (!("success" in finalized) || !finalized.success) {
      throw new Error(t("m.payments.payment_confirmation_failed"));
    }
    onSuccess({ type: finalized.type, alreadyPaid: finalized.alreadyPaid });
  }

  async function paySelected() {
    if (!(await moneyAge.ensureMoneyAge())) return;
    if (!orderId || !selectedId) {
      setError(t("m.payments.select_a_card"));
      return;
    }
    if (!purchaseTermsAccepted) {
      setError(t("m.payments.accept_the_terms_before_paying"));
      return;
    }
    setPaying(true);
    setError("");
    try {
      const res = await payCheckoutWithSavedCard(orderId, selectedId);
      if ("requiresAction" in res && res.requiresAction) {
        await openAuthenticate(res.authenticateUrl, res.orderId);
        onClose();
        return;
      }
      if ("success" in res && res.success) {
        onSuccess({ type: res.type, alreadyPaid: res.alreadyPaid });
        onClose();
        return;
      }
      if ("error" in res && res.error) {
        setError(res.error);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t("m.payments.payment_failed"));
    } finally {
      setPaying(false);
    }
  }

  async function payWithNewCard() {
    if (!(await moneyAge.ensureMoneyAge())) return;
    if (!purchaseTermsAccepted) {
      setError(t("m.payments.accept_the_terms_before_paying"));
      return;
    }
    setPaying(true);
    setError("");
    try {
      if (isGemTopup) {
        throw new Error("MOCO can be purchased only on the website.");
      }
      const { checkoutUrl } = await startCheckoutRedirect(body);
      const result = await WebBrowser.openAuthSessionAsync(checkoutUrl, RETURN_PREFIX, {
        preferEphemeralSession: false,
        showInRecents: true,
      });
      if (result.type === "cancel" || result.type === "dismiss") {
        throw new Error(t("m.payments.payment_was_canceled"));
      }
      if (result.type !== "success" || !result.url) {
        throw new Error(t("m.payments.could_not_complete_payment"));
      }
      let sessionId: string | null = null;
      try {
        sessionId = new URL(result.url).searchParams.get("session_id");
      } catch {
        const m = /[?&]session_id=([^&]+)/.exec(result.url);
        sessionId = m?.[1] ? decodeURIComponent(m[1]) : null;
      }
      if (!sessionId) throw new Error(t("m.payments.could_not_verify_payment_session"));
      const confirmed = await confirmCheckout(sessionId);
      onSuccess({ type: confirmed.type, alreadyPaid: confirmed.alreadyPaid });
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t("m.payments.payment_failed"));
    } finally {
      setPaying(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: colors.surfaceRaised }]}>
          <Text style={[styles.title, { color: colors.text }]}>{t("m.payments.choose_payment_method")}</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>{body.orderName}</Text>
          <Text style={[styles.amount, { color: colors.text }]}>
            {formatAmount(body.type, body.amount)}
          </Text>

          {/* Sits above every pay affordance so no purchase can be completed
              without the personal-viewing-licence terms on screen. */}
          {isRecurringSubscription ? (
            <View style={[styles.recurringNotice, { borderColor: `${colors.cobalt}66` }]}>
              <Text style={[styles.recurringTitle, { color: colors.text }]}>{t("m.payments.subscription_info")}</Text>
              <Text style={[styles.recurringBody, { color: colors.textMuted }]}>
                {RECURRING_DONATION_CHECKOUT_NOTICE_KO}
              </Text>
              <Pressable
                onPress={() => setRecurringDonationTermsAccepted((v) => !v)}
                style={styles.termsCheckRow}
              >
                <View
                  style={[
                    styles.checkbox,
                    {
                      borderColor: recurringDonationTermsAccepted ? colors.cobalt : colors.hairline,
                      backgroundColor: recurringDonationTermsAccepted
                        ? `${colors.cobalt}33`
                        : "transparent",
                    },
                  ]}
                />
                <Text style={[styles.termsCheckLabel, { color: colors.text }]}>
                  {RECURRING_DONATION_CHECKBOX_LABEL_KO}
                </Text>
              </Pressable>
            </View>
          ) : null}

          {!isRecurringSubscription && requiresPaidContentUsageNotice(body.type) ? (
            <View style={[styles.usageNotice, { borderColor: `${colors.terracotta}66` }]}>
              <Text style={[styles.usageNoticeTitle, { color: colors.text }]}>
                {PAID_CONTENT_USAGE_NOTICE_TITLE}
              </Text>
              <Text style={[styles.usageNoticeBody, { color: colors.textMuted }]}>
                {PAID_CONTENT_USAGE_NOTICE_BODY}
              </Text>
            </View>
          ) : null}

          {isGemTopup ? (
            <View style={[styles.termsNotice, { borderColor: `${colors.terracotta}66` }]}>
              <Text style={[styles.termsTitle, { color: colors.text }]}>
                MOCO can be purchased only on the website.
              </Text>
              <Text style={[styles.termsBullet, { color: colors.textMuted }]}>
                In-app purchases are not offered. Use mocomo.net to buy MOCO.
              </Text>
            </View>
          ) : (
          <View style={[styles.termsNotice, { borderColor: `${colors.terracotta}66` }]}>
            {(
              <>
                <Text style={[styles.termsTitle, { color: colors.text }]}>
                  {PURCHASE_CHARGEBACK_TERMS_TITLE}{" "}
                  <Text style={{ color: colors.textMuted, fontSize: 11 }}>v{PURCHASE_CHARGEBACK_TERMS_VERSION}</Text>
                </Text>
                {PURCHASE_CHARGEBACK_TERMS_BULLETS.map((line) => (
                  <Text key={line} style={[styles.termsBullet, { color: colors.textMuted }]}>
                    • {line}
                  </Text>
                ))}
              </>
            )}
            <Pressable
              onPress={() => setPurchaseTermsAccepted((v) => !v)}
              style={styles.termsCheckRow}
            >
              <View
                style={[
                  styles.checkbox,
                  {
                    borderColor: purchaseTermsAccepted ? colors.cobalt : colors.hairline,
                    backgroundColor: purchaseTermsAccepted ? `${colors.cobalt}33` : "transparent",
                  },
                ]}
              />
              <Text style={[styles.termsCheckLabel, { color: colors.text }]}>
                {isGemTopup ? t("m.payments.i_agree_to_the_terms_above") : PURCHASE_CHARGEBACK_TERMS_CHECKBOX_LABEL}
              </Text>
            </Pressable>
          </View>
          )}

          {isGemTopup ? (
            <FolkButton label={t("toast.cancel")} variant="ghost" onPress={onClose} />
          ) : isRecurringSubscription ? (
            <>
              {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
              <View style={styles.actions}>
                <FolkButton label={t("toast.cancel")} variant="ghost" onPress={onClose} disabled={paying} />
                <FolkButton
                  label={paying ? t("m.common.opening") : t("m.payments.start_subscription")}
                  onPress={() => void startRecurringSubscription()}
                  loading={paying}
                  disabled={!purchaseTermsAccepted || !recurringDonationTermsAccepted}
                />
              </View>
            </>
          ) : loading ? (
            <ActivityIndicator style={{ marginVertical: spacing.lg }} color={colors.terracotta} />
          ) : (
            <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
              {methods.map((pm) => (
                <Pressable
                  key={pm.id}
                  onPress={() => setSelectedId(pm.id)}
                  style={[
                    styles.cardRow,
                    {
                      borderColor: selectedId === pm.id ? colors.cobalt : colors.hairline,
                      backgroundColor: selectedId === pm.id ? `${colors.cobalt}18` : colors.surface,
                    },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cardTitle, { color: colors.text }]}>
                      {pm.brand} •••• {pm.last4}
                      {pm.isDefault ? t("m.payments.default") : ""}
                    </Text>
                    <Text style={[styles.cardMeta, { color: colors.textMuted }]}>
                      {String(pm.expMonth).padStart(2, "0")}/{String(pm.expYear).slice(-2)}
                    </Text>
                  </View>
                </Pressable>
              ))}
              <Pressable
                onPress={() => void payWithNewCard()}
                style={[styles.cardRow, styles.newCardRow, { borderColor: colors.hairline }]}
              >
                <Text style={[styles.cardTitle, { color: colors.text }]}>{t("m.payments.pay_with_new_card")}</Text>
                <Text style={[styles.cardMeta, { color: colors.textMuted }]}>
                  {t("m.payments.enter_card_in_stripe_can_save")}
                </Text>
              </Pressable>
            </ScrollView>
          )}

          {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}

          <Text style={[styles.notice, { color: colors.textMuted }]}>{STRIPE_OVERSEAS_PAYMENT_NOTICE}</Text>

          <View style={styles.actions}>
            <FolkButton label={t("toast.cancel")} variant="ghost" onPress={onClose} disabled={paying} />
            {methods.length > 0 ? (
              <FolkButton
                label={paying ? t("m.payments.paying") : t("m.payments.pay_with_selected_card")}
                onPress={() => void paySelected()}
                loading={paying}
                disabled={!selectedId || loading || !purchaseTermsAccepted}
              />
            ) : (
              <FolkButton
                label={paying ? t("m.common.opening") : t("m.payments.pay_with_new_card_2")}
                onPress={() => void payWithNewCard()}
                loading={paying}
                disabled={loading || !purchaseTermsAccepted}
              />
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      justifyContent: "flex-end",
      backgroundColor: "rgba(0,0,0,0.45)",
    },
    sheet: {
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: spacing.lg,
      maxHeight: "78%",
    },
    title: { fontSize: 20, fontWeight: "900" },
    subtitle: { fontSize: 13, fontWeight: "600", marginTop: 4 },
    amount: { fontSize: 26, fontWeight: "900", marginTop: spacing.sm, marginBottom: spacing.md },
    list: { maxHeight: 260 },
    cardRow: {
      borderWidth: 1,
      borderRadius: 14,
      padding: spacing.md,
      marginBottom: spacing.sm,
    },
    newCardRow: {
      borderStyle: "dashed",
      minHeight: 56,
    },
    cardTitle: { fontWeight: "800", fontSize: 15 },
    cardMeta: { fontSize: 12, marginTop: 2, fontWeight: "600" },
    usageNotice: {
      borderWidth: 1,
      borderRadius: 14,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      marginBottom: spacing.md,
      backgroundColor: "rgba(200, 120, 60, 0.10)",
    },
    usageNoticeTitle: { fontSize: 13, fontWeight: "800", lineHeight: 18 },
    usageNoticeBody: { fontSize: 12, fontWeight: "600", lineHeight: 17, marginTop: 4 },
    termsNotice: {
      borderWidth: 1,
      borderRadius: 14,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      marginBottom: spacing.md,
      backgroundColor: "rgba(200, 120, 60, 0.10)",
    },
    termsTitle: { fontSize: 13, fontWeight: "800", lineHeight: 18 },
    termsBullet: { fontSize: 11, fontWeight: "600", lineHeight: 16, marginTop: 4 },
    termsCheckRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm, marginTop: spacing.sm },
    checkbox: { width: 18, height: 18, borderWidth: 1.5, borderRadius: 4, marginTop: 1 },
    termsCheckLabel: { flex: 1, fontSize: 11, fontWeight: "700", lineHeight: 16 },
    recurringNotice: {
      borderWidth: 1,
      borderRadius: 14,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      marginBottom: spacing.md,
      backgroundColor: "rgba(100, 80, 200, 0.08)",
    },
    recurringTitle: { fontSize: 13, fontWeight: "800", lineHeight: 18 },
    recurringBody: { fontSize: 11, fontWeight: "600", lineHeight: 16, marginTop: 4 },
    error: { fontSize: 13, fontWeight: "700", marginTop: spacing.sm },
    notice: { fontSize: 11, fontWeight: "600", lineHeight: 16, marginTop: spacing.sm },
    actions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
  });
}
