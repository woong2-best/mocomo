import { getUserGemBalance } from "@/lib/gems/balance";

/** 1 gem = 1 USD cent */
export async function getGemCheckoutQuote(userId: string, amountUsdCents: number) {
  const gemBalance = await getUserGemBalance(userId);
  const gemsRequired = amountUsdCents;
  return {
    gemBalance,
    gemsRequired,
    canPayWithGems: gemsRequired > 0 && gemBalance >= gemsRequired,
  };
}
