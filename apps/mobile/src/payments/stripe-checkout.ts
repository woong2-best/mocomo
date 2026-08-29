import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { createCheckout, confirmCheckout, type CheckoutBody } from "@/api/checkout";
import { createStarMarketCheckout, type MarketplaceCheckoutBody } from "@/api/star-market";

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
export async function openStripeCheckout(body: CheckoutBody): Promise<CheckoutResult> {
  const { checkoutUrl } = await createCheckout(body);

  const result = await WebBrowser.openAuthSessionAsync(checkoutUrl, RETURN_PREFIX, {
    preferEphemeralSession: false,
    showInRecents: true,
  });

  if (result.type === "cancel" || result.type === "dismiss") {
    throw new Error("결제가 취소되었습니다.");
  }

  if (result.type !== "success" || !result.url) {
    throw new Error("결제를 완료하지 못했습니다.");
  }

  if (result.url.includes("payment/cancel")) {
    throw new Error("결제가 취소되었습니다.");
  }

  const sessionId = extractSessionId(result.url);
  if (!sessionId) {
    throw new Error("결제 세션을 확인하지 못했습니다.");
  }

  const confirmed = await confirmCheckout(sessionId);
  return { type: confirmed.type, alreadyPaid: confirmed.alreadyPaid };
}

/** Star market (marketplace listing) checkout */
export async function openMarketplaceCheckout(
  listingId: string,
  body: MarketplaceCheckoutBody
): Promise<CheckoutResult> {
  const { checkoutUrl } = await createStarMarketCheckout(listingId, body);

  const result = await WebBrowser.openAuthSessionAsync(checkoutUrl, RETURN_PREFIX, {
    preferEphemeralSession: false,
    showInRecents: true,
  });

  if (result.type === "cancel" || result.type === "dismiss") {
    throw new Error("결제가 취소되었습니다.");
  }
  if (result.type !== "success" || !result.url) {
    throw new Error("결제를 완료하지 못했습니다.");
  }
  if (result.url.includes("payment/cancel")) {
    throw new Error("결제가 취소되었습니다.");
  }

  const sessionId = extractSessionId(result.url);
  if (!sessionId) {
    throw new Error("결제 세션을 확인하지 못했습니다.");
  }

  const confirmed = await confirmCheckout(sessionId);
  return { type: confirmed.type, alreadyPaid: confirmed.alreadyPaid };
}

export function paymentTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    TIP: "후원",
    CREATOR_SUBSCRIPTION: "구독",
    PREMIUM: "프리미엄",
    PRODUCT: "구매",
    MARKETPLACE: "마켓 구매",
    EMOTICON: "이모티콘",
    CREATOR_EPISODE: "회차 구매",
    POST_MEDIA: "미디어 구매",
    MESSAGE_MEDIA: "팬아트 구매",
    EVENT_REGISTRATION: "이벤트 등록",
    STUDIO_ASSET: "Studio 구매",
    CALL_BOOKING: "통화 예약",
  };
  return labels[type] ?? "결제";
}
