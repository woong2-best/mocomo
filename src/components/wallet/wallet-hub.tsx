"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { confirmPaymentMethodSetup } from "@/actions/payment-methods";
import { PaymentMethodsPanel } from "@/components/wallet/payment-methods-panel";
import { PaymentHistoryPanel } from "@/components/wallet/payment-history-panel";
import { ReceivedTipsPanel } from "@/components/wallet/received-tips-panel";
import { RevenueSettlementPanel } from "@/components/wallet/revenue-settlement-panel";
import type { SavedPaymentMethod } from "@/lib/stripe-payment-methods";
import type { WalletEarningsAnalytics } from "@/lib/wallet-analytics";
import type { PaymentHistoryItem } from "@/lib/payment-history";
import type { TipHistory } from "@/actions/support";
import { GemBalancePanel } from "@/components/wallet/gem-balance-panel";
import { cn } from "@/lib/utils";

type WalletData = Awaited<ReturnType<typeof import("@/actions/wallet").getMyWallet>>;

type Props = {
  data: WalletData;
  earnings: WalletEarningsAnalytics;
  paymentMethods: SavedPaymentMethod[];
  tipHistory: TipHistory;
  paymentHistory: PaymentHistoryItem[];
  gemBalance: number;
  gemPackages: readonly { gems: number; usdCents: number; label: string }[];
  gemPurchases: {
    id: string;
    gems: number;
    remainingGems: number;
    krwAmount: number;
    refunded: boolean;
    refundedUsd: number | null;
    createdAt: Date;
  }[];
  stripeOnboardingCompleted: boolean;
};

type Tab = "wallet" | "earnings";

function tabFromParams(params: URLSearchParams): Tab {
  return params.get("tab") === "earnings" ? "earnings" : "wallet";
}

export function WalletHub({
  data,
  earnings,
  paymentMethods,
  tipHistory,
  paymentHistory,
  gemBalance,
  gemPackages,
  gemPurchases,
  stripeOnboardingCompleted,
}: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl");
  const safeCallbackUrl =
    callbackUrl?.startsWith("/") && !callbackUrl.startsWith("//") ? callbackUrl : null;
  const [tab, setTab] = useState<Tab>(() => tabFromParams(params));
  const [setupMsg, setSetupMsg] = useState("");

  const syncTabToUrl = useCallback(
    (next: Tab) => {
      const nextParams = new URLSearchParams();
      if (next === "earnings") nextParams.set("tab", "earnings");
      if (safeCallbackUrl) nextParams.set("callbackUrl", safeCallbackUrl);
      const qs = nextParams.toString();
      router.replace(qs ? `/wallet?${qs}` : "/wallet", { scroll: false });
    },
    [router, safeCallbackUrl]
  );

  const selectTab = useCallback(
    (next: Tab) => {
      setTab(next);
      syncTabToUrl(next);
    },
    [syncTabToUrl]
  );

  useEffect(() => {
    setTab(tabFromParams(params));
  }, [params]);

  useEffect(() => {
    const setup = params.get("setup");
    const sessionId = params.get("session_id");
    if (setup !== "success" || !sessionId) return;

    void (async () => {
      const res = await confirmPaymentMethodSetup(sessionId);
      if ("error" in res && res.error) setSetupMsg(res.error);
      else {
        setSetupMsg("결제 수단이 등록되었습니다.");
        selectTab("wallet");
        router.refresh();
      }
    })();
  }, [params, router, selectTab]);

  return (
    <div className="max-w-lg mx-auto space-y-5 pb-8">
      {safeCallbackUrl && !stripeOnboardingCompleted ? (
        <div className="rounded-2xl border border-primary/25 bg-primary/5 px-4 py-3 text-sm space-y-1">
          <p className="font-bold text-foreground">수익 정산 계좌 연동</p>
          <p className="text-muted-foreground leading-relaxed">
            판매·중고거래·크리에이터 수익을 받으려면 아래에서 Stripe Connect로 정산 계좌를
            연동해 주세요.
          </p>
          <Link href={safeCallbackUrl} className="text-primary font-semibold text-xs underline">
            나중에 — 이전 화면으로
          </Link>
        </div>
      ) : null}

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
            onClick={() => selectTab(t.id)}
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
        <>
          <GemBalancePanel balance={gemBalance} packages={gemPackages} purchases={gemPurchases} />
          <PaymentMethodsPanel methods={paymentMethods} />
          <PaymentHistoryPanel items={paymentHistory} />
          <p className="text-center text-xs text-muted-foreground px-4">
            결제할 때 등록된 카드 목록에서 선택합니다.
          </p>
        </>
      ) : (
        <>
          <ReceivedTipsPanel tips={tipHistory.receivedTips} />
          <RevenueSettlementPanel
            data={data}
            earnings={earnings}
            stripeOnboardingCompleted={stripeOnboardingCompleted}
            callbackUrl={safeCallbackUrl ?? "/wallet?tab=earnings"}
          />
        </>
      )}

      {setupMsg ? <p className="text-sm text-center text-muted-foreground">{setupMsg}</p> : null}
    </div>
  );
}
