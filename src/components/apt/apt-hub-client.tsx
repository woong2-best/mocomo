"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { Building2, Home } from "lucide-react";
import type { AptProfileDto } from "@/actions/apt";
import type { BondeeRoomState } from "@/lib/apt/bondee/types";
import { AptSceneErrorBoundary } from "@/components/apt/apt-scene-error-boundary";
import { cn } from "@/lib/utils";

const AptBuildingView = dynamic(
  () => import("@/components/apt/apt-building-view").then((m) => m.AptBuildingView),
  {
    ssr: false,
    loading: () => (
      <div className="folk-card flex min-h-[min(80dvh,760px)] items-center justify-center text-sm text-muted-foreground bg-white">
        3D 아파트 불러오는 중…
      </div>
    ),
  }
);

const AptBondeeRoom = dynamic(
  () => import("@/components/apt/apt-bondee-room").then((m) => m.AptBondeeRoom),
  {
    ssr: false,
    loading: () => (
      <div className="folk-card flex min-h-[min(70dvh,640px)] items-center justify-center text-sm text-muted-foreground bg-white">
        내 방 불러오는 중…
      </div>
    ),
  }
);

export function AptHubClient({
  initialProfile,
  bondeeRoom,
  isLoggedIn,
}: {
  initialProfile: AptProfileDto | null;
  bondeeRoom: BondeeRoomState;
  isLoggedIn: boolean;
}) {
  const [tab, setTab] = useState<"tower" | "room">("room");

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 pb-16 space-y-5">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold flex items-center gap-2 text-folk-cobalt">APT</h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {isLoggedIn
            ? "치비 아바타와 아이소메트릭 방을 꾸미거나, 100층 타워에서 생활을 관찰하세요."
            : "로그인 후 가입 국가 아파트에 입주하세요."}
        </p>
        {isLoggedIn && initialProfile?.regionLabel && (
          <p className="text-xs text-folk-terracotta font-medium flex items-center gap-1">
            📍 {initialProfile.regionLabel}
            {` · ${initialProfile.homeFloor}층`}
          </p>
        )}
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setTab("room")}
          className={cn(
            "flex items-center gap-1.5 rounded-xl border px-4 py-2 text-xs font-bold transition-colors",
            tab === "room" ? "border-folk-terracotta bg-folk-terracotta/10 text-folk-terracotta" : "border-neutral-200 bg-white"
          )}
        >
          <Home className="h-4 w-4" />
          내 방
        </button>
        <button
          type="button"
          onClick={() => setTab("tower")}
          className={cn(
            "flex items-center gap-1.5 rounded-xl border px-4 py-2 text-xs font-bold transition-colors",
            tab === "tower" ? "border-folk-terracotta bg-folk-terracotta/10 text-folk-terracotta" : "border-neutral-200 bg-white"
          )}
        >
          <Building2 className="h-4 w-4" />
          100층 타워
        </button>
      </div>

      <AptSceneErrorBoundary>
        {tab === "room" ? (
          <AptBondeeRoom initialState={bondeeRoom} isLoggedIn={isLoggedIn} />
        ) : (
          <AptBuildingView initialProfile={initialProfile} isLoggedIn={isLoggedIn} />
        )}
      </AptSceneErrorBoundary>
    </div>
  );
}
