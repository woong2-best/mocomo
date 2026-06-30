"use client";

import Link from "next/link";
import { BookOpen, ImageIcon, Library, PenLine, BarChart3, Store } from "lucide-react";
import { AppPageChrome, NativePageTitle } from "@/components/layout/app-page-chrome";

export function WorksLayoutChrome({ children }: { children: React.ReactNode }) {
  return (
    <AppPageChrome maxWidth="5xl" spacing="sm" className="!px-3 sm:!px-4">
      <header className="flex flex-wrap items-center gap-2 py-2 border-b border-border/60">
        <NativePageTitle>
          <h1 className="text-lg font-bold text-folk-cobalt flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            크리에이터 작품
          </h1>
        </NativePageTitle>
        <nav className="flex gap-1 ml-auto overflow-x-auto">
          <Link href="/works" className="px-3 py-1.5 rounded-full text-xs font-medium bg-muted/60 hover:bg-muted">
            둘러보기
          </Link>
          <Link
            href="/works/studio"
            className="px-3 py-1.5 rounded-full text-xs font-medium bg-muted/60 hover:bg-muted flex items-center gap-1"
          >
            <PenLine className="h-3 w-3" />
            판매 등록
          </Link>
          <Link
            href="/works/library"
            className="px-3 py-1.5 rounded-full text-xs font-medium bg-muted/60 hover:bg-muted flex items-center gap-1"
          >
            <Library className="h-3 w-3" />
            구매함
          </Link>
        </nav>
      </header>
      {children}
    </AppPageChrome>
  );
}

export function WebtoonLayoutChrome({ children }: { children: React.ReactNode }) {
  return (
    <AppPageChrome maxWidth="6xl" spacing="sm" className="!px-3 sm:!px-4">
      <header className="flex flex-wrap items-center gap-2 py-2 border-b border-border/60">
        <NativePageTitle>
          <div className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-[#0096fa]" />
            <h1 className="text-lg font-bold text-[#0096fa]">일러스트</h1>
          </div>
        </NativePageTitle>
        <p className="text-[11px] text-muted-foreground hidden sm:inline w-full sm:w-auto sm:ml-0">
          그림 판매 · 작품별 개별 결제 · 캡처 제한
        </p>
        <nav className="flex gap-1 ml-auto overflow-x-auto w-full sm:w-auto">
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
    </AppPageChrome>
  );
}
