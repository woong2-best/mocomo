"use client";

import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import Link from "next/link";
import { WalletMembershipStrip } from "@/components/wallet/wallet-card-stack";
import { LEDGER_LABELS } from "@/lib/wallet-labels";
import { REWARD_TERMS_LABEL } from "@/lib/settlement-moco/constants";
import { rewardTierProgress } from "@/lib/settlement-moco/reward-tier-table";
import { CreatorRewardTierTable } from "@/components/wallet/creator-reward-tier-table";
import { UnifiedSettlementHistoryPanel } from "@/components/wallet/unified-settlement-history-panel";
import { ReceivedTipsPanel } from "@/components/wallet/received-tips-panel";
import { formatMocoSignedFromCents } from "@/lib/gems/display";
import type { TipHistory } from "@/actions/support";

type WalletData = Awaited<ReturnType<typeof import("@/actions/wallet").getMyWallet>>;

type SettlementStatus = Awaited<
  ReturnType<typeof import("@/actions/settlement-register").getCreatorSettlementStatus>
>;

type Props = {
  data: WalletData;
  settlement: SettlementStatus;
  receivedTips: TipHistory["receivedTips"];
  callbackUrl?: string | null;
  /** Deep link to return after skipping reward payout registration (Earnings tab only). */
  postSetupReturnUrl?: string | null;
};

export function RevenueSettlementPanel({
  data,
  settlement,
  receivedTips,
  postSetupReturnUrl,
}: Props) {
  const earned = settlement.settlementMocoPoints;
  const progress = rewardTierProgress(earned);
  const span = progress.nextRequiredMoco
    ? Math.max(1, progress.nextRequiredMoco - progress.currentRequiredMoco)
    : 1;
  const filled = progress.atMaxTier
    ? 1
    : Math.min(1, Math.max(0, (earned - progress.currentRequiredMoco) / span));

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border/60 bg-card p-4 space-y-3">
        <div>
          <p className="text-sm text-muted-foreground">{t("wallet.moco")}</p>
          <p className="text-3xl font-black tabular-nums">{earned.toLocaleString()} MOCO</p>
        </div>
        <div className="space-y-1.5">
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <p className="font-bold">{t("wallet.settlement.tierLabel", { label: progress.currentLabel })}</p>
            {progress.atMaxTier ? (
              <p className="text-xs font-semibold text-muted-foreground">{t("wallet.s17fu66s")}</p>
            ) : (
              <p className="text-xs font-semibold tabular-nums">
                {t("wallet.settlement.mocoToNext", { tier: progress.nextLabel, moco: progress.mocoRemaining.toLocaleString() })}
              </p>
            )}
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${Math.round(filled * 100)}%` }}
            />
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">
            {progress.atMaxTier
              ? t("wallet.s1ecavxh", { v0: progress.currentLabel })
              : t("wallet.moco_2", { v0: progress.nextLabel, v1: progress.mocoRemaining.toLocaleString() })}
          </p>
        </div>
        <p className="text-sm text-muted-foreground">
          {t("wallet.settlement.supportBadgeLine", { tier: settlement.earnedMocoTier ?? "SEED" })}
        </p>
        <p className="text-xs text-muted-foreground">
          {t("wallet.settlement.onDemandBody", { rewardLabel: REWARD_TERMS_LABEL })}{" "}
          {t("wallet.settlement.purchasedMocoNote", {
            amount: settlement.purchasedMocoPoints.toLocaleString(),
          })}
        </p>
      </div>

      <Link
        href="/settlement/request"
        className="block rounded-2xl border border-black bg-white p-4 text-black dark:border-white dark:bg-black dark:text-white"
      >
        <p className="inline-block bg-white px-1 font-display text-lg font-bold leading-none text-black">MoCoMo</p>
        <p className="mt-3 text-base font-bold">Request payout</p>
        <p className="mt-1 text-sm leading-relaxed text-black/70 dark:text-white/70">
          Opens the payout page. Your current Reward tier, tax form, and destination are handled there.
        </p>
      </Link>

      <UnifiedSettlementHistoryPanel />

      <div className="space-y-2">
        {data.recent.slice(0, 6).map((e) => (
          <WalletMembershipStrip
            key={e.id}
            title={LEDGER_LABELS[e.type] ?? e.type}
            subtitle={e.memo ?? undefined}
            right={formatMocoSignedFromCents(e.amount, e.type !== "PAYOUT_REQUEST")}
            tone={e.type === "SELLER_EARNING" ? "cobalt" : "muted"}
          />
        ))}
        {data.recent.length === 0 ? (
          <WalletMembershipStrip
            title={t("wallet.s1a73mo3")}
            subtitle={t("wallet.moco_3")}
          />
        ) : null}
      </div>

      <CreatorRewardTierTable earnedMoco={earned} />

      {postSetupReturnUrl && !settlement.payoutsEnabled ? (
        <div className="rounded-2xl border border-primary/25 bg-primary/5 px-4 py-3 text-sm space-y-1">
          <p className="font-bold text-foreground">{t("wallet.hub.rewardRegistrationTitle")}</p>
          <p className="text-muted-foreground leading-relaxed">{t("wallet.hub.rewardRegistrationDesc")}</p>
          <Link href={postSetupReturnUrl} className="text-primary font-semibold text-xs underline">
            {t("wallet.hub.rewardLater")}
          </Link>
        </div>
      ) : null}

      <ReceivedTipsPanel tips={receivedTips} />
    </div>
  );
}
