"use client";

import type { AptProfileDto } from "@/actions/apt";
import { AptHouseView } from "@/components/apt/apt-house-view";

export function AptHouseHubClient({ initialProfile }: { initialProfile: AptProfileDto }) {
  return (
    <div className="max-w-5xl mx-auto px-4 py-6 pb-16 space-y-5">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-folk-cobalt">주택</h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          GTA 스타일 오픈월드 주택 부지입니다. 건설·운전·낮/밤이 가능합니다.
        </p>
      </div>
      <AptHouseView profile={initialProfile} />
    </div>
  );
}
