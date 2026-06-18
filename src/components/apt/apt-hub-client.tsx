"use client";

import { Building2 } from "lucide-react";
import { FolkSectionTitle } from "@/components/brand/folk-decor";
import { AptBuildingView } from "@/components/apt/apt-building-view";
import { useLocale } from "@/components/providers/locale-provider";

export function AptHubClient() {
  const { t } = useLocale();

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 pb-16 space-y-5">
      <div className="space-y-2">
        <FolkSectionTitle icon="sun" className="flex items-center gap-2">
          <Building2 className="h-6 w-6 text-folk-terracotta" />
          {t("nav.apt")}
        </FolkSectionTitle>
        <p className="text-sm text-muted-foreground leading-relaxed">
          층별 평면도를 편집하세요. 마우스 휠로 확대/축소하고, 현관·주방·화장실은 고정이며 나머지 방은 추가·삭제·합칠 수 있습니다.
        </p>
      </div>

      <AptBuildingView />
    </div>
  );
}
