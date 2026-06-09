"use client";

import {
  StudioPanel,
  StudioSection,
  StudioSlider,
} from "@/components/avatar/studio-controls";
import { StudioColorField } from "@/components/avatar/studio-color-field";
import type { VirtualAvatarStudioState } from "@/hooks/use-virtual-avatar-studio";
import { Eye, EyeOff, Shirt } from "lucide-react";

const LAYER_LABELS = [
  { key: "top" as const, label: "상의" },
  { key: "bottom" as const, label: "하의" },
  { key: "shoes" as const, label: "신발" },
];

export function AvatarBasicOutfitPanel({ studio }: { studio: VirtualAvatarStudioState }) {
  const { config, setOutfit, setHair } = studio;

  return (
    <StudioPanel
      title="기본 의상 · 색상"
      className="lg:col-span-3 border-[hsl(var(--folk-cobalt)/0.12)]"
    >
      <div className="flex items-start gap-2 rounded-2xl bg-muted/40 border border-border/60 px-3 py-2.5">
        <Shirt className="h-4 w-4 shrink-0 text-folk-cobalt mt-0.5" />
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          항목을 누르면 Windows 스타일 색 선택 창이 열립니다. HTML·RGB·HSV로 정확한 색을 고를 수 있습니다.
        </p>
      </div>

      <StudioSection title="의상 색상">
        <div className="space-y-2">
          <StudioColorField label="상의" value={config.outfit.topColor} onChange={(topColor) => setOutfit({ topColor })} />
          <StudioColorField label="하의" value={config.outfit.bottomColor} onChange={(bottomColor) => setOutfit({ bottomColor })} />
          <StudioColorField label="신발" value={config.outfit.accentColor} onChange={(accentColor) => setOutfit({ accentColor })} />
        </div>
      </StudioSection>

      <StudioSection title="헤어">
        <StudioColorField label="헤어 색상" value={config.hair.colorHex} onChange={(colorHex) => setHair({ colorHex })} />
        <StudioSlider
          label="볼륨"
          value={config.hair.volume}
          min={0}
          max={100}
          onChange={(volume) => setHair({ volume })}
        />
        <StudioSlider
          label="길이"
          value={config.hair.length}
          min={0}
          max={100}
          onChange={(length) => setHair({ length })}
        />
      </StudioSection>

      <StudioSection title="표시">
        {LAYER_LABELS.map(({ key, label }) => {
          const visible = config.outfit.layers[key];
          return (
            <button
              key={key}
              type="button"
              onClick={() => setOutfit({ layers: { ...config.outfit.layers, [key]: !visible } })}
              className="flex items-center justify-between w-full py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground rounded-lg px-1"
            >
              <span>{label}</span>
              {visible ? (
                <Eye className="h-4 w-4 text-folk-terracotta" />
              ) : (
                <EyeOff className="h-4 w-4 text-muted-foreground/50" />
              )}
            </button>
          );
        })}
      </StudioSection>
    </StudioPanel>
  );
}
