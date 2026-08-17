import { db } from "@/lib/db";
import { safeReturnPath } from "@/lib/donation-metadata";
import { getAppOrigin, getStripe, isStripeConfigured } from "@/lib/stripe";
import type { CheckoutPlatform } from "@/lib/stripe-checkout-service";

export type SavedPaymentMethod = {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  isDefault: boolean;
};

function cardBrandLabel(brand: string | null | undefined) {
  const b = (brand ?? "card").toLowerCase();
  const labels: Record<string, string> = {
    visa: "Visa",
    mastercard: "Mastercard",
    amex: "American Express",
    discover: "Discover",
    jcb: "JCB",
    unionpay: "UnionPay",
    diners: "Diners Club",
  };
  return labels[b] ?? brand ?? "Card";
}

export async function getOrCreateStripeCustomer(userId: string, email?: string | null) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { stripeCustomerId: true, email: true, username: true },
  });
  if (!user) throw new Error("USER_NOT_FOUND");

  if (user.stripeCustomerId) {
    return user.stripeCustomerId;
  }

  const stripe = getStripe();
  const customer = await stripe.customers.create({
    email: email ?? user.email ?? undefined,
    metadata: { userId, username: user.username },
  });

  await db.user.update({
    where: { id: userId },
    data: { stripeCustomerId: customer.id },
  });

  return customer.id;
}

export async function listSavedPaymentMethods(userId: string): Promise<SavedPaymentMethod[]> {
  if (!isStripeConfigured()) return [];

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { stripeCustomerId: true },
  });
  if (!user?.stripeCustomerId) return [];

  const stripe = getStripe();
  const [methods, customer] = await Promise.all([
    stripe.paymentMethods.list({ customer: user.stripeCustomerId, type: "card" }),
    stripe.customers.retrieve(user.stripeCustomerId),
  ]);

  const defaultId =
    typeof customer !== "string" && !customer.deleted
      ? (customer.invoice_settings?.default_payment_method as string | null)
      : null;

  return methods.data.map((pm) => ({
    id: pm.id,
    brand: cardBrandLabel(pm.card?.brand),
    last4: pm.card?.last4 ?? "????",
    expMonth: pm.card?.exp_month ?? 0,
    expYear: pm.card?.exp_year ?? 0,
    isDefault: pm.id === defaultId,
  }));
}

export function stripeSetupReturnUrls(platform: CheckoutPlatform, returnPath?: string) {
  const origin = getAppOrigin();
  if (platform === "mobile") {
    return {
      successUrl: `${origin}/payments/mobile-return?session_id={CHECKOUT_SESSION_ID}&setup=1`,
      cancelUrl: `${origin}/payments/mobile-cancel?setup=1`,
    };
  }
  const base = safeReturnPath(returnPath, "/wallet");
  const sep = base.includes("?") ? "&" : "?";
  return {
    successUrl: `${origin}${base}${sep}setup=success&session_id={CHECKOUT_SESSION_ID}`,
    cancelUrl: `${origin}${base}${sep}setup=cancel`,
  };
}

export async function createSetupCheckoutSession(input: {
  userId: string;
  email?: string | null;
  platform?: CheckoutPlatform;
  returnPath?: string;
}) {
  if (!isStripeConfigured()) {
    return { error: "결제가 설정되지 않았습니다." };
  }

  const customerId = await getOrCreateStripeCustomer(input.userId, input.email);
  const urls = stripeSetupReturnUrls(input.platform ?? "web", input.returnPath);
  const stripe = getStripe();

  const session = await stripe.checkout.sessions.create({
    mode: "setup",
    customer: customerId,
    payment_method_types: ["card"],
    success_url: urls.successUrl,
    cancel_url: urls.cancelUrl,
    metadata: { userId: input.userId, purpose: "save_payment_method" },
  });

  if (!session.url) return { error: "카드 등록 세션을 만들지 못했습니다." };
  return { checkoutUrl: session.url, sessionId: session.id };
}

export async function confirmSetupCheckoutSession(userId: string, sessionId: string) {
  if (!isStripeConfigured()) return { error: "결제가 설정되지 않았습니다." };

  const stripe = getStripe();
  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["setup_intent"],
  });

  if (session.mode !== "setup") return { error: "잘못된 세션입니다." };
  if (session.metadata?.userId !== userId) return { error: "세션 사용자가 일치하지 않습니다." };
  if (session.status !== "complete") return { error: "카드 등록이 완료되지 않았습니다." };

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { stripeCustomerId: true },
  });
  if (!user?.stripeCustomerId || session.customer !== user.stripeCustomerId) {
    return { error: "고객 정보가 일치하지 않습니다." };
  }

  const setupIntent =
    typeof session.setup_intent === "string"
      ? await stripe.setupIntents.retrieve(session.setup_intent)
      : session.setup_intent;

  const paymentMethodId =
    typeof setupIntent?.payment_method === "string"
      ? setupIntent.payment_method
      : setupIntent?.payment_method?.id;

  if (paymentMethodId) {
    const existing = await listSavedPaymentMethods(userId);
    if (existing.length === 0) {
      await stripe.customers.update(user.stripeCustomerId, {
        invoice_settings: { default_payment_method: paymentMethodId },
      });
    }
  }

  const methods = await listSavedPaymentMethods(userId);
  return { ok: true as const, methods };
}

export async function detachPaymentMethod(userId: string, paymentMethodId: string) {
  if (!isStripeConfigured()) return { error: "결제가 설정되지 않았습니다." };

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { stripeCustomerId: true },
  });
  if (!user?.stripeCustomerId) return { error: "등록된 카드가 없습니다." };

  const stripe = getStripe();
  const pm = await stripe.paymentMethods.retrieve(paymentMethodId);
  if (pm.customer !== user.stripeCustomerId) {
    return { error: "본인 카드만 삭제할 수 있습니다." };
  }

  await stripe.paymentMethods.detach(paymentMethodId);

  const remaining = await listSavedPaymentMethods(userId);
  if (remaining.length > 0 && !remaining.some((m) => m.isDefault)) {
    await stripe.customers.update(user.stripeCustomerId, {
      invoice_settings: { default_payment_method: remaining[0]!.id },
    });
  }

  return { ok: true as const, methods: await listSavedPaymentMethods(userId) };
}

export async function setDefaultPaymentMethod(userId: string, paymentMethodId: string) {
  if (!isStripeConfigured()) return { error: "결제가 설정되지 않았습니다." };

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { stripeCustomerId: true },
  });
  if (!user?.stripeCustomerId) return { error: "등록된 카드가 없습니다." };

  const stripe = getStripe();
  const pm = await stripe.paymentMethods.retrieve(paymentMethodId);
  if (pm.customer !== user.stripeCustomerId) {
    return { error: "본인 카드만 선택할 수 있습니다." };
  }

  await stripe.customers.update(user.stripeCustomerId, {
    invoice_settings: { default_payment_method: paymentMethodId },
  });

  return { ok: true as const, methods: await listSavedPaymentMethods(userId) };
}
