import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getCachedCurrentUser } from "@/lib/auth";
import { UsedPostForm } from "@/components/used/used-post-form";
import { isUsedMarketEligible } from "@/lib/used-bank-auth";
import { usedMarketVerifyPath } from "@/lib/used-market-verify-path";
import { isUsedAdultVerified } from "@/lib/used-youth-protection";
import { getServerTranslator } from "@/lib/i18n/server";
import { AppPageChrome, NativePageTitle } from "@/components/layout/app-page-chrome";
import { assertUsedMarketCountryAllowed } from "@/lib/used-regions-global";
import { usedMarketBlockedRegionMsg } from "@/lib/used-bank-auth";

export default async function UsedNewPage() {
  const user = await getCachedCurrentUser();
  if (!user) redirect("/auth/signin?callbackUrl=/used/new");
  const { locale } = await getServerTranslator();

  const regionErr = assertUsedMarketCountryAllowed(user.countryCode);
  if (regionErr) {
    return (
      <AppPageChrome maxWidth="lg" spacing="sm" className="py-8 text-center">
        <p className="text-muted-foreground">{usedMarketBlockedRegionMsg(locale)}</p>
        <Link href="/used" className="text-primary underline text-sm">
          {locale === "en" ? "Back to marketplace" : "중고거래 홈으로"}
        </Link>
      </AppPageChrome>
    );
  }

  if (!isUsedMarketEligible(user)) {
    redirect(usedMarketVerifyPath("/used/new", user.countryCode));
  }

  const sns = user.profile?.snsLinks as { location?: string } | null | undefined;

  return (
    <AppPageChrome maxWidth="lg" spacing="sm">
      <Link
        href="/used"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground font-medium"
      >
        <ChevronLeft className="h-4 w-4" />
        {locale === "en" ? "Marketplace" : "중고거래 홈"}
      </Link>
      <NativePageTitle>
        <h1 className="text-xl font-bold">
          {locale === "en" ? "Sell an item" : "내 물건 팔기"}
        </h1>
      </NativePageTitle>
      <p className="text-sm text-muted-foreground">
        {locale === "en"
          ? "Add photos, price, and location."
          : "사진·가격·거래 지역을 입력해 글을 올려 보세요."}
      </p>
      <UsedPostForm
        defaultRegion={sns?.location}
        sellerAdultVerified={isUsedAdultVerified(user)}
        sellerCountryCode={user.countryCode}
      />
    </AppPageChrome>
  );
}
