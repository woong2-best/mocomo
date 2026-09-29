import { useMemo } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fetchMarketOrderDetail } from "@/api/commerce-market";
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
  });
}
