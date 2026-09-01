import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";

export default async function SellerConnectExternalPage({
  searchParams,
}: {
  searchParams: Promise<{ target?: string }>;
}) {
  const params = await searchParams;
  const target = params.target ?? null;
  const safeTarget =
    target && target.startsWith("https://connect.stripe.com/") ? target : null;

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <ExternalLink className="h-10 w-10 text-primary" />
      <h1 className="text-xl font-bold">Stripe 온보딩</h1>
      <p className="text-sm text-muted-foreground leading-relaxed">
        Stripe 본인 확인 및 정산 계좌 등록은 앱 내 브라우저에서 지원되지 않습니다. 아래 버튼으로
        Safari·Chrome 등 외부 브라우저에서 진행해 주세요.
      </p>
      {safeTarget ? (
        <Button asChild className="w-full">
          <a href={safeTarget} target="_blank" rel="noopener noreferrer">
            Stripe에서 계속하기
          </a>
        </Button>
      ) : (
        <Button asChild variant="secondary" className="w-full">
          <Link href="/market/seller/register">판매자 등록으로 돌아가기</Link>
        </Button>
      )}
    </div>
  );
}
