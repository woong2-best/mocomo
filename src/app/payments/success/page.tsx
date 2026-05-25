import Link from "next/link";
import { confirmStripeCheckout } from "@/actions/monetization";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle } from "lucide-react";

export default async function PaymentSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id } = await searchParams;

  if (!session_id) {
    return (
      <Result
        ok={false}
        title="결제 정보 없음"
        message="Stripe 결제 세션 ID가 없습니다."
      />
    );
  }

  const result = await confirmStripeCheckout(session_id);

  if ("error" in result && result.error) {
    return <Result ok={false} title="결제 실패" message={result.error} />;
  }

  const labels: Record<string, string> = {
    TIP: "후원",
    PRODUCT: "상품 구매",
    PREMIUM: "프리미엄 구독",
    EMOTICON: "이모티콘 구매",
    LISTING_FEE: "굿즈 등록비",
    PHYSICAL_GOODS: "굿즈 주문",
  };

  return (
    <Result
      ok
      title="결제 완료"
      message={`${labels[result.type ?? ""] ?? "결제"}가 정상 처리되었습니다.`}
    />
  );
}

function Result({ ok, title, message }: { ok: boolean; title: string; message: string }) {
  return (
    <div className="max-w-md mx-auto p-8 text-center space-y-4">
      {ok ? (
        <CheckCircle className="h-14 w-14 text-green-500 mx-auto" />
      ) : (
        <XCircle className="h-14 w-14 text-destructive mx-auto" />
      )}
      <h1 className="text-xl font-bold">{title}</h1>
      <p className="text-muted-foreground text-sm">{message}</p>
      <Link href="/">
        <Button className="rounded-xl">홈으로</Button>
      </Link>
    </div>
  );
}
