import { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import type { PaymentIntentType } from "@/api/checkout";
import { getAccessToken } from "@/auth/token-store";
import { FolkButton } from "@/ui/FolkButton";
import { PaymentCheckoutSheet } from "@/payments/PaymentCheckoutSheet";
import { paymentTypeLabel } from "@/payments/stripe-checkout";
import { ADULT_MONETIZATION_BANNED_SHORT } from "@/lib/stripe-payment-notice";
import { useAdultVerificationGate } from "@/hooks/useAdultVerificationGate";
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
  const { u, locale } = useI18n();
  const isAdult =
    contentRating === "ADULT" ||
    contentRating === true ||
    metadata.contentRating === "ADULT" ||
    metadata.isNsfw === true;
  const [open, setOpen] = useState(false);
  const adultGate = useAdultVerificationGate("DM_PAID");
  const checkoutBody = useMemo(
    () => normalizeCheckoutBody(type, amount, orderName, metadata),
    [amount, metadata, orderName, type]
  );

  async function openCheckout() {
    if (type === "CREATOR_SUBSCRIPTION") {
      showIslandError(
        u("이용 불가", "Unavailable"),
        u("크리에이터 정기 후원 기능은 종료되었습니다.", "Creator subscriptions are no longer available.")
      );
      return;
    }
    const token = await getAccessToken();
    if (!token) {
      showIslandError(u("로그인 필요", "Sign in required"), u("결제하려면 먼저 로그인해 주세요.", "Sign in to pay."));
      return;
    }
    if (isAdult) {
      showIslandError(u("결제 불가", "Payment blocked"), ADULT_MONETIZATION_BANNED_SHORT);
      return;
    }
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
            result.alreadyPaid ? u("이미 처리됨", "Already processed") : u("결제 완료", "Payment complete"),
            u(
              `${paymentTypeLabel(result.type, locale)}이 완료되었습니다.`,
              `${paymentTypeLabel(result.type, locale)} completed.`
            )
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6, zIndex: 20, elevation: 20 },
});
