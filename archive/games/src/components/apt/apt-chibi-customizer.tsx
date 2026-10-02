"use client";

import { useState } from "react";
import type { ChibiAvatarConfig } from "@/lib/apt/bondee/types";
import { cn } from "@/lib/utils";

const HAIR_STYLES = ["숏", "롱", "포니", "트윈", "단발", "볼륨"];
const EYE_STYLES = ["닷", "큰눈", "웃는눈", "감은눈"];
const MOUTH_STYLES = ["미소", "벌림", "뾰족"];
const TOP_STYLES = ["티셔츠", "블레이저", "후드"];
const SKIN_TONES = ["#f5d0b5", "#e8b896", "#c68642", "#8d5524", "#ffdbac", "#f1c27d"];
const HAIR_COLORS = ["#5c3d2e", "#2a1a0a", "#d4a574", "#c45a8a", "#4a6a8a", "#1a1a1a", "#f0e0c0"];

export function AptChibiCustomizer({
  config,
  onChange,
}: {
  config: ChibiAvatarConfig;
  onChange: (c: ChibiAvatarConfig) => void;
}) {
  const [tab, setTab] = useState<"face" | "hair" | "outfit">("face");

  return (
    <div className="space-y-3 rounded-xl border border-neutral-200 bg-neutral-50/50 p-3">
      <div className="flex gap-1">
        {(["face", "hair", "outfit"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "flex-1 rounded-lg py-1.5 text-[10px] font-bold border",
              tab === t ? "border-folk-terracotta bg-white text-folk-terracotta" : "border-transparent text-muted-foreground"
            )}
          >
            {t === "face" ? "얼굴" : t === "hair" ? "헤어" : "옷"}
          </button>
        ))}
      </div>

      {tab === "face" && (
        <div className="space-y-3">
          <div>
            <p className="text-[10px] font-bold text-muted-foreground mb-1.5">피부톤</p>
            <div className="flex flex-wrap gap-2">
              {SKIN_TONES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => onChange({ ...config, skinColor: c })}
                  className={cn(
                    "h-8 w-8 rounded-full border-2",
                    config.skinColor === c ? "border-folk-terracotta scale-110" : "border-white"
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          <div>
            <p className="text-[10px] font-bold text-muted-foreground mb-1.5">눈</p>
            <div className="grid grid-cols-4 gap-1.5">
              {EYE_STYLES.map((label, i) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => onChange({ ...config, eyeStyle: i as ChibiAvatarConfig["eyeStyle"] })}
                  className={cn(
                    "rounded-lg border py-2 text-[10px] font-semibold",
                    config.eyeStyle === i ? "border-folk-terracotta bg-white" : "border-neutral-200"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[10px] font-bold text-muted-foreground mb-1.5">입</p>
            <div className="grid grid-cols-3 gap-1.5">
              {MOUTH_STYLES.map((label, i) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => onChange({ ...config, mouthStyle: i as ChibiAvatarConfig["mouthStyle"] })}
                  className={cn(
                    "rounded-lg border py-2 text-[10px] font-semibold",
                    config.mouthStyle === i ? "border-folk-terracotta bg-white" : "border-neutral-200"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <label className="flex items-center gap-2 text-[10px] font-semibold">
            <input
              type="checkbox"
              checked={config.blush}
              onChange={(e) => onChange({ ...config, blush: e.target.checked })}
            />
            볼터치
          </label>
        </div>
      )}

      {tab === "hair" && (
        <div className="space-y-3">
          <div>
            <p className="text-[10px] font-bold text-muted-foreground mb-1.5">헤어스타일</p>
            <div className="grid grid-cols-3 gap-1.5">
              {HAIR_STYLES.map((label, i) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => onChange({ ...config, hairStyle: i as ChibiAvatarConfig["hairStyle"] })}
                  className={cn(
                    "rounded-lg border py-2 text-[10px] font-semibold",
                    config.hairStyle === i ? "border-folk-terracotta bg-white" : "border-neutral-200"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[10px] font-bold text-muted-foreground mb-1.5">헤어 컬러</p>
            <div className="flex flex-wrap gap-2">
              {HAIR_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => onChange({ ...config, hairColor: c })}
                  className={cn(
                    "h-7 w-7 rounded-full border-2",
                    config.hairColor === c ? "border-folk-terracotta" : "border-white"
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === "outfit" && (
        <div className="space-y-3">
          <div>
            <p className="text-[10px] font-bold text-muted-foreground mb-1.5">상의</p>
            <div className="grid grid-cols-3 gap-1.5">
              {TOP_STYLES.map((label, i) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => onChange({ ...config, topStyle: i as ChibiAvatarConfig["topStyle"] })}
                  className={cn(
                    "rounded-lg border py-2 text-[10px] font-semibold",
                    config.topStyle === i ? "border-folk-terracotta bg-white" : "border-neutral-200"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <ColorRow label="상의 색" value={config.topColor} onChange={(c) => onChange({ ...config, topColor: c })} />
          <ColorRow label="하의 색" value={config.bottomColor} onChange={(c) => onChange({ ...config, bottomColor: c })} />
          <ColorRow label="신발 색" value={config.shoeColor} onChange={(c) => onChange({ ...config, shoeColor: c })} />
        </div>
      )}
    </div>
  );
}

function ColorRow({ label, value, onChange }: { label: string; value: string; onChange: (c: string) => void }) {
  const presets = ["#7a8a9a", "#e85a71", "#4a7ae8", "#f4a261", "#2a9d8f", "#264653", "#ffffff", "#2a2a2a"];
  return (
    <div>
      <p className="text-[10px] font-bold text-muted-foreground mb-1.5">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {presets.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
            className={cn("h-6 w-6 rounded-md border", value === c ? "border-folk-terracotta border-2" : "border-neutral-200")}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>
    </div>
  );
}
