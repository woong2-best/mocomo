import { redirect } from "next/navigation";
import Link from "next/link";
import { getCachedCurrentUser } from "@/lib/auth";
import { isUsedMarketEligible } from "@/lib/used-bank-auth";
import { usedMarketVerifyPath } from "@/lib/used-market-verify-path";
import { isKoreaUsedMarketCountry } from "@/lib/used-regions-global";
import { UsedPhoneVerifyForm } from "@/components/used/used-phone-verify-form";
import { getServerTranslator } from "@/lib/i18n/server";
import { AppPageChrome } from "@/components/layout/app-page-chrome";

export default async function UsedVerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const user = await getCachedCurrentUser();
  const { callbackUrl } = await searchParams;
  const next = callbackUrl?.startsWith("/") ? callbackUrl : "/market/new";
  const { locale } = await getServerTranslator();

  if (!user) {
    redirect(
      `/auth/signin?callbackUrl=${encodeURIComponent(usedMarketVerifyPath(next, "KR"))}`
    );
  }

  if (isUsedMarketEligible(user) || isKoreaUsedMarketCountry(user.countryCode)) {
    redirect(next);
  }

  return (
    <AppPageChrome maxWidth="2xl" spacing="sm" className="py-6 space-y-4">
      <div>
        <Link href="/market" className="text-sm text-muted-foreground hover:text-foreground underline">
          {"Back to marketplace"}
        </Link>
        <h1 className="text-xl font-bold mt-2">
          {"Verify to use marketplace"}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {"Phone verification is required before listing, bidding, or chatting."}
        </p>
      </div>
      <UsedPhoneVerifyForm callbackUrl={next} countryCode={user.countryCode} />
    </AppPageChrome>
  );
}
