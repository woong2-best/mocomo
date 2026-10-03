import { StyleSheet, Text, View } from "react-native";
import { PayButton } from "@/payments/PayButton";
import { formatUsd } from "@/lib/money";
import { useI18n } from "@/i18n/I18nProvider";

type Props = {
  mediaId?: string;
  priceKrw: number;
  label?: string;
  paymentsEnabled?: boolean;
  username?: string;
  postId?: string;
  variant?: "button" | "label";
  onPurchaseSuccess?: () => void;
};

export function PurchasePostMediaButton({
  mediaId,
  priceKrw,
  label,
  paymentsEnabled = false,
  username,
  postId,
  variant = "button",
  onPurchaseSuccess,
}: Props) {
  const { t } = useI18n();
  const payLabel = label ?? t("m.media.pay");
  if (!mediaId) return null;

  if (!paymentsEnabled) {
    return (
      <Text style={styles.disabled}>
        {variant === "label" ? payLabel : t("m.media.available_to_buy_once_payments_are")}
      </Text>
    );
  }

  if (variant === "label") {
    return (
      <View style={styles.labelWrap}>
        <PayButton
          type="POST_MEDIA"
          amount={priceKrw}
          orderName={payLabel}
          metadata={{ mediaId, username, postId }}
          label={payLabel}
          variant="primary"
          onSuccess={onPurchaseSuccess}
        />
      </View>
    );
  }

  return (
    <PayButton
      type="POST_MEDIA"
      amount={priceKrw}
      orderName={payLabel}
      metadata={{ mediaId, username, postId }}
      label={`${formatUsd(priceKrw)} · ${payLabel}`}
      onSuccess={onPurchaseSuccess}
    />
  );
}

const styles = StyleSheet.create({
  labelWrap: { alignItems: "center", minWidth: 160 },
  disabled: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
    paddingHorizontal: 8,
  },
});
