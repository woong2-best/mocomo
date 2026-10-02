"use client";

import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { useState } from "react";
import {
  StudioPanel,
  StudioSection,
  StudioSegmentTabs,
  StudioSlider,
  StudioToggle,
  studioChip,
  studioChipSm,
  studioSwatchRing,
} from "@/components/avatar/studio-controls";
import {
  EYE_COLORS,
  FACE_SHAPES,
  FACE_QUICK_PRESETS,
  GENDER_OPTIONS,
  LIP_COLORS,
  SKIN_TONES,
} from "@/lib/virtual-avatar/presets";
import { StudioColorField } from "@/components/avatar/studio-color-field";
import { getFaceShapePatch } from "@/lib/virtual-avatar/face-shape-profiles";
import type { VirtualAvatarStudioState } from "@/hooks/use-virtual-avatar-studio";
import { cn } from "@/lib/utils";

type LeftTab = "body" | "face" | "skin";
type FaceSubTab = "base" | "eyes" | "nose" | "mouth" | "brows" | "makeup";

export function AvatarLeftPanel({ studio }: { studio: VirtualAvatarStudioState }) {
  const [tab, setTab] = useState<LeftTab>("face");
  const [faceTab, setFaceTab] = useState<FaceSubTab>("base");
  const { config, setBody, setFace, setMakeup, setSkin, setHair } = studio;

  return (
    <StudioPanel title={t("avatar.srngnof")} className="lg:col-span-3">
      <StudioSegmentTabs
        tabs={[
          { id: "body" as const, label: t("avatar.sy9qs") },
          { id: "face" as const, label: t("avatar.syl2w") },
          { id: "skin" as const, label: t("avatar.s11b5w") },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === "body" && (
        <>
          <StudioSection title={t("avatar.szzs1")}>
            <StudioSlider label={t("avatar.s157o")} value={config.body.height} min={150} max={190} unit="cm" onChange={(height) => setBody({ height })} />
            <StudioSlider label={t("avatar.szx7h")} value={config.body.weight} min={40} max={100} unit="kg" onChange={(weight) => setBody({ weight })} />
            <StudioSlider label={t("avatar.syl2s")} value={config.body.shoulderWidth} min={30} max={60} onChange={(shoulderWidth) => setBody({ shoulderWidth })} />
            <StudioSlider label={t("avatar.s11dr8")} value={config.body.waist} min={50} max={90} unit="cm" onChange={(waist) => setBody({ waist })} />
            <StudioSlider label={t("avatar.sqnap54")} value={config.body.armLength} min={45} max={75} onChange={(armLength) => setBody({ armLength })} />
            <StudioSlider label={t("avatar.sqnbllg")} value={config.body.armThickness} min={45} max={75} onChange={(armThickness) => setBody({ armThickness })} />
            <StudioSlider label={t("avatar.svg3s")} value={config.body.legLength} min={70} max={110} onChange={(legLength) => setBody({ legLength })} />
          </StudioSection>
          <StudioSection title={t("avatar.s1wwi6r9")}>
            <div className="flex flex-wrap gap-2">
              {GENDER_OPTIONS.map((opt) => (
                <button key={opt.id} type="button" onClick={() => setBody({ genderExpression: opt.id })} className={studioChip(config.body.genderExpression === opt.id)}>
                  {opt.label}
                </button>
              ))}
            </div>
          </StudioSection>
        </>
      )}

      {tab === "face" && (
        <>
          <StudioSegmentTabs
            tabs={[
              { id: "base" as const, label: t("lib.virtual-avatar.sunyg") },
              { id: "eyes" as const, label: t("avatar.sz60") },
              { id: "nose" as const, label: t("avatar.s14yc") },
              { id: "mouth" as const, label: t("avatar.s13et") },
              { id: "brows" as const, label: t("avatar.svcs1") },
              { id: "makeup" as const, label: t("lib.virtual-avatar.soc9v95") },
            ]}
            value={faceTab}
            onChange={setFaceTab}
          />

          <StudioSection title={t("avatar.srdou0r")}>
            <div className="grid grid-cols-2 gap-1.5">
              {FACE_QUICK_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() =>
                    setFace({
                      ...preset.patch,
                      makeup: preset.patch.makeup
                        ? { ...config.face.makeup, ...preset.patch.makeup }
                        : config.face.makeup,
                    })
                  }
                  className={studioChipSm(false, "py-2 text-[10px] font-bold bg-gradient-to-br from-pink-50 to-violet-50 dark:from-pink-950/40 dark:to-violet-950/30")}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </StudioSection>

          {faceTab === "base" && (
            <>
              <StudioSection title={t("avatar.sttbrx")}>
                <div className="grid grid-cols-4 gap-1.5">
                  {FACE_SHAPES.map((shape) => (
                    <button
                      key={shape.id}
                      type="button"
                      onClick={() => setFace(getFaceShapePatch(shape.id))}
                      className={studioChipSm(config.face.faceShape === shape.id, "py-2 text-[10px] leading-tight")}
                    >
                      {shape.label}
                    </button>
                  ))}
                </div>
              </StudioSection>
              <StudioSection title={t("avatar.s1xjol4h")}>
                <StudioSlider label={t("avatar.sqeqpvv")} value={config.face.jawWidth} min={0} max={100} onChange={(jawWidth) => setFace({ jawWidth })} />
                <StudioSlider label={t("avatar.sqept0y")} value={config.face.jawAngle} min={0} max={100} onChange={(jawAngle) => setFace({ jawAngle })} />
                <StudioSlider label={t("avatar.sqeqah7")} value={config.face.chinLength} min={0} max={100} onChange={(chinLength) => setFace({ chinLength })} />
                <StudioSlider label={t("avatar.suo1ta")} value={config.face.chinPoint} min={0} max={100} onChange={(chinPoint) => setFace({ chinPoint })} />
                <StudioSlider label={t("lib.face-filters.suf4f")} value={config.face.cheekbone} min={0} max={100} onChange={(cheekbone) => setFace({ cheekbone })} />
                <StudioSlider label={t("avatar.syy1g")} value={config.face.forehead} min={0} max={100} onChange={(forehead) => setFace({ forehead })} />
              </StudioSection>
            </>
          )}

          {faceTab === "eyes" && (
            <>
              <StudioSection title={t("avatar.smhavwh")}>
                <StudioSlider label={t("avatar.s10eo4")} value={config.face.eyeSize} min={0} max={100} onChange={(eyeSize) => setFace({ eyeSize })} />
                <StudioSlider label={t("avatar.su7fp")} value={config.face.eyeSpacing} min={0} max={100} onChange={(eyeSpacing) => setFace({ eyeSpacing })} />
                <StudioSlider label={t("avatar.svaqq")} value={config.face.eyeHeight} min={0} max={100} onChange={(eyeHeight) => setFace({ eyeHeight })} />
                <StudioSlider label={t("avatar.sqh8rs")} value={config.face.eyeTilt} min={0} max={100} onChange={(eyeTilt) => setFace({ eyeTilt })} />
                <StudioSlider label={t("avatar.suqne")} value={config.face.eyeDepth} min={0} max={100} onChange={(eyeDepth) => setFace({ eyeDepth })} />
                <StudioSlider label={t("avatar.svjgc")} value={config.face.pupilSize} min={0} max={100} onChange={(pupilSize) => setFace({ pupilSize })} />
                <StudioSlider label={t("avatar.stfdw1")} value={config.face.doubleEyelid} min={0} max={100} onChange={(doubleEyelid) => setFace({ doubleEyelid })} />
              </StudioSection>
              <StudioSection title={t("avatar.sq3u0h")}>
                <StudioColorField
                  label={t("avatar.s9aabpk")}
                  value={config.face.eyeColorHex}
                  onChange={(eyeColorHex) => setFace({ eyeColorHex })}
                />
                <div className="grid grid-cols-5 gap-2 mt-2">
                  {EYE_COLORS.map((c, i) => (
                    <button
                      key={c.label}
                      type="button"
                      title={c.label}
                      onClick={() => setFace({ eyeColorIndex: i, eyeColorHex: c.hex })}
                      className={cn(studioSwatchRing(config.face.eyeColorHex === c.hex), "aspect-square rounded-full p-0.5")}
                    >
                      <span className="block w-full h-full rounded-full border border-black/10" style={{ backgroundColor: c.hex }} />
                    </button>
                  ))}
                </div>
              </StudioSection>
            </>
          )}

          {faceTab === "nose" && (
            <StudioSection title={t("avatar.s14yc")}>
              <StudioSlider label={t("avatar.s10eo4")} value={config.face.noseSize} min={0} max={100} onChange={(noseSize) => setFace({ noseSize })} />
              <StudioSlider label={t("avatar.svaqq")} value={config.face.noseHeight} min={0} max={100} onChange={(noseHeight) => setFace({ noseHeight })} />
              <StudioSlider label={t("avatar.sv5mk")} value={config.face.noseWidth} min={0} max={100} onChange={(noseWidth) => setFace({ noseWidth })} />
              <StudioSlider label={t("avatar.s109dl")} value={config.face.noseBridge} min={0} max={100} onChange={(noseBridge) => setFace({ noseBridge })} />
              <StudioSlider label={t("avatar.s108eh")} value={config.face.noseTip} min={0} max={100} onChange={(noseTip) => setFace({ noseTip })} />
            </StudioSection>
          )}

          {faceTab === "mouth" && (
            <StudioSection title={t("avatar.s13et")}>
              <StudioSlider label={t("avatar.snab825")} value={config.face.lipThickness} min={0} max={100} onChange={(lipThickness) => setFace({ lipThickness })} />
              <StudioSlider label={t("avatar.sp6tqd3")} value={config.face.lipWidth} min={0} max={100} onChange={(lipWidth) => setFace({ lipWidth })} />
              <StudioSlider label={t("avatar.su2vk5")} value={config.face.mouthCorner} min={0} max={100} onChange={(mouthCorner) => setFace({ mouthCorner })} />
              <StudioSlider label={t("avatar.sz15l")} value={config.face.philtrum} min={0} max={100} onChange={(philtrum) => setFace({ philtrum })} />
            </StudioSection>
          )}

          {faceTab === "brows" && (
            <StudioSection title={t("avatar.svcs1")}>
              <StudioSlider label={t("avatar.svaqq")} value={config.face.browHeight} min={0} max={100} onChange={(browHeight) => setFace({ browHeight })} />
              <StudioSlider label={t("avatar.svmo8")} value={config.face.browThickness} min={0} max={100} onChange={(browThickness) => setFace({ browThickness })} />
              <StudioSlider label={t("avatar.su7fp")} value={config.face.browSpacing} min={0} max={100} onChange={(browSpacing) => setFace({ browSpacing })} />
              <StudioSlider label={t("avatar.sqh8rs")} value={config.face.browTilt} min={0} max={100} onChange={(browTilt) => setFace({ browTilt })} />
            </StudioSection>
          )}

          {faceTab === "makeup" && (
            <>
              <StudioSection title={t("avatar.s1lp98pi")}>
                <StudioSlider label={t("avatar.sppv0j8")} value={config.face.makeup.eyeshadow} min={0} max={100} onChange={(eyeshadow) => setMakeup({ eyeshadow })} />
                <StudioSlider label={t("avatar.iner")} value={config.face.makeup.eyeliner} min={0} max={100} onChange={(eyeliner) => setMakeup({ eyeliner })} />
                <StudioSlider label={t("avatar.so92oo4")} value={config.face.makeup.mascara} min={0} max={100} onChange={(mascara) => setMakeup({ mascara })} />
                <StudioSlider label={t("lib.face-filters.ssqmf0")} value={config.face.makeup.blushIntensity} min={0} max={100} onChange={(blushIntensity) => setMakeup({ blushIntensity })} />
                <StudioSlider label={t("avatar.ss5npm")} value={config.face.makeup.lipstick} min={0} max={100} onChange={(lipstick) => setMakeup({ lipstick })} />
                <StudioSlider label={t("avatar.sy1nd")} value={config.face.makeup.contour} min={0} max={100} onChange={(contour) => setMakeup({ contour })} />
                <StudioSlider label={t("avatar.s7q8azo")} value={config.face.makeup.highlight} min={0} max={100} onChange={(highlight) => setMakeup({ highlight })} />
              </StudioSection>
              <StudioSection title={t("avatar.snge2f7")}>
                <StudioColorField
                  label={t("avatar.s15byhrn")}
                  value={config.face.makeup.lipColorHex}
                  onChange={(lipColorHex) => setMakeup({ lipColorHex })}
                />
                <div className="grid grid-cols-4 gap-2 mt-2">
                  {LIP_COLORS.map((c, i) => (
                    <button
                      key={c.label}
                      type="button"
                      title={c.label}
                      onClick={() => setMakeup({ lipColorIndex: i, lipColorHex: c.hex })}
                      className={cn(studioSwatchRing(config.face.makeup.lipColorHex === c.hex), "aspect-square rounded-full p-0.5")}
                    >
                      <span className="block w-full h-full rounded-full border border-black/10" style={{ backgroundColor: c.hex }} />
                    </button>
                  ))}
                </div>
              </StudioSection>
              <StudioSection title={t("lib.virtual-avatar.s11gsw")}>
                <StudioColorField
                  label={t("avatar.s8wdcyw")}
                  value={config.hair.colorHex}
                  onChange={(colorHex) => setHair({ colorHex })}
                />
                <StudioSlider label={t("media.sx5v0")} value={config.hair.volume} min={0} max={100} onChange={(volume) => setHair({ volume })} />
                <StudioSlider label={t("avatar.suq7w")} value={config.hair.length} min={0} max={100} onChange={(length) => setHair({ length })} />
              </StudioSection>
            </>
          )}
        </>
      )}

      {tab === "skin" && (
        <>
          <StudioSection title={t("avatar.sw5rhc")}>
            <div className="grid grid-cols-5 gap-2">
              {SKIN_TONES.map((tone, i) => (
                <button
                  key={tone.label}
                  type="button"
                  title={tone.label}
                  onClick={() => setSkin({ toneIndex: i })}
                  className={cn(studioSwatchRing(config.skin.toneIndex === i), "aspect-square rounded-full p-0.5")}
                >
                  <span className="block w-full h-full rounded-full border border-black/10" style={{ backgroundColor: tone.hex }} />
                </button>
              ))}
            </div>
          </StudioSection>
          <StudioSection title={t("avatar.sqgw6ms")}>
            <StudioSlider label={t("lib.webtoon-studio.swyb7")} value={config.skin.brightness} min={0} max={100} onChange={(brightness) => setSkin({ brightness })} />
            <StudioSlider label={t("lib.webtoon-studio.szqbk")} value={config.skin.saturation} min={0} max={100} onChange={(saturation) => setSkin({ saturation })} />
          </StudioSection>
          <StudioSection title={t("avatar.srjikk")}>
            <StudioToggle label={t("avatar.suac4o")} checked={config.skin.freckles} onChange={(freckles) => setSkin({ freckles })} />
            <StudioToggle label={t("lib.face-filters.ssqmf0")} checked={config.skin.blush} onChange={(blush) => setSkin({ blush })} />
            <StudioToggle label={t("lib.face-filters.sqdy38")} checked={config.skin.glow} onChange={(glow) => setSkin({ glow })} />
          </StudioSection>
        </>
      )}
    </StudioPanel>
  );
}
