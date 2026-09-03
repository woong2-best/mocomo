import { getStripe } from "@/lib/stripe";
import { isMarketplacePaymentAuthorized } from "@/lib/marketplace/stripe-payment";

/** Stripe Checkout 세션이 결제 완료(또는 manual-capture 승인)인지 검증 */
export async function verifyStripeCheckoutSession(sessionId: string) {
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.retrieve(sessionId);

  const orderId = session.metadata?.orderId;
  if (!orderId) return { ok: false as const, error: "주문 정보가 없습니다." };

  const amount = session.amount_total;
  if (amount == null) return { ok: false as const, error: "결제 금액을 확인할 수 없습니다." };

  const paymentRef = session.payment_intent
    ? typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent.id
    : sessionId;

  if (session.payment_status === "paid") {
    return { ok: true as const, orderId, amount, paymentRef };
  }

  // Manual capture (Star Market): authorized but not yet captured
  if (session.payment_status === "unpaid" && session.metadata?.type === "MARKETPLACE" && paymentRef.startsWith("pi_")) {
    const pi = await stripe.paymentIntents.retrieve(paymentRef);
    if (isMarketplacePaymentAuthorized(pi)) {
      return { ok: true as const, orderId, amount: pi.amount, paymentRef: pi.id };
    }
  }

  return { ok: false as const, error: "결제가 완료되지 않았습니다." };
}
