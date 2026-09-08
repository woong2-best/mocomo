import { redirect } from "next/navigation";
import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { getMyPaymentMethods } from "@/actions/payment-methods";
import { getMyTipHistory } from "@/actions/support";
import { getMyWallet, getMyWalletEarnings, getMyPaymentHistory } from "@/actions/wallet";
import { getMyGemBalance, getMyGemPurchases } from "@/actions/gems";
import { WalletHub } from "@/components/wallet/wallet-hub";
import { AppPageChrome, NativePageTitle } from "@/components/layout/app-page-chrome";
import { db } from "@/lib/db";

export default async function WalletPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin?callbackUrl=/wallet");

  const [data, earnings, paymentData, tipHistory, paymentHistory, gemData, gemPurchases, user] =
    await Promise.all([
    getMyWallet(),
    getMyWalletEarnings(),
    getMyPaymentMethods(),
    getMyTipHistory(),
    getMyPaymentHistory(),
    getMyGemBalance(),
    getMyGemPurchases(),
    db.user.findUnique({
      where: { id: session.user.id },
      select: {
        stripeOnboardingCompleted: true,
      },
    }),
  ]);

  if (!tipHistory) redirect("/auth/signin?callbackUrl=/wallet");

  const stripeOnboardingCompleted = !!user?.stripeOnboardingCompleted;

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
          stripeOnboardingCompleted={stripeOnboardingCompleted}
        />
      </Suspense>
    </AppPageChrome>
  );
}
