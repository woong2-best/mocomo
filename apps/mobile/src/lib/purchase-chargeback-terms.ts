/**
 * Purchase terms shown before every card / wallet charge.
 * Keep wording identical on web and mobile — used as Stripe dispute evidence.
 */
export const PURCHASE_CHARGEBACK_TERMS_VERSION = "2026-03";

export const PURCHASE_CHARGEBACK_TERMS_TITLE = "Before you pay";

export const PURCHASE_CHARGEBACK_TERMS_BULLETS = [
  "I am 18 or older and agree to the MoCoMo Terms of Service and payment/refund policy.",
  "If I use someone else's card or payment method without permission, I am fully responsible legally and financially.",
  "Digital content and paid services are delivered immediately after payment; refunds may be limited under law and the Terms of Service.",
  "Abusive refunds or chargebacks may lead to account restrictions and legal action.",
] as const;

export const PURCHASE_CHARGEBACK_TERMS_CHECKBOX_LABEL =
  "I have read the above and agree to proceed with payment.";

