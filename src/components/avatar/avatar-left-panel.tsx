"use client";

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
    <StudioPanel title="캐릭터 메이크" className="lg:col-span-3">
      <StudioSegmentTabs
        tabs={[
          { id: "body" as const, label: "신체" },
          { id: "face" as const, label: "얼굴" },
          { id: "skin" as const, label: "피부" },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === "body" && (
        <>
          <StudioSection title="체형">
            <StudioSlider label="키" value={config.body.height} min={150} max={190} unit="cm" onChange={(height) => setBody({ height })} />
            <StudioSlider label="체중" value={config.body.weight} min={40} max={100} unit="kg" onChange={(weight) => setBody({ weight })} />
            <StudioSlider label="어깨" value={config.body.shoulderWidth} min={30} max={60} onChange={(shoulderWidth) => setBody({ shoulderWidth })} />
            <StudioSlider label="허리" value={config.body.waist} min={50} max={90} unit="cm" onChange={(waist) => setBody({ waist })} />
            <StudioSlider label="팔 길이" value={config.body.armLength} min={45} max={75} onChange={(armLength) => setBody({ armLength })} />
            <StudioSlider label="팔 두께" value={config.body.armThickness} min={45} max={75} onChange={(armThickness) => setBody({ armThickness })} />
            <StudioSlider label="다리" value={config.body.legLength} min={70} max={110} onChange={(legLength) => setBody({ legLength })} />
          </StudioSection>
          <StudioSection title="성별 표현">
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
              { id: "base" as const, label: "기본" },
              { id: "eyes" as const, label: "눈" },
              { id: "nose" as const, label: "코" },
              { id: "mouth" as const, label: "입" },
              { id: "brows" as const, label: "눈썹" },
              { id: "makeup" as const, label: "메이크업" },
            ]}
            value={faceTab}
            onChange={setFaceTab}
          />

          <StudioSection title="원터치 프리셋">
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
              <StudioSection title="얼굴형">
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
              <StudioSection title="턱 · 윤곽">
                <StudioSlider label="턱 너비" value={config.face.jawWidth} min={0} max={100} onChange={(jawWidth) => setFace({ jawWidth })} />
                <StudioSlider label="턱 각도" value={config.face.jawAngle} min={0} max={100} onChange={(jawAngle) => setFace({ jawAngle })} />
                <StudioSlider label="턱 길이" value={config.face.chinLength} min={0} max={100} onChange={(chinLength) => setFace({ chinLength })} />
                <StudioSlider label="턱 끝" value={config.face.chinPoint} min={0} max={100} onChange={(chinPoint) => setFace({ chinPoint })} />
                <StudioSlider label="광대" value={config.face.cheekbone} min={0} max={100} onChange={(cheekbone) => setFace({ cheekbone })} />
                <StudioSlider label="이마" value={config.face.forehead} min={0} max={100} onChange={(forehead) => setFace({ forehead })} />
              </StudioSection>
            </>
          )}

          {faceTab === "eyes" && (
            <>
              <StudioSection title="눈 모양">
                <StudioSlider label="크기" value={config.face.eyeSize} min={0} max={100} onChange={(eyeSize) => setFace({ eyeSize })} />
                <StudioSlider label="간격" value={config.face.eyeSpacing} min={0} max={100} onChange={(eyeSpacing) => setFace({ eyeSpacing })} />
                <StudioSlider label="높이" value={config.face.eyeHeight} min={0} max={100} onChange={(eyeHeight) => setFace({ eyeHeight })} />
                <StudioSlider label="기울기" value={config.face.eyeTilt} min={0} max={100} onChange={(eyeTilt) => setFace({ eyeTilt })} />
                <StudioSlider label="깊이" value={config.face.eyeDepth} min={0} max={100} onChange={(eyeDepth) => setFace({ eyeDepth })} />
                <StudioSlider label="동공" value={config.face.pupilSize} min={0} max={100} onChange={(pupilSize) => setFace({ pupilSize })} />
                <StudioSlider label="쌍꺼풀" value={config.face.doubleEyelid} min={0} max={100} onChange={(doubleEyelid) => setFace({ doubleEyelid })} />
              </StudioSection>
              <StudioSection title="눈 색">
                <StudioColorField
                  label="눈동자 색"
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
            <StudioSection title="코">
              <StudioSlider label="크기" value={config.face.noseSize} min={0} max={100} onChange={(noseSize) => setFace({ noseSize })} />
              <StudioSlider label="높이" value={config.face.noseHeight} min={0} max={100} onChange={(noseHeight) => setFace({ noseHeight })} />
              <StudioSlider label="너비" value={config.face.noseWidth} min={0} max={100} onChange={(noseWidth) => setFace({ noseWidth })} />
              <StudioSlider label="콧대" value={config.face.noseBridge} min={0} max={100} onChange={(noseBridge) => setFace({ noseBridge })} />
              <StudioSlider label="코끝" value={config.face.noseTip} min={0} max={100} onChange={(noseTip) => setFace({ noseTip })} />
            </StudioSection>
          )}

          {faceTab === "mouth" && (
            <StudioSection title="입">
              <StudioSlider label="입술 두께" value={config.face.lipThickness} min={0} max={100} onChange={(lipThickness) => setFace({ lipThickness })} />
              <StudioSlider label="입 너비" value={config.face.lipWidth} min={0} max={100} onChange={(lipWidth) => setFace({ lipWidth })} />
              <StudioSlider label="입꼬리" value={config.face.mouthCorner} min={0} max={100} onChange={(mouthCorner) => setFace({ mouthCorner })} />
              <StudioSlider label="인중" value={config.face.philtrum} min={0} max={100} onChange={(philtrum) => setFace({ philtrum })} />
            </StudioSection>
          )}

          {faceTab === "brows" && (
            <StudioSection title="눈썹">
              <StudioSlider label="높이" value={config.face.browHeight} min={0} max={100} onChange={(browHeight) => setFace({ browHeight })} />
              <StudioSlider label="두께" value={config.face.browThickness} min={0} max={100} onChange={(browThickness) => setFace({ browThickness })} />
              <StudioSlider label="간격" value={config.face.browSpacing} min={0} max={100} onChange={(browSpacing) => setFace({ browSpacing })} />
              <StudioSlider label="기울기" value={config.face.browTilt} min={0} max={100} onChange={(browTilt) => setFace({ browTilt })} />
            </StudioSection>
          )}

          {faceTab === "makeup" && (
            <>
              <StudioSection title="메이크업 강도">
                <StudioSlider label="아이섀도" value={config.face.makeup.eyeshadow} min={0} max={100} onChange={(eyeshadow) => setMakeup({ eyeshadow })} />
                <StudioSlider label="아이라iner" value={config.face.makeup.eyeliner} min={0} max={100} onChange={(eyeliner) => setMakeup({ eyeliner })} />
                <StudioSlider label="마스카라" value={config.face.makeup.mascara} min={0} max={100} onChange={(mascara) => setMakeup({ mascara })} />
                <StudioSlider label="블러셔" value={config.face.makeup.blushIntensity} min={0} max={100} onChange={(blushIntensity) => setMakeup({ blushIntensity })} />
                <StudioSlider label="립스틱" value={config.face.makeup.lipstick} min={0} max={100} onChange={(lipstick) => setMakeup({ lipstick })} />
                <StudioSlider label="쉐딩" value={config.face.makeup.contour} min={0} max={100} onChange={(contour) => setMakeup({ contour })} />
                <StudioSlider label="하이라이트" value={config.face.makeup.highlight} min={0} max={100} onChange={(highlight) => setMakeup({ highlight })} />
              </StudioSection>
              <StudioSection title="립 컬러">
                <StudioColorField
                  label="립스틱 색"
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
              <StudioSection title="헤어">
                <StudioColorField
                  label="헤어 색상"
                  value={config.hair.colorHex}
                  onChange={(colorHex) => setHair({ colorHex })}
                />
                <StudioSlider label="볼륨" value={config.hair.volume} min={0} max={100} onChange={(volume) => setHair({ volume })} />
                <StudioSlider label="길이" value={config.hair.length} min={0} max={100} onChange={(length) => setHair({ length })} />
              </StudioSection>
            </>
          )}
        </>
      )}

      {tab === "skin" && (
        <>
          <StudioSection title="피부톤">
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
          <StudioSection title="톤 조절">
            <StudioSlider label="밝기" value={config.skin.brightness} min={0} max={100} onChange={(brightness) => setSkin({ brightness })} />
            <StudioSlider label="채도" value={config.skin.saturation} min={0} max={100} onChange={(saturation) => setSkin({ saturation })} />
          </StudioSection>
          <StudioSection title="디테일">
            <StudioToggle label="주근깨" checked={config.skin.freckles} onChange={(freckles) => setSkin({ freckles })} />
            <StudioToggle label="블러셔" checked={config.skin.blush} onChange={(blush) => setSkin({ blush })} />
            <StudioToggle label="글로우" checked={config.skin.glow} onChange={(glow) => setSkin({ glow })} />
          </StudioSection>
        </>
      )}
    </StudioPanel>
  );
}
