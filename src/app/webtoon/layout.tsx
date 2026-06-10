import Link from "next/link";
import { LayoutGrid, PenLine } from "lucide-react";
import { hasWebtoonAccess } from "@/actions/webtoon";
import { WebtoonShell } from "@/components/webtoon/webtoon-shell";

export default async function WebtoonLayout({ children }: { children: React.ReactNode }) {
  const hasAccess = await hasWebtoonAccess();

  return (
    <WebtoonShell hasAccess={hasAccess}>
      <div className="live-page-shell max-w-[1200px] mx-auto px-3 sm:px-4 pb-nav lg:pb-6 space-y-4">
        <header className="flex flex-wrap items-center gap-2 py-2 border-b border-border/60">
          <LayoutGrid className="h-5 w-5 text-emerald-600" />
          <h1 className="text-lg font-bold text-emerald-700 dark:text-emerald-400">웹툰</h1>
          <p className="text-[11px] text-muted-foreground hidden sm:inline">
            캡처·녹화 제한 · 회차별 개별 결제
          </p>
          <nav className="flex gap-1 ml-auto overflow-x-auto">
            <Link
              href="/webtoon"
              className="px-3 py-1.5 rounded-full text-xs font-medium bg-muted/60 hover:bg-muted"
            >
              요일별 전체
            </Link>
            <Link
              href="/webtoon/studio"
              className="px-3 py-1.5 rounded-full text-xs font-medium bg-muted/60 hover:bg-muted flex items-center gap-1"
            >
              <PenLine className="h-3 w-3" />
              웹툰 스튜디오
            </Link>
          </nav>
        </header>
        {children}
      </div>
    </WebtoonShell>
  );
}
