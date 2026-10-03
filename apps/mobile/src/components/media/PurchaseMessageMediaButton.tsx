import { StyleSheet, Text, View } from "react-native";
import { PayButton } from "@/payments/PayButton";
import { formatUsd } from "@/lib/money";
import { useI18n } from "@/i18n/I18nProvider";

type Props = {
  attachmentId: string;
  priceKrw: number;
  sellerUsername?: string;
  paymentsEnabled?: boolean;
  onPurchaseSuccess?: () => void;
};

export function PurchaseMessageMediaButton({
  attachmentId,
  priceKrw,
  sellerUsername,
  paymentsEnabled = true,
  onPurchaseSuccess,
}: Props) {
  const { t } = useI18n();
  if (!paymentsEnabled) {
    return <Text style={styles.disabled}>{t("m.media.available_to_buy_once_payments_are")}</Text>;
  }

  return (
    <View style={styles.wrap}>
      <PayButton
        type="MESSAGE_MEDIA"
        amount={priceKrw}
        orderName={t("m.payments.fan_art_purchase")}
        metadata={{ attachmentId, username: sellerUsername }}
        label={t("m.media.formatusd_pay", { formatUsd: String(formatUsd(priceKrw)) })}
        variant="primary"
        onSuccess={onPurchaseSuccess}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", minWidth: 160 },
  disabled: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
    paddingHorizontal: 8,
  },
});
