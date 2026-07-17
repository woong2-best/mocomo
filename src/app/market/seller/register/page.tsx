import { SellerPortalShell } from "@/components/market/seller-portal-shell";
import { SellerOnboardingWizard } from "@/components/market/seller-onboarding-wizard";
import { getSellerOnboardingState } from "@/actions/marketplace-seller-onboarding";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "판매자 가입 — MoCoMo MARKET",
  description: "MoCoMo MARKET 판매자 온보딩. 계정·약관·인증·정산까지 한 번에 시작하세요.",
};

export default async function SellerRegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ connect?: string }>;
}) {
  const state = await getSellerOnboardingState();
  if (state.signedIn && state.step === "COMPLETE") {
    redirect("/market/seller");
  }

  const connect = (await searchParams).connect;

  return (
    <SellerPortalShell>
      <SellerOnboardingWizard initialState={state} connectParam={connect} />
    </SellerPortalShell>
  );
}
