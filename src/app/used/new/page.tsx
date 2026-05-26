import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getCachedCurrentUser } from "@/lib/auth";
import { UsedPostForm } from "@/components/used/used-post-form";
import { UsedPhoneVerifyForm } from "@/components/used/used-phone-verify-form";
import { isUsedMarketEligible } from "@/lib/used-phone-auth";

export default async function UsedNewPage() {
  const user = await getCachedCurrentUser();
  if (!user) redirect("/auth/signin?callbackUrl=/used/new");

  if (user.countryCode !== "KR") {
    return (
      <div className="py-8 max-w-lg mx-auto text-center space-y-4">
        <p className="text-muted-foreground">중고거래는 대한민국 회원만 이용할 수 있습니다.</p>
        <Link href="/used" className="text-primary underline text-sm">
          중고거래 홈으로
        </Link>
      </div>
    );
  }

  if (!isUsedMarketEligible(user)) {
    return (
      <div className="py-4 max-w-lg mx-auto">
        <Link
          href="/used"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground font-medium mb-4"
        >
          <ChevronLeft className="h-4 w-4" />
          중고거래 홈
        </Link>
        <h1 className="text-xl font-bold mb-2">휴대폰 인증 후 글쓰기</h1>
        <p className="text-sm text-muted-foreground mb-6">
          안전한 거래를 위해 한국 휴대폰 번호 인증이 필요합니다.
        </p>
        <UsedPhoneVerifyForm callbackUrl="/used/new" />
      </div>
    );
  }

  const sns = user.profile?.snsLinks as { location?: string } | null | undefined;

  return (
    <div className="py-4 max-w-lg mx-auto">
      <Link
        href="/used"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground font-medium mb-4"
      >
        <ChevronLeft className="h-4 w-4" />
        중고거래 홈
      </Link>
      <h1 className="text-xl font-bold mb-1">내 물건 팔기</h1>
      <p className="text-sm text-muted-foreground mb-6">
        사진·가격·거래 지역을 입력해 글을 올려 보세요.
      </p>
      <UsedPostForm defaultRegion={sns?.location} />
    </div>
  );
}
