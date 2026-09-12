import { redirect } from "next/navigation";
import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { getMyPaymentMethods } from "@/actions/payment-methods";
import { getMyTipHistory } from "@/actions/support";
import { getMyWallet, getMyWalletEarnings, getMyPaymentHistory } from "@/actions/wallet";
import { getMyGemBalance, getMyGemPurchases } from "@/actions/gems";
import { WalletHub } from "@/components/wallet/wallet-hub";
import { AppPageChrome, NativePageTitle } from "@/components/layout/app-page-chrome";
import { getCreatorSettlementStatus } from "@/actions/settlement-register";
import type { WalletEarningsAnalytics } from "@/lib/wallet-analytics";
import { GEM_TOPUP_PACKAGES } from "@/lib/gems/constants";

const EMPTY_EARNINGS = (): WalletEarningsAnalytics => {
  const year = new Date().getFullYear();
  return {
    year,
    years: [year],
    months: [],
    transactions: [],
    yearEarned: 0,
    yearWithdrawn: 0,
    yearNet: 0,
    bySource: [],
    summary: {
      availableBalance: 0,
      totalEarned: 0,
      totalWithdrawn: 0,
      pendingPayout: 0,
      withdrawable: 0,
    },
  };
};

export default async function WalletPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin?callbackUrl=/wallet");

  const results = await Promise.allSettled([
    getMyWallet(),
    getMyWalletEarnings(),
    getMyPaymentMethods(),
    getMyTipHistory(),
    getMyPaymentHistory(),
    getMyGemBalance(),
    getMyGemPurchases(),
    getCreatorSettlementStatus(),
  ]);

  for (const r of results) {
    if (r.status === "rejected") {
      console.error("[wallet/page] load failed", r.reason);
    }
  }

  const data =
    results[0].status === "fulfilled"
      ? results[0].value
      : {
          availableBalance: 0,
          totalEarned: 0,
          totalWithdrawn: 0,
          pendingPayout: 0,
          bank: null,
          recent: [],
        };
  const earnings =
    results[1].status === "fulfilled" ? results[1].value : EMPTY_EARNINGS();
  const paymentData =
    results[2].status === "fulfilled" ? results[2].value : { methods: [], configured: false };
  const tipHistory = results[3].status === "fulfilled" ? results[3].value : null;
  const paymentHistory = results[4].status === "fulfilled" ? results[4].value : [];
  const gemData =
    results[5].status === "fulfilled"
      ? results[5].value
      : { balance: 0, packages: GEM_TOPUP_PACKAGES, termsCopy: "" };
  const gemPurchases =
    results[6].status === "fulfilled" ? results[6].value : { purchases: [], balance: 0 };
  const settlement =
    results[7].status === "fulfilled"
      ? results[7].value
      : {
          registered: false,
          payoutsEnabled: false,
          profile: null,
          settlementMocoPoints: 0,
          earnedMocoPoints: 0,
          earnedMocoTier: "SEED" as const,
          purchasedMocoPoints: 0,
          recentRewards: [],
        };

  if (!tipHistory) redirect("/auth/signin?callbackUrl=/wallet");

  return (
    <AppPageChrome spacing="sm">
      <NativePageTitle>
        <h1 className="text-2xl font-black tracking-tight text-foreground lg:sr-only">지갑</h1>
      </NativePageTitle>
      <Suspense fallback={null}>
        <WalletHub
          data={data}
          earnings={earnings}
          paymentMethods={paymentData.methods}
          tipHistory={tipHistory}
          paymentHistory={paymentHistory}
          gemBalance={gemData.balance}
          gemPackages={gemData.packages}
          gemPurchases={gemPurchases.purchases}
          settlement={settlement}
        />
      </Suspense>
    </AppPageChrome>
  );
}
