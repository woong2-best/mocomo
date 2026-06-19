"use client";

import { useState, useTransition } from "react";
import { requestStudioPayout } from "@/studio/actions/wallet";
import { STUDIO_MIN_PAYOUT_KRW, STUDIO_PLATFORM_FEE_PERCENT } from "@/studio/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Summary = Awaited<ReturnType<typeof import("@/studio/actions/wallet").getStudioWalletSummary>>;

export function StudioWalletPanel({ summary }: { summary: Summary }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [amount, setAmount] = useState(STUDIO_MIN_PAYOUT_KRW);

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-semibold">Studio 수익</h1>
      <p className="text-sm text-muted-foreground">
        플랫폼 수수료 {STUDIO_PLATFORM_FEE_PERCENT}% · MoCoMo 지갑과 별도
        {!summary.bankAccount && (
          <span className="ml-2 text-amber-600">· 정산 계좌 미등록</span>
        )}
      </p>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "출금 가능", value: summary.availableBalance },
          { label: "누적 수익", value: summary.totalEarned },
          { label: "출금 완료", value: summary.totalWithdrawn },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-pink-100 bg-white p-4">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className="text-xl font-bold text-pink-600">{s.value.toLocaleString()}원</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-pink-100 bg-white p-5">
        <h2 className="font-medium">출금 신청</h2>
        <p className="mt-1 text-xs text-muted-foreground">최소 {STUDIO_MIN_PAYOUT_KRW.toLocaleString()}원</p>
        <div className="mt-3 flex gap-2">
          <Input
            type="number"
            min={STUDIO_MIN_PAYOUT_KRW}
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
          />
          <Button
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                setError(null);
                const r = await requestStudioPayout(amount);
                if (r.error) setError(r.error);
              })
            }
          >
            신청
          </Button>
        </div>
        {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
      </div>

      <div>
        <h2 className="mb-2 font-medium">최근 거래</h2>
        <ul className="space-y-2 text-sm">
          {summary.transactions.map((t) => (
            <li key={t.id} className="flex justify-between rounded-lg border border-pink-50 px-3 py-2">
              <span>{t.memo ?? t.type}</span>
              <span className={t.amount >= 0 ? "text-emerald-600" : "text-muted-foreground"}>
                {t.amount >= 0 ? "+" : ""}
                {t.amount.toLocaleString()}원
              </span>
            </li>
          ))}
          {!summary.transactions.length && <li className="text-muted-foreground">거래 내역 없음</li>}
        </ul>
      </div>
    </div>
  );
}
