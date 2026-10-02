import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { SUPPORT_TIERS } from "@/lib/tiers";
import { OreTierButton } from "@/components/support/ore-tier-button";

export function SupportTierTable() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        광석 등급은 MOCO 구매가 아니라, 다른 사용자에게 <strong>{t("support.moco_2")}</strong> 기준입니다.
        사이트 <strong>{t("support.s14h06jj")}</strong>{t("support.sy64")} <strong>{t("support.scy0fh8")}</strong> 모두 같은 등급표를 사용합니다.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {SUPPORT_TIERS.map((t) => (
          <OreTierButton key={t.level} tier={t.level} showAmount className="w-full" />
        ))}
      </div>
    </div>
  );
}
