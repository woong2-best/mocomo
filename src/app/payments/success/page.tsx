import Link from "next/link";
import { confirmStripeCheckout } from "@/actions/monetization";
import { errorText } from "@/lib/i18n/error-text";
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
        title="No payment information"
        message="Missing Stripe checkout session ID."
      />
    );
  }

  const result = await confirmStripeCheckout(session_id);

  if ("error" in result && result.error) {
    return <Result ok={false} title="Payment failed" message={errorText(result.error)} />;
  }

  const labels: Record<string, string> = {
    TIP: "Tip",
    PRODUCT: "Product purchase",
    PREMIUM: "Premium subscription",
    EMOTICON: "Emote purchase",
    LISTING_FEE: "Merch listing fee",
    VENDOR_ONBOARDING_FEE: "Seller onboarding fee",
    PHYSICAL_GOODS: "Merch order",
    EVENT_REGISTRATION: "Create event",
    STUDIO_ASSET: "Studio asset purchase",
  };

  const redirectPath =
    "redirectPath" in result && typeof result.redirectPath === "string"
      ? result.redirectPath
      : "/";

  return (
    <Result
      ok
      title="Payment complete"
      message={`${labels[result.type ?? ""] ?? "Payment"}가 정상 처리되었습니다.`}
      primaryHref={redirectPath}
      primaryLabel={
        result.type === "TIP"
          ? "돌아가기"
          : result.type === "EVENT_REGISTRATION"
            ? "이벤트 보기"
            : result.type === "STUDIO_ASSET"
              ? "Studio 보관함"
              : "Home"
      }
      subMessage={
        result.type === "TIP" &&
        typeof redirectPath === "string" &&
        redirectPath.startsWith("/voice/")
          ? "댓글 후원이 채팅에 표시됩니다. 라이브로 돌아가 확인해 보세요."
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
  primaryLabel = "Home",
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
