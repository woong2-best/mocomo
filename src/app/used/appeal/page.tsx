import { redirect } from "next/navigation";
import Link from "next/link";
import { AppPageChrome } from "@/components/layout/app-page-chrome";
import { UsedMarketAppealForm } from "@/components/used/used-market-appeal-form";
import { getUsedMarketAppealContext } from "@/actions/used-market-appeal";

export default async function UsedMarketAppealPage() {
  const ctx = await getUsedMarketAppealContext();
  if ("error" in ctx) {
    if (ctx.error === "로그인이 필요합니다.") {
      redirect("/auth/signin?callbackUrl=/used/appeal");
    }
    redirect("/used");
  }

  return (
    <AppPageChrome maxWidth="2xl" className="py-8">
      <div className="space-y-6">
        <div>
          <Link href="/used" className="text-sm text-muted-foreground hover:text-primary">
            ← 중고거래
          </Link>
          <h1 className="text-2xl font-bold mt-2">중고거래 이용 제한 이의 신청</h1>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
            경매 낙찰 후 결제 미이행 등으로 중고거래 이용이 제한된 경우, 정당한 사유가 있으면
            소명 자료와 함께 이의를 제출할 수 있습니다.
          </p>
        </div>
        <UsedMarketAppealForm
          userEmail={ctx.userEmail}
          banInfo={ctx.banInfo}
          openAppeal={ctx.openAppeal}
        />
      </div>
    </AppPageChrome>
  );
}
