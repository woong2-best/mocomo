import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getCachedCurrentUser } from "@/lib/auth";
import { UsedAdultVerifyForm } from "@/components/used/used-adult-verify-form";
import { isUsedMarketEligible } from "@/lib/used-bank-auth";
import { usedMarketVerifyPath } from "@/lib/used-market-verify-path";
import { isUsedAdultVerified } from "@/lib/used-youth-protection";
import { AppPageChrome, NativePageTitle } from "@/components/layout/app-page-chrome";

export default async function UsedAdultVerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; kind?: string }>;
}) {
  const user = await getCachedCurrentUser();
  if (!user) redirect("/auth/signin?callbackUrl=/market/adult-verify");

  const { callbackUrl, kind } = await searchParams;
  const next = callbackUrl?.startsWith("/market") ? callbackUrl : "/market";

  if (!isUsedMarketEligible(user)) {
    redirect(usedMarketVerifyPath(next, user.countryCode));
  }

  if (isUsedAdultVerified(user)) redirect(next);

  const label =
    kind === "ALCOHOL" ? t("lib.used.youth.protection.sccada8949d") : kind === "TOBACCO" ? t("lib.used.youth.protection.s2b92ea06c4") : kind === "ADULT" ? t("lib.used.youth.protection.s293f7b60bf") : undefined;

  return (
    <AppPageChrome maxWidth="lg" spacing="sm">
      <Link
        href={next}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground font-medium"
      >
        <ChevronLeft className="h-4 w-4" />
        돌아가기
      </Link>
      <NativePageTitle>
        <h1 className="text-xl font-bold">{t("app.market.s1y91hfi")}</h1>
      </NativePageTitle>
      <p className="text-sm text-muted-foreground">{t("app.market.s12ywxhk")}</p>
      <UsedAdultVerifyForm callbackUrl={next} restrictedLabel={label} />
    </AppPageChrome>
  );
}
