import { errorText } from "@/lib/i18n/error-text";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getCachedCurrentUser } from "@/lib/auth";
import { defaultUsedRegionForCountry } from "@/lib/used-regions-global";
import { UsedPostForm } from "@/components/used/used-post-form";
import { isUsedAdultVerified } from "@/lib/used-youth-protection";
import { AppPageChrome } from "@/components/layout/app-page-chrome";
import { assertUsedMarketCountryAllowed } from "@/lib/used-regions-global";
import { usedMarketBlockedRegionMsg } from "@/lib/used-bank-auth";
import { MARKET_BRAND_NAME } from "@/lib/market-brand";

export default async function MarketPhysicalSellPage() {
  const user = await getCachedCurrentUser();
  if (!user) redirect("/auth/signin?callbackUrl=/market/new/physical");

  const regionErr = assertUsedMarketCountryAllowed(user.countryCode);
  if (regionErr) {
    return (
      <AppPageChrome maxWidth="lg" spacing="sm" className="py-8 text-center">
        <p className="text-muted-foreground">{errorText(usedMarketBlockedRegionMsg())}</p>
        <Link href="/market" className="text-sm text-primary underline">
          {`Back to ${MARKET_BRAND_NAME}`}
        </Link>
      </AppPageChrome>
    );
  }

  return (
    <AppPageChrome maxWidth="lg" spacing="sm">
      <Link
        href="/market/new"
        className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        {MARKET_BRAND_NAME}
      </Link>
      <UsedPostForm
        defaultRegion={defaultUsedRegionForCountry(user.countryCode)}
        sellerAdultVerified={isUsedAdultVerified(user)}
        sellerCountryCode={user.countryCode}
        forcedTrack="physical"
      />
    </AppPageChrome>
  );
}
