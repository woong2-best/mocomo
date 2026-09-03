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
import { confirmCheckout } from "@/api/checkout";
import type { MarketplaceCheckoutBody } from "@/api/star-market";
import {
  finalizeMarketplacePayment,
  payMarketplaceWithSavedCard,
  prepareMarketplacePayment,
  startMarketplaceCheckoutRedirect,
} from "@/api/star-market";
import type { PaymentMethodItem } from "@/features/wallet/wallet-card-builders";
import { FolkButton } from "@/ui/FolkButton";
import { useTheme } from "@/theme/ThemeContext";
import { spacing, type ThemeColors } from "@/theme/tokens";
import { formatUsd } from "@/lib/money";
import { STRIPE_OVERSEAS_PAYMENT_NOTICE } from "@/lib/stripe-payment-notice";
import {
  PURCHASE_CHARGEBACK_TERMS_BULLETS,
  PURCHASE_CHARGEBACK_TERMS_CHECKBOX_LABEL,
  PURCHASE_CHARGEBACK_TERMS_TITLE,
  PURCHASE_CHARGEBACK_TERMS_VERSION,
} from "@/lib/purchase-chargeback-terms";

const RETURN_PREFIX = Linking.createURL("payment/success");

type Props = {
  visible: boolean;
  listingId: string;
  body: MarketplaceCheckoutBody;
  onClose: () => void;
  onSuccess: (result: { type: string; alreadyPaid?: boolean }) => void;
};

export function MarketplacePaymentSheet({
  visible,
  listingId,
  body,
  onClose,
  onSuccess,
}: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [loading, setLoading] = useState(false);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");
  const [orderId, setOrderId] = useState<string | null>(null);
  const [amount, setAmount] = useState(0);
  const [orderName, setOrderName] = useState("");
  const [methods, setMethods] = useState<PaymentMethodItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [purchaseTermsAccepted, setPurchaseTermsAccepted] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setPurchaseTermsAccepted(false);
    setError("");
    setLoading(true);
    void prepareMarketplacePayment(listingId, body)
      .then((res) => {
        setOrderId(res.orderId);
        setAmount(res.amount);
        setOrderName(res.orderName);
        setMethods(res.methods);
        const def = res.methods.find((m) => m.isDefault) ?? res.methods[0];
        setSelectedId(def?.id ?? null);
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : "결제 준비에 실패했습니다.");
      })
      .finally(() => setLoading(false));
  }, [visible, listingId, body]);

  async function openAuthenticate(authenticateUrl: string, oid: string) {
    const result = await WebBrowser.openAuthSessionAsync(authenticateUrl, RETURN_PREFIX, {
      preferEphemeralSession: false,
      showInRecents: true,
    });
    if (result.type !== "success" || !result.url) {
      throw new Error("카드 인증이 취소되었습니다.");
    }
    const parsed = new URL(result.url);
    const returnedOrderId = parsed.searchParams.get("order_id") ?? oid;
    const finalized = await finalizeMarketplacePayment(listingId, returnedOrderId);
    if (!("success" in finalized) || !finalized.success) {
      throw new Error("결제 확인에 실패했습니다.");
    }
    onSuccess({ type: finalized.type, alreadyPaid: finalized.alreadyPaid });
  }

  async function paySelected() {
    if (!orderId || !selectedId) {
      setError("카드를 선택해 주세요.");
      return;
    }
    if (!purchaseTermsAccepted) {
      setError("결제 전 이용약관에 동의해 주세요.");
      return;
    }
    setPaying(true);
    setError("");
    try {
      const res = await payMarketplaceWithSavedCard(listingId, orderId, selectedId);
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
      setError(e instanceof Error ? e.message : "결제에 실패했습니다.");
    } finally {
      setPaying(false);
    }
  }

  async function payWithNewCard() {
    if (!orderId) return;
    if (!purchaseTermsAccepted) {
      setError("결제 전 이용약관에 동의해 주세요.");
      return;
    }
    setPaying(true);
    setError("");
    try {
      const { checkoutUrl } = await startMarketplaceCheckoutRedirect(listingId, orderId);
      const result = await WebBrowser.openAuthSessionAsync(checkoutUrl, RETURN_PREFIX, {
        preferEphemeralSession: false,
        showInRecents: true,
      });
      if (result.type === "cancel" || result.type === "dismiss") {
        throw new Error("결제가 취소되었습니다.");
      }
      if (result.type !== "success" || !result.url) {
        throw new Error("결제를 완료하지 못했습니다.");
      }
      let sessionId: string | null = null;
      try {
        sessionId = new URL(result.url).searchParams.get("session_id");
      } catch {
        const m = /[?&]session_id=([^&]+)/.exec(result.url);
        sessionId = m?.[1] ? decodeURIComponent(m[1]) : null;
      }
      if (!sessionId) throw new Error("결제 세션을 확인하지 못했습니다.");
      const confirmed = await confirmCheckout(sessionId);
      onSuccess({ type: confirmed.type, alreadyPaid: confirmed.alreadyPaid });
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "결제에 실패했습니다.");
    } finally {
      setPaying(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: colors.surfaceRaised }]}>
          <Text style={[styles.title, { color: colors.text }]}>결제 수단 선택</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>{orderName}</Text>
          <Text style={[styles.amount, { color: colors.text }]}>
            {amount > 0 ? formatUsd(amount) : "—"}
          </Text>

          <View style={[styles.termsNotice, { borderColor: `${colors.terracotta}66` }]}>
            <Text style={[styles.termsTitle, { color: colors.text }]}>
              {PURCHASE_CHARGEBACK_TERMS_TITLE}{" "}
              <Text style={{ color: colors.textMuted, fontSize: 11 }}>v{PURCHASE_CHARGEBACK_TERMS_VERSION}</Text>
            </Text>
            {PURCHASE_CHARGEBACK_TERMS_BULLETS.map((line) => (
              <Text key={line} style={[styles.termsBullet, { color: colors.textMuted }]}>
                • {line}
              </Text>
            ))}
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
                {PURCHASE_CHARGEBACK_TERMS_CHECKBOX_LABEL}
              </Text>
            </Pressable>
          </View>

          {loading ? (
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
                      {pm.isDefault ? " · 기본" : ""}
                    </Text>
                    <Text style={[styles.cardMeta, { color: colors.textMuted }]}>
                      {String(pm.expMonth).padStart(2, "0")}/{String(pm.expYear).slice(-2)}
                    </Text>
                  </View>
                </Pressable>
              ))}
              <Pressable
                onPress={() => void payWithNewCard()}
                style={[styles.cardRow, { borderColor: colors.hairline, borderStyle: "dashed" }]}
              >
                <Text style={[styles.cardTitle, { color: colors.text }]}>+ 새 카드로 결제</Text>
                <Text style={[styles.cardMeta, { color: colors.textMuted }]}>
                  Stripe에서 카드 입력 · 저장 가능
                </Text>
              </Pressable>
            </ScrollView>
          )}

          {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}

          <Text style={[styles.notice, { color: colors.textMuted }]}>{STRIPE_OVERSEAS_PAYMENT_NOTICE}</Text>

          <View style={styles.actions}>
            <FolkButton label="취소" variant="ghost" onPress={onClose} disabled={paying} />
            {methods.length > 0 ? (
              <FolkButton
                label={paying ? "결제 중…" : "선택한 카드로 결제"}
                onPress={() => void paySelected()}
                loading={paying}
                disabled={!selectedId || loading || !purchaseTermsAccepted}
              />
            ) : (
              <FolkButton
                label={paying ? "이동 중…" : "새 카드로 결제"}
                onPress={() => void payWithNewCard()}
                loading={paying}
                disabled={loading || !orderId || !purchaseTermsAccepted}
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
    cardTitle: { fontWeight: "800", fontSize: 15 },
    cardMeta: { fontSize: 12, marginTop: 2, fontWeight: "600" },
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
    error: { fontSize: 13, fontWeight: "700", marginTop: spacing.sm },
    notice: { fontSize: 11, fontWeight: "600", lineHeight: 16, marginTop: spacing.sm },
    actions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
  });
}
