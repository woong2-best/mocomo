import Link from "next/link";
import { ShieldOff } from "lucide-react";
import { AdminPageChrome } from "@/components/admin/admin-page-chrome";
import { Button } from "@/components/ui/button";

export function AdminAccessDenied() {
  return (
    <AdminPageChrome maxWidth="lg">
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <ShieldOff className="h-12 w-12 text-muted-foreground" />
        <div className="space-y-1">
          <p className="text-lg font-semibold">관리자 권한이 필요합니다</p>
          <p className="text-sm text-muted-foreground">
            이 페이지는 운영자 계정으로 로그인한 경우에만 열 수 있습니다.
          </p>
        </div>
        <Button asChild variant="outline" className="rounded-xl">
          <Link href="/">홈으로</Link>
        </Button>
      </div>
    </AdminPageChrome>
  );
}
