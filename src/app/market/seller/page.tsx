import { SellerCenterShell } from "@/components/market/seller-center-shell";
import { SellerCenterHome } from "@/components/market/seller-center-home";
import {
  getMarketplaceSellerProfile,
  listMyMarketplaceListings,
  markMarketplaceConnectComplete,
} from "@/actions/marketplace";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { stripeConnectStatus } from "@/lib/stripe-connect";
import { formatSellerCode } from "@/lib/marketplace/seller-code";

export const dynamic = "force-dynamic";

export default async function MarketSellerPage({
  searchParams,
}: {
  searchParams: Promise<{ connect?: string; welcome?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/signin?callbackUrl=/market/seller");
  }

  const params = await searchParams;
  if (params.connect === "return") {
    await markMarketplaceConnectComplete().catch(() => null);
  }

  const [profile, listings] = await Promise.all([
    getMarketplaceSellerProfile(),
    listMyMarketplaceListings().catch(() => []),
  ]);

  if (!profile) {
    redirect("/market/seller/register");
  }

  if (!profile.onboardingCompletedAt && profile.onboardingStep !== "COMPLETE") {
    redirect("/market/seller/register");
  }

  const connectStatus = stripeConnectStatus(profile.user.stripeConnectAccountId);
  const sellerInfoDone =
    !!profile.sellerType &&
    profile.kycStatus !== "NOT_STARTED" &&
    (profile.sellerType === "INDIVIDUAL" ||
      (!!profile.businessName && !!profile.businessRegNo));
  const firstProductDone = listings.length > 0;
  const displayName =
    profile.displayName || session.user.name || session.user.username || "판매자";

  return (
    <SellerCenterShell displayName={displayName} sellerCode={formatSellerCode(profile.id)}>
      <SellerCenterHome
        prep={{
          sellerInfoDone,
          firstProductDone,
          displayName,
          sellerTypeLabel:
            profile.sellerType === "BUSINESS"
              ? "사업자 판매자"
              : profile.sellerType === "INDIVIDUAL"
                ? "개인 판매자"
                : "판매자",
          connectReady: connectStatus.ready,
          connectMessage: connectStatus.message,
          listingsCount: listings.length,
          welcome: params.welcome === "1",
        }}
        profileFormName={displayName}
      />
    </SellerCenterShell>
  );
}
