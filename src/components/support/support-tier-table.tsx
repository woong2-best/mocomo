import { SUPPORT_TIERS } from "@/lib/tiers";
import { OreTierButton } from "@/components/support/ore-tier-button";

export function SupportTierTable() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        광석 등급은 MOCO 구매가 아니라, 다른 사용자에게 <strong>후원을 완료한 누적 MOCO</strong> 기준입니다.
        사이트 <strong>전체 누적 후원</strong>과 <strong>크리에이터별 개별 후원</strong> 모두 같은 등급표를 사용합니다.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {SUPPORT_TIERS.map((t) => (
          <OreTierButton key={t.level} tier={t.level} showAmount linkToDetail className="w-full" />
        ))}
      </div>
    </div>
  );
}
