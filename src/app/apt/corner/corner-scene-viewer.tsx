"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

const BASE = "/apt/hero-assets/scene-material-assembly.html";

export function CornerSceneViewer() {
  const params = useSearchParams();
  const compare = params.get("compare") ?? "0";
  const zone = params.get("zone") ?? "";
  const qs = new URLSearchParams({ compare });
  if (zone) qs.set("zone", zone);
  const src = `${BASE}?${qs.toString()}`;

  return (
    <div className="fixed inset-0 flex flex-col bg-[#1a1612]">
      <header className="flex shrink-0 items-center justify-between gap-2 border-b border-white/10 px-3 py-2 pt-[max(0.5rem,env(safe-area-inset-top))] text-white">
        <Link href="/apt/scene-review" className="text-xs font-semibold text-amber-200/90">
          ← 리뷰 목록
        </Link>
        <span className="text-[11px] font-bold tracking-wide text-white/70">CORNER SCENE · POLISH #4</span>
        <Link href="/apt" className="text-xs text-white/60">
          APT
        </Link>
      </header>
      <iframe
        title="MoCoMo corner scene"
        src={src}
        className="min-h-0 flex-1 w-full border-0"
        allow="fullscreen"
      />
    </div>
  );
}
