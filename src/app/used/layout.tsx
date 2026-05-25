import Link from "next/link";
import { Suspense } from "react";

export default function UsedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#FFF9F5] pb-20">
      <header className="sticky top-14 z-40 bg-[#FF6F0F] text-white px-4 py-3 shadow-md">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
          <div>
            <Link href="/used" className="text-lg font-black tracking-tight flex items-center gap-1.5">
              <span>🥕</span> 중고거래
            </Link>
            <p className="text-[11px] text-white/85">우리 동네 MoCoMo 중고</p>
          </div>
          <nav className="flex items-center gap-2 text-sm font-semibold">
            <Link href="/used/my" className="px-2.5 py-1 rounded-lg bg-white/15 hover:bg-white/25">
              내 거래
            </Link>
            <Link
              href="/used/new"
              className="px-3 py-1.5 rounded-lg bg-white text-[#FF6F0F] hover:bg-orange-50 shadow-sm"
            >
              + 글쓰기
            </Link>
          </nav>
        </div>
      </header>
      <div className="max-w-3xl mx-auto px-4">
        <Suspense fallback={<div className="h-24" />}>{children}</Suspense>
      </div>
    </div>
  );
}
