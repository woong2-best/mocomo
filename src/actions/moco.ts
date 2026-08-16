"use server";

const RETIRED =
  "가상 재화 기능은 종료되었습니다. 후원·구매는 각 화면에서 Stripe로 바로 결제해 주세요.";

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
