"use client";

import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { useCallback, useRef } from "react";
import { AvatarCanvasView } from "@/components/avatar/avatar-canvas-view";
import { AvatarLeftPanel } from "@/components/avatar/avatar-left-panel";
import { AvatarBasicOutfitPanel } from "@/components/avatar/avatar-basic-outfit-panel";
import { AvatarStudioExtrasPanel } from "@/components/avatar/avatar-studio-extras-panel";
import { AvatarTexturePaintPanel } from "@/components/avatar/avatar-texture-paint-panel";
import { useVirtualAvatarStudio } from "@/hooks/use-virtual-avatar-studio";
import type { VirtualAvatar3DScene } from "@/lib/virtual-avatar/avatar-3d-scene";
import { FolkBrushDivider } from "@/components/brand/folk-decor";
import { StudioBackLink } from "@/components/avatar/studio-back-link";
import { Button } from "@/components/ui/button";
import { Radio, Sparkles } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { AvatarStyle } from "@/lib/virtual-avatar/types";

const STYLE_TABS: { id: AvatarStyle; label: string }[] = [
  { id: "anime", label: t("avatar.sdq593k") },
  { id: "realistic", label: t("avatar.s15dvn55") },
  { id: "cartoon", label: t("avatar.s109q4") },
  { id: "cyberpunk", label: t("lib.virtual-avatar.s1wzhrnb") },
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
        {t("avatar.s1luvx49")}
      </div>
    );
  }

  return (
    <div className="live-page-shell w-full max-w-none space-y-3 sm:space-y-4 pb-nav lg:pb-4 min-h-[calc(100dvh-var(--header-h))]">
      <StudioBackLink />

      <header className="live-hero flex flex-wrap items-center gap-3 sm:gap-4">
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl border-2 border-folk-cobalt/25 bg-folk-gold/25 text-folk-cobalt shrink-0">
          <Sparkles className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="folk-tag mb-1.5 w-fit">3D · VRM</p>
          <h1 className="text-xl sm:text-2xl font-display font-bold text-folk-cobalt folk-chunky-text">
            {t("avatar.s1h52hdz")}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            {t("avatar.3d_vrm_uv_vtuber")}
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
            {t("avatar.obs")}
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm" className="rounded-xl gap-1.5 border-2 shrink-0 ml-auto sm:ml-0">
          <Link href="/live">
            <Radio className="h-4 w-4" />
            {t("avatar.sx1ht4s")}
          </Link>
        </Button>
      </header>

      <FolkBrushDivider className="opacity-50" />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 lg:gap-4 xl:gap-5 flex-1 min-h-0 lg:min-h-[calc(100dvh-var(--header-h)-11rem)]">
        <AvatarLeftPanel studio={studio} />
        <AvatarCanvasView studio={studio} onRendererReady={handleRendererReady} />
        <div className="lg:col-span-3 flex flex-col gap-3 min-h-0 overflow-y-auto">
          <AvatarBasicOutfitPanel studio={studio} />
          <AvatarTexturePaintPanel studio={studio} sceneRef={rendererRef} />
          <AvatarStudioExtrasPanel studio={studio} onExportPng={exportPng} sceneRef={rendererRef} />
        </div>
      </div>
    </div>
  );
}
