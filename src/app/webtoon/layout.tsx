import Link from "next/link";
import { ImageIcon, PenLine, BarChart3, Store } from "lucide-react";
import { hasWebtoonAccess } from "@/actions/webtoon";
import { WebtoonShell } from "@/components/webtoon/webtoon-shell";

export default async function WebtoonLayout({ children }: { children: React.ReactNode }) {
  const hasAccess = await hasWebtoonAccess();

  return (
    <WebtoonShell hasAccess={hasAccess}>
      <div className="live-page-shell max-w-[1200px] mx-auto px-3 sm:px-4 pb-nav lg:pb-6 space-y-4">
        <header className="flex flex-wrap items-center gap-2 py-2 border-b border-border/60">
          <ImageIcon className="h-5 w-5 text-[#0096fa]" />
          <h1 className="text-lg font-bold text-[#0096fa]">일러스트</h1>
          <p className="text-[11px] text-muted-foreground hidden sm:inline">
            그림 판매 · 작품별 개별 결제 · 캡처 제한
          </p>
          <nav className="flex gap-1 ml-auto overflow-x-auto">
            <Link
              href="/webtoon"
              className="px-3 py-1.5 rounded-full text-xs font-medium bg-[#0096fa]/10 text-[#0096fa] hover:bg-[#0096fa]/20"
            >
              작품 둘러보기
            </Link>
            <Link
              href="/webtoon/studio"
              className="px-3 py-1.5 rounded-full text-xs font-medium bg-muted/60 hover:bg-muted flex items-center gap-1"
            >
              <Store className="h-3 w-3" />
              작품 판매
            </Link>
            <Link
              href="/webtoon/studio/draw"
              className="px-3 py-1.5 rounded-full text-xs font-medium bg-muted/60 hover:bg-muted flex items-center gap-1"
            >
              <PenLine className="h-3 w-3" />
              그리기
            </Link>
            <Link
              href="/webtoon/studio/dashboard"
              className="px-3 py-1.5 rounded-full text-xs font-medium bg-muted/60 hover:bg-muted flex items-center gap-1"
            >
              <BarChart3 className="h-3 w-3" />
              판매 통계
            </Link>
          </nav>
        </header>
        {children}
      </div>
    </WebtoonShell>
  );
}
