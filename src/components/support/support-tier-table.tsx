import { SUPPORT_TIERS } from "@/lib/tiers";
import { OreTierButton } from "@/components/support/ore-tier-button";

export function SupportTierTable() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        사이트 <strong>전체 누적 후원</strong>과 <strong>크리에이터별 개별 후원</strong> 모두 같은 등급표를 사용합니다.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {SUPPORT_TIERS.map((t) => (
          <OreTierButton key={t.level} tier={t.level} showAmount className="w-full" />
        ))}
      </div>
      <div className="rounded-xl border border-border/60 p-4 space-y-2 text-sm">
        {SUPPORT_TIERS.filter((t) => t.perks.length).map((t) => (
          <div key={t.level} className="flex gap-2 items-start border-b border-border/30 pb-2 last:border-0">
            <OreTierButton tier={t.level} showAmount className="shrink-0" />
            <p className="text-muted-foreground text-xs pt-2">{t.perks.join(" · ")}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
