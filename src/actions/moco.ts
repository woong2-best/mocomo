"use server";

const RETIRED =
  t("actions.stripe_7");

export async function listMocoTopupPackages() {
  return [] as const;
}

/** @deprecated Virtual currency retired — use direct Stripe checkout */
export async function createMocoTopupCheckout(_mocoAmount: number) {
  return { error: RETIRED };
}

/** @deprecated Virtual currency retired — use direct Stripe TIP checkout */
export async function tipWithMoco(_input: {
  receiverId: string;
  mocoAmount: number;
  message?: string;
  channelId?: string;
}) {
  return { error: RETIRED };
}
