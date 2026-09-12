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

export default async function WalletPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin?callbackUrl=/wallet");

  const [data, earnings, paymentData, tipHistory, paymentHistory, gemData, gemPurchases, settlement] =
    await Promise.all([
    getMyWallet(),
    getMyWalletEarnings(),
    getMyPaymentMethods(),
    getMyTipHistory(),
    getMyPaymentHistory(),
    getMyGemBalance(),
    getMyGemPurchases(),
    getCreatorSettlementStatus(),
  ]);

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
