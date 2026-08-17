"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import {
  confirmSetupCheckoutSession,
  createSetupCheckoutSession,
  detachPaymentMethod,
  listSavedPaymentMethods,
  setDefaultPaymentMethod,
} from "@/lib/stripe-payment-methods";

export async function getMyPaymentMethods() {
  const user = await requireAuth();
  const methods = await listSavedPaymentMethods(user.id);
  return { methods, configured: methods.length >= 0 };
}

export async function startAddPaymentMethod(returnPath?: string) {
  const user = await requireAuth();
  const res = await createSetupCheckoutSession({
    userId: user.id,
    email: user.email,
    platform: "web",
    returnPath,
  });
  if ("error" in res && res.error) return { error: res.error };
  return { checkoutUrl: res.checkoutUrl! };
}

export async function confirmPaymentMethodSetup(sessionId: string) {
  const user = await requireAuth();
  const res = await confirmSetupCheckoutSession(user.id, sessionId);
  if ("error" in res && res.error) return { error: res.error };
  revalidatePath("/wallet");
  revalidatePath("/support");
  return { ok: true, methods: res.methods };
}

export async function removePaymentMethod(paymentMethodId: string) {
  const user = await requireAuth();
  const res = await detachPaymentMethod(user.id, paymentMethodId);
  if ("error" in res && res.error) return { error: res.error };
  revalidatePath("/wallet");
  revalidatePath("/support");
  return { ok: true, methods: res.methods };
}

export async function chooseDefaultPaymentMethod(paymentMethodId: string) {
  const user = await requireAuth();
  const res = await setDefaultPaymentMethod(user.id, paymentMethodId);
  if ("error" in res && res.error) return { error: res.error };
  revalidatePath("/wallet");
  revalidatePath("/support");
  return { ok: true, methods: res.methods };
}
