"use client";

import { useCallback, useRef } from "react";
import { AvatarCanvasView } from "@/components/avatar/avatar-canvas-view";
import { AvatarLeftPanel } from "@/components/avatar/avatar-left-panel";
import { AvatarShopPanel } from "@/components/avatar/avatar-shop-panel";
import { AvatarStudioExtrasPanel } from "@/components/avatar/avatar-studio-extras-panel";
import { AvatarTexturePaintPanel } from "@/components/avatar/avatar-texture-paint-panel";
import { useVirtualAvatarStudio } from "@/hooks/use-virtual-avatar-studio";
import type { VirtualAvatar3DScene } from "@/lib/virtual-avatar/avatar-3d-scene";
import { FolkBrushDivider } from "@/components/brand/folk-decor";
import { Button } from "@/components/ui/button";
import { Radio, Sparkles } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { AvatarStyle } from "@/lib/virtual-avatar/types";

const STYLE_TABS: { id: AvatarStyle; label: string }[] = [
  { id: "anime", label: "애니메이션" },
  { id: "realistic", label: "리얼리스틱" },
  { id: "cartoon", label: "카툰" },
  { id: "cyberpunk", label: "사이버펑크" },
];

export function VirtualAvatarStudio() {
  const studio = useVirtualAvatarStudio();
  const rendererRef = useRef<VirtualAvatar3DScene | null>(null);

  const handleRendererReady = useCallback((renderer: VirtualAvatar3DScene | null) => {
    rendererRef.current = renderer;
  }, []);

  const exportPng = useCallback(() => {
    const renderer = rendererRef.current;
    if (!renderer) return;
    const dataUrl = renderer.exportPng();
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `mocomo-avatar-${Date.now()}.png`;
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
      <header className="live-hero flex flex-wrap items-center gap-3 sm:gap-4">
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl border-2 border-folk-cobalt/25 bg-folk-gold/25 text-folk-cobalt shrink-0">
          <Sparkles className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="folk-tag mb-1.5 w-fit">라이브 스튜디오</p>
          <h1 className="text-xl sm:text-2xl font-display font-bold text-folk-cobalt folk-chunky-text">
            버츄얼 아바타 스튜디오
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            3D 부착 · MToon · UV 페인트 · 메시 스컬pt · 74종 무료 옷장 · 클라우드 프리셋
          </p>
        </div>
        <div className="flex flex-wrap gap-1 rounded-xl bg-muted/50 border border-[hsl(var(--folk-cobalt)/0.12)] p-1 w-full sm:w-auto">
          {STYLE_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => studio.setStyle(tab.id)}
              className={cn(
                "px-2.5 py-1 text-[11px] font-bold rounded-lg transition-colors",
                studio.config.style === tab.id
                  ? "bg-card text-folk-cobalt shadow-folk-sm border border-[hsl(var(--folk-cobalt)/0.15)]"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <Button asChild variant="outline" size="sm" className="rounded-xl gap-1.5 border-2 shrink-0">
          <Link href="/avatar/broadcast" target="_blank">
            <Radio className="h-4 w-4" />
            OBS 방송
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm" className="rounded-xl gap-1.5 border-2 shrink-0 ml-auto sm:ml-0">
          <Link href="/live">
            <Radio className="h-4 w-4" />
            라이브 홈
          </Link>
        </Button>
      </header>

      <FolkBrushDivider className="opacity-50" />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 lg:gap-4 xl:gap-5 flex-1 min-h-0 lg:min-h-[calc(100dvh-var(--header-h)-11rem)]">
        <AvatarLeftPanel studio={studio} />
        <AvatarCanvasView studio={studio} onRendererReady={handleRendererReady} />
        <div className="lg:col-span-3 flex flex-col gap-3 min-h-0 overflow-y-auto">
          <AvatarShopPanel studio={studio} />
          <AvatarTexturePaintPanel studio={studio} sceneRef={rendererRef} />
          <AvatarStudioExtrasPanel studio={studio} onExportPng={exportPng} sceneRef={rendererRef} />
        </div>
      </div>
    </div>
  );
}
