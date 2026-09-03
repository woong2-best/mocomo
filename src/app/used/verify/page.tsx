import { redirect } from "next/navigation";
import Link from "next/link";
import { getCachedCurrentUser } from "@/lib/auth";
import { isUsedMarketEligible } from "@/lib/used-bank-auth";
import { usedMarketVerifyPath } from "@/lib/used-market-verify-path";
import { isKoreaUsedMarketCountry } from "@/lib/used-regions-global";
import { walletSettlementPath } from "@/lib/settlement-account";
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
  const next = callbackUrl?.startsWith("/") ? callbackUrl : "/used/new";
  const { locale } = await getServerTranslator();

  if (!user) {
    redirect(
      `/auth/signin?callbackUrl=${encodeURIComponent(usedMarketVerifyPath(next, "KR"))}`
    );
  }

  if (isUsedMarketEligible(user)) redirect(next);

  if (isKoreaUsedMarketCountry(user.countryCode)) {
    redirect(walletSettlementPath(next));
  }

  return (
    <AppPageChrome maxWidth="md" spacing="sm" className="py-6 space-y-4">
      <div>
        <Link href="/used" className="text-sm text-muted-foreground hover:text-foreground underline">
          {locale === "en" ? "Back to marketplace" : "중고거래 홈"}
        </Link>
        <h1 className="text-xl font-bold mt-2">
          {locale === "en" ? "Verify to use marketplace" : "중고거래 이용 인증"}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {locale === "en"
            ? "Phone verification is required before listing, bidding, or chatting."
            : "글 등록·입찰·채팅 전 휴대폰 인증이 필요합니다."}
        </p>
      </div>
      <UsedPhoneVerifyForm callbackUrl={next} countryCode={user.countryCode} />
    </AppPageChrome>
  );
}
