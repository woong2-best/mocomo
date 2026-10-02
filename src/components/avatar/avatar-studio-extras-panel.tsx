"use client";

import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { useRef, useState, type RefObject } from "react";
import {
  StudioPanel,
  StudioSection,
  StudioSegmentTabs,
  studioChipSm,
} from "@/components/avatar/studio-controls";
import { BACKGROUNDS, MOTIONS, PARTICLE_EFFECTS, RENDER_QUALITIES } from "@/lib/virtual-avatar/presets";
import type { VirtualAvatarStudioState } from "@/hooks/use-virtual-avatar-studio";
import type { VirtualAvatar3DScene } from "@/lib/virtual-avatar/avatar-3d-scene";
import { downloadBlob } from "@/lib/virtual-avatar/avatar-export";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Download, Link2, Save, Upload } from "lucide-react";
import { PhotoAvatarUploadPanel } from "@/components/avatar/photo-avatar-upload-panel";

type ExtraTab = "effects" | "output";

export function AvatarStudioExtrasPanel({
  studio,
  onExportPng,
  sceneRef,
}: {
  studio: VirtualAvatarStudioState;
  onExportPng: () => void;
  sceneRef: RefObject<VirtualAvatar3DScene | null>;
}) {
  const [tab, setTab] = useState<ExtraTab>("effects");
  const [msg, setMsg] = useState("");
  const vrmInputRef = useRef<HTMLInputElement>(null);
  const presetInputRef = useRef<HTMLInputElement>(null);
  const flash = (text: string) => {
    setMsg(text);
    window.setTimeout(() => setMsg(""), 2200);
  };

  const {
    config,
    setEffects,
    savePreset,
    loadCloudPreset,
    exportPresetFile,
    importPreset,
    uploadVrm,
    vrmModelName,
  } = studio;

  return (
    <StudioPanel title={t("avatar.sfeffm9")} className="shrink-0 max-h-[38vh]">
      <StudioSegmentTabs
        tabs={[
          { id: "effects" as const, label: t("avatar.s11glw") },
          { id: "output" as const, label: t("avatar.szzex") },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === "effects" && (
        <>
          <StudioSection title={t("avatar.mtoon")}>
            <button
              type="button"
              onClick={() => setEffects({ celShading: !config.effects.celShading })}
              className={studioChipSm(config.effects.celShading, "w-full py-1.5 text-[10px]")}
            >
              {config.effects.celShading ? t("avatar.mtoon_on") : t("avatar.mtoon_off")}
            </button>
          </StudioSection>
          <StudioSection title={t("avatar.svyh40o")}>
            <div className="grid grid-cols-3 gap-1.5">
              {RENDER_QUALITIES.map((rq) => (
                <button
                  key={rq.id}
                  type="button"
                  title={rq.hint}
                  onClick={() => setEffects({ renderQuality: rq.id })}
                  className={studioChipSm(config.effects.renderQuality === rq.id, "py-1.5 text-[10px]")}
                >
                  {rq.label}
                </button>
              ))}
            </div>
            <p className="text-[9px] text-muted-foreground mt-1.5">
              {t("avatar.ibl_uv_ssao")}
            </p>
          </StudioSection>
          <StudioSection title={t("avatar.swt68")}>
            <div className="grid grid-cols-3 gap-1.5">
              {MOTIONS.map((motion) => (
                <button key={motion.id} type="button" onClick={() => setEffects({ motion: motion.id })} className={studioChipSm(config.effects.motion === motion.id, "py-1.5 text-[10px]")}>
                  {motion.label}
                </button>
              ))}
            </div>
          </StudioSection>
          <StudioSection title={t("lib.media-editor.swyh9")} defaultOpen={false}>
            <div className="flex flex-wrap gap-1.5">
              {BACKGROUNDS.map((bg) => (
                <button key={bg.id} type="button" onClick={() => setEffects({ background: bg.id })} className={studioChipSm(config.effects.background === bg.id, "px-2 py-1 text-[10px]")}>
                  {bg.label}
                </button>
              ))}
            </div>
          </StudioSection>
          <StudioSection title={t("avatar.svxv9s")} defaultOpen={false}>
            <div className="flex flex-wrap gap-1.5">
              {PARTICLE_EFFECTS.map((fx) => (
                <button key={fx.id} type="button" onClick={() => setEffects({ particle: fx.id })} className={studioChipSm(config.effects.particle === fx.id, "px-2 py-1 text-[10px]")}>
                  {fx.label}
                </button>
              ))}
            </div>
          </StudioSection>
        </>
      )}

      {tab === "output" && (
        <>
          <StudioSection title={t("avatar.s1rvyxns")} defaultOpen>
            <PhotoAvatarUploadPanel
              onReady={() => {
                flash(t("avatar.sgamj28"));
                window.dispatchEvent(new Event("mocomo-photo-avatar-reload"));
              }}
            />
          </StudioSection>
          <StudioSection title="VRM · OBS" defaultOpen={false}>
            <p className="text-[10px] text-muted-foreground mb-2">{vrmModelName ?? t("lib.virtual-avatar.vrm")}</p>
            <div className="grid grid-cols-2 gap-1.5">
              <Button type="button" variant="outline" size="sm" className="rounded-xl h-8 text-[11px] border-2" onClick={() => vrmInputRef.current?.click()}>
                <Upload className="h-3 w-3 mr-1" /> VRM
              </Button>
              <Button asChild variant="outline" size="sm" className="rounded-xl h-8 text-[11px] border-2">
                <Link href="/avatar/broadcast" target="_blank">
                  <Link2 className="h-3 w-3 mr-1" /> OBS
                </Link>
              </Button>
            </div>
            <input ref={vrmInputRef} type="file" accept=".vrm" className="hidden" onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              void (async () => {
                if (!(await uploadVrm(file))) { flash(t("avatar.vrm_7")); return; }
                const ok = await sceneRef.current?.loadVrmFromFile(file);
                flash(ok ? t("avatar.vrm_8") : t("avatar.sxdc06c"));
              })();
              e.target.value = "";
            }} />
          </StudioSection>
          <StudioSection title={t("avatar.sn2vni4")}>
            <div className="grid grid-cols-3 gap-1.5">
              <Button type="button" variant="outline" size="sm" className="rounded-xl h-8 text-[10px] border-2" onClick={() => { onExportPng(); flash("PNG"); }}>
                <Download className="h-3 w-3" />
              </Button>
              <Button type="button" variant="outline" size="sm" className="rounded-xl h-8 text-[10px] border-2" onClick={() => void sceneRef.current?.exportGlb().then((b) => b && downloadBlob(b, `avatar.glb`))}>
                GLB
              </Button>
              <Button type="button" variant="outline" size="sm" className="rounded-xl h-8 text-[10px] border-2" onClick={() => { downloadBlob(exportPresetFile(), "preset.json"); flash("JSON"); }}>
                <Save className="h-3 w-3" />
              </Button>
            </div>
            <Button type="button" variant="ghost" size="sm" className="w-full h-7 text-[10px]" onClick={() => { savePreset(); flash(t("avatar.su9jj7")); }}>
              {t("avatar.s13gr0uc")}
            </Button>
            <Button type="button" variant="ghost" size="sm" className="w-full h-7 text-[10px]" onClick={() => void loadCloudPreset().then((ok) => flash(ok ? t("avatar.sh5bzdw") : t("avatar.ss1syeq")))}>
              {t("avatar.sydk15o")}
            </Button>
            <input ref={presetInputRef} type="file" accept=".json" className="hidden" onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void importPreset(file).then((ok) => flash(ok ? t("avatar.ssnrkg") : t("donations.sypx0")));
              e.target.value = "";
            }} />
          </StudioSection>
        </>
      )}

      {msg && <p className="text-[10px] text-center font-semibold text-folk-forest">{msg}</p>}
    </StudioPanel>
  );
}
