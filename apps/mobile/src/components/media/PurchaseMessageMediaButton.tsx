import { StyleSheet, Text, View } from "react-native";
import { PayButton } from "@/payments/PayButton";
import { formatUsd } from "@/lib/money";

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
  if (!paymentsEnabled) {
    return <Text style={styles.disabled}>결제 연동 후 구매할 수 있습니다.</Text>;
  }

  return (
    <View style={styles.wrap}>
      <PayButton
        type="MESSAGE_MEDIA"
        amount={priceKrw}
        orderName="팬아트 구매"
        metadata={{ attachmentId, username: sellerUsername }}
        label={`${formatUsd(priceKrw)} · 결제하기`}
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
