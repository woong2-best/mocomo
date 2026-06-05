import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getMyWallet } from "@/actions/wallet";
import { WalletDashboard } from "@/components/wallet/wallet-dashboard";
import { Wallet } from "lucide-react";

export default async function WalletPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin?callbackUrl=/wallet");

  const data = await getMyWallet();

  return (
    <div className="max-w-3xl mx-auto p-4 pb-24 space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Wallet className="h-7 w-7 text-muted-foreground" />
          정산 · 출금
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          후원·이모티콘 선물 수익을 확인하고 출금하세요.
        </p>
      </div>
      <WalletDashboard data={data} />
      <p className="text-xs text-muted-foreground text-center">
        <Link href="/support?tab=gifts" className="underline">
          받은 이모티콘 선물
        </Link>
        {" · "}
        <Link href="/support?tab=storage" className="underline">
          이모티콘 보관함
        </Link>
      </p>
    </div>
  );
}
