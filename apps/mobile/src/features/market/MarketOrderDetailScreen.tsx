import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fetchMarketOrderDetail, submitMarketOrderDispute } from "@/api/commerce-market";
import { showIslandError, showIslandSuccess } from "@/ui/IslandToast";
import { AppHeader } from "@/ui/AppHeader";
import { Screen } from "@/ui/Screen";
import { useTheme } from "@/theme/ThemeContext";
import { radii, spacing, type ThemeColors } from "@/theme/tokens";
import type { RootStackParamList } from "@/navigation/types";
import { formatUsd } from "@/lib/money";
import { shipCountryLabel } from "@/lib/marketplace-shipping";
import { useI18n } from "@/i18n/I18nProvider";
import type { UsedUiText } from "@/features/marketplace/used-catalog";

function orderStatusLabel(status: string, u: UsedUiText): string {
  switch (status) {
    case "AWAITING_PAYMENT":
      return u("결제대기", "Awaiting payment");
    case "PAID":
      return u("결제 완료", "Paid");
    case "PREPARING":
      return u("상품 준비 중", "Preparing");
    case "SHIPPED":
      return u("발송 완료", "Shipped");
    case "DELIVERED":
      return u("배송 완료", "Delivered");
    case "CONFIRMED":
      return u("구매 확정", "Confirmed");
    case "SETTLED":
      return u("정산 완료", "Settled");
    case "CANCELLED":
      return u("취소", "Cancelled");
    case "REFUND_REQUESTED":
      return u("환불요청", "Refund requested");
    case "REFUNDED":
      return u("환불완료", "Refunded");
    case "DISPUTED":
      return u("분쟁", "Disputed");
    case "ADMIN_REVIEW":
      return u("관리자 검토", "Admin review");
    default:
      return status;
  }
}

const DISPUTE_REASONS = [
  { code: "NOT_RECEIVED", ko: "물품 미발송·미도착", en: "Not shipped / not received" },
  { code: "COUNTERFEIT", ko: "가품·위조품", en: "Counterfeit" },
  { code: "SELLER_NO_RESPONSE", ko: "연락 두절", en: "No response" },
  { code: "SCAM_FRAUD_ACCOUNT", ko: "사기 계좌·허위 입금", en: "Fraud account" },
  { code: "OTHER", ko: "기타 사기·피해", en: "Other fraud" },
] as const;

function MarketOrderDisputePanel({ orderId, u }: { orderId: string; u: UsedUiText }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const client = useQueryClient();
  const [reasonCode, setReasonCode] = useState<string>("NOT_RECEIVED");
  const [detail, setDetail] = useState("");
  const [evidence, setEvidence] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      submitMarketOrderDispute(orderId, {
        reason: detail.trim(),
        reasonCode,
        evidenceUrls: evidence
          .split(/[,\n]+/)
          .map((s) => s.trim())
          .filter(Boolean)
          .slice(0, 12),
      }),
    onSuccess: async () => {
      showIslandSuccess(u("분쟁이 접수되었습니다.", "Dispute submitted."));
      await client.invalidateQueries({ queryKey: ["mobile-market-order", orderId] });
    },
    onError: () => showIslandError(u("오류", "Error"), u("접수에 실패했습니다.", "Could not submit.")),
  });

  return (
    <View style={styles.disputeBox}>
      <Text style={styles.sectionTitle}>{u("분쟁 신청 / 사기 신고", "Dispute / fraud report")}</Text>
      <Text style={styles.disputeHint}>
        {u(
          "거래·채팅 기록이 자동 저장됩니다.",
          "Trade and chat logs are saved automatically."
        )}
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
        {DISPUTE_REASONS.map((r) => {
          const active = reasonCode === r.code;
          return (
            <Pressable
              key={r.code}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => setReasonCode(r.code)}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{u(r.ko, r.en)}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <TextInput
        style={styles.input}
        multiline
        value={detail}
        onChangeText={setDetail}
        placeholder={u("피해 경위를 입력하세요", "Describe what happened")}
        placeholderTextColor={colors.textMuted}
      />
      <TextInput
        style={styles.input}
        value={evidence}
        onChangeText={setEvidence}
        placeholder={u("증거 URL (쉼표·줄바꿈)", "Evidence URLs")}
        placeholderTextColor={colors.textMuted}
      />
      <Pressable
        style={[styles.submitBtn, mutation.isPending && { opacity: 0.6 }]}
        disabled={mutation.isPending || !detail.trim()}
        onPress={() => mutation.mutate()}
      >
        <Text style={styles.submitText}>{u("분쟁 접수", "Submit")}</Text>
      </Pressable>
    </View>
  );
}

export function MarketOrderDetailScreen() {
  const { u, t } = useI18n();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, "MarketOrderDetail">>();
  const insets = useSafeAreaInsets();

  const query = useQuery({
    queryKey: ["mobile-market-order", route.params.orderId],
    queryFn: () => fetchMarketOrderDetail(route.params.orderId),
  });

  const order = query.data?.order;
  const openDispute =
    order?.isBuyer &&
    ["PAID", "PREPARING", "SHIPPED", "DELIVERED", "CONFIRMED"].includes(order.status) &&
    !(order.disputes ?? []).some((d) => ["OPEN", "EVIDENCE", "REVIEWING"].includes(d.status));

  return (
    <Screen>
      <AppHeader title={u("주문 상세", "Order details")} leftLabel={t("common.back")} onLeftPress={() => navigation.goBack()} />
      {query.isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.terracotta} />
      ) : !order ? (
        <Text style={styles.muted}>{u("주문을 불러오지 못했습니다.", "Could not load order.")}</Text>
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: insets.bottom + 24, gap: 14 }}>
          <Text style={styles.status}>{orderStatusLabel(order.status, u)}</Text>
          <Text style={styles.total}>
            {formatUsd(order.subtotalAmount + order.shippingAmount)}
          </Text>
          <Text style={styles.meta}>
            {new Date(order.createdAt).toLocaleString("ko-KR")}
            {order.isBuyer && order.seller ? u(` · 판매자 @${order.seller.username}`, ` · Seller @${order.seller.username}`) : ""}
            {order.isSeller && order.buyer ? u(` · 구매자 @${order.buyer.username}`, ` · Buyer @${order.buyer.username}`) : ""}
          </Text>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{u("상품", "Items")}</Text>
            {order.items.map((item) => (
              <Pressable
                key={item.id}
                style={styles.lineCard}
                onPress={() => navigation.navigate("StarMarketDetail", { id: item.listingId })}
              >
                <Text style={styles.lineTitle}>{item.titleSnapshot}</Text>
                <Text style={styles.lineMeta}>
                  {formatUsd(item.unitPrice)} × {item.quantity} · {item.listingType}
                </Text>
              </Pressable>
            ))}
          </View>

          {order.shipAddress1 ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t("market.shippingAddress")}</Text>
              <Text style={styles.bodyText}>
                {order.shipName}
                {"\n"}
                {order.shipCountry ? shipCountryLabel(order.shipCountry) : ""}{" "}
                {order.shipPostal ?? ""}
                {"\n"}
                {order.shipAddress1}
                {order.shipAddress2 ? `\n${order.shipAddress2}` : ""}
              </Text>
            </View>
          ) : null}

          {order.shipment ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{u("배송", "Shipping")}</Text>
              <Text style={styles.bodyText}>
                {order.shipment.status}
                {order.shipment.carrier ? ` · ${order.shipment.carrier}` : ""}
                {order.shipment.trackingNumber ? `\n${order.shipment.trackingNumber}` : ""}
              </Text>
            </View>
          ) : null}

          {order.downloads.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{u("디지털 다운로드", "Digital download")}</Text>
              {order.downloads.map((d) => (
                <Text key={d.id} style={styles.bodyText} numberOfLines={2}>
                  {d.fileUrl}
                </Text>
              ))}
            </View>
          ) : null}

          {openDispute ? <MarketOrderDisputePanel orderId={order.id} u={u} /> : null}
        </ScrollView>
      )}
    </Screen>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    muted: { textAlign: "center", color: colors.textMuted, marginTop: 40, fontWeight: "600" },
    status: { fontSize: 14, fontWeight: "800", color: colors.cobalt },
    total: { fontSize: 24, fontWeight: "900", color: colors.text },
    meta: { fontSize: 12, color: colors.textMuted, fontWeight: "600" },
    section: { gap: 8 },
    sectionTitle: { fontSize: 13, fontWeight: "800", color: colors.textMuted },
    lineCard: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.lg,
      padding: spacing.md,
      backgroundColor: colors.surfaceRaised,
    },
    lineTitle: { fontWeight: "800", color: colors.text },
    lineMeta: { marginTop: 4, fontSize: 12, color: colors.textMuted, fontWeight: "600" },
    bodyText: { fontSize: 14, lineHeight: 20, color: colors.text },
    disputeBox: {
      gap: 8,
      padding: spacing.md,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.terracotta,
      backgroundColor: `${colors.terracotta}12`,
    },
    disputeHint: { fontSize: 11, color: colors.textMuted, fontWeight: "600" },
    chipRow: { flexDirection: "row", gap: 8, paddingVertical: 4 },
    chip: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceRaised,
    },
    chipActive: { borderColor: colors.terracotta, backgroundColor: colors.background },
    chipText: { fontSize: 11, fontWeight: "700", color: colors.textMuted },
    chipTextActive: { color: colors.text },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.md,
      padding: spacing.sm,
      minHeight: 44,
      color: colors.text,
      fontSize: 14,
    },
    submitBtn: {
      alignItems: "center",
      paddingVertical: 12,
      borderRadius: radii.md,
      backgroundColor: colors.terracotta,
    },
    submitText: { color: "#fff", fontWeight: "800", fontSize: 14 },
  });
}
