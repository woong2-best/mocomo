import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getCachedCurrentUser } from "@/lib/auth";
import { UsedPhoneVerifyForm } from "@/components/used/used-phone-verify-form";
import { isUsedMarketEligible } from "@/lib/used-phone-auth";

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
      <div className="py-8 max-w-lg mx-auto text-center space-y-4">
        <p className="text-muted-foreground">중고거래는 대한민국 회원만 이용할 수 있습니다.</p>
        <Link href="/used" className="text-primary underline text-sm">
          중고거래 홈으로
        </Link>
      </div>
    );
  }

  return (
    <div className="py-4 max-w-lg mx-auto">
      <Link
        href="/used"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground font-medium mb-4"
      >
        <ChevronLeft className="h-4 w-4" />
        중고거래 홈
      </Link>
      <UsedPhoneVerifyForm callbackUrl={next} />
    </div>
  );
}
