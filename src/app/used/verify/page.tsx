import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getCachedCurrentUser } from "@/lib/auth";
import { UsedPhoneVerifyForm } from "@/components/used/used-phone-verify-form";
import { isUsedMarketEligible, usedMarketUnsupportedCountryMsg } from "@/lib/used-phone-auth";
import { isUsedMarketPhoneCountry } from "@/lib/used-phone-countries";
import { getServerTranslator } from "@/lib/i18n/server";
import { AppPageChrome, NativePageTitle } from "@/components/layout/app-page-chrome";

export default async function UsedVerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const user = await getCachedCurrentUser();
  if (!user) redirect("/auth/signin?callbackUrl=/used/verify");

  const { callbackUrl } = await searchParams;
  const next = callbackUrl?.startsWith("/used") ? callbackUrl : "/used/new";
  const { locale } = await getServerTranslator();

  if (isUsedMarketEligible(user)) redirect(next);

  if (!isUsedMarketPhoneCountry(user.countryCode)) {
    return (
      <AppPageChrome maxWidth="lg" spacing="sm" className="py-8 text-center">
        <p className="text-muted-foreground">{usedMarketUnsupportedCountryMsg(locale)}</p>
        <Link href="/used" className="text-primary underline text-sm">
          {locale === "en" ? "Back to marketplace" : "중고거래 홈으로"}
        </Link>
      </AppPageChrome>
    );
  }

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
          {locale === "en" ? "Phone verification" : "휴대폰 인증"}
        </h1>
      </NativePageTitle>
      <UsedPhoneVerifyForm callbackUrl={next} countryCode={user.countryCode} />
    </AppPageChrome>
  );
}
