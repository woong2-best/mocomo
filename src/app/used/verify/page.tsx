import { redirect } from "next/navigation";
import { getCachedCurrentUser } from "@/lib/auth";
import { isUsedMarketEligible } from "@/lib/used-bank-auth";
import { walletSettlementPath } from "@/lib/settlement-account";

export default async function UsedVerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const user = await getCachedCurrentUser();
  const { callbackUrl } = await searchParams;
  const next = callbackUrl?.startsWith("/") ? callbackUrl : "/used/new";

  if (!user) redirect(`/auth/signin?callbackUrl=${encodeURIComponent(walletSettlementPath(next))}`);

  if (isUsedMarketEligible(user)) redirect(next);

  redirect(walletSettlementPath(next));
}
