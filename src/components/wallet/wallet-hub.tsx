"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveBankAccount, requestPayout } from "@/actions/wallet";
import { MIN_PAYOUT_KRW } from "@/lib/settlement";
import { LEDGER_LABELS } from "@/lib/wallet-labels";
import type { WalletEarningsAnalytics } from "@/lib/wallet-analytics";
import { WalletCardStack, WalletMembershipStrip } from "@/components/wallet/wallet-card-stack";
import { WalletEarningsChart } from "@/components/wallet/wallet-earnings-chart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type WalletData = Awaited<ReturnType<typeof import("@/actions/wallet").getMyWallet>>;

type Props = {
  data: WalletData;
  earnings: WalletEarningsAnalytics;
};

type Tab = "wallet" | "earnings";

function won(n: number) {
  return `${n.toLocaleString("ko-KR")}원`;
}

export function WalletHub({ data, earnings: initialEarnings }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("wallet");
  const [earnings, setEarnings] = useState(initialEarnings);
  const [year, setYear] = useState(initialEarnings.year);
  const [pending, startTransition] = useTransition();

  const [bankName, setBankName] = useState(data.bank?.bankName ?? "");
  const [accountNumber, setAccountNumber] = useState(data.bank?.accountNumber ?? "");
  const [holderName, setHolderName] = useState(data.bank?.holderName ?? "");
  const [payoutAmount, setPayoutAmount] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const withdrawable = Math.max(0, data.availableBalance - data.pendingPayout);
  const bankLabel = data.bank
    ? `${data.bank.bankName} ${data.bank.accountNumber ? `****${String(data.bank.accountNumber).slice(-4)}` : ""}`
    : null;

  async function saveBank(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg("");
    const res = await saveBankAccount({ bankName, accountNumber, holderName });
    setLoading(false);
    if ("error" in res && res.error) setMsg(res.error);
    else {
      setMsg("계좌가 저장되었습니다.");
      router.refresh();
    }
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

  function changeYear(nextYear: number) {
    setYear(nextYear);
    startTransition(async () => {
      const { getMyWalletEarnings } = await import("@/actions/wallet");
      const next = await getMyWalletEarnings(nextYear);
      setEarnings(next);
    });
  }

  return (
    <div className="max-w-lg mx-auto space-y-5 pb-8">
      <div className="flex items-end gap-6 px-1">
        {(
          [
            { id: "wallet" as const, label: "지갑" },
            { id: "earnings" as const, label: "수익" },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "text-3xl font-black tracking-tight transition-colors",
              tab === t.id ? "text-foreground" : "text-muted-foreground/50 hover:text-muted-foreground"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "wallet" ? (
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
                right={`${e.type === "PAYOUT_REQUEST" ? "-" : "+"}${won(e.amount)}`}
                tone={e.type === "SELLER_EARNING" ? "cobalt" : e.type === "PAYOUT_REQUEST" ? "terracotta" : "muted"}
              />
            ))}
            {data.recent.length === 0 ? (
              <WalletMembershipStrip title="아직 정산 내역이 없습니다" subtitle="후원·판매 수익이 여기에 표시됩니다" />
            ) : null}
          </div>

          <div className="rounded-2xl border border-border/60 bg-card p-4 space-y-3">
            <p className="font-bold">출금 계좌</p>
            <form onSubmit={saveBank} className="space-y-2">
              <Input placeholder="은행명" value={bankName} onChange={(e) => setBankName(e.target.value)} required />
              <Input placeholder="계좌번호" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} required />
              <Input placeholder="예금주" value={holderName} onChange={(e) => setHolderName(e.target.value)} required />
              <Button type="submit" variant="secondary" disabled={loading} className="w-full">
                계좌 저장
              </Button>
            </form>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card p-4 space-y-3">
            <p className="font-bold">출금 신청</p>
            <form onSubmit={submitPayout} className="space-y-2">
              <Input
                type="number"
                placeholder={`금액 (최소 ${MIN_PAYOUT_KRW.toLocaleString()}원)`}
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
          </div>
        </div>
      ) : (
        <div className={cn("space-y-4", pending && "opacity-70 pointer-events-none")}>
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
                <WalletMembershipStrip
                  key={s.key}
                  title={s.label}
                  right={won(s.amount)}
                  tone="forest"
                />
              ))}
            </div>
          ) : null}
        </div>
      )}

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
      <p
        className={cn(
          "text-base font-black mt-1",
          tone === "up" ? "text-emerald-700" : "text-red-700"
        )}
      >
        {tone === "down" && value > 0 ? "-" : ""}
        {Math.abs(value).toLocaleString()}원
      </p>
    </div>
  );
}
