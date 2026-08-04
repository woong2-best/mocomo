import Link from "next/link";
import { confirmStripeCheckout } from "@/actions/monetization";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle } from "lucide-react";
import { AppPageChrome, NativePageTitle } from "@/components/layout/app-page-chrome";

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
    FLOWER: "Flower Gift 구매",
    LISTING_FEE: "굿즈 등록비",
    PHYSICAL_GOODS: "굿즈 주문",
    EVENT_REGISTRATION: "이벤트 등록",
    STUDIO_ASSET: "Studio 자산 구매",
    MOCO_TOPUP: "모코 충전",
  };

  const redirectPath =
    "redirectPath" in result && typeof result.redirectPath === "string"
      ? result.redirectPath
      : "/";

  return (
    <Result
      ok
      title="결제 완료"
      message={`${labels[result.type ?? ""] ?? "결제"}가 정상 처리되었습니다.`}
      primaryHref={redirectPath}
      primaryLabel={
        result.type === "TIP"
          ? "돌아가기"
          : result.type === "MOCO_TOPUP"
            ? "지갑 보기"
            : result.type === "EVENT_REGISTRATION"
            ? "이벤트 보기"
            : result.type === "STUDIO_ASSET"
              ? "Studio 보관함"
              : "홈으로"
      }
      subMessage={
        result.type === "TIP" &&
        typeof redirectPath === "string" &&
        redirectPath.startsWith("/voice/")
          ? "영상 후원은 호스트 검수 후 방송에 재생됩니다."
          : undefined
      }
    />
  );
}

function Result({
  ok,
  title,
  message,
  subMessage,
  primaryHref = "/",
  primaryLabel = "홈으로",
}: {
  ok: boolean;
  title: string;
  message: string;
  subMessage?: string;
  primaryHref?: string;
  primaryLabel?: string;
}) {
  return (
    <AppPageChrome maxWidth="lg" spacing="sm" className="!p-8 text-center">
      {ok ? (
        <CheckCircle className="h-14 w-14 text-green-500 mx-auto" />
      ) : (
        <XCircle className="h-14 w-14 text-destructive mx-auto" />
      )}
      <NativePageTitle>
        <h1 className="text-xl font-bold">{title}</h1>
      </NativePageTitle>
      <p className="text-muted-foreground text-sm">{message}</p>
      {subMessage && <p className="text-sm text-primary font-medium">{subMessage}</p>}
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
        <Link href={primaryHref}>
          <Button className="rounded-xl w-full sm:w-auto">{primaryLabel}</Button>
        </Link>
        {ok && primaryHref !== "/support" && (
          <Link href="/support">
            <Button variant="outline" className="rounded-xl w-full sm:w-auto">
              후원 내역
            </Button>
          </Link>
        )}
      </div>
    </AppPageChrome>
  );
}
