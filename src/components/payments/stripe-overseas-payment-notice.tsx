/** Stripe 해외 결제망 안내 — 현금영수증 미지원 */
export const STRIPE_OVERSEAS_PAYMENT_NOTICE =
  "본 결제는 해외 결제망(Stripe)을 이용하므로 한국 현금영수증 발급이 불가하며 신용/체크카드 결제를 권장합니다.";

export function StripeOverseasPaymentNotice({ className }: { className?: string }) {
  return (
    <p className={className ?? "text-xs text-muted-foreground leading-relaxed rounded-lg border border-border/50 bg-muted/30 px-3 py-2.5"}>
      {STRIPE_OVERSEAS_PAYMENT_NOTICE}
    </p>
  );
}
