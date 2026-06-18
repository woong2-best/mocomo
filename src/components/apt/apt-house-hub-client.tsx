"use client";

import type { AptProfileDto } from "@/actions/apt";
import { AptHouseView } from "@/components/apt/apt-house-view";

export function AptHouseHubClient({ initialProfile }: { initialProfile: AptProfileDto }) {
  return (
    <div className="max-w-5xl mx-auto px-4 py-6 pb-16 space-y-5">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-folk-cobalt">주택</h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          지구본에서 선택한 부지입니다. 실제 지구 비율에 맞춘 집 크기로 건설 모드가 확장됩니다.
        </p>
      </div>
      <AptHouseView profile={initialProfile} />
    </div>
  );
}
