import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import {
  CREATOR_REWARD_TIER_TABLE,
  achievedCreatorRewardTier,
  rewardTierProgress,
} from "@/lib/settlement-moco/reward-tier-table";
import { cn } from "@/lib/utils";

export function CreatorRewardTierTable({ earnedMoco = 0 }: { earnedMoco?: number }) {
  const current = achievedCreatorRewardTier(earnedMoco);
  const progress = rewardTierProgress(earnedMoco);
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4 space-y-3">
      <div>
        <p className="font-bold text-sm">{t("wallet.reward_novice_pulse")}</p>
        <p className="text-xs text-muted-foreground mt-1">
          {t("wallet.earned_moco")} <strong>{t("wallet.spb29fy")}</strong> 등급입니다. 프로필{' '}
          <strong>{t("wallet.scgh9hc")}</strong>{t("wallet.seed_stone_moco")}
        </p>
      </div>
      <ul className="max-h-64 overflow-y-auto space-y-1 text-xs">
        {CREATOR_REWARD_TIER_TABLE.map((row) => (
          <li
            key={row.label}
            className={cn(
              "flex items-center justify-between gap-2 rounded-lg border px-2 py-1.5",
              row.label === current.label
                ? "border-primary bg-primary/10"
                : row.label === progress.nextLabel
                  ? "border-primary/40"
                  : "border-border/40",
            )}
          >
            <span className="font-semibold">
              {row.label}
              {row.label === current.label ? t("wallet.slwf9t") : ""}
              {row.label === progress.nextLabel ? t("wallet.slqg41") : ""}
            </span>
            <span className="font-mono font-bold tabular-nums">{row.requiredMoco.toLocaleString()} MOCO</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
