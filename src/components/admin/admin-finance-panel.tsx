"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { markPayoutPaid, rejectPayout } from "@/actions/admin-finance";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatUsd } from "@/lib/money";

type Dashboard = Awaited<ReturnType<typeof import("@/actions/admin-finance").getFinanceDashboard>>;

const TYPE_LABELS: Record<string, string> = {
  TIP: "후원",
  PREMIUM: "프리미엄",
  EMOTICON: "이모티콘",
  LISTING_FEE: "등록비",
  PHYSICAL_GOODS: "실물굿즈",
  PRODUCT: "디지털",
};

export function AdminFinancePanel({ data }: { data: Dashboard }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const { stats, recentPayments, pendingPayouts } = data;

  async function paid(id: string) {
    setBusy(id);
    await markPayoutPaid(id);
    setBusy(null);
    router.refresh();
  }

  async function reject(id: string) {
    const reason = prompt("반려 사유");
    if (!reason) return;
    setBusy(id);
    await rejectPayout(id, reason);
    setBusy(null);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">총 결제액 (장부)</p>
            <p className="text-xl font-bold">{formatUsd(stats.totalGross)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">플랫폼 수익 (수수료·등록비·프리미엄)</p>
            <p className="text-xl font-bold text-primary">{formatUsd(stats.platformRevenue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">판매자 미지급 잔액</p>
            <p className="text-xl font-bold">{formatUsd(stats.sellerBalances)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">출금 대기</p>
            <p className="text-xl font-bold">
              {formatUsd(stats.pendingPayoutAmount)} ({stats.pendingPayoutCount}건)
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">완료 결제 건수</p>
            <p className="text-xl font-bold">{stats.paidPaymentCount.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      <p className="text-xs text-muted-foreground rounded-lg border border-border p-3 bg-muted/30">
        실제 입금은 Stripe 정산 계좌로 들어옵니다. 아래 「플랫폼 수익」은 앱 장부 기준이며, 판매자
        출금은 Stripe 입금 후 계좌이체로 처리하세요.
      </p>

      <Card>
        <CardHeader>
          <CardTitle>출금 대기열</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {pendingPayouts.length === 0 ? (
            <p className="text-sm text-muted-foreground">대기 중인 출금이 없습니다.</p>
          ) : (
            pendingPayouts.map((p) => (
              <div key={p.id} className="border rounded-lg p-3 text-sm space-y-2">
                <p className="font-medium">
                  @{p.user.username} · {formatUsd(p.amount)}
                </p>
                <p className="text-muted-foreground">
                  {p.bankName} {p.accountNumber} · {p.holderName}
                </p>
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" disabled={busy === p.id} onClick={() => paid(p.id)}>
                    입금 완료
                  </Button>
                  <Button size="sm" variant="outline" disabled={busy === p.id} onClick={() => reject(p.id)}>
                    반려
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>최근 결제</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {recentPayments.length === 0 ? (
            <p className="text-muted-foreground">결제 내역이 없습니다.</p>
          ) : (
            recentPayments.map((pi) => (
              <div key={pi.id} className="flex justify-between py-1 border-b border-border/40 last:border-0">
                <span>
                  {TYPE_LABELS[pi.type] ?? pi.type} · @{pi.user.username}
                </span>
                <span className="font-medium">
                  {formatUsd(pi.amount)}
                  {pi.paidAt && (
                    <span className="text-muted-foreground text-xs ml-1">
                      {new Date(pi.paidAt).toLocaleDateString("ko-KR")}
                    </span>
                  )}
                </span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
