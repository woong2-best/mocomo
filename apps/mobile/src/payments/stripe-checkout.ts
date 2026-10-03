import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { createCheckout, confirmCheckout, type CheckoutBody } from "@/api/checkout";
import { createStarMarketCheckout, type MarketplaceCheckoutBody } from "@/api/star-market";
import { translate } from "@/i18n/runtime";

WebBrowser.maybeCompleteAuthSession();

const RETURN_PREFIX = Linking.createURL("payment/success");

function extractSessionId(url: string): string | null {
  try {
    const parsed = new URL(url);
    const fromQuery = parsed.searchParams.get("session_id");
    if (fromQuery) return fromQuery;
  } catch {
    const m = /[?&]session_id=([^&]+)/.exec(url);
    if (m?.[1]) return decodeURIComponent(m[1]);
  }
  return null;
}

export type CheckoutResult = {
  type: string;
  alreadyPaid?: boolean;
};

/** Open Stripe Checkout in AuthSession; confirm on return to mocomo:// */
export async function openStripeCheckout(
  body: CheckoutBody,
  locale?: string
): Promise<CheckoutResult> {
  const { checkoutUrl } = await createCheckout(body);

  const result = await WebBrowser.openAuthSessionAsync(checkoutUrl, RETURN_PREFIX, {
    preferEphemeralSession: false,
    showInRecents: true,
  });

  if (result.type === "cancel" || result.type === "dismiss") {
    throw new Error(translate("m.payments.payment_was_canceled"));
  }

  if (result.type !== "success" || !result.url) {
    throw new Error(translate("m.payments.could_not_complete_payment"));
  }

  if (result.url.includes("payment/cancel")) {
    throw new Error(translate("m.payments.payment_was_canceled"));
  }

  const sessionId = extractSessionId(result.url);
  if (!sessionId) {
    throw new Error(translate("m.payments.could_not_verify_payment_session"));
  }

  const confirmed = await confirmCheckout(sessionId);
  return { type: confirmed.type, alreadyPaid: confirmed.alreadyPaid };
}

/** Star market (marketplace listing) checkout */
export async function openMarketplaceCheckout(
  listingId: string,
  body: MarketplaceCheckoutBody,
  locale?: string
): Promise<CheckoutResult> {
  const { checkoutUrl } = await createStarMarketCheckout(listingId, body);

  const result = await WebBrowser.openAuthSessionAsync(checkoutUrl, RETURN_PREFIX, {
    preferEphemeralSession: false,
    showInRecents: true,
  });

  if (result.type === "cancel" || result.type === "dismiss") {
    throw new Error(translate("m.payments.payment_was_canceled"));
  }
  if (result.type !== "success" || !result.url) {
    throw new Error(translate("m.payments.could_not_complete_payment"));
  }
  if (result.url.includes("payment/cancel")) {
    throw new Error(translate("m.payments.payment_was_canceled"));
  }

  const sessionId = extractSessionId(result.url);
  if (!sessionId) {
    throw new Error(translate("m.payments.could_not_verify_payment_session"));
  }

  const confirmed = await confirmCheckout(sessionId);
  return { type: confirmed.type, alreadyPaid: confirmed.alreadyPaid };
}

export function paymentTypeLabel(type: string, _locale?: string): string {
  const labels: Record<string, string> = {
    TIP: translate("m.payments.tip"),
    CREATOR_SUBSCRIPTION: translate("m.payments.subscription"),
    PREMIUM: translate("m.payments.premium"),
    PRODUCT: translate("m.payments.purchase"),
    MARKETPLACE: translate("m.payments.marketplace_purchase"),
    EMOTICON: translate("m.payments.emoticon"),
    CREATOR_EPISODE: translate("m.payments.episode_purchase"),
    POST_MEDIA: translate("m.payments.media_purchase"),
    MESSAGE_MEDIA: translate("m.payments.fan_art_purchase"),
    EVENT_REGISTRATION: translate("m.payments.event_registration"),
    STUDIO_ASSET: translate("m.payments.studio_purchase"),
    CALL_BOOKING: translate("m.common.call_booking"),
  };
  return labels[type] ?? translate("m.payments.payment");
}
