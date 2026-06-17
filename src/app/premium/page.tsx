import { auth } from "@/lib/auth";
import { isPaymentsConfigured, PREMIUM_USD_CENTS } from "@/lib/payments";
import { formatMocoDisplay, usdCentsToMocoDisplay } from "@/lib/moco-display";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Crown, Check } from "lucide-react";
import { PayButton } from "@/components/payments/pay-button";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const benefits = [
  "광고 제거",
  "프로필 꾸미기 확장",
  "고급 기능 · 스트리밍 확장",
  "추가 저장공간",
  "특별 배지",
];

export default async function PremiumPage() {
  const session = await auth();
  const isPremium = session?.user?.premiumTier === "PREMIUM";
  const paymentsEnabled = isPaymentsConfigured();
  const priceUsd = (PREMIUM_USD_CENTS / 100).toFixed(2);
  const mocoHint = formatMocoDisplay(usdCentsToMocoDisplay(PREMIUM_USD_CENTS));

  return (
    <div className="max-w-lg mx-auto p-4 space-y-6 pb-24 lg:pb-6">
      <div className="text-center">
        <Crown className="h-12 w-12 text-yellow-400 mx-auto mb-2" />
        <h1 className="text-2xl font-bold">MoCoMo Premium</h1>
        <p className="text-muted-foreground mt-2">월 ${priceUsd}</p>
        <p className="text-xs text-muted-foreground mt-1">{mocoHint} (표시 단위만)</p>
      </div>

      <Card className="border-yellow-500/30 bg-gradient-to-b from-yellow-500/10 to-transparent rounded-2xl">
        <CardHeader>
          <CardTitle>프리미엄 혜택</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {benefits.map((b) => (
            <div key={b} className="flex items-center gap-2 text-sm">
              <Check className="h-4 w-4 text-primary shrink-0" />
              {b}
            </div>
          ))}
        </CardContent>
      </Card>

      {isPremium ? (
        <p className="text-center text-primary font-medium">프리미엄 회원입니다</p>
      ) : session ? (
        paymentsEnabled ? (
          <PayButton
            type="PREMIUM"
            amount={PREMIUM_USD_CENTS}
            orderName="MoCoMo Premium (1 month)"
            metadata={{}}
            className="w-full rounded-xl"
          >
            ${priceUsd}/월 구독하기
          </PayButton>
        ) : (
          <p className="text-center text-sm text-muted-foreground">
            결제 연동 후 구독할 수 있습니다. Stripe API 키를 설정하세요.
          </p>
        )
      ) : (
        <Link href="/auth/signin?callbackUrl=/premium">
          <Button className="w-full rounded-xl">로그인 후 구독</Button>
        </Link>
      )}
    </div>
  );
}
