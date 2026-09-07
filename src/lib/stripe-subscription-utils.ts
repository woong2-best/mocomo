import type Stripe from "stripe";

type InvoiceWithLegacySubscription = Stripe.Invoice & {
  subscription?: string | Stripe.Subscription | null;
};

type SubscriptionItemWithPeriod = Stripe.SubscriptionItem & {
  current_period_end?: number;
};

type SubscriptionWithLegacyPeriod = Stripe.Subscription & {
  current_period_end?: number;
};

/** Basil API moved subscription id off Invoice; support legacy + parent.subscription_details. */
export function getStripeSubscriptionIdFromInvoice(
  invoice: Stripe.Invoice
): string | null {
  const parent = invoice.parent;
  if (parent && "subscription_details" in parent && parent.subscription_details) {
    const sub = parent.subscription_details.subscription;
    if (typeof sub === "string") return sub;
    if (sub && typeof sub === "object" && "id" in sub) return sub.id;
  }

  const legacy = (invoice as InvoiceWithLegacySubscription).subscription;
  if (typeof legacy === "string") return legacy;
  if (legacy && typeof legacy === "object" && "id" in legacy) return legacy.id;

  return null;
}

/** Basil API moved billing period to subscription items; support legacy top-level field. */
export function getStripeSubscriptionPeriodEndUnix(
  subscription: Stripe.Subscription
): number {
  const firstItem = subscription.items?.data?.[0] as SubscriptionItemWithPeriod | undefined;
  if (firstItem?.current_period_end) return firstItem.current_period_end;

  const legacy = subscription as SubscriptionWithLegacyPeriod;
  if (legacy.current_period_end) return legacy.current_period_end;

  return Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;
}
