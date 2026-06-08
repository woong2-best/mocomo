"use client";

import { useEffect, useMemo, useState } from "react";
import {
  FACE_FILTER_BY_CATEGORY,
  FACE_FILTER_PRESETS,
  type FaceFilterCategory,
  type FaceFilterId,
} from "@/lib/face-filters/presets";
import { cn } from "@/lib/utils";
import { Sparkles } from "lucide-react";

type FaceFilterStripProps = {
  value: FaceFilterId;
  onChange: (id: FaceFilterId) => void;
  disabled?: boolean;
  className?: string;
  compact?: boolean;
  /** 얼굴 추적 모듈 상태 (AR·3D 마스크) */
  faceTrackingNeeded?: boolean;
  faceTrackingReady?: boolean;
  landmarkerState?: "idle" | "loading" | "ready" | "error";
};

const TABS: { id: FaceFilterCategory; label: string }[] = [
  { id: "beauty", label: "뷰티" },
  { id: "ar", label: "AR" },
  { id: "mask3d", label: "3D 마스크" },
];

export function FaceFilterStrip({
  value,
  onChange,
  disabled,
  className,
  compact,
  faceTrackingNeeded,
  faceTrackingReady,
  landmarkerState,
}: FaceFilterStripProps) {
  const activeCategory = useMemo(() => {
    return FACE_FILTER_PRESETS.find((p) => p.id === value)?.category ?? "beauty";
  }, [value]);

  const [tab, setTab] = useState<FaceFilterCategory>(activeCategory);
  const presets = FACE_FILTER_BY_CATEGORY[tab];

  useEffect(() => {
    setTab(activeCategory);
  }, [activeCategory]);

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center justify-between gap-2 px-0.5">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5" />
          <span>얼굴 필터</span>
        </div>
        <div className="flex rounded-lg bg-muted/60 p-0.5 gap-0.5">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              disabled={disabled}
              onClick={() => setTab(t.id)}
              className={cn(
                "px-2 py-0.5 rounded-md text-[10px] font-semibold transition-colors",
                tab === t.id
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
                disabled && "opacity-50"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === "mask3d" && (
        <p className="text-[10px] text-muted-foreground px-0.5 leading-snug">
          얼굴을 따라 붙는 풀페이스 마스크 · 고개를 돌려도 추적
        </p>
      )}

      {tab === "ar" && (
        <p className="text-[10px] text-muted-foreground px-0.5 leading-snug">
          {value === "dog" && "WARM · FLUFFY · COCKER SPANIEL"}
          {value === "cat" && "SLEEK · MYSTERIOUS · CALICO"}
          {value === "bunny" && "SOFT · FLUFFY · ANGORA STYLE"}
          {value === "crown" && "REGAL · METALLIC · 3D JEWELED"}
          {value === "glasses" && "CHIC · OVERSIZED · ACETATE 3D"}
          {value === "hearts" && "ROMANTIC · PARTICLE · DREAMY"}
        </p>
      )}

      {(tab === "ar" || tab === "mask3d") && faceTrackingNeeded && (
        <p
          className={cn(
            "text-[10px] px-0.5 leading-snug",
            faceTrackingReady
              ? "text-emerald-600 dark:text-emerald-400"
              : landmarkerState === "error"
                ? "text-destructive"
                : "text-amber-600 dark:text-amber-400"
          )}
        >
          {faceTrackingReady
            ? "얼굴 추적 준비됨"
            : landmarkerState === "error"
              ? "얼굴 인식 모듈 로드 실패 — 새로고침 후 다시 시도해 주세요"
              : landmarkerState === "loading" || landmarkerState === "idle"
                ? "얼굴 인식 모듈 로딩 중…"
                : "얼굴을 화면 중앙에 맞춰 주세요"}
        </p>
      )}

      <div
        className={cn(
          "flex gap-2 overflow-x-auto pb-1 scrollbar-thin",
          compact ? "px-0" : "-mx-1 px-1"
        )}
      >
        {presets.map((preset) => {
          const selected = value === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              disabled={disabled}
              onClick={() => onChange(preset.id)}
              className={cn(
                "shrink-0 flex flex-col items-center gap-1 rounded-xl border px-2.5 py-2 transition-all min-w-[4.5rem]",
                selected
                  ? "border-primary bg-primary/15 ring-2 ring-primary/40"
                  : "border-border bg-muted/40 hover:border-primary/30",
                disabled && "opacity-50 pointer-events-none",
                preset.category === "mask3d" && !selected && "border-violet-500/25"
              )}
            >
              <span
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full text-lg",
                  selected ? "bg-primary/20" : "bg-background/80",
                  preset.category === "mask3d" && "ring-1 ring-violet-400/30"
                )}
              >
                {preset.emoji}
              </span>
              <span className={cn("text-[10px] font-medium", selected && "text-primary")}>
                {preset.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
