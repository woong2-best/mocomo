import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { apiRequest } from "@/api/client";
import { MobileApi } from "@/api/paths";
import type { PaymentMethodItem } from "@/features/wallet/wallet-card-builders";

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

export async function fetchPaymentMethods() {
  return apiRequest<{ methods: PaymentMethodItem[] }>(MobileApi.paymentMethods, { auth: true });
}

export async function startPaymentMethodSetup() {
  return apiRequest<{ checkoutUrl: string; sessionId: string }>(MobileApi.paymentMethods, {
    method: "POST",
    auth: true,
  });
}

export async function confirmPaymentMethodSetup(sessionId: string) {
  return apiRequest<{ ok: boolean; methods: PaymentMethodItem[] }>(MobileApi.paymentMethodsConfirm, {
    method: "POST",
    body: { sessionId },
    auth: true,
  });
}

export async function setDefaultPaymentMethod(id: string) {
  return apiRequest<{ ok: boolean; methods: PaymentMethodItem[] }>(MobileApi.paymentMethods, {
    method: "PATCH",
    body: { id },
    auth: true,
  });
}

/** Stripe Setup Checkout — save card for later payments */
export async function openPaymentMethodSetup(): Promise<PaymentMethodItem[]> {
  const { checkoutUrl } = await startPaymentMethodSetup();

  const result = await WebBrowser.openAuthSessionAsync(checkoutUrl, RETURN_PREFIX, {
    preferEphemeralSession: false,
    showInRecents: true,
  });

  if (result.type === "cancel" || result.type === "dismiss") {
    throw new Error("카드 등록이 취소되었습니다.");
  }
  if (result.type !== "success" || !result.url) {
    throw new Error("카드 등록을 완료하지 못했습니다.");
  }

  const sessionId = extractSessionId(result.url);
  if (!sessionId) throw new Error("등록 세션을 확인하지 못했습니다.");

  const confirmed = await confirmPaymentMethodSetup(sessionId);
  return confirmed.methods;
}
