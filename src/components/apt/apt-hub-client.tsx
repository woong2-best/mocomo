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
          아파트 층을 탐색하세요. 화살표·층 클릭으로 이동하고, 상단 버튼으로 내부 구조를 투명하게 볼 수 있습니다.
        </p>
      </div>

      <AptBuildingView />
    </div>
  );
}
