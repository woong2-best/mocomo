import { getUserGemBalance } from "@/lib/gems/balance";
import { usdCentsToMocoRequired } from "@/lib/gems/constants";

export async function getGemCheckoutQuote(userId: string, amountUsdCents: number) {
  const gemBalance = await getUserGemBalance(userId);
  const gemsRequired = usdCentsToMocoRequired(amountUsdCents);
  return {
    gemBalance,
    gemsRequired,
    canPayWithGems: gemsRequired > 0 && gemBalance >= gemsRequired,
  };
}
