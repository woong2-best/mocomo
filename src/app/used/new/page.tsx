import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getCachedCurrentUser } from "@/lib/auth";
import { UsedPostForm } from "@/components/used/used-post-form";
import { UsedBankVerifyForm } from "@/components/used/used-bank-verify-form";
import { isUsedMarketEligible, usedMarketUnsupportedCountryMsg } from "@/lib/used-bank-auth";
import { isUsedAdultVerified } from "@/lib/used-youth-protection";
import { getServerTranslator } from "@/lib/i18n/server";
import { AppPageChrome, NativePageTitle } from "@/components/layout/app-page-chrome";

export default async function UsedNewPage() {
  const user = await getCachedCurrentUser();
  if (!user) redirect("/auth/signin?callbackUrl=/used/new");
  const { locale } = await getServerTranslator();

  if (user.countryCode.toUpperCase() !== "KR") {
    return (
      <AppPageChrome maxWidth="lg" spacing="sm" className="py-8 text-center">
        <p className="text-muted-foreground">{usedMarketUnsupportedCountryMsg(locale)}</p>
        <Link href="/used" className="text-primary underline text-sm">
          {locale === "en" ? "Back to marketplace" : "중고거래 홈으로"}
        </Link>
      </AppPageChrome>
    );
  }

  if (!isUsedMarketEligible(user)) {
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
            {locale === "en" ? "Verify bank account to post" : "계좌 인증 후 글쓰기"}
          </h1>
        </NativePageTitle>
        <p className="text-sm text-muted-foreground">
          {locale === "en"
            ? "Bank account verification is required for safe trading."
            : "안전한 거래를 위해 본인 명의 계좌 1원 인증이 필요합니다."}
        </p>
        <UsedBankVerifyForm callbackUrl="/used/new" legalName={user.name} />
      </AppPageChrome>
    );
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
