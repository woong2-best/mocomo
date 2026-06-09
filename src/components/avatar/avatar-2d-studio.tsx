"use client";

import { useCallback, useRef } from "react";
import Link from "next/link";
import { Layers, Radio } from "lucide-react";
import { Avatar2dCanvasView } from "@/components/avatar/avatar-2d-canvas-view";
import { AvatarLeftPanel } from "@/components/avatar/avatar-left-panel";
import { AvatarBasicOutfitPanel } from "@/components/avatar/avatar-basic-outfit-panel";
import { PhotoAvatarUploadPanel } from "@/components/avatar/photo-avatar-upload-panel";
import { StudioBackLink } from "@/components/avatar/studio-back-link";
import { StudioPanel, StudioSection } from "@/components/avatar/studio-controls";
import { FolkBrushDivider } from "@/components/brand/folk-decor";
import { Button } from "@/components/ui/button";
import { useVirtualAvatarStudio } from "@/hooks/use-virtual-avatar-studio";

export function Avatar2dStudio() {
  const studio = useVirtualAvatarStudio();
  const canvasHostRef = useRef<HTMLDivElement>(null);

  const exportPng = useCallback(() => {
    const canvas = canvasHostRef.current?.querySelector("canvas");
    if (!(canvas instanceof HTMLCanvasElement)) return;
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `mocomo-2d-avatar-${Date.now()}.png`;
    a.click();
  }, []);

  if (!studio.loaded) {
    return (
      <div className="live-page-shell flex items-center justify-center min-h-[50vh] text-muted-foreground text-sm">
        스튜디오 불러오는 중…
      </div>
    );
  }

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
            캔버스 캐릭터 또는 얼굴 사진 아바타 · 라이브·OBS 연동
          </p>
        </div>
        <Button asChild variant="outline" size="sm" className="rounded-xl gap-1.5 border-2 shrink-0">
          <Link href="/avatar/broadcast" target="_blank">
            <Radio className="h-4 w-4" />
            OBS 방송
          </Link>
        </Button>
      </header>

      <FolkBrushDivider className="opacity-50" />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 lg:gap-4 xl:gap-5 flex-1 min-h-0 lg:min-h-[calc(100dvh-var(--header-h)-11rem)]">
        <div className="lg:col-span-3 flex flex-col gap-3 min-h-0 overflow-y-auto">
          <AvatarLeftPanel studio={studio} />
          <StudioPanel title="사진 아바타" className="shrink-0">
            <StudioSection title="2D 사진">
              <PhotoAvatarUploadPanel
                onReady={() => window.dispatchEvent(new Event("mocomo-photo-avatar-reload"))}
              />
            </StudioSection>
          </StudioPanel>
        </div>

        <div ref={canvasHostRef} className="contents">
          <Avatar2dCanvasView studio={studio} />
        </div>

        <div className="lg:col-span-3 flex flex-col gap-3 min-h-0 overflow-y-auto">
          <AvatarBasicOutfitPanel studio={studio} />
          <StudioPanel title="내보내기">
            <Button type="button" variant="outline" size="sm" className="w-full rounded-xl" onClick={exportPng}>
              PNG 저장
            </Button>
          </StudioPanel>
        </div>
      </div>
    </div>
  );
}
