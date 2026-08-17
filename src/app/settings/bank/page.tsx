import { redirect } from "next/navigation";
import { getCachedCurrentUser } from "@/lib/auth";
import { isBankVerified } from "@/lib/bank-verification";
import { walletSettlementPath } from "@/lib/settlement-account";

export default async function SettingsBankPage() {
  const user = await getCachedCurrentUser();
  if (!user) redirect("/auth/signin?callbackUrl=/settings/bank");

  if (isBankVerified(user)) {
    redirect("/wallet?tab=earnings");
  }

  redirect(walletSettlementPath("/settings/bank"));
}
