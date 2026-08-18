"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { requestPayout } from "@/actions/wallet";
import { UsedBankVerifyForm } from "@/components/used/used-bank-verify-form";
import { WalletCardStack, WalletMembershipStrip } from "@/components/wallet/wallet-card-stack";
import { WalletEarningsChart } from "@/components/wallet/wallet-earnings-chart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MIN_PAYOUT_KRW } from "@/lib/settlement";
import { formatUsd } from "@/lib/money";
import { LEDGER_LABELS } from "@/lib/wallet-labels";
import type { WalletEarningsAnalytics } from "@/lib/wallet-analytics";
import { cn } from "@/lib/utils";
import { ShieldCheck } from "lucide-react";

type WalletData = Awaited<ReturnType<typeof import("@/actions/wallet").getMyWallet>>;

type Props = {
  data: WalletData;
  earnings: WalletEarningsAnalytics;
  bankVerified: boolean;
  verifiedBankLabel?: string | null;
  legalName?: string | null;
  emailVerified?: boolean;
  callbackUrl?: string | null;
};

function fmtUsd(n: number) {
  return formatUsd(n);
}

export function RevenueSettlementPanel({
  data,
  earnings: initialEarnings,
  bankVerified,
  verifiedBankLabel,
  legalName,
  emailVerified = true,
  callbackUrl = "/wallet?tab=earnings",
}: Props) {
  const router = useRouter();
  const [earnings, setEarnings] = useState(initialEarnings);
  const [year, setYear] = useState(initialEarnings.year);
  const [pending, startTransition] = useTransition();
  const [payoutAmount, setPayoutAmount] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const withdrawable = Math.max(0, data.availableBalance - data.pendingPayout);
  const bankLabel =
    verifiedBankLabel ??
    (data.bank
      ? `${data.bank.bankName} ${data.bank.accountNumber ? `****${String(data.bank.accountNumber).slice(-4)}` : ""}`
      : null);

  function changeYear(nextYear: number) {
    setYear(nextYear);
    startTransition(async () => {
      const { getMyWalletEarnings } = await import("@/actions/wallet");
      const next = await getMyWalletEarnings(nextYear);
      setEarnings(next);
    });
  }

  async function submitPayout(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg("");
    const res = await requestPayout(Number(payoutAmount));
    setLoading(false);
    if ("error" in res && res.error) setMsg(res.error);
    else {
      setMsg("출금 신청이 접수되었습니다.");
      setPayoutAmount("");
      router.refresh();
    }
  }

  return (
    <div className="space-y-4">
      <WalletCardStack
        withdrawable={withdrawable}
        totalEarned={data.totalEarned}
        totalWithdrawn={data.totalWithdrawn}
        pendingPayout={data.pendingPayout}
        bankLabel={bankLabel}
      />

      <div className="space-y-2">
        {data.recent.slice(0, 6).map((e) => (
          <WalletMembershipStrip
            key={e.id}
            title={LEDGER_LABELS[e.type] ?? e.type}
            subtitle={e.memo ?? undefined}
            right={`${e.type === "PAYOUT_REQUEST" ? "-" : "+"}${fmtUsd(e.amount)}`}
            tone={e.type === "SELLER_EARNING" ? "cobalt" : e.type === "PAYOUT_REQUEST" ? "terracotta" : "muted"}
          />
        ))}
        {data.recent.length === 0 ? (
          <WalletMembershipStrip title="아직 정산 내역이 없습니다" subtitle="후원·판매 수익이 여기에 표시됩니다" />
        ) : null}
      </div>

      <div className="rounded-2xl border border-border/60 bg-card p-4 space-y-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <p className="font-bold">수익 입금 계좌 (1원 인증)</p>
        </div>
        {bankVerified && verifiedBankLabel ? (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
            <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
              ✓ {verifiedBankLabel}
            </p>
            <p className="text-xs text-emerald-800/80 dark:text-emerald-300/80 mt-1">
              등록된 계좌로 수익이 입금됩니다.
            </p>
          </div>
        ) : (
          <UsedBankVerifyForm
            mode="account"
            callbackUrl={callbackUrl ?? "/wallet?tab=earnings"}
            legalName={legalName}
            emailVerified={emailVerified}
          />
        )}
      </div>

      <div className="rounded-2xl border border-border/60 bg-card p-4 space-y-3">
        <p className="font-bold">출금 신청</p>
        {!bankVerified && !data.bank ? (
          <p className="text-sm text-muted-foreground">출금 전 수익 입금 계좌를 1원 인증으로 등록해 주세요.</p>
        ) : (
          <form onSubmit={submitPayout} className="space-y-2">
            <Input
              type="number"
              placeholder={`금액 (최소 ${formatUsd(MIN_PAYOUT_KRW)})`}
              value={payoutAmount}
              onChange={(e) => setPayoutAmount(e.target.value)}
              min={MIN_PAYOUT_KRW}
              max={withdrawable}
              required
            />
            <Button
              type="submit"
              variant="secondary"
              disabled={loading || withdrawable < MIN_PAYOUT_KRW}
              className="w-full"
            >
              출금 신청
            </Button>
          </form>
        )}
      </div>

      <div className={cn("space-y-4 pt-2 border-t border-border/50", pending && "opacity-70 pointer-events-none")}>
        <p className="text-sm font-bold px-1">연간 수익 분석</p>
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

        <div className="grid grid-cols-3 gap-2">
          <StatCard label="수익" value={earnings.yearEarned} tone="up" />
          <StatCard label="지출" value={earnings.yearWithdrawn} tone="down" />
          <StatCard label="순수익" value={earnings.yearNet} tone={earnings.yearNet >= 0 ? "up" : "down"} />
        </div>

        <WalletEarningsChart months={earnings.months} yearNet={earnings.yearNet} />

        {earnings.bySource.length > 0 ? (
          <div className="space-y-2">
            <p className="text-sm font-bold px-1">수익 출처</p>
            {earnings.bySource.map((s) => (
              <WalletMembershipStrip key={s.key} title={s.label} right={fmtUsd(s.amount)} tone="forest" />
            ))}
          </div>
        ) : null}
      </div>

      {msg ? <p className="text-sm text-center text-muted-foreground">{msg}</p> : null}
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "up" | "down";
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-3 text-center">
      <p className="text-[11px] text-muted-foreground font-semibold">{label}</p>
      <p className={cn("text-base font-black mt-1", tone === "up" ? "text-emerald-700" : "text-red-700")}>
        {tone === "down" && value > 0 ? "-" : ""}
        {formatUsd(Math.abs(value))}
      </p>
    </div>
  );
}
