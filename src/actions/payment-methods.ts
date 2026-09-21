"use server";

import { revalidatePath } from "next/cache";
import { requireAuth, requireAuthForAction } from "@/lib/auth";
import {
  confirmSetupCheckoutSession,
  createSetupCheckoutSession,
  detachPaymentMethod,
  listSavedPaymentMethods,
  setDefaultPaymentMethod,
} from "@/lib/stripe-payment-methods";

function actionAuthError(e: unknown): string {
  if (!(e instanceof Error)) return "요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.";
  switch (e.message) {
    case "UNAUTHORIZED":
      return "로그인이 필요합니다.";
    case "BANNED":
      return "이용이 제한된 계정입니다.";
    case "ACCOUNT_DELETED":
      return "삭제된 계정입니다.";
    case "USER_NOT_FOUND":
      return "사용자 정보를 찾을 수 없습니다.";
    default:
      return "요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.";
  }
}

export async function getMyPaymentMethods() {
  try {
    const user = await requireAuth();
    const methods = await listSavedPaymentMethods(user.id);
    return { methods, configured: methods.length >= 0 };
  } catch (e) {
    console.error("[getMyPaymentMethods]", e);
    return { methods: [], configured: false };
  }
}

export async function startAddPaymentMethod(returnPath?: string) {
  try {
    const user = await requireAuthForAction();
    const res = await createSetupCheckoutSession({
      userId: user.id,
      email: null,
      platform: "web",
      returnPath,
    });
    if ("error" in res && res.error) return { error: res.error };
    if (!("checkoutUrl" in res) || !res.checkoutUrl) {
      return { error: "카드 등록 페이지로 이동하지 못했습니다." };
    }
    return { checkoutUrl: res.checkoutUrl };
  } catch (e) {
    console.error("[startAddPaymentMethod]", e);
    return { error: actionAuthError(e) };
  }
}

export async function confirmPaymentMethodSetup(sessionId: string) {
  try {
    const user = await requireAuthForAction();
    const res = await confirmSetupCheckoutSession(user.id, sessionId);
    if ("error" in res && res.error) return { error: res.error };
    revalidatePath("/wallet");
    revalidatePath("/support");
    return { ok: true, methods: res.methods };
  } catch (e) {
    console.error("[confirmPaymentMethodSetup]", e);
    return { error: actionAuthError(e) };
  }
}

export async function removePaymentMethod(paymentMethodId: string) {
  try {
    const user = await requireAuthForAction();
    const res = await detachPaymentMethod(user.id, paymentMethodId);
    if ("error" in res && res.error) return { error: res.error };
    revalidatePath("/wallet");
    revalidatePath("/support");
    return { ok: true, methods: res.methods };
  } catch (e) {
    console.error("[removePaymentMethod]", e);
    return { error: actionAuthError(e) };
  }
}

export async function chooseDefaultPaymentMethod(paymentMethodId: string) {
  try {
    const user = await requireAuthForAction();
    const res = await setDefaultPaymentMethod(user.id, paymentMethodId);
    if ("error" in res && res.error) return { error: res.error };
    revalidatePath("/wallet");
    revalidatePath("/support");
    return { ok: true, methods: res.methods };
  } catch (e) {
    console.error("[chooseDefaultPaymentMethod]", e);
    return { error: actionAuthError(e) };
  }
}
