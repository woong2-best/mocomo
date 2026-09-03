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
import type { MarketplaceCheckoutBody, DirectTradeSnapshot } from "@/api/star-market";
import {
  confirmDirectTradeCheckout,
  prepareDirectTradeCheckout,
} from "@/api/star-market";
import { FolkButton } from "@/ui/FolkButton";
import { useTheme } from "@/theme/ThemeContext";
import { spacing, type ThemeColors } from "@/theme/tokens";
import { formatPrice } from "@/lib/money";

type Props = {
  visible: boolean;
  listingId: string;
  body: MarketplaceCheckoutBody;
  onClose: () => void;
  onSuccess: () => void;
};

export function DirectTradePaymentSheet({
  visible,
  listingId,
  body,
  onClose,
  onSuccess,
}: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  const [orderId, setOrderId] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<DirectTradeSnapshot | null>(null);

  useEffect(() => {
    if (!visible) return;
    setError("");
    setLoading(true);
    void prepareDirectTradeCheckout(listingId, body)
      .then((res) => {
        setOrderId(res.marketplaceOrderId);
        setSnapshot(res.directTradeSnapshot);
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : "직거래 주문을 만들 수 없습니다.");
      })
      .finally(() => setLoading(false));
  }, [visible, listingId, body]);

  async function confirmPaid() {
    if (!orderId) return;
    setConfirming(true);
    setError("");
    try {
      await confirmDirectTradeCheckout(listingId, orderId);
      onSuccess();
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "확인에 실패했습니다.");
    } finally {
      setConfirming(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: colors.surfaceRaised }]}>
          <Text style={[styles.title, { color: colors.text }]}>무통장 직거래</Text>

          {loading ? (
            <ActivityIndicator style={{ marginVertical: spacing.lg }} color={colors.terracotta} />
          ) : snapshot ? (
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={[styles.notice, { backgroundColor: `${colors.terracotta}18` }]}>
                <Text style={[styles.noticeText, { color: colors.text }]}>{snapshot.notice}</Text>
              </View>

              <View style={[styles.card, { borderColor: colors.hairline }]}>
                <Text style={[styles.seller, { color: colors.text }]}>{snapshot.sellerDisplayName}</Text>
                <InfoRow label="은행" value={snapshot.bankName} colors={colors} />
                <InfoRow label="계좌번호" value={snapshot.accountNumber} colors={colors} mono />
                <InfoRow label="예금주" value={snapshot.accountHolder} colors={colors} />
                {snapshot.contactPhone ? (
                  <InfoRow label="연락처" value={snapshot.contactPhone} colors={colors} />
                ) : null}
                <View style={styles.amountRow}>
                  <Text style={{ color: colors.textMuted, fontWeight: "700" }}>송금 금액</Text>
                  <Text style={[styles.amount, { color: colors.cobalt }]}>
                    {formatPrice(snapshot.amount, snapshot.currency)}
                  </Text>
                </View>
                <Text style={[styles.feeNote, { color: colors.textMuted }]}>
                  플랫폼 수수료 0원 · 입금 확인은 판매자와 직접 진행
                </Text>
              </View>
            </ScrollView>
          ) : null}

          {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}

          <View style={styles.actions}>
            <FolkButton label="닫기" variant="ghost" onPress={onClose} disabled={confirming} />
            <FolkButton
              label={confirming ? "처리 중…" : "송금 완료 표시"}
              onPress={() => void confirmPaid()}
              loading={confirming}
              disabled={!orderId || loading}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

function InfoRow({
  label,
  value,
  colors,
  mono,
}: {
  label: string;
  value: string;
  colors: ThemeColors;
  mono?: boolean;
}) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8, marginTop: 8 }}>
      <Text style={{ color: colors.textMuted, fontWeight: "600", fontSize: 13 }}>{label}</Text>
      <Text
        style={{
          color: colors.text,
          fontWeight: "800",
          fontSize: 13,
          fontFamily: mono ? "monospace" : undefined,
          flexShrink: 1,
          textAlign: "right",
        }}
      >
        {value}
      </Text>
    </View>
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
    notice: { borderRadius: 12, padding: spacing.md, marginBottom: spacing.md },
    noticeText: { fontSize: 13, fontWeight: "600", lineHeight: 20 },
    card: {
      borderWidth: 1,
      borderRadius: 16,
      padding: spacing.md,
      marginBottom: spacing.md,
    },
    seller: { fontSize: 16, fontWeight: "900" },
    amountRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: spacing.md,
      paddingTop: spacing.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.hairline,
    },
    amount: { fontSize: 22, fontWeight: "900" },
    feeNote: { fontSize: 11, fontWeight: "600", marginTop: spacing.sm, lineHeight: 16 },
    error: { fontSize: 13, fontWeight: "700", marginTop: spacing.sm },
    actions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
  });
}
