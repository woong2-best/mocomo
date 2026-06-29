"use client";

import type { AptProfileDto } from "@/actions/apt";
import { AptHouseView } from "@/components/apt/apt-house-view";
import { AppPageChrome } from "@/components/layout/app-page-chrome";
import { useClientPlatform } from "@/components/providers/client-platform-provider";
import { cn } from "@/lib/utils";

export function AptHouseHubClient({ initialProfile }: { initialProfile: AptProfileDto }) {
  const { isNativeApp } = useClientPlatform();

  return (
    <AppPageChrome maxWidth="5xl" spacing="sm">
      <div className="space-y-2">
        <h1 className={cn("text-2xl font-bold text-folk-cobalt", isNativeApp && "sr-only")}>주택</h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          GTA 스타일 오픈월드 주택 부지입니다. 건설·운전·낮/밤이 가능합니다.
        </p>
      </div>
      <AptHouseView profile={initialProfile} />
    </AppPageChrome>
  );
}
