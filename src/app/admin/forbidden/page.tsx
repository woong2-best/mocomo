import Link from "next/link";
import { ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AdminForbiddenPage() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-zinc-50 p-6 dark:bg-zinc-950">
      <div className="mx-auto max-w-md space-y-4 rounded-2xl border border-border/70 bg-card p-8 text-center shadow-sm">
        <ShieldOff className="mx-auto h-12 w-12 text-muted-foreground" />
        <div className="space-y-1">
          <p className="text-2xl font-bold">403</p>
          <p className="text-lg font-semibold">관리자 권한이 없습니다</p>
          <p className="text-sm text-muted-foreground">
            이 페이지는 지정된 관리자 역할이 있는 계정만 접근할 수 있습니다.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          <Button asChild variant="outline">
            <Link href="/">홈으로</Link>
          </Button>
          <Button asChild>
            <Link href="/auth/signin">다시 로그인</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
