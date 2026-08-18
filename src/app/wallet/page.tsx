import { redirect } from "next/navigation";
import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { getMyPaymentMethods } from "@/actions/payment-methods";
import { getMyWallet, getMyWalletEarnings } from "@/actions/wallet";
import { WalletHub } from "@/components/wallet/wallet-hub";
import { AppPageChrome, NativePageTitle } from "@/components/layout/app-page-chrome";
import { apickBankLabel } from "@/lib/apick/bank-codes";
import { db } from "@/lib/db";

export default async function WalletPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin?callbackUrl=/wallet");

  const [data, earnings, paymentData, user] = await Promise.all([
    getMyWallet(),
    getMyWalletEarnings(),
    getMyPaymentMethods(),
    db.user.findUnique({
      where: { id: session.user.id },
      select: {
        name: true,
        emailVerified: true,
        bankVerifiedAt: true,
        settlementBankCode: true,
        settlementAccountLast4: true,
      },
    }),
  ]);

  const bankVerified = !!user?.bankVerifiedAt;
  const verifiedBankLabel =
    bankVerified && user?.settlementBankCode && user.settlementAccountLast4
      ? `${apickBankLabel(user.settlementBankCode)} ****${user.settlementAccountLast4}`
      : null;

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
          bankVerified={bankVerified}
          verifiedBankLabel={verifiedBankLabel}
          legalName={user?.name}
          emailVerified={!!user?.emailVerified}
        />
      </Suspense>
    </AppPageChrome>
  );
}
