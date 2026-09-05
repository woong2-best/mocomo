/**
 * Card brand–aware authorization windows for Star Market / auction holds.
 *
 * - Mastercard, Amex, Discover: Extended Authorization (up to ~30 days) immediately.
 * - Visa: standard 7-day window + re-auth cron until `visa_extended_auth` flag is ON.
 * - Checkout Session (brand unknown): request EA if_available — networks decide eligibility.
 */

import type Stripe from "stripe";
import { isFeatureEnabled } from "@/lib/platform/feature-flags";
import {
  USED_AUCTION_HOLD_AUTH_DAYS,
  USED_AUCTION_REAUTH_LEAD_HOURS,
} from "@/lib/used-auction-config";

export const VISA_EXTENDED_AUTH_FEATURE_FLAG = "visa_extended_auth";

/** Remaining hold longer than this implies Extended Authorization (not standard 7-day). */
export const EXTENDED_AUTH_MIN_REMAINING_DAYS = 8;

export type CardAuthorizationOptions = {
  card?: {
    request_extended_authorization?: "if_available";
  };
};

export function normalizeStripeCardBrand(brand: string | null | undefined): string {
  const b = (brand ?? "").trim().toLowerCase();
  if (b === "american express" || b === "americanexpress") return "amex";
  return b;
}

export function isVisaBrand(brand: string | null | undefined): boolean {
  return normalizeStripeCardBrand(brand) === "visa";
}

export function isExtendedAuthEligibleBrand(brand: string | null | undefined): boolean {
  const n = normalizeStripeCardBrand(brand);
  return n === "mastercard" || n === "amex" || n === "discover";
}

/**
 * Whether to set `request_extended_authorization: if_available` on PaymentIntent create/update.
 */
export function shouldRequestExtendedAuthorization(input: {
  cardBrand?: string | null;
  visaExtendedAuthEnabled: boolean;
  /** Stripe Checkout / new card — brand not known at PI create */
  checkoutBrandUnknown?: boolean;
}): boolean {
  if (input.checkoutBrandUnknown) {
    // MC/Amex/Discover receive EA via if_available; Visa only when Stripe merchant is eligible.
    // Re-auth cron + flag gate Visa-specific behavior post-auth.
    return true;
  }
  if (isExtendedAuthEligibleBrand(input.cardBrand)) return true;
  if (isVisaBrand(input.cardBrand)) return input.visaExtendedAuthEnabled;
  return false;
}

export function buildCardAuthorizationOptions(input: {
  cardBrand?: string | null;
  visaExtendedAuthEnabled: boolean;
  checkoutBrandUnknown?: boolean;
}): CardAuthorizationOptions | undefined {
  if (!shouldRequestExtendedAuthorization(input)) return undefined;
  return { card: { request_extended_authorization: "if_available" } };
}

export async function resolveVisaExtendedAuthEnabled(): Promise<boolean> {
  return isFeatureEnabled(VISA_EXTENDED_AUTH_FEATURE_FLAG, false);
}

export function holdExpiresAtFromCaptureBefore(
  captureBeforeUnix: number | null | undefined,
  fallbackDays = USED_AUCTION_HOLD_AUTH_DAYS,
  now = Date.now()
): Date {
  if (captureBeforeUnix && captureBeforeUnix > 0) {
    return new Date(captureBeforeUnix * 1000);
  }
  return new Date(now + fallbackDays * 24 * 60 * 60 * 1000);
}

export function readCaptureBeforeFromCharge(
  charge: Stripe.Charge | null | undefined
): number | null {
  const ts = charge?.payment_method_details?.card?.capture_before;
  return typeof ts === "number" && ts > 0 ? ts : null;
}

export function readCardBrandFromCharge(
  charge: Stripe.Charge | null | undefined
): string | null {
  return charge?.payment_method_details?.card?.brand ?? null;
}

/**
 * Post-auth hold expiry — after checkoutBrandUnknown confirm, Visa + flag OFF is capped
 * to the standard 7-day window even if Stripe granted a longer capture_before.
 */
export function resolveEffectiveHoldExpiresAt(input: {
  cardBrand: string | null | undefined;
  visaExtendedAuthEnabled: boolean;
  captureBeforeUnix: number | null | undefined;
  /** Charge or PaymentIntent created time (unix seconds) */
  authorizedAtUnix: number;
}): Date {
  const authMs = input.authorizedAtUnix * 1000;
  const standardExpiryMs = authMs + USED_AUCTION_HOLD_AUTH_DAYS * 24 * 60 * 60 * 1000;

  if (!isVisaBrand(input.cardBrand) || input.visaExtendedAuthEnabled) {
    return holdExpiresAtFromCaptureBefore(input.captureBeforeUnix, USED_AUCTION_HOLD_AUTH_DAYS, authMs);
  }

  const stripeExpiryMs = input.captureBeforeUnix
    ? input.captureBeforeUnix * 1000
    : standardExpiryMs;
  return new Date(Math.min(stripeExpiryMs, standardExpiryMs));
}

export async function resolveHoldExpiresAtFromPaymentIntent(
  stripe: Stripe,
  pi: Stripe.PaymentIntent,
  opts?: { visaExtendedAuthEnabled?: boolean }
): Promise<Date> {
  const visaExtendedAuthEnabled =
    opts?.visaExtendedAuthEnabled ?? (await resolveVisaExtendedAuthEnabled());

  let charge: Stripe.Charge | null = null;
  if (typeof pi.latest_charge === "string") {
    try {
      charge = await stripe.charges.retrieve(pi.latest_charge);
    } catch {
      charge = null;
    }
  } else if (pi.latest_charge && typeof pi.latest_charge === "object") {
    charge = pi.latest_charge;
  }

  const authorizedAtUnix = charge?.created ?? pi.created;
  return resolveEffectiveHoldExpiresAt({
    cardBrand: readCardBrandFromCharge(charge),
    visaExtendedAuthEnabled,
    captureBeforeUnix: readCaptureBeforeFromCharge(charge),
    authorizedAtUnix,
  });
}

export function hasExtendedAuthorizationHold(
  holdExpiresAt: Date | null | undefined,
  now = Date.now()
): boolean {
  if (!holdExpiresAt) return false;
  const remainingDays = (holdExpiresAt.getTime() - now) / (24 * 60 * 60 * 1000);
  return remainingDays > EXTENDED_AUTH_MIN_REMAINING_DAYS;
}

/** Skip re-auth cron when hold still has extended authorization runway. */
export function shouldSkipReauthorization(
  holdExpiresAt: Date | null | undefined,
  now = Date.now()
): boolean {
  return hasExtendedAuthorizationHold(holdExpiresAt, now);
}

export function isVisaExtendedAuthApplied(input: {
  cardBrand?: string | null;
  visaExtendedAuthEnabled: boolean;
  holdExpiresAt?: Date | null;
}): boolean {
  if (!isVisaBrand(input.cardBrand)) return false;
  if (!input.visaExtendedAuthEnabled) return false;
  if (input.holdExpiresAt) {
    return hasExtendedAuthorizationHold(input.holdExpiresAt);
  }
  return input.visaExtendedAuthEnabled;
}

/** Apply brand-specific EA options before off-session / saved-card confirm. */
export async function applyExtendedAuthorizationBeforeConfirm(
  stripe: Stripe,
  paymentIntentId: string,
  paymentMethodId: string,
  opts?: { visaExtendedAuthEnabled?: boolean }
): Promise<void> {
  const visaExtendedAuthEnabled =
    opts?.visaExtendedAuthEnabled ?? (await resolveVisaExtendedAuthEnabled());

  const pm = await stripe.paymentMethods.retrieve(paymentMethodId);
  const authOptions = buildCardAuthorizationOptions({
    cardBrand: pm.card?.brand ?? null,
    visaExtendedAuthEnabled,
  });

  await stripe.paymentIntents.update(paymentIntentId, {
    payment_method: paymentMethodId,
    ...(authOptions ? { payment_method_options: authOptions } : {}),
  });
}
