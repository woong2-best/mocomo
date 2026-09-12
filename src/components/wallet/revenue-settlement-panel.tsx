"use client";

import { useState, useTransition } from "react";
import { WalletMembershipStrip } from "@/components/wallet/wallet-card-stack";
import { WalletEarningsExportPanel } from "@/components/wallet/wallet-earnings-export-panel";
import { SettlementRegistrationPanel } from "@/components/wallet/settlement-registration-panel";
import { formatKrw } from "@/lib/money";
import { mocoToKrw } from "@/lib/moco/economy";
import { LEDGER_LABELS } from "@/lib/wallet-labels";
import { REWARD_TERMS_LABEL } from "@/lib/settlement-moco/constants";
import type { WalletEarningsAnalytics } from "@/lib/wallet-analytics";
import { cn } from "@/lib/utils";

type WalletData = Awaited<ReturnType<typeof import("@/actions/wallet").getMyWallet>>;

type SettlementStatus = Awaited<
  ReturnType<typeof import("@/actions/settlement-register").getCreatorSettlementStatus>
>;

type Props = {
  data: WalletData;
  earnings: WalletEarningsAnalytics;
  settlement: SettlementStatus;
  callbackUrl?: string | null;
};

export function RevenueSettlementPanel({ data, earnings: initialEarnings, settlement }: Props) {
  const [earnings, setEarnings] = useState(initialEarnings);
  const [year, setYear] = useState(initialEarnings.year);
  const [pending, startTransition] = useTransition();

  const settlementKrw = mocoToKrw(settlement.settlementMocoPoints);

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
      <div className="rounded-2xl border border-border/60 bg-card p-4 space-y-2">
        <p className="text-sm text-muted-foreground">earned MOCO (후원 수령 · 정산 대상)</p>
        <p className="text-3xl font-black tabular-nums">
          {settlement.settlementMocoPoints.toLocaleString()} MOCO
        </p>
        <p className="text-sm text-muted-foreground">
          등급 {settlement.earnedMocoTier ?? "SEED"} · 매월 1일 등급 차감 후 {REWARD_TERMS_LABEL} 지급 · 잔여 이월
        </p>
        <p className="text-xs text-muted-foreground">
          purchased MOCO {settlement.purchasedMocoPoints.toLocaleString()} (충전만으로는 정산 등급·출금 불가)
        </p>
      </div>

      <div className="space-y-2">
        {data.recent.slice(0, 6).map((e) => (
          <WalletMembershipStrip
            key={e.id}
            title={LEDGER_LABELS[e.type] ?? e.type}
            subtitle={e.memo ?? undefined}
            right={`+${e.amount}`}
            tone={e.type === "SELLER_EARNING" ? "cobalt" : "muted"}
          />
        ))}
        {data.recent.length === 0 ? (
          <WalletMembershipStrip
            title="아직 활동 보상 내역이 없습니다"
            subtitle="후원·판매·구독 수익이 정산 MOCO로 적립됩니다"
          />
        ) : null}
      </div>

      <SettlementRegistrationPanel
        registered={settlement.registered}
        payoutsEnabled={settlement.payoutsEnabled}
        profile={settlement.profile}
      />

      {settlement.recentRewards.length > 0 ? (
        <div className="rounded-2xl border border-border/60 bg-card p-4 space-y-2">
          <p className="font-bold">Reward 지급 내역</p>
          {settlement.recentRewards.map((batch) => (
            <WalletMembershipStrip
              key={batch.id}
              title={`${batch.periodYear}.${String(batch.periodMonth).padStart(2, "0")} ${REWARD_TERMS_LABEL}`}
              subtitle={batch.status}
              right={
                batch.currency === "krw"
                  ? formatKrw(batch.netAmountMinor)
                  : `${batch.netAmountMinor}`
              }
              tone={batch.status === "COMPLETED" ? "forest" : "muted"}
            />
          ))}
        </div>
      ) : null}

      <div className={cn("space-y-4 pt-2 border-t border-border/50", pending && "opacity-70 pointer-events-none")}>
        <p className="text-sm font-bold px-1">연간 활동 분석</p>
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
              {y}년
            </button>
          ))}
        </div>

        <WalletEarningsExportPanel
          transactions={earnings.transactions ?? []}
          months={earnings.months}
          year={earnings.year}
          yearNet={earnings.yearNet}
        />
      </div>
    </div>
  );
}
