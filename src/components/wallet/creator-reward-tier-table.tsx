import {
  CREATOR_REWARD_TIER_TABLE,
  formatRewardUsd,
} from "@/lib/settlement-moco/reward-tier-table";

export function CreatorRewardTierTable() {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4 space-y-3">
      <div>
        <p className="font-bold text-sm">Reward 정산 등급 (Novice / Pulse / …)</p>
        <p className="text-xs text-muted-foreground mt-1">
          매월 earned MOCO로 산정하는 <strong>정산 지급</strong> 등급입니다. 프로필{' '}
          <strong>후원 광석</strong>(Seed/Stone/…) 등급과 이름·기준이 다릅니다. (1 MOCO = $5, 플랫폼 5% → $4.75/MOCO)
        </p>
      </div>
      <ul className="max-h-64 overflow-y-auto space-y-1 text-xs">
        {CREATOR_REWARD_TIER_TABLE.map((row) => (
          <li
            key={row.label}
            className="flex items-center justify-between gap-2 rounded-lg border border-border/40 px-2 py-1.5"
          >
            <span className="font-semibold">{row.label}</span>
            <span className="tabular-nums text-muted-foreground">
              {row.requiredMoco.toLocaleString()} MOCO
            </span>
            <span className="font-mono font-bold tabular-nums">{formatRewardUsd(row.rewardUsd)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
