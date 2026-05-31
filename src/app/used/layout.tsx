import Link from "next/link";
import { Suspense } from "react";
import { Tags } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function UsedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-3xl mx-auto p-4 pb-24 lg:pb-8 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Tags className="h-7 w-7 text-muted-foreground" />
            중고거래
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            대한민국 전역 · 휴대폰·성인 인증(주류·담배·성인용품)
          </p>
        </div>
        <nav className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" asChild>
            <Link href="/used?mode=auction">경매</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/used/my">내 거래</Link>
          </Button>
          <Button variant="secondary" size="sm" asChild>
            <Link href="/used/new">글쓰기</Link>
          </Button>
        </nav>
      </div>
      <Suspense fallback={<div className="h-24" />}>{children}</Suspense>
    </div>
  );
}
