import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { createCheckout, confirmCheckout, type CheckoutBody } from "@/api/checkout";
import { createStarMarketCheckout, type MarketplaceCheckoutBody } from "@/api/star-market";
import { uiText } from "@/i18n/ui-text";

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
    throw new Error(uiText(locale, "결제가 취소되었습니다.", "Payment was canceled."));
  }

  if (result.type !== "success" || !result.url) {
    throw new Error(uiText(locale, "결제를 완료하지 못했습니다.", "Could not complete payment."));
  }

  if (result.url.includes("payment/cancel")) {
    throw new Error(uiText(locale, "결제가 취소되었습니다.", "Payment was canceled."));
  }

  const sessionId = extractSessionId(result.url);
  if (!sessionId) {
    throw new Error(uiText(locale, "결제 세션을 확인하지 못했습니다.", "Could not verify payment session."));
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
    throw new Error(uiText(locale, "결제가 취소되었습니다.", "Payment was canceled."));
  }
  if (result.type !== "success" || !result.url) {
    throw new Error(uiText(locale, "결제를 완료하지 못했습니다.", "Could not complete payment."));
  }
  if (result.url.includes("payment/cancel")) {
    throw new Error(uiText(locale, "결제가 취소되었습니다.", "Payment was canceled."));
  }

  const sessionId = extractSessionId(result.url);
  if (!sessionId) {
    throw new Error(uiText(locale, "결제 세션을 확인하지 못했습니다.", "Could not verify payment session."));
  }

  const confirmed = await confirmCheckout(sessionId);
  return { type: confirmed.type, alreadyPaid: confirmed.alreadyPaid };
}

export function paymentTypeLabel(type: string, locale?: string): string {
  const u = (ko: string, en: string) => uiText(locale, ko, en);
  const labels: Record<string, string> = {
    TIP: u("후원", "Tip"),
    CREATOR_SUBSCRIPTION: u("구독", "Subscription"),
    PREMIUM: u("프리미엄", "Premium"),
    PRODUCT: u("구매", "Purchase"),
    MARKETPLACE: u("마켓 구매", "Marketplace purchase"),
    EMOTICON: u("이모티콘", "Emoticon"),
    CREATOR_EPISODE: u("회차 구매", "Episode purchase"),
    POST_MEDIA: u("미디어 구매", "Media purchase"),
    MESSAGE_MEDIA: u("팬아트 구매", "Fan art purchase"),
    EVENT_REGISTRATION: u("이벤트 등록", "Event registration"),
    STUDIO_ASSET: u("Studio 구매", "Studio purchase"),
    CALL_BOOKING: u("통화 예약", "Call booking"),
  };
  return labels[type] ?? u("결제", "Payment");
}
