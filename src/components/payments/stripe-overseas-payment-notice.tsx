import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

/** Stripe 해외 결제망 안내 — 현금영수증 미지원 */
export const STRIPE_OVERSEAS_PAYMENT_NOTICE =
  t("payments.stripe_4");

export function StripeOverseasPaymentNotice({ className }: { className?: string }) {
  return (
    <p className={className ?? "text-xs text-muted-foreground leading-relaxed rounded-lg border border-border/50 bg-muted/30 px-3 py-2.5"}>
      {STRIPE_OVERSEAS_PAYMENT_NOTICE}
    </p>
  );
}
