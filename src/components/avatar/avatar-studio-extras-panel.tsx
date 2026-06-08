"use client";

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
    <StudioPanel title="효과 · 내보내기" className="shrink-0 max-h-[38vh]">
      <StudioSegmentTabs
        tabs={[
          { id: "effects" as const, label: "효과" },
          { id: "output" as const, label: "출력" },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === "effects" && (
        <>
          <StudioSection title="셀·MToon">
            <button
              type="button"
              onClick={() => setEffects({ celShading: !config.effects.celShading })}
              className={studioChipSm(config.effects.celShading, "w-full py-1.5 text-[10px]")}
            >
              {config.effects.celShading ? "MToon·셀 ON" : "MToon·셀 OFF"}
            </button>
          </StudioSection>
          <StudioSection title="렌더 품질">
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
              스튜디오·시네마: IBL·블룸·얼굴 UV 메이크업 · 시네마: SSAO·림라이트
            </p>
          </StudioSection>
          <StudioSection title="모션">
            <div className="grid grid-cols-3 gap-1.5">
              {MOTIONS.map((motion) => (
                <button key={motion.id} type="button" onClick={() => setEffects({ motion: motion.id })} className={studioChipSm(config.effects.motion === motion.id, "py-1.5 text-[10px]")}>
                  {motion.label}
                </button>
              ))}
            </div>
          </StudioSection>
          <StudioSection title="배경" defaultOpen={false}>
            <div className="flex flex-wrap gap-1.5">
              {BACKGROUNDS.map((bg) => (
                <button key={bg.id} type="button" onClick={() => setEffects({ background: bg.id })} className={studioChipSm(config.effects.background === bg.id, "px-2 py-1 text-[10px]")}>
                  {bg.label}
                </button>
              ))}
            </div>
          </StudioSection>
          <StudioSection title="파티클" defaultOpen={false}>
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
          <StudioSection title="VRM · OBS" defaultOpen={false}>
            <p className="text-[10px] text-muted-foreground mb-2">{vrmModelName ?? "기본 VRM"}</p>
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
                if (!(await uploadVrm(file))) { flash("VRM만 가능"); return; }
                const ok = await sceneRef.current?.loadVrmFromFile(file);
                flash(ok ? "VRM 적용" : "로드 실패");
              })();
              e.target.value = "";
            }} />
          </StudioSection>
          <StudioSection title="내보내기">
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
            <Button type="button" variant="ghost" size="sm" className="w-full h-7 text-[10px]" onClick={() => { savePreset(); flash("저장됨"); }}>
              프리셋 저장 (로컬+클라우드)
            </Button>
            <Button type="button" variant="ghost" size="sm" className="w-full h-7 text-[10px]" onClick={() => void loadCloudPreset().then((ok) => flash(ok ? "클라우드 불러옴" : "클라우드 없음"))}>
              클라우드 불러오기
            </Button>
            <input ref={presetInputRef} type="file" accept=".json" className="hidden" onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void importPreset(file).then((ok) => flash(ok ? "불러옴" : "오류"));
              e.target.value = "";
            }} />
          </StudioSection>
        </>
      )}

      {msg && <p className="text-[10px] text-center font-semibold text-folk-forest">{msg}</p>}
    </StudioPanel>
  );
}
