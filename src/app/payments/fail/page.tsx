import Link from "next/link";
import { Button } from "@/components/ui/button";
import { XCircle } from "lucide-react";
import { DEFAULT_LANDING_PATH } from "@/lib/site-routes";
import { AppPageChrome, NativePageTitle } from "@/components/layout/app-page-chrome";
import { OFAC_REGION_UNAVAILABLE_MESSAGE } from "@/lib/compliance/ofac-sanctioned-countries";

export default async function PaymentFailPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string; code?: string; reason?: string }>;
}) {
  const { message, code, reason } = await searchParams;
  const text =
    reason === "region"
      ? OFAC_REGION_UNAVAILABLE_MESSAGE
      : message ?? (code ? `오류 코드: ${code}` : "결제가 취소되었거나 실패했습니다.");

  return (
    <AppPageChrome maxWidth="lg" spacing="sm" className="!p-8 text-center">
      <XCircle className="h-14 w-14 text-destructive mx-auto" />
      <NativePageTitle>
        <h1 className="text-xl font-bold">결제 실패</h1>
      </NativePageTitle>
      <p className="text-muted-foreground text-sm">{text}</p>
      <Link href={DEFAULT_LANDING_PATH}>
        <Button variant="outline" className="rounded-xl">
          홈으로
        </Button>
      </Link>
    </AppPageChrome>
  );
}
