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
  if (!(e instanceof Error)) return t("actions.se2gpcp");
  switch (e.message) {
    case "UNAUTHORIZED":
      return t("actions.s1mzxopt");
    case "BANNED":
      return t("actions.s12qpsrn");
    case "ACCOUNT_DELETED":
      return t("actions.so0m8y9");
    case "USER_NOT_FOUND":
      return t("actions.s1mr2r81");
    case "ACCOUNT_SUSPENDED":
      return t("actions.s1mcwspz");
    case "ACCOUNT_LIMITED":
      return t("actions.s1mocqj6");
    default:
      return t("actions.se2gpcp");
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
    const user = await requireAuth();
    const res = await createSetupCheckoutSession({
      userId: user.id,
      email: user.email,
      platform: "web",
      returnPath,
    });
    if ("error" in res && res.error) return { error: res.error };
    if (!("checkoutUrl" in res) || !res.checkoutUrl) {
      return { error: "actions.s90ss29" };
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
