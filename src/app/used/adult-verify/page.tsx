import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getCachedCurrentUser } from "@/lib/auth";
import { UsedAdultVerifyForm } from "@/components/used/used-adult-verify-form";
import { isUsedMarketEligible } from "@/lib/used-phone-auth";
import { isUsedAdultVerified } from "@/lib/used-youth-protection";

export default async function UsedAdultVerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; kind?: string }>;
}) {
  const user = await getCachedCurrentUser();
  if (!user) redirect("/auth/signin?callbackUrl=/used/adult-verify");

  const { callbackUrl, kind } = await searchParams;
  const next = callbackUrl?.startsWith("/used") ? callbackUrl : "/used";

  if (!isUsedMarketEligible(user)) {
    redirect(`/used/verify?callbackUrl=${encodeURIComponent(next)}`);
  }

  if (isUsedAdultVerified(user)) redirect(next);

  const label =
    kind === "ALCOHOL" ? "술·주류" : kind === "TOBACCO" ? "담배" : kind === "ADULT" ? "성인용품" : undefined;

  return (
    <div className="py-4 max-w-lg mx-auto">
      <Link
        href={next}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground font-medium mb-4"
      >
        <ChevronLeft className="h-4 w-4" />
        돌아가기
      </Link>
      <h1 className="text-xl font-bold mb-1">성인 인증</h1>
      <p className="text-sm text-muted-foreground mb-6">중고거래 청소년 보호 (만 19세 이상)</p>
      <UsedAdultVerifyForm callbackUrl={next} restrictedLabel={label} />
    </div>
  );
}
