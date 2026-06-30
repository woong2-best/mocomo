import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { AdminPageChrome } from "@/components/admin/admin-page-chrome";
import { Button } from "@/components/ui/button";

export function AdminLoadError({
  message = "관리자 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.",
}: {
  message?: string;
}) {
  return (
    <AdminPageChrome maxWidth="lg">
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <AlertTriangle className="h-12 w-12 text-destructive" />
        <div className="space-y-1">
          <p className="text-lg font-semibold">로드 실패</p>
          <p className="text-sm text-muted-foreground">{message}</p>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          <Button asChild variant="outline" className="rounded-xl">
            <Link href="/admin">관리자 패널</Link>
          </Button>
          <Button asChild className="rounded-xl">
            <Link href="/">홈으로</Link>
          </Button>
        </div>
      </div>
    </AdminPageChrome>
  );
}
