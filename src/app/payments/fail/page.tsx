import Link from "next/link";
import { Button } from "@/components/ui/button";
import { XCircle } from "lucide-react";

export default async function PaymentFailPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string; code?: string }>;
}) {
  const { message, code } = await searchParams;
  const text = message ?? (code ? `오류 코드: ${code}` : "결제가 취소되었거나 실패했습니다.");

  return (
    <div className="max-w-md mx-auto p-8 text-center space-y-4">
      <XCircle className="h-14 w-14 text-destructive mx-auto" />
      <h1 className="text-xl font-bold">결제 실패</h1>
      <p className="text-muted-foreground text-sm">{text}</p>
      <Link href="/">
        <Button variant="outline" className="rounded-xl">
          홈으로
        </Button>
      </Link>
    </div>
  );
}
