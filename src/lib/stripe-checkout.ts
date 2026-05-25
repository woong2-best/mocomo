import { getStripe } from "@/lib/stripe";

/** Stripe Checkout 세션이 실제 결제 완료인지 검증 */
export async function verifyStripeCheckoutSession(sessionId: string) {
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.retrieve(sessionId);

  if (session.payment_status !== "paid") {
    return { ok: false as const, error: "결제가 완료되지 않았습니다." };
  }

  const orderId = session.metadata?.orderId;
  if (!orderId) return { ok: false as const, error: "주문 정보가 없습니다." };

  const amount = session.amount_total;
  if (amount == null) return { ok: false as const, error: "결제 금액을 확인할 수 없습니다." };

  return {
    ok: true as const,
    orderId,
    amount,
    paymentRef: session.payment_intent
      ? typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent.id
      : sessionId,
  };
}
