"use client";

import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { useRef, useState, type RefObject } from "react";
import {
  StudioPanel,
  StudioSection,
  StudioSegmentTabs,
  StudioSlider,
  StudioToggle,
  studioChipSm,
  studioSwatchRing,
} from "@/components/avatar/studio-controls";
import {
  BACKGROUNDS,
  HAIR_COLORS,
  HAIR_STYLES,
  MOTIONS,
  OUTFIT_LAYER_LABELS,
  OUTFIT_PRESETS,
  PARTICLE_EFFECTS,
  TOP_COLORS,
} from "@/lib/virtual-avatar/presets";
import type { VirtualAvatarStudioState } from "@/hooks/use-virtual-avatar-studio";
import type { VirtualAvatar3DScene } from "@/lib/virtual-avatar/avatar-3d-scene";
import { DEFAULT_AVATAR_VRM_URL } from "@/lib/virtual-avatar/avatar-3d-scene";
import { downloadBlob } from "@/lib/virtual-avatar/avatar-export";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Download,
  Eye,
  EyeOff,
  Link2,
  Save,
  Sparkles,
  Upload,
} from "lucide-react";

type RightTab = "outfit" | "hair" | "effects" | "output";

export function AvatarRightPanel({
  studio,
  onExportPng,
  sceneRef,
}: {
  studio: VirtualAvatarStudioState;
  onExportPng: () => void;
  sceneRef: RefObject<VirtualAvatar3DScene | null>;
}) {
  const [tab, setTab] = useState<RightTab>("outfit");
  const [exportMsg, setExportMsg] = useState("");
  const vrmInputRef = useRef<HTMLInputElement>(null);
  const presetInputRef = useRef<HTMLInputElement>(null);
  const {
    config,
    setOutfit,
    setHair,
    setEffects,
    savePreset,
    loadPreset,
    uploadVrm,
    selectVrmSlot,
    removeVrmSlot,
    resetVrmModel,
    exportPresetFile,
    importPreset,
    vrmModelName,
    vrmSlots,
    activeVrmId,
    summary,
  } = studio;

  function flash(msg: string) {
    setExportMsg(msg);
    window.setTimeout(() => setExportMsg(""), 2500);
  }

  return (
    <StudioPanel title={t("avatar.so4xloj")} className="lg:col-span-3">
      <StudioSegmentTabs
        tabs={[
          { id: "outfit" as const, label: t("avatar.syyqx") },
          { id: "hair" as const, label: t("lib.virtual-avatar.s11gsw") },
          { id: "effects" as const, label: t("avatar.s11glw") },
          { id: "output" as const, label: t("avatar.szzex") },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === "outfit" && (
        <>
          <StudioSection title={t("avatar.sw3vab")}>
            <div className="grid grid-cols-2 gap-2">
              {OUTFIT_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setOutfit({ preset: preset.id })}
                  className={studioChipSm(config.outfit.preset === preset.id, "flex items-center gap-2 p-2.5 text-left")}
                >
                  <span className="text-lg">{preset.emoji}</span>
                  <span className="text-xs font-semibold">{preset.label}</span>
                </button>
              ))}
            </div>
          </StudioSection>
          <StudioSection title={t("avatar.s1wiuwpt")}>
            <div className="flex flex-wrap gap-2">
              {TOP_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setOutfit({ topColor: color })}
                  className={cn(studioSwatchRing(config.outfit.topColor === color), "w-8 h-8 rounded-full p-0.5")}
                >
                  <span className="block w-full h-full rounded-full" style={{ backgroundColor: color }} />
                </button>
              ))}
            </div>
          </StudioSection>
          <StudioSection title={t("webtoon-studio.srxeiw")}>
            {OUTFIT_LAYER_LABELS.map(({ key, label }) => {
              const visible = config.outfit.layers[key];
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() =>
                    setOutfit({ layers: { ...config.outfit.layers, [key]: !visible } })
                  }
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
        </>
      )}

      {tab === "hair" && (
        <>
          <StudioSection title={t("avatar.s9oxseo")}>
            <div className="grid grid-cols-2 gap-2">
              {HAIR_STYLES.map((label, i) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setHair({ style: i })}
                  className={studioChipSm(config.hair.style === i, "py-2 px-2")}
                >
                  {label}
                </button>
              ))}
            </div>
          </StudioSection>
          <StudioSection title={t("avatar.s12drz7d")}>
            <StudioSlider label={t("media.sx5v0")} value={config.hair.volume} min={0} max={100} onChange={(volume) => setHair({ volume })} />
            <StudioSlider label={t("avatar.suq7w")} value={config.hair.length} min={0} max={100} onChange={(length) => setHair({ length })} />
          </StudioSection>
          <StudioSection title={t("avatar.s8wfpsg")}>
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
                    className="block w-full h-full rounded-full"
                    style={{
                      background:
                        c.hex === "linear"
                          ? "linear-gradient(135deg,#f472b6,#a855f7,#22d3ee)"
                          : c.hex,
                    }}
                  />
                </button>
              ))}
            </div>
          </StudioSection>
          <StudioSection title={t("avatar.syrwj")}>
            <StudioToggle label={t("avatar.s1sub21c")} checked={config.hair.gradient} onChange={(gradient) => setHair({ gradient })} />
            <StudioToggle label={t("avatar.s7q8azo")} checked={config.hair.highlight} onChange={(highlight) => setHair({ highlight })} />
          </StudioSection>
        </>
      )}

      {tab === "effects" && (
        <>
          <StudioSection title={t("avatar.swt68")}>
            <div className="grid grid-cols-3 gap-2">
              {MOTIONS.map((motion) => (
                <button
                  key={motion.id}
                  type="button"
                  onClick={() => setEffects({ motion: motion.id })}
                  className={studioChipSm(config.effects.motion === motion.id, "py-2")}
                >
                  {motion.label}
                </button>
              ))}
            </div>
          </StudioSection>
          <StudioSection title={t("avatar.svxv9s")}>
            <div className="flex flex-wrap gap-2">
              {PARTICLE_EFFECTS.map((fx) => (
                <button
                  key={fx.id}
                  type="button"
                  onClick={() => setEffects({ particle: fx.id })}
                  className={studioChipSm(config.effects.particle === fx.id, "px-3 py-1.5 text-xs")}
                >
                  {fx.label}
                </button>
              ))}
            </div>
          </StudioSection>
          <StudioSection title={t("lib.media-editor.swyh9")}>
            <div className="flex flex-wrap gap-2">
              {BACKGROUNDS.map((bg) => (
                <button
                  key={bg.id}
                  type="button"
                  onClick={() => setEffects({ background: bg.id })}
                  className={studioChipSm(config.effects.background === bg.id, "px-3 py-1.5 text-xs")}
                >
                  {bg.label}
                </button>
              ))}
            </div>
          </StudioSection>
        </>
      )}

      {tab === "output" && (
        <>
          <StudioSection title={t("avatar.vrm_3")}>
            <p className="text-[11px] text-muted-foreground mb-2">
              현재: {vrmModelName ?? t("lib.virtual-avatar.vrm")}
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-xl gap-1.5 border-2"
                onClick={() => vrmInputRef.current?.click()}
              >
                <Upload className="h-3.5 w-3.5" />
                {t("avatar.vrm")}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-xl gap-1.5 border-2"
                onClick={() => {
                  void (async () => {
                    await resetVrmModel();
                    await sceneRef.current?.loadVrmFromUrl(DEFAULT_AVATAR_VRM_URL, t("lib.virtual-avatar.vrm"));
                    flash(t("avatar.vrm_4"));
                  })();
                }}
              >
                {t("lib.virtual-avatar.vrm")}
              </Button>
            </div>
            <input
              ref={vrmInputRef}
              type="file"
              accept=".vrm"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                void (async () => {
                  const saved = await uploadVrm(file);
                  if (!saved) {
                    flash(t("avatar.vrm_5"));
                    return;
                  }
                  const ok = await sceneRef.current?.loadVrmFromFile(file);
                  flash(ok ? t("avatar.su9e8w", { v0: file.name }) : t("avatar.vrm_6"));
                })();
                e.target.value = "";
              }}
            />
            {vrmSlots.length > 0 && (
              <div className="mt-2 space-y-1 max-h-28 overflow-y-auto">
                {vrmSlots.map((slot) => (
                  <div key={slot.id} className="flex items-center gap-1">
                    <button
                      type="button"
                      className={studioChipSm(activeVrmId === slot.id, "flex-1 text-left text-[10px] py-1 px-2 truncate")}
                      onClick={() => {
                        void (async () => {
                          const row = await selectVrmSlot(slot.id);
                          if (row) {
                            const ok = await sceneRef.current?.loadVrmFromFile(
                              new File([row.blob], row.name, { type: "application/octet-stream" })
                            );
                            flash(ok ? t("media.sz3yg", { v0: row.name }) : t("avatar.sxdc06c"));
                          }
                        })();
                      }}
                    >
                      {slot.name}
                    </button>
                    <button
                      type="button"
                      className="text-[10px] text-muted-foreground px-1"
                      onClick={() => {
                        void removeVrmSlot(slot.id);
                        flash(t("avatar.spfftlo"));
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </StudioSection>
          <StudioSection title={t("avatar.obs_2")}>
            <p className="text-[10px] text-muted-foreground mb-2">
              {t("avatar.obs_browser_source_url")}
            </p>
            <div className="grid grid-cols-1 gap-2">
              <Button asChild variant="outline" size="sm" className="rounded-xl border-2">
                <Link href="/avatar/broadcast" target="_blank">
                  <Link2 className="h-3.5 w-3.5 mr-1.5" />
                  {t("avatar.s82iwsg")}
                </Link>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-xl border-2"
                onClick={() => {
                  void navigator.clipboard.writeText(`${window.location.origin}/avatar/broadcast`);
                  flash(t("avatar.url_2"));
                }}
              >
                {t("avatar.url")}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-xl border-2 text-[11px]"
                onClick={() => {
                  void navigator.clipboard.writeText(`${window.location.origin}/avatar/broadcast?bg=chroma`);
                  flash(t("avatar.url_3"));
                }}
              >
                {t("avatar.url_green_00ff00")}
              </Button>
            </div>
          </StudioSection>
          <StudioSection title={t("avatar.sofvorz")}>
            <dl className="space-y-2 text-xs">
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">{t("avatar.s2scz4y")}</dt>
                <dd className="font-semibold text-foreground tabular-nums">
                  {summary.height} · {summary.weight}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">{t("avatar.sttbrx")}</dt>
                <dd className="font-semibold text-foreground">{summary.faceShape}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">{t("avatar.syyqx")}</dt>
                <dd className="font-semibold text-foreground">{summary.outfit}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">{t("avatar.s1tzb11i")}</dt>
                <dd className="font-semibold text-foreground">{summary.motion} · {summary.background}</dd>
              </div>
            </dl>
          </StudioSection>
          <StudioSection title={t("avatar.sn2vni4")}>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-xl gap-1.5 border-2"
                onClick={() => {
                  onExportPng();
                  flash(t("avatar.png_3"));
                }}
              >
                <Download className="h-3.5 w-3.5" />
                PNG
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-xl gap-1.5 border-2"
                onClick={() => {
                  void (async () => {
                    const blob = await sceneRef.current?.exportGlb();
                    if (blob) {
                      downloadBlob(blob, `mocomo-avatar-${Date.now()}.glb`);
                      flash(t("avatar.glb"));
                    } else flash(t("avatar.glb_2"));
                  })();
                }}
              >
                <Sparkles className="h-3.5 w-3.5" />
                GLB
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-xl gap-1.5 border-2"
                onClick={() => {
                  const url = `${window.location.origin}/live/studio`;
                  void navigator.clipboard.writeText(url);
                  flash(t("avatar.s17dp1x0"));
                }}
              >
                <Link2 className="h-3.5 w-3.5" />
                {t("avatar.stuphho")}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-xl gap-1.5 border-2"
                onClick={() => {
                  downloadBlob(exportPresetFile(), `mocomo-preset-${Date.now()}.json`);
                  flash(t("avatar.json_3"));
                }}
              >
                <Save className="h-3.5 w-3.5" />
                JSON
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-xl gap-1.5 border-2"
                onClick={() => presetInputRef.current?.click()}
              >
                <Upload className="h-3.5 w-3.5" />
                {t("avatar.json_2")}
              </Button>
              <input
                ref={presetInputRef}
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  void (async () => {
                    const ok = await importPreset(file);
                    flash(ok ? t("avatar.s1q4ah9f") : t("avatar.json_4"));
                  })();
                  e.target.value = "";
                }}
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full text-muted-foreground"
              onClick={() => {
                savePreset();
                flash(t("avatar.sbqqh6j"));
              }}
            >
              {t("avatar.ss2dn67")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full text-muted-foreground"
              onClick={() => {
                if (loadPreset()) flash(t("avatar.sso2myy"));
                else flash(t("avatar.szan8ng"));
              }}
            >
              {t("avatar.s10cy2eu")}
            </Button>
            {exportMsg && (
              <p className="text-[11px] text-folk-forest font-semibold text-center">{exportMsg}</p>
            )}
          </StudioSection>
        </>
      )}
    </StudioPanel>
  );
}
