import { getAppOrigin } from "@/lib/stripe";

/** Stripe PaymentIntent confirm / 3DS redirect landing (web + mobile deep link). */
export function stripePaymentIntentReturnUrl(orderId: string, returnTo?: string) {
  const origin = getAppOrigin();
  const params = new URLSearchParams({ order_id: orderId });
  if (returnTo?.trim()) params.set("return_to", returnTo.trim());
  return `${origin}/payments/authenticate?${params.toString()}`;
}

/** Client-side return URL (browser origin may differ from server env in preview). */
export function stripePaymentIntentReturnUrlClient(
  orderId: string,
  returnTo?: string,
  origin = typeof window !== "undefined" ? window.location.origin : getAppOrigin()
) {
  const params = new URLSearchParams({ order_id: orderId });
  if (returnTo?.trim()) params.set("return_to", returnTo.trim());
  return `${origin.replace(/\/$/, "")}/payments/authenticate?${params.toString()}`;
}

/** Mobile / initial 3DS page — includes client_secret for proactive confirm. */
export function stripePaymentAuthenticateUrl(
  orderId: string,
  clientSecret: string,
  returnTo?: string
) {
  return `${stripePaymentIntentReturnUrl(orderId, returnTo)}&client_secret=${encodeURIComponent(clientSecret)}`;
}
