"use client";

import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { markPayoutPaid, rejectPayout } from "@/actions/admin-finance";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatUsd } from "@/lib/money";

type Dashboard = Awaited<ReturnType<typeof import("@/actions/admin-finance").getFinanceDashboard>>;

const TYPE_LABELS: Record<string, string> = {
  TIP: t("lib.wallet.labels.s202dc467ce"),
  PREMIUM: t("lib.payment.history.sbc6dd7236b"),
  EMOTICON: t("lib.wallet.labels.sa33c320215"),
  LISTING_FEE: t("admin.srei48"),
  PHYSICAL_GOODS: t("admin.spd75xd"),
  PRODUCT: t("lib.marketplace.sriaa4"),
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
    const reason = prompt(t("admin.s1cdv8g8"));
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
            <p className="text-xs text-muted-foreground">{t("admin.seyz6tw")}</p>
            <p className="text-xl font-bold">{formatUsd(stats.totalGross)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{t("admin.sbe4qn7")}</p>
            <p className="text-xl font-bold text-primary">{formatUsd(stats.platformRevenue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{t("admin.s13o5re8")}</p>
            <p className="text-xl font-bold">{formatUsd(stats.sellerBalances)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{t("admin.s18k9of8")}</p>
            <p className="text-xl font-bold">
              {formatUsd(stats.pendingPayoutAmount)} ({stats.pendingPayoutCount}건)
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{t("admin.swnr5mo")}</p>
            <p className="text-xl font-bold">{stats.paidPaymentCount.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      <p className="text-xs text-muted-foreground rounded-lg border border-border p-3 bg-muted/30">
        실제 입금은 Stripe 정산 계좌로 들어옵니다. 아래 「플랫폼 수익」은 앱 장부 기준이며, 판매자
        출금은 Stripe 입금 후 계좌이체로 처리하세요.{" "}
        <Link href="/admin/finance/stripe-verify" className="text-primary hover:underline">
          Stripe 테스트 결제 · 후원 검증 →
        </Link>
      </p>

      <Card>
        <CardHeader>
          <CardTitle>{t("admin.svv82og")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {pendingPayouts.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("admin.sj14k5e")}</p>
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
          <CardTitle>{t("admin.s17ku92k")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {recentPayments.length === 0 ? (
            <p className="text-muted-foreground">{t("admin.sjw7scq")}</p>
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
