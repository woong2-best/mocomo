import { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import type { PaymentIntentType } from "@/api/checkout";
import { getAccessToken } from "@/auth/token-store";
import { FolkButton } from "@/ui/FolkButton";
import { PaymentCheckoutSheet } from "@/payments/PaymentCheckoutSheet";
import { paymentTypeLabel } from "@/payments/stripe-checkout";
import { ADULT_MONETIZATION_BANNED_SHORT } from "@/lib/stripe-payment-notice";
import { useAdultVerificationGate } from "@/hooks/useAdultVerificationGate";
import { useMoneyAgeGate } from "@/hooks/useMoneyAgeGate";
import { paymentTypeRequiresAdultVerification } from "@/lib/adult-verification-messages";
import { showIslandError, showIslandSuccess } from "@/ui/IslandToast";
import { useI18n } from "@/i18n/I18nProvider";

type Props = {
  type: PaymentIntentType;
  amount: number;
  orderName: string;
  metadata: Record<string, unknown>;
  label: string;
  contentRating?: "GENERAL" | "ADULT" | boolean;
  disabled?: boolean;
  onSuccess?: () => void;
  variant?: "primary" | "secondary" | "ghost";
};

function normalizeCheckoutBody(
  type: PaymentIntentType,
  amount: number,
  orderName: string,
  metadata: Record<string, unknown>
) {
  const normalized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (value == null) continue;
    normalized[key] = typeof value === "string" ? value : String(value);
  }
  if (type === "POST_MEDIA" && normalized.mediaId) {
    normalized.mediaId = String(normalized.mediaId);
  }
  if (type === "MESSAGE_MEDIA" && normalized.attachmentId) {
    normalized.attachmentId = String(normalized.attachmentId);
  }
  if (type === "CREATOR_SUBSCRIPTION" && normalized.creatorId) {
    normalized.creatorId = String(normalized.creatorId);
  }
  return {
    type,
    amount: Math.max(1, Math.round(amount)),
    orderName,
    metadata: normalized,
  };
}

export function PayButton({
  type,
  amount,
  orderName,
  metadata,
  label,
  contentRating = "GENERAL",
  disabled,
  onSuccess,
  variant = "primary",
}: Props) {
  const { t, locale } = useI18n();
  const isAdult =
    contentRating === "ADULT" ||
    contentRating === true ||
    metadata.contentRating === "ADULT" ||
    metadata.isNsfw === true;
  const [open, setOpen] = useState(false);
  const adultGate = useAdultVerificationGate("DM_PAID");
  const moneyAge = useMoneyAgeGate();
  const checkoutBody = useMemo(
    () => normalizeCheckoutBody(type, amount, orderName, metadata),
    [amount, metadata, orderName, type]
  );

  async function openCheckout() {
    if (type === "CREATOR_SUBSCRIPTION") {
      showIslandError(
        t("m.common.unavailable"),
        t("m.payments.creator_subscriptions_are_no_longer_avai")
      );
      return;
    }
    const token = await getAccessToken();
    if (!token) {
      showIslandError(t("m.common.sign_in_required"), t("m.payments.sign_in_to_pay"));
      return;
    }
    if (isAdult) {
      showIslandError(t("m.payments.payment_blocked"), ADULT_MONETIZATION_BANNED_SHORT);
      return;
    }
    if (!(await moneyAge.ensureMoneyAge())) return;
    if (paymentTypeRequiresAdultVerification(type)) {
      const ok = await adultGate.ensureAdult();
      if (!ok) return;
    }
    setOpen(true);
  }

  return (
    <View style={styles.wrap}>
      <FolkButton
        label={label}
        onPress={() => void openCheckout()}
        disabled={disabled || isAdult || adultGate.busy}
        variant={variant}
      />
      <PaymentCheckoutSheet
        visible={open}
        body={checkoutBody}
        onClose={() => setOpen(false)}
        onSuccess={(result) => {
          onSuccess?.();
          showIslandSuccess(
            result.alreadyPaid ? t("m.payments.already_processed") : t("m.common.payment_complete"),
            t("m.payments.paymenttypelabel_completed", { paymentTypeLabel: String(paymentTypeLabel(result.type, locale)) })
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6, zIndex: 20, elevation: 20 },
});
