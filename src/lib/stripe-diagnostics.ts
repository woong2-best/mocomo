import { getStripe, isStripeConfigured } from "@/lib/stripe";

export type StripeKeyMode = "test" | "live" | "missing" | "mismatch";

export type StripeDiagnostics = {
  configured: boolean;
  keyMode: StripeKeyMode;
  secretKeyPresent: boolean;
  publishableKeyPresent: boolean;
  webhookSecretPresent: boolean;
  connectWebhookSecretPresent: boolean;
  apiOk: boolean;
  accountId?: string;
  accountCountry?: string;
  defaultCurrency?: string;
  chargesEnabled?: boolean;
  payoutsEnabled?: boolean;
  balanceAvailableUsdCents?: number;
  balancePendingUsdCents?: number;
  apiError?: string;
};

function stripeKeyMode(): StripeKeyMode {
  const sk = process.env.STRIPE_SECRET_KEY?.trim() ?? "";
  const pk = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim() ?? "";
  if (!sk || !pk) return "missing";
  const skTest = sk.startsWith("sk_test_");
  const skLive = sk.startsWith("sk_live_");
  const pkTest = pk.startsWith("pk_test_");
  const pkLive = pk.startsWith("pk_live_");
  if (skTest && pkTest) return "test";
  if (skLive && pkLive) return "live";
  return "mismatch";
}

function sumBalanceUsdCents(
  entries: { currency: string; amount: number }[] | undefined
): number | undefined {
  if (!entries?.length) return 0;
  const usd = entries.find((e) => e.currency === "usd");
  return usd?.amount ?? 0;
}

/** Stripe API 연결·키 모드·웹훅 설정 (민감 값 미포함) */
export async function runStripeDiagnostics(): Promise<StripeDiagnostics> {
  const secretKeyPresent = !!process.env.STRIPE_SECRET_KEY?.trim();
  const publishableKeyPresent = !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim();
  const webhookSecretPresent = !!process.env.STRIPE_WEBHOOK_SECRET?.trim();
  const connectWebhookSecretPresent = !!process.env.STRIPE_CONNECT_WEBHOOK_SECRET?.trim();
  const configured = isStripeConfigured();
  const keyMode = stripeKeyMode();

  const base: StripeDiagnostics = {
    configured,
    keyMode,
    secretKeyPresent,
    publishableKeyPresent,
    webhookSecretPresent,
    connectWebhookSecretPresent,
    apiOk: false,
  };

  if (!configured) {
    return {
      ...base,
      apiError: "STRIPE_SECRET_KEY 또는 NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY 가 없습니다.",
    };
  }

  if (keyMode === "mismatch") {
    return {
      ...base,
      apiError: "Secret key와 Publishable key 모드(test/live)가 일치하지 않습니다.",
    };
  }

  try {
    const stripe = getStripe();
    const [account, balance] = await Promise.all([
      stripe.accounts.retrieve(),
      stripe.balance.retrieve(),
    ]);

    return {
      ...base,
      apiOk: true,
      accountId: account.id,
      accountCountry: account.country ?? undefined,
      defaultCurrency: account.default_currency ?? undefined,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      balanceAvailableUsdCents: sumBalanceUsdCents(balance.available),
      balancePendingUsdCents: sumBalanceUsdCents(balance.pending),
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Stripe API 오류";
    return { ...base, apiError: message };
  }
}
