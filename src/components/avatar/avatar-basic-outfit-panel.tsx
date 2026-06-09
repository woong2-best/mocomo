"use client";

import {
  StudioPanel,
  StudioSection,
  StudioSlider,
  studioSwatchRing,
} from "@/components/avatar/studio-controls";
import { BOTTOM_COLORS, HAIR_COLORS, SHOE_COLORS, TOP_COLORS } from "@/lib/virtual-avatar/presets";
import type { VirtualAvatarStudioState } from "@/hooks/use-virtual-avatar-studio";
import { cn } from "@/lib/utils";
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
      title="기본 의상"
      className="lg:col-span-3 border-[hsl(var(--folk-cobalt)/0.12)]"
    >
      <div className="flex items-start gap-2 rounded-2xl bg-muted/40 border border-border/60 px-3 py-2.5">
        <Shirt className="h-4 w-4 shrink-0 text-folk-cobalt mt-0.5" />
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          VRM 기본 상의·하의·신발만 사용합니다. 체형 슬라이더에 맞춰 자연스럽게 밀착되며, 색상만 바꿀 수 있습니다.
        </p>
      </div>

      <StudioSection title="상의 색상">
        <div className="flex flex-wrap gap-2">
          {TOP_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => setOutfit({ topColor: color })}
              className={cn(studioSwatchRing(config.outfit.topColor === color), "w-8 h-8 rounded-full p-0.5")}
              aria-label={`상의 ${color}`}
            >
              <span className="block w-full h-full rounded-full border border-black/10" style={{ backgroundColor: color }} />
            </button>
          ))}
        </div>
      </StudioSection>

      <StudioSection title="하의 색상">
        <div className="flex flex-wrap gap-2">
          {BOTTOM_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => setOutfit({ bottomColor: color })}
              className={cn(studioSwatchRing(config.outfit.bottomColor === color), "w-8 h-8 rounded-full p-0.5")}
              aria-label={`하의 ${color}`}
            >
              <span className="block w-full h-full rounded-full border border-black/10" style={{ backgroundColor: color }} />
            </button>
          ))}
        </div>
      </StudioSection>

      <StudioSection title="신발 색상">
        <div className="flex flex-wrap gap-2">
          {SHOE_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => setOutfit({ accentColor: color })}
              className={cn(studioSwatchRing(config.outfit.accentColor === color), "w-8 h-8 rounded-full p-0.5")}
              aria-label={`신발 ${color}`}
            >
              <span className="block w-full h-full rounded-full border border-black/10" style={{ backgroundColor: color }} />
            </button>
          ))}
        </div>
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

      <StudioSection title="헤어 색상">
        <div className="grid grid-cols-5 gap-2">
          {HAIR_COLORS.map((c, i) => (
            <button
              key={c.label}
              type="button"
              title={c.label}
              onClick={() => setHair({ colorIndex: i })}
              className={cn(studioSwatchRing(config.hair.colorIndex === i), "aspect-square rounded-full p-0.5")}
            >
              <span
                className="block w-full h-full rounded-full border border-black/10"
                style={{
                  background: c.hex === "linear" ? "linear-gradient(135deg,#f472b6,#a855f7,#22d3ee)" : c.hex,
                }}
              />
            </button>
          ))}
        </div>
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
    </StudioPanel>
  );
}
