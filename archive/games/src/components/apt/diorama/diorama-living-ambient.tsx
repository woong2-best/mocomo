"use client";

import { memo } from "react";

/** RC-1 거실 — 창밖 햇빛 · 바닥 반사 (CSS only) */
function DioramaLivingAmbientInner({ roomType }: { roomType: string }) {
  if (roomType !== "living") return null;

  return (
    <div className="apt-living-ambient pointer-events-none absolute inset-0 z-[2] overflow-hidden rounded-2xl">
      <div className="apt-living-window-sun" />
      <div className="apt-living-floor-bounce" />
    </div>
  );
}

export const DioramaLivingAmbient = memo(DioramaLivingAmbientInner);
