"use client";

import { Layers } from "lucide-react";
import { StudioBackLink } from "@/components/avatar/studio-back-link";
import { FolkBrushDivider } from "@/components/brand/folk-decor";

export function Avatar2dStudio() {
  return (
    <div className="live-page-shell w-full max-w-none space-y-3 sm:space-y-4 pb-nav lg:pb-4 min-h-[calc(100dvh-var(--header-h))]">
      <StudioBackLink />

      <header className="live-hero flex flex-wrap items-center gap-3 sm:gap-4">
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl border-2 border-folk-cobalt/25 bg-folk-cobalt/10 text-folk-cobalt shrink-0">
          <Layers className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="folk-tag mb-1.5 w-fit">2D</p>
          <h1 className="text-xl sm:text-2xl font-display font-bold text-folk-cobalt folk-chunky-text">
            2D 아바타 편집
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            새 2D 아바타 편집기를 준비 중입니다
          </p>
        </div>
      </header>

      <FolkBrushDivider className="opacity-50" />

      <div className="folk-card flex min-h-[min(60vh,520px)] items-center justify-center rounded-2xl border-2 border-dashed border-folk-cobalt/25 bg-[hsl(var(--folk-cobalt)/0.04)] p-8 text-center">
        <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
          2D 아바타 스튜디오는 곧 새 방식으로 열립니다.
        </p>
      </div>
    </div>
  );
}
