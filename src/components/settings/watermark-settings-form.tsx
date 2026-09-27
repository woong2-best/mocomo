"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  updateWatermarkSettings,
  type WatermarkSettings,
} from "@/actions/watermark-settings";
import type { WatermarkPlacement } from "@/lib/media-watermark";

export function WatermarkSettingsForm({ initial }: { initial: WatermarkSettings }) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(initial.enabled);
  const [placement, setPlacement] = useState<WatermarkPlacement | null>(initial.placement);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  async function persist(next: { enabled: boolean; placement?: WatermarkPlacement | null }) {
    setBusy(true);
    setSaved(false);
    const result = await updateWatermarkSettings({
      enabled: next.enabled,
      placement: next.placement,
    });
    setBusy(false);
    if ("error" in result) return;
    setSaved(true);
    router.refresh();
  }

  async function toggleEnabled() {
    const next = !enabled;
    setEnabled(next);
    if (!next) setPlacement(placement);
    await persist({ enabled: next, placement });
  }

  async function choosePlacement(next: WatermarkPlacement) {
    if (!enabled || busy) return;
    setPlacement(next);
    await persist({ enabled: true, placement: next });
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        게시물에 올리는 사진·영상에 워터마크를 넣을지 정합니다. 기본은 꺼져 있습니다.
      </p>

      <button
        type="button"
        disabled={busy}
        onClick={() => void toggleEnabled()}
        className={cn(
          "flex w-full items-center justify-between rounded-xl border-2 px-4 py-3 text-left transition-colors",
          enabled
            ? "border-folk-terracotta bg-folk-terracotta/5"
            : "border-border hover:border-folk-cobalt/30"
        )}
      >
        <div>
          <p className="text-sm font-semibold">워터마크 삽입</p>
          <p className="text-xs text-muted-foreground mt-0.5">{enabled ? "On" : "Off"}</p>
        </div>
        <span
          className={cn(
            "rounded-full px-2.5 py-0.5 text-[11px] font-bold",
            enabled ? "bg-folk-terracotta text-white" : "bg-muted text-muted-foreground"
          )}
        >
          {enabled ? "On" : "Off"}
        </span>
      </button>

      <div className="grid grid-cols-2 gap-2">
        {(
          [
            { id: "corner" as const, label: "하단", hint: "오른쪽 아래" },
            { id: "diagonal" as const, label: "전체", hint: "사선으로 반복" },
          ] as const
        ).map((opt) => {
          const active = enabled && placement === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              disabled={busy || !enabled}
              onClick={() => void choosePlacement(opt.id)}
              className={cn(
                "rounded-xl border-2 px-3 py-3 text-left transition-all",
                enabled ? "opacity-100" : "opacity-35",
                active
                  ? "border-folk-terracotta bg-folk-terracotta/10 font-bold"
                  : "border-border font-medium text-muted-foreground"
              )}
            >
              <p className={cn("text-sm", active && "text-foreground")}>{opt.label}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{opt.hint}</p>
            </button>
          );
        })}
      </div>
      {saved ? <p className="text-sm text-primary">저장되었습니다.</p> : null}
    </div>
  );
}
