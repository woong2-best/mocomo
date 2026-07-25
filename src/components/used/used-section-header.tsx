"use client";

import Link from "next/link";
import { Tags } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useClientPlatform } from "@/components/providers/client-platform-provider";
import { cn } from "@/lib/utils";

/** 서버 컴포넌트 — 탭 링크 prefetch로 전환 가속 */
export function UsedSectionHeader() {
  const { isNativeApp } = useClientPlatform();

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className={cn("min-w-0", isNativeApp && "sr-only")}>
        <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
          <Tags className="h-6 w-6 sm:h-7 sm:w-7 text-muted-foreground shrink-0" />
          <span className="truncate">중고거래</span>
        </h1>
      </div>
      <nav className="flex flex-wrap items-center gap-2 shrink-0">
        <Button variant="outline" size="sm" className="rounded-xl" asChild>
          <Link href="/used?mode=auction" prefetch>
            경매
          </Link>
        </Button>
        <Button variant="outline" size="sm" className="rounded-xl" asChild>
          <Link href="/used/my" prefetch>
            내 거래
          </Link>
        </Button>
        <Button variant="secondary" size="sm" className="rounded-xl" asChild>
          <Link href="/used/new" prefetch>
            글쓰기
          </Link>
        </Button>
      </nav>
    </div>
  );
}
