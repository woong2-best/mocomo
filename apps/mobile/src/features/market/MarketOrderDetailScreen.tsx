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

function orderStatusLabel(status: string, t: UsedUiText): string {
  switch (status) {
    case "AWAITING_PAYMENT":
      return t("m.market.awaiting_payment");
    case "PAID":
      return t("m.market.paid");
    case "PREPARING":
      return t("m.market.preparing");
    case "SHIPPED":
      return t("m.market.shipped");
    case "DELIVERED":
      return t("m.market.delivered");
    case "CONFIRMED":
      return t("m.market.confirmed");
    case "SETTLED":
      return t("m.market.settled");
    case "CANCELLED":
      return t("m.common.cancelled");
    case "REFUND_REQUESTED":
      return t("m.market.refund_requested");
    case "REFUNDED":
      return t("m.market.refunded");
    case "DISPUTED":
      return t("m.market.disputed");
    case "ADMIN_REVIEW":
      return t("m.market.admin_review");
    default:
      return status;
  }
}

const DISPUTE_REASONS = [
  { code: "NOT_RECEIVED", key: "m.market.not_shipped_not_received" },
  { code: "COUNTERFEIT", key: "m.market.counterfeit" },
  { code: "SELLER_NO_RESPONSE", key: "m.market.no_response" },
  { code: "SCAM_FRAUD_ACCOUNT", key: "m.market.fraud_account" },
  { code: "OTHER", key: "m.market.other_fraud" },
] as const;

function MarketOrderDisputePanel({ orderId, t }: { orderId: string; t: UsedUiText }) {
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
      showIslandSuccess(t("m.market.dispute_submitted"));
      await client.invalidateQueries({ queryKey: ["mobile-market-order", orderId] });
    },
    onError: () => showIslandError(t("m.common.error"), t("m.market.could_not_submit")),
  });

  return (
    <View style={styles.disputeBox}>
      <Text style={styles.sectionTitle}>{t("m.market.dispute_fraud_report")}</Text>
      <Text style={styles.disputeHint}>
        {t("m.market.trade_and_chat_logs_are_saved")}
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
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{t(r.key)}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <TextInput
        style={styles.input}
        multiline
        value={detail}
        onChangeText={setDetail}
        placeholder={t("m.market.describe_what_happened")}
        placeholderTextColor={colors.textMuted}
      />
      <TextInput
        style={styles.input}
        value={evidence}
        onChangeText={setEvidence}
        placeholder={t("m.market.evidence_urls")}
        placeholderTextColor={colors.textMuted}
      />
      <Pressable
        style={[styles.submitBtn, mutation.isPending && { opacity: 0.6 }]}
        disabled={mutation.isPending || !detail.trim()}
        onPress={() => mutation.mutate()}
      >
        <Text style={styles.submitText}>{t("m.market.submit")}</Text>
      </Pressable>
    </View>
  );
}

export function MarketOrderDetailScreen() {
  const { t } = useI18n();
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
  return (
    <Screen>
      <AppHeader title={t("m.market.order_details")} leftLabel={t("common.back")} onLeftPress={() => navigation.goBack()} />
      {query.isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.terracotta} />
      ) : !order ? (
        <Text style={styles.muted}>{t("m.market.could_not_load_order")}</Text>
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: insets.bottom + 24, gap: 14 }}>
          <Text style={styles.status}>{orderStatusLabel(order.status, t)}</Text>
          <Text style={styles.total}>
            {formatUsd(order.subtotalAmount + order.shippingAmount)}
          </Text>
          <Text style={styles.meta}>
            {new Date(order.createdAt).toLocaleString("ko-KR")}
            {order.isBuyer && order.seller ? t("m.market.seller_username", { username: String(order.seller.username) }) : ""}
            {order.isSeller && order.buyer ? t("m.market.buyer_username", { username: String(order.buyer.username) }) : ""}
          </Text>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("m.market.items")}</Text>
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
              <Text style={styles.sectionTitle}>{t("m.common.shipping")}</Text>
              <Text style={styles.bodyText}>
                {order.shipment.status}
                {order.shipment.carrier ? ` · ${order.shipment.carrier}` : ""}
                {order.shipment.trackingNumber ? `\n${order.shipment.trackingNumber}` : ""}
              </Text>
            </View>
          ) : null}

          {order.downloads.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t("m.market.digital_download")}</Text>
              {order.downloads.map((d) => (
                <Text key={d.id} style={styles.bodyText} numberOfLines={2}>
                  {d.fileUrl}
                </Text>
              ))}
            </View>
          ) : null}

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
