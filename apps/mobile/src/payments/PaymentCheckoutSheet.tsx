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

const RETURN_PREFIX = Linking.createURL("payment/success");

type Props = {
  visible: boolean;
  body: CheckoutBody;
  onClose: () => void;
  onSuccess: (result: { type: string; alreadyPaid?: boolean }) => void;
};

function formatAmount(type: CheckoutBody["type"], amount: number) {
  if (type === "PREMIUM") return `$${(amount / 100).toFixed(2)}`;
  return `${amount.toLocaleString("ko-KR")}원`;
}

export function PaymentCheckoutSheet({ visible, body, onClose, onSuccess }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [loading, setLoading] = useState(false);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");
  const [orderId, setOrderId] = useState<string | null>(null);
  const [methods, setMethods] = useState<PaymentMethodItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setError("");
    setLoading(true);
    void prepareCheckoutPayment(body)
      .then((res) => {
        setOrderId(res.orderId);
        setMethods(res.methods);
        const def = res.methods.find((m) => m.isDefault) ?? res.methods[0];
        setSelectedId(def?.id ?? null);
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : "결제 준비에 실패했습니다.");
      })
      .finally(() => setLoading(false));
  }, [visible, body]);

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
    const finalized = await finalizeCheckoutPayment(returnedOrderId);
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
      setError(e instanceof Error ? e.message : "결제에 실패했습니다.");
    } finally {
      setPaying(false);
    }
  }

  async function payWithNewCard() {
    setPaying(true);
    setError("");
    try {
      const { checkoutUrl } = await startCheckoutRedirect(body);
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
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>{body.orderName}</Text>
          <Text style={[styles.amount, { color: colors.text }]}>
            {formatAmount(body.type, body.amount)}
          </Text>

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

          <View style={styles.actions}>
            <FolkButton label="취소" variant="ghost" onPress={onClose} disabled={paying} />
            {methods.length > 0 ? (
              <FolkButton
                label={paying ? "결제 중…" : "선택한 카드로 결제"}
                onPress={() => void paySelected()}
                loading={paying}
                disabled={!selectedId || loading}
              />
            ) : (
              <FolkButton
                label={paying ? "이동 중…" : "새 카드로 결제"}
                onPress={() => void payWithNewCard()}
                loading={paying}
                disabled={loading}
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
    error: { fontSize: 13, fontWeight: "700", marginTop: spacing.sm },
    actions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
  });
}
