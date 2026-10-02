"use client";

import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { useCallback, useRef, useState, type RefObject } from "react";
import { StudioPanel, StudioSection, studioChipSm } from "@/components/avatar/studio-controls";
import { Button } from "@/components/ui/button";
import type { VirtualAvatarStudioState } from "@/hooks/use-virtual-avatar-studio";
import type { VirtualAvatar3DScene } from "@/lib/virtual-avatar/avatar-3d-scene";
import type { PaintZone } from "@/lib/virtual-avatar/types";

const ZONES: { id: PaintZone; label: string }[] = [
  { id: "face", label: t("avatar.syl2w") },
  { id: "body", label: t("avatar.swzgg") },
  { id: "all", label: t("lib.live.categories.s934dd25ec5") },
];

export function AvatarTexturePaintPanel({
  studio,
  sceneRef,
}: {
  studio: VirtualAvatarStudioState;
  sceneRef: RefObject<VirtualAvatar3DScene | null>;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const painting = useRef(false);
  const [mode, setMode] = useState<"paint" | "sculpt">("paint");
  const { config, setPaint, setSculpt, addPaintStroke, clearPaint, clearSculpt } = studio;

  const drawPreview = useCallback(
    (x: number, y: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.fillStyle = config.paint.brushColor;
      ctx.globalAlpha = config.paint.brushOpacity;
      ctx.beginPath();
      ctx.arc(x, y, config.paint.brushSize / 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    },
    [config.paint.brushColor, config.paint.brushOpacity, config.paint.brushSize]
  );

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    painting.current = true;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 512;
    const y = ((e.clientY - rect.top) / rect.height) * 512;

    if (mode === "sculpt" && config.sculpt.enabled) {
      const next = sceneRef.current?.sculptAtScreen(e.clientX, e.clientY, () => config);
      if (next) setSculpt({ deltas: next.deltas });
      return;
    }

    if (!config.paint.enabled) return;
    addPaintStroke({
      x,
      y,
      radius: config.paint.brushSize,
      color: config.paint.brushColor,
      opacity: config.paint.brushOpacity,
      zone: config.paint.activeZone,
    });
    drawPreview((e.clientX - rect.left) / rect.width * 256, (e.clientY - rect.top) / rect.height * 256);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!painting.current) return;
    onPointerDown(e);
  };

  const onPointerUp = () => {
    painting.current = false;
  };

  return (
    <StudioPanel title={t("avatar.s15y69ec")} className="shrink-0">
      <StudioSection title={t("avatar.swqpg")}>
        <div className="grid grid-cols-2 gap-1.5 mb-2">
          <button
            type="button"
            onClick={() => {
              setMode("paint");
              setPaint({ enabled: true });
              setSculpt({ enabled: false });
            }}
            className={studioChipSm(mode === "paint" && config.paint.enabled, "py-1.5 text-[10px]")}
          >
            {t("avatar.s16gnffd")}
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("sculpt");
              setSculpt({ enabled: true });
              setPaint({ enabled: false });
            }}
            className={studioChipSm(mode === "sculpt" && config.sculpt.enabled, "py-1.5 text-[10px]")}
          >
            {t("avatar.s10gyep0")}
          </button>
        </div>
      </StudioSection>

      {config.paint.enabled && (
        <>
          <StudioSection title={t("avatar.sz0obw")}>
            <div className="flex flex-wrap gap-1.5">
              {ZONES.map((z) => (
                <button
                  key={z.id}
                  type="button"
                  onClick={() => setPaint({ activeZone: z.id })}
                  className={studioChipSm(config.paint.activeZone === z.id, "px-2 py-1 text-[10px]")}
                >
                  {z.label}
                </button>
              ))}
            </div>
          </StudioSection>
          <StudioSection title={t("lib.media-editor.ssqgsc")}>
            <label className="text-[10px] text-muted-foreground block mb-1">
              크기 {config.paint.brushSize}
            </label>
            <input
              type="range"
              min={4}
              max={48}
              value={config.paint.brushSize}
              onChange={(e) => setPaint({ brushSize: Number(e.target.value) })}
              className="w-full accent-folk-cobalt"
            />
            <input
              type="color"
              value={config.paint.brushColor}
              onChange={(e) => setPaint({ brushColor: e.target.value })}
              className="w-full h-8 rounded-lg border mt-2"
            />
          </StudioSection>
        </>
      )}

      {config.sculpt.enabled && (
        <StudioSection title={t("avatar.sydfcir")}>
          <input
            type="range"
            min={4}
            max={40}
            value={Math.round(config.sculpt.brushStrength * 1000)}
            onChange={(e) => setSculpt({ brushStrength: Number(e.target.value) / 1000 })}
            className="w-full accent-folk-cobalt"
          />
          <p className="text-[9px] text-muted-foreground mt-1">{t("avatar.s1ja8ej")}</p>
        </StudioSection>
      )}

      <StudioSection title={t("avatar.s179u50k")}>
        <canvas
          ref={canvasRef}
          width={256}
          height={256}
          className="w-full rounded-xl border-2 border-[hsl(var(--folk-cobalt)/0.15)] bg-black/20 touch-none cursor-crosshair"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
        />
        <div className="grid grid-cols-2 gap-1.5 mt-2">
          <Button type="button" variant="outline" size="sm" className="h-7 text-[10px] rounded-xl" onClick={clearPaint}>
            {t("avatar.sbfqcxk")}
          </Button>
          <Button type="button" variant="outline" size="sm" className="h-7 text-[10px] rounded-xl" onClick={clearSculpt}>
            {t("avatar.s8cxco")}
          </Button>
        </div>
      </StudioSection>
    </StudioPanel>
  );
}
