import { useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import type { PaymentIntentType } from "@/api/checkout";
import { FolkButton } from "@/ui/FolkButton";
import { PaymentCheckoutSheet } from "@/payments/PaymentCheckoutSheet";
import { paymentTypeLabel } from "@/payments/stripe-checkout";

type Props = {
  type: PaymentIntentType;
  amount: number;
  orderName: string;
  metadata: Record<string, unknown>;
  label: string;
  disabled?: boolean;
  onSuccess?: () => void;
  variant?: "primary" | "secondary" | "ghost";
};

export function PayButton({
  type,
  amount,
  orderName,
  metadata,
  label,
  disabled,
  onSuccess,
  variant = "primary",
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <View style={styles.wrap}>
      <FolkButton
        label={label}
        onPress={() => setOpen(true)}
        disabled={disabled}
        variant={variant}
      />
      <PaymentCheckoutSheet
        visible={open}
        body={{ type, amount, orderName, metadata }}
        onClose={() => setOpen(false)}
        onSuccess={(result) => {
          onSuccess?.();
          Alert.alert(
            result.alreadyPaid ? "이미 처리됨" : "결제 완료",
            `${paymentTypeLabel(result.type)}이 완료되었습니다.`
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
});
