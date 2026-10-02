"use client";

import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import {
  StudioPanel,
  StudioSection,
  StudioSlider,
} from "@/components/avatar/studio-controls";
import { StudioColorField } from "@/components/avatar/studio-color-field";
import type { VirtualAvatarStudioState } from "@/hooks/use-virtual-avatar-studio";
import { Eye, EyeOff, Shirt } from "lucide-react";

const LAYER_LABELS = [
  { key: "top" as const, label: t("lib.virtual-avatar.sxvp3") },
  { key: "bottom" as const, label: t("lib.virtual-avatar.s11ds0") },
  { key: "shoes" as const, label: t("lib.virtual-avatar.sy6gs") },
];

export function AvatarBasicOutfitPanel({ studio }: { studio: VirtualAvatarStudioState }) {
  const { config, setOutfit, setHair } = studio;

  return (
    <StudioPanel
      title={t("avatar.s1c84ye8")}
      className="lg:col-span-3 border-[hsl(var(--folk-cobalt)/0.12)]"
    >
      <div className="flex items-start gap-2 rounded-2xl bg-muted/40 border border-border/60 px-3 py-2.5">
        <Shirt className="h-4 w-4 shrink-0 text-folk-cobalt mt-0.5" />
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          {t("avatar.windows_html_rgb_hsv")}
        </p>
      </div>

      <StudioSection title={t("avatar.smfekvj")}>
        <div className="space-y-2">
          <StudioColorField label={t("lib.virtual-avatar.sxvp3")} value={config.outfit.topColor} onChange={(topColor) => setOutfit({ topColor })} />
          <StudioColorField label={t("lib.virtual-avatar.s11ds0")} value={config.outfit.bottomColor} onChange={(bottomColor) => setOutfit({ bottomColor })} />
          <StudioColorField label={t("lib.virtual-avatar.sy6gs")} value={config.outfit.accentColor} onChange={(accentColor) => setOutfit({ accentColor })} />
        </div>
      </StudioSection>

      <StudioSection title={t("lib.virtual-avatar.s11gsw")}>
        <StudioColorField label={t("avatar.s8wdcyw")} value={config.hair.colorHex} onChange={(colorHex) => setHair({ colorHex })} />
        <StudioSlider
          label={t("media.sx5v0")}
          value={config.hair.volume}
          min={0}
          max={100}
          onChange={(volume) => setHair({ volume })}
        />
        <StudioSlider
          label={t("avatar.suq7w")}
          value={config.hair.length}
          min={0}
          max={100}
          onChange={(length) => setHair({ length })}
        />
      </StudioSection>

      <StudioSection title={t("sensitiveContent.view")}>
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
