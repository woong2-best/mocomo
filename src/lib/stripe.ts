import Stripe from "stripe";

let stripeClient: Stripe | null = null;

export function isStripeConfigured(): boolean {
  return !!(
    process.env.STRIPE_SECRET_KEY &&
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  );
}

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  if (!stripeClient) {
    stripeClient = new Stripe(key);
  }
  return stripeClient;
}

export function getAppOrigin(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.AUTH_URL ??
    process.env.NEXTAUTH_URL ??
    "http://localhost:3000"
  ).replace(/\/$/, "");
}
