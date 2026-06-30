import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getCachedCurrentUser } from "@/lib/auth";
import { UsedPostForm } from "@/components/used/used-post-form";
import { UsedPhoneVerifyForm } from "@/components/used/used-phone-verify-form";
import { isUsedMarketEligible } from "@/lib/used-phone-auth";
import { isUsedAdultVerified } from "@/lib/used-youth-protection";
import { AppPageChrome, NativePageTitle } from "@/components/layout/app-page-chrome";

export default async function UsedNewPage() {
  const user = await getCachedCurrentUser();
  if (!user) redirect("/auth/signin?callbackUrl=/used/new");

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

  if (!isUsedMarketEligible(user)) {
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
          <h1 className="text-xl font-bold">휴대폰 인증 후 글쓰기</h1>
        </NativePageTitle>
        <p className="text-sm text-muted-foreground">
          안전한 거래를 위해 한국 휴대폰 번호 인증이 필요합니다.
        </p>
        <UsedPhoneVerifyForm callbackUrl="/used/new" />
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
        중고거래 홈
      </Link>
      <NativePageTitle>
        <h1 className="text-xl font-bold">내 물건 팔기</h1>
      </NativePageTitle>
      <p className="text-sm text-muted-foreground">
        사진·가격·거래 지역을 입력해 글을 올려 보세요.
      </p>
      <UsedPostForm
        defaultRegion={sns?.location}
        sellerAdultVerified={isUsedAdultVerified(user)}
      />
    </AppPageChrome>
  );
}
