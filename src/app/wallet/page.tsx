import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { AppPageChrome } from "@/components/layout/app-page-chrome";
import { Wallet, Coins, Gift, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getOrCreatePlatformWallet } from "@/lib/platform/wallet/service";
import { MocoTopupPanel } from "@/components/wallet/moco-topup-panel";

export const dynamic = "force-dynamic";

/** 플랫폼 Wallet (MOCO 포인트 · 크레딧) — 정산·출금은 /support?tab=settlement */
export default async function WalletPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin?callbackUrl=/wallet");

  const wallet = await getOrCreatePlatformWallet(session.user.id);

  return (
    <AppPageChrome maxWidth="3xl" spacing="sm">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Wallet className="h-7 w-7 text-muted-foreground" />
          Wallet
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          모코(가상 재화) · 사이트 크레딧 · 프로모션 크레딧 · 환불금
        </p>
      </div>

      <MocoTopupPanel />

      <div className="grid gap-3 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Coins className="h-4 w-4" /> 모코
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-black">{wallet.mocoPoints.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">
              후원·이벤트용 표시 재화 (1모코 = ₩10)
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Gift className="h-4 w-4" /> 사이트 크레딧
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-black">₩{wallet.siteCreditKrw.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">결제·구매에 사용</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">프로모션 크레딧</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-black">₩{wallet.promoCreditKrw.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <RefreshCw className="h-4 w-4" /> 환불 잔액
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-black">₩{wallet.refundCreditKrw.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        후원 수익 정산·출금은{" "}
        <Link href="/support?tab=settlement" className="underline">
          후원 정산 출금
        </Link>
        에서 이용하세요.
      </p>
    </AppPageChrome>
  );
}
