import { SellerPortalShell } from "@/components/market/seller-portal-shell";
import { SellerOnboardingWizard } from "@/components/market/seller-onboarding-wizard";
import { getSellerOnboardingState } from "@/actions/marketplace-seller-onboarding";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { MARKET_BRAND_FULL } from "@/lib/market-brand";
import { isSafeReturnPath } from "@/lib/safe-link";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `판매자 가입 — ${MARKET_BRAND_FULL}`,
  description: `${MARKET_BRAND_FULL} 판매자 온보딩. 계정·약관·Stripe 본인 확인 및 정산까지 한 번에 시작하세요.`,
};

export default async function SellerRegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ connect?: string; app?: string; return?: string }>;
}) {
  const params = await searchParams;
  const fromApp = params.app === "1";
  const returnTo =
    typeof params.return === "string" && isSafeReturnPath(params.return) ? params.return : null;

  const session = await auth();
  if (!session?.user?.id) {
    const qs = new URLSearchParams();
    if (fromApp) qs.set("app", "1");
    if (returnTo) qs.set("return", returnTo);
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    redirect(`/auth/signin?callbackUrl=${encodeURIComponent(`/market/seller/register${suffix}`)}`);
  }

  const state = await getSellerOnboardingState();
  if (state.signedIn && state.step === "COMPLETE") {
    if (fromApp && returnTo) {
      redirect(returnTo);
    }
    redirect("/market/seller");
  }

  const connect = params.connect;

  return (
    <SellerPortalShell
      signedIn
      fromApp={fromApp}
      username={session.user.username ?? null}
    >
      <SellerOnboardingWizard
        initialState={state}
        connectParam={connect}
        fromApp={fromApp}
        returnTo={returnTo}
      />
    </SellerPortalShell>
  );
}
