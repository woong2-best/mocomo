"use client";

import Link from "next/link";
import { useTransition } from "react";
import { Check, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MARKET_BRAND_FULL, MARKET_BRAND_NAME } from "@/lib/market-brand";
import { MarketplaceSellerApplyForm } from "@/components/market/marketplace-seller-apply-form";
import { SellerSettlementInvoices } from "@/components/market/seller-settlement-invoices";
import type { SellerSettlementInvoiceRow } from "@/actions/marketplace-settlement-invoices";
import { resumeSellerConnectFromOnboarding } from "@/actions/marketplace-seller-onboarding";
import { openStripeConnectOnboardingUrl } from "@/lib/marketplace/open-stripe-connect-url";

export type SellerPrepState = {
  sellerInfoDone: boolean;
  firstProductDone: boolean;
  displayName: string;
  sellerTypeLabel: string;
  connectReady: boolean;
  connectMessage: string;
  listingsCount: number;
  welcome?: boolean;
  status: string;
  canList: boolean;
  stripeRequirementsDue?: boolean;
  stripeDisabled?: boolean;
};

export function SellerCenterHome({
  prep,
  profileFormName,
  settlementInvoices = [],
}: {
  prep: SellerPrepState;
  profileFormName: string;
  settlementInvoices?: SellerSettlementInvoiceRow[];
}) {
  const doneCount = (prep.sellerInfoDone ? 1 : 0) + (prep.firstProductDone ? 1 : 0);
  const total = 2;
  const progressPct = (doneCount / total) * 100;
  const showPrep = doneCount < total || prep.welcome;
  const [stripePending, startStripe] = useTransition();

  function resumeStripe() {
    startStripe(async () => {
      const res = await resumeSellerConnectFromOnboarding();
      if ("url" in res && res.url) openStripeConnectOnboardingUrl(res.url, false);
    });
  }

  return (
    <div className="space-y-5 max-w-4xl">
      {(!prep.connectReady || prep.stripeRequirementsDue || prep.stripeDisabled) && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 space-y-2">
          <p className="font-semibold">Stripe 온보딩</p>
          <p>{prep.connectMessage}</p>
          <Button type="button" size="sm" disabled={stripePending} onClick={resumeStripe}>
            Stripe 온보딩 이어서 하기
          </Button>
        </div>
      )}

      {prep.welcome && (
        <div
          className={cn(
            "rounded-xl border px-4 py-3 text-sm",
            prep.status === "APPROVED"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-amber-200 bg-amber-50 text-amber-900"
          )}
        >
          {prep.status === "APPROVED" ? (
            <>판매자 등록이 완료되었습니다. Stripe 정산이 준비되면 바로 상품을 등록할 수 있습니다.</>
          ) : (
            <>가입 신청이 접수되었습니다. Stripe 온보딩 완료 후 판매를 시작할 수 있습니다.</>
          )}
        </div>
      )}

      {prep.status === "PENDING" && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-semibold">승인 대기 중</p>
          <p className="mt-1 text-amber-800/90">
            Stripe 온보딩 상태를 확인 중입니다. 추가 정보가 필요하면 위 배너에서 이어서 진행해
            주세요.
          </p>
        </div>
      )}

      {prep.status === "REJECTED" && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          판매자 신청이 거절되었습니다. 판매자 가입을 다시 진행하거나 고객지원으로 문의해 주세요.
        </div>
      )}

      {showPrep && (
        <section className="rounded-2xl border border-[#d8e0ef] bg-white p-5 sm:p-7 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-start gap-4 mb-6">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary text-xl font-black">
              M
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
                {MARKET_BRAND_FULL}과 함께 빠르게 판매를 시작하세요!
              </h1>
              <p className="text-sm text-muted-foreground mt-1.5">
                가이드에 따라 단계를 완료하면 바로 판매할 수 있어요.
              </p>
            </div>
            <div className="sm:w-44 shrink-0">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-medium">판매 준비하기</span>
                <span className="text-muted-foreground">
                  {doneCount}/{total}
                </span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <PrepCard
              done={prep.sellerInfoDone}
              title="판매자 정보 입력하기"
              description="Stripe에서 본인 확인 및 정산 계좌를 등록합니다."
              actions={
                <Button asChild className="min-w-[9.5rem]">
                  <Link href="#profile">판매자 정보 입력</Link>
                </Button>
              }
            />

            <PrepCard
              done={prep.firstProductDone}
              title="첫 상품등록하기"
              description="첫 상품을 등록하면 판매를 시작할 수 있어요. 상품 사진·가격·배송 정보를 정확히 입력해 주세요."
              actions={
                <div className="flex flex-col gap-2 w-full sm:w-auto">
                  {prep.canList && prep.status === "APPROVED" ? (
                    <Button asChild className="min-w-[9.5rem]">
                      <Link href="/market/sell-item">상품등록 하기</Link>
                    </Button>
                  ) : (
                    <Button type="button" className="min-w-[9.5rem]" disabled>
                      승인 후 상품등록
                    </Button>
                  )}
                  <Button asChild variant="outline" className="min-w-[9.5rem] border-primary/40 text-primary">
                    <Link href="/market">{MARKET_BRAND_NAME}에서 둘러보기</Link>
                  </Button>
                </div>
              }
            />
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-border/60 bg-white p-5 sm:p-6 shadow-sm">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="text-base font-bold">판매자가이드 및 혜택</h2>
          <span className="text-xs text-muted-foreground">1/1</span>
        </div>
        <div className="grid sm:grid-cols-[140px_1fr] gap-4 items-center">
          <div className="h-28 rounded-xl bg-gradient-to-br from-primary/15 via-amber-50 to-sky-50 border border-border/40" />
          <div>
            <p className="font-semibold">성장하는 셀러를 위한 판매 가이드</p>
            <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
              상품 등록, 주문 처리, Stripe Connect 정산까지 {MARKET_BRAND_FULL} 판매자센터에서 한 번에
              관리할 수 있습니다. 약관과 정책을 확인한 뒤 첫 상품을 올려 보세요.
            </p>
            <Link
              href="/legal/seller-terms"
              className="inline-block mt-3 text-sm text-primary font-medium hover:underline"
            >
              판매자 이용약관 보기
            </Link>
          </div>
        </div>
      </section>

      <section
        id="profile"
        className="rounded-2xl border border-border/60 bg-white p-5 sm:p-6 shadow-sm scroll-mt-20"
      >
        <h2 className="text-base font-bold mb-1">판매자 정보 · 정산</h2>
        <p className="text-xs text-muted-foreground mb-4">
          {prep.sellerTypeLabel} · {prep.connectMessage}
          {prep.listingsCount > 0 ? ` · 등록 상품 ${prep.listingsCount}개` : ""}
        </p>
        <MarketplaceSellerApplyForm
          initialName={profileFormName}
          connectReady={prep.connectReady}
        />
      </section>

      <section
        id="settlement"
        className="rounded-2xl border border-border/60 bg-white p-5 sm:p-6 shadow-sm scroll-mt-20"
      >
        <h2 className="text-base font-bold mb-1">정산 · Invoice</h2>
        <p className="text-xs text-muted-foreground mb-4">
          Stripe Connect 정산 완료 주문의 플랫폼 수수료(10%) 차감 내역입니다.
        </p>
        <SellerSettlementInvoices invoices={settlementInvoices} />
      </section>
    </div>
  );
}

function PrepCard({
  done,
  title,
  description,
  actions,
}: {
  done: boolean;
  title: string;
  description: string;
  actions: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row sm:items-center gap-4 rounded-xl border px-4 py-4 sm:px-5",
        done ? "border-emerald-200 bg-emerald-50/40" : "border-[#c9d7f5] bg-[#f7f9ff]"
      )}
    >
      <div
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2",
          done
            ? "border-emerald-500 bg-emerald-500 text-white"
            : "border-muted-foreground/30 text-muted-foreground/40"
        )}
      >
        <Check className="h-5 w-5" strokeWidth={2.5} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-[15px] sm:text-base">{title}</p>
        <p className="text-sm text-muted-foreground mt-1 leading-relaxed flex items-start gap-1">
          <span>{description}</span>
          <Info className="h-3.5 w-3.5 shrink-0 mt-0.5 opacity-50" />
        </p>
      </div>
      {!done && <div className="sm:ml-auto shrink-0">{actions}</div>}
      {done && (
        <span className="sm:ml-auto text-sm font-medium text-emerald-700 shrink-0">완료</span>
      )}
    </div>
  );
}
