"use client";

import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { WalletMembershipStrip } from "@/components/wallet/wallet-card-stack";
import { WalletEarningsExportPanel } from "@/components/wallet/wallet-earnings-export-panel";
import { SettlementRegistrationPanel } from "@/components/wallet/settlement-registration-panel";
import { LEDGER_LABELS } from "@/lib/wallet-labels";
import { REWARD_TERMS_LABEL } from "@/lib/settlement-moco/constants";
import { rewardTierProgress } from "@/lib/settlement-moco/reward-tier-table";
import { CreatorRewardTierTable } from "@/components/wallet/creator-reward-tier-table";
import { OnDemandWithdrawalPanel } from "@/components/wallet/on-demand-withdrawal-panel";
import { UnifiedSettlementHistoryPanel } from "@/components/wallet/unified-settlement-history-panel";
import { ReceivedTipsPanel } from "@/components/wallet/received-tips-panel";
import {
  formatMocoDisplay,
  formatMocoSignedFromCents,
} from "@/lib/gems/display";
import type { WalletEarningsAnalytics } from "@/lib/wallet-analytics";
import type { TipHistory } from "@/actions/support";
import { cn } from "@/lib/utils";

type WalletData = Awaited<ReturnType<typeof import("@/actions/wallet").getMyWallet>>;

type SettlementStatus = Awaited<
  ReturnType<typeof import("@/actions/settlement-register").getCreatorSettlementStatus>
>;

type Props = {
  data: WalletData;
  earnings: WalletEarningsAnalytics;
  settlement: SettlementStatus;
  receivedTips: TipHistory["receivedTips"];
  callbackUrl?: string | null;
  /** Deep link to return after skipping reward payout registration (Earnings tab only). */
  postSetupReturnUrl?: string | null;
};

export function RevenueSettlementPanel({
  data,
  earnings: initialEarnings,
  settlement,
  receivedTips,
  postSetupReturnUrl,
}: Props) {
  const [earnings, setEarnings] = useState(initialEarnings);
  const [year, setYear] = useState(initialEarnings.year);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);

  const earned = settlement.settlementMocoPoints;
  const progress = rewardTierProgress(earned);
  const span = progress.nextRequiredMoco
    ? Math.max(1, progress.nextRequiredMoco - progress.currentRequiredMoco)
    : 1;
  const filled = progress.atMaxTier
    ? 1
    : Math.min(1, Math.max(0, (earned - progress.currentRequiredMoco) / span));

  function changeYear(nextYear: number) {
    setYear(nextYear);
    startTransition(async () => {
      const { getMyWalletEarnings } = await import("@/actions/wallet");
      const next = await getMyWalletEarnings(nextYear);
      setEarnings(next);
    });
  }

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
          {settlement.onDemandPayoutEnabled
            ? t("wallet.settlement.onDemandBody", { rewardLabel: REWARD_TERMS_LABEL })
            : t("wallet.settlement.monthlyBody", { rewardLabel: REWARD_TERMS_LABEL })}{" "}
          {t("wallet.settlement.purchasedMocoNote", {
            amount: settlement.purchasedMocoPoints.toLocaleString(),
          })}
        </p>
      </div>

      {settlement.onDemandPayoutEnabled ? (
        <OnDemandWithdrawalPanel
          settlementMoco={earned}
          payoutsEnabled={settlement.payoutsEnabled}
          onSuccess={() => {
            router.refresh();
            setHistoryRefreshKey((k) => k + 1);
          }}
        />
      ) : null}

      <UnifiedSettlementHistoryPanel refreshKey={historyRefreshKey} />

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

      <SettlementRegistrationPanel
        registered={settlement.registered}
        payoutsEnabled={settlement.payoutsEnabled}
        hasConnectAccount={settlement.hasConnectAccount}
        needsExpressMigration={settlement.needsExpressMigration}
        taxReportingReady={settlement.taxReportingReady}
        taxRequirementsDue={settlement.taxRequirementsDue}
        profile={settlement.profile}
        detailsSubmitted={settlement.payoutDashboard?.detailsSubmitted}
        notReadyReasons={settlement.payoutDashboard?.reasons}
      />

      <div className={cn("space-y-4 pt-2 border-t border-border/50", pending && "opacity-70 pointer-events-none")}>
        <p className="text-sm font-bold px-1">{t("wallet.s10el2q8")}</p>
        <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
          {earnings.years.map((y) => (
            <button
              key={y}
              type="button"
              onClick={() => changeYear(y)}
              className={cn(
                "shrink-0 rounded-full px-4 py-2 text-sm font-bold border transition-colors",
                year === y
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-muted/40 text-muted-foreground border-border/60"
              )}
            >
              {t("wallet.settlement.yearButton", { year: String(y) })}
            </button>
          ))}
        </div>

        <WalletEarningsExportPanel
          transactions={earnings.transactions ?? []}
          months={earnings.months}
          year={earnings.year}
          yearNet={earnings.yearNet}
        />

        <ReceivedTipsPanel tips={receivedTips} />
      </div>
    </div>
  );
}
