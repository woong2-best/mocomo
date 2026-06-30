import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getCachedCurrentUser } from "@/lib/auth";
import { UsedPhoneVerifyForm } from "@/components/used/used-phone-verify-form";
import { isUsedMarketEligible } from "@/lib/used-phone-auth";
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

  if (isUsedMarketEligible(user)) redirect(next);

  if (user.countryCode !== "KR") {
    return (
      <AppPageChrome maxWidth="lg" spacing="sm" className="py-8 text-center">
        <p className="text-muted-foreground">중고거래는 대한민국 회원만 이용할 수 있습니다.</p>
        <Link href="/used" className="text-primary underline text-sm">
          중고거래 홈으로
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
        중고거래 홈
      </Link>
      <NativePageTitle>
        <h1 className="text-xl font-bold">휴대폰 인증</h1>
      </NativePageTitle>
      <UsedPhoneVerifyForm callbackUrl={next} />
    </AppPageChrome>
  );
}
