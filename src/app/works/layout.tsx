import Link from "next/link";
import { BookOpen, PenLine, Library } from "lucide-react";

export default function WorksLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="live-page-shell max-w-5xl mx-auto px-3 sm:px-4 pb-nav lg:pb-6 space-y-4">
      <header className="flex flex-wrap items-center gap-2 py-2 border-b border-border/60">
        <BookOpen className="h-5 w-5 text-folk-cobalt" />
        <h1 className="text-lg font-bold text-folk-cobalt">크리에이터 작품</h1>
        <nav className="flex gap-1 ml-auto overflow-x-auto">
          <Link href="/works" className="px-3 py-1.5 rounded-full text-xs font-medium bg-muted/60 hover:bg-muted">
            둘러보기
          </Link>
          <Link href="/works/studio" className="px-3 py-1.5 rounded-full text-xs font-medium bg-muted/60 hover:bg-muted flex items-center gap-1">
            <PenLine className="h-3 w-3" />
            판매 등록
          </Link>
          <Link href="/works/library" className="px-3 py-1.5 rounded-full text-xs font-medium bg-muted/60 hover:bg-muted flex items-center gap-1">
            <Library className="h-3 w-3" />
            구매함
          </Link>
        </nav>
      </header>
      {children}
    </div>
  );
}
