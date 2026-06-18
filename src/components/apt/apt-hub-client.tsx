"use client";

import { Building2 } from "lucide-react";
import { FolkSectionTitle } from "@/components/brand/folk-decor";
import { AptBuildingView } from "@/components/apt/apt-building-view";
import { useLocale } from "@/components/providers/locale-provider";
import type { AptProfileDto } from "@/actions/apt";

export function AptHubClient({
  initialProfile,
  isLoggedIn,
}: {
  initialProfile: AptProfileDto | null;
  isLoggedIn: boolean;
}) {
  const { t } = useLocale();

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 pb-16 space-y-5">
      <div className="space-y-2">
        <FolkSectionTitle icon="sun" className="flex items-center gap-2">
          <Building2 className="h-6 w-6 text-folk-terracotta" />
          {t("nav.apt")}
        </FolkSectionTitle>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {isLoggedIn
            ? "3D 아파트에서 아바타가 생활합니다. 휠로 확대/축소하고, 방을 편집하거나 TV 시청·청소·요리 활동을 관찰하세요."
            : "로그인 후 입주하면 나만의 APT와 아바타 생활 시뮬레이션이 시작됩니다."}
        </p>
      </div>

      <AptBuildingView initialProfile={initialProfile} isLoggedIn={isLoggedIn} />
    </div>
  );
}
