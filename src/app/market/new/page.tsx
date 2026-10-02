import { errorText } from "@/lib/i18n/error-text";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getCachedCurrentUser } from "@/lib/auth";
import { defaultUsedRegionForCountry } from "@/lib/used-regions-global";
import { UsedPostForm } from "@/components/used/used-post-form";
import { isUsedMarketEligible } from "@/lib/used-bank-auth";
import { usedMarketVerifyPath } from "@/lib/used-market-verify-path";
import { isUsedAdultVerified } from "@/lib/used-youth-protection";
import { getServerTranslator } from "@/lib/i18n/server";
import { AppPageChrome } from "@/components/layout/app-page-chrome";
import { assertUsedMarketCountryAllowed } from "@/lib/used-regions-global";
import { usedMarketBlockedRegionMsg } from "@/lib/used-bank-auth";
import { MARKET_BRAND_NAME } from "@/lib/market-brand";

export default async function UsedNewPage() {
  const user = await getCachedCurrentUser();
  if (!user) redirect("/auth/signin?callbackUrl=/market/new");
  const { locale } = await getServerTranslator();

  const regionErr = assertUsedMarketCountryAllowed(user.countryCode);
  if (regionErr) {
    return (
      <AppPageChrome maxWidth="lg" spacing="sm" className="py-8 text-center">
        <p className="text-muted-foreground">{errorText(usedMarketBlockedRegionMsg())}</p>
        <Link href="/market" className="text-primary underline text-sm">
          {`Back to ${MARKET_BRAND_NAME}`}
        </Link>
      </AppPageChrome>
    );
  }

  if (!isUsedMarketEligible(user)) {
    redirect(usedMarketVerifyPath("/market/new", user.countryCode));
  }

  return (
    <AppPageChrome maxWidth="lg" spacing="sm">
      <Link
        href="/market"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground font-medium"
      >
        <ChevronLeft className="h-4 w-4" />
        {MARKET_BRAND_NAME}
      </Link>
      <UsedPostForm
        defaultRegion={defaultUsedRegionForCountry(user.countryCode)}
        sellerAdultVerified={isUsedAdultVerified(user)}
        sellerCountryCode={user.countryCode}
      />
    </AppPageChrome>
  );
}
