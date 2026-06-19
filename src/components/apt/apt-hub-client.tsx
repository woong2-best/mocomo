"use client";

import dynamic from "next/dynamic";
import type { AptProfileDto } from "@/actions/apt";
import { AptSceneErrorBoundary } from "@/components/apt/apt-scene-error-boundary";

const AptBuildingView = dynamic(
  () => import("@/components/apt/apt-building-view").then((m) => m.AptBuildingView),
  {
    ssr: false,
    loading: () => (
      <div className="folk-card flex min-h-[min(80dvh,760px)] items-center justify-center text-sm text-muted-foreground">
        3D 아파트 불러오는 중…
      </div>
    ),
  }
);

export function AptHubClient({
  initialProfile,
  isLoggedIn,
}: {
  initialProfile: AptProfileDto | null;
  isLoggedIn: boolean;
}) {
  return (
    <div className="max-w-5xl mx-auto px-4 py-6 pb-16 space-y-5">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold flex items-center gap-2 text-folk-cobalt">
          APT
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {isLoggedIn
            ? "3D 아파트에서 아바타가 생활합니다. 휠로 확대/축소하고, 방을 편집하거나 TV 시청·청소·요리 활동을 관찰하세요."
            : "로그인 후 가입 국가 아파트에 입주하세요."}
        </p>
        {isLoggedIn && initialProfile?.regionLabel && (
          <p className="text-xs text-folk-terracotta font-medium flex items-center gap-1">
            📍 {initialProfile.regionLabel}
            {` · ${initialProfile.homeFloor}층`}
          </p>
        )}
      </div>

      <AptSceneErrorBoundary>
        <AptBuildingView initialProfile={initialProfile} isLoggedIn={isLoggedIn} />
      </AptSceneErrorBoundary>
    </div>
  );
}
