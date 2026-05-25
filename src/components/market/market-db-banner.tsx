import Link from "next/link";
import { AlertCircle } from "lucide-react";

export function MarketDbBanner({ dbReady }: { dbReady: boolean }) {
  if (dbReady) return null;
  return (
    <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm flex gap-3">
      <AlertCircle className="h-5 w-5 shrink-0 text-amber-600" />
      <div className="space-y-1">
        <p className="font-medium text-amber-900 dark:text-amber-100">굿즈샵 DB 연동 필요</p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          목록은 미리보기로 표시됩니다. 구매·저장 기능은 Supabase SQL{" "}
          <strong>섹션 J</strong> 실행 후 <code className="text-[10px]">npx prisma db push</code> 가 필요합니다.
        </p>
        <Link href="/legal" className="text-xs text-primary hover:underline">
          관리자 안내 →
        </Link>
      </div>
    </div>
  );
}
