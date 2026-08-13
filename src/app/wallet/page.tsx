import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getMyWallet, getMyWalletEarnings } from "@/actions/wallet";
import { WalletHub } from "@/components/wallet/wallet-hub";
import { AppPageChrome, NativePageTitle } from "@/components/layout/app-page-chrome";

export default async function WalletPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin?callbackUrl=/wallet");

  const [data, earnings] = await Promise.all([getMyWallet(), getMyWalletEarnings()]);

  return (
    <AppPageChrome>
      <NativePageTitle>
        <h1 className="sr-only">지갑</h1>
      </NativePageTitle>
      <WalletHub data={data} earnings={earnings} />
    </AppPageChrome>
  );
}
