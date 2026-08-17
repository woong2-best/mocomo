import { StyleSheet, Text, View } from "react-native";
import { PayButton } from "@/payments/PayButton";

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
  label = "결제하기",
  paymentsEnabled = false,
  username,
  postId,
  variant = "button",
  onPurchaseSuccess,
}: Props) {
  if (!mediaId) return null;

  if (!paymentsEnabled) {
    return (
      <Text style={styles.disabled}>
        {variant === "label" ? label : "결제 연동 후 구매할 수 있습니다."}
      </Text>
    );
  }

  if (variant === "label") {
    return (
      <View style={styles.labelWrap}>
        <PayButton
          type="POST_MEDIA"
          amount={priceKrw}
          orderName={label}
          metadata={{ mediaId, username, postId }}
          label={label}
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
      orderName={label}
      metadata={{ mediaId, username, postId }}
      label={`${priceKrw.toLocaleString()}원 · ${label}`}
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
