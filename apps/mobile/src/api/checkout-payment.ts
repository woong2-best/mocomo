import { apiRequest } from "@/api/client";
import { MobileApi } from "@/api/paths";
import type { CheckoutBody } from "@/api/checkout";
import type { PaymentMethodItem } from "@/features/wallet/wallet-card-builders";

export type PrepareCheckoutResult = {
  orderId: string;
  clientSecret: string | null;
  publishableKey: string;
  methods: PaymentMethodItem[];
};

export async function prepareCheckoutPayment(body: CheckoutBody) {
  return apiRequest<PrepareCheckoutResult>(MobileApi.checkoutIntent, {
    method: "POST",
    body,
  });
}

export async function payCheckoutWithSavedCard(orderId: string, paymentMethodId: string) {
  return apiRequest<
    | { success: true; type: string; alreadyPaid?: boolean; redirectPath?: string }
    | { requiresAction: true; authenticateUrl: string; orderId: string }
    | { error: string }
  >(MobileApi.checkoutIntent, {
    method: "PATCH",
    body: { mode: "saved", orderId, paymentMethodId, purchaseTermsAccepted: true },
  });
}

export async function finalizeCheckoutPayment(orderId: string) {
  return apiRequest<{ success: true; type: string; alreadyPaid?: boolean }>(MobileApi.checkoutIntent, {
    method: "PATCH",
    body: { mode: "finalize", orderId },
  });
}

export async function startCheckoutRedirect(body: CheckoutBody) {
  return apiRequest<{ checkoutUrl: string; orderId: string }>(MobileApi.checkoutIntent, {
    method: "PATCH",
    body: { mode: "checkout", ...body, purchaseTermsAccepted: true },
  });
}

export async function requestWalletPayout(amount: number) {
  return apiRequest<{ ok: boolean }>(MobileApi.walletPayout, {
    method: "POST",
    body: { amount },
    auth: true,
  });
}

export type BankStatus = {
  bankVerified: boolean;
  displayAccount?: string | null;
  legalName?: string | null;
  emailVerified?: boolean;
};

export async function fetchBankStatus() {
  return apiRequest<BankStatus>(MobileApi.accountBank, { auth: true });
}

export async function sendBankVerification(bankCode: string, accountNum: string) {
  return apiRequest<{ message?: string; devCode?: string; alreadyVerified?: boolean }>(
    MobileApi.accountBank,
    {
      method: "POST",
      body: { action: "send", bankCode, accountNum },
      auth: true,
    }
  );
}

export async function verifyBankCode(bankCode: string, accountNum: string, code: string) {
  return apiRequest<{ displayAccount?: string; message?: string }>(MobileApi.accountBank, {
    method: "POST",
    body: { action: "verify", bankCode, accountNum, code },
    auth: true,
  });
}
