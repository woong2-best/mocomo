"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { confirmPaymentMethodSetup } from "@/actions/payment-methods";
import { PaymentMethodsPanel } from "@/components/wallet/payment-methods-panel";
import { RevenueSettlementPanel } from "@/components/wallet/revenue-settlement-panel";
import type { SavedPaymentMethod } from "@/lib/stripe-payment-methods";
import type { WalletEarningsAnalytics } from "@/lib/wallet-analytics";
import { cn } from "@/lib/utils";

type WalletData = Awaited<ReturnType<typeof import("@/actions/wallet").getMyWallet>>;

type Props = {
  data: WalletData;
  earnings: WalletEarningsAnalytics;
  paymentMethods: SavedPaymentMethod[];
  bankVerified: boolean;
  verifiedBankLabel?: string | null;
  legalName?: string | null;
  emailVerified?: boolean;
};

type Tab = "wallet" | "earnings";

function tabFromParams(params: URLSearchParams): Tab {
  return params.get("tab") === "earnings" ? "earnings" : "wallet";
}

export function WalletHub({
  data,
  earnings,
  paymentMethods,
  bankVerified,
  verifiedBankLabel,
  legalName,
  emailVerified,
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
      {safeCallbackUrl && !bankVerified ? (
        <div className="rounded-2xl border border-primary/25 bg-primary/5 px-4 py-3 text-sm space-y-1">
          <p className="font-bold text-foreground">수익 입금 계좌 등록</p>
          <p className="text-muted-foreground leading-relaxed">
            판매·중고거래·크리에이터 수익을 받으려면 아래에서 본인 명의 계좌 1원 인증을 완료해 주세요.
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
          <PaymentMethodsPanel methods={paymentMethods} />
          <p className="text-center text-xs text-muted-foreground px-4">
            결제할 때 이 카드 목록에서 선택합니다. 맨 앞 카드를 눌러 추가하세요.
          </p>
        </>
      ) : (
        <RevenueSettlementPanel
          data={data}
          earnings={earnings}
          bankVerified={bankVerified}
          verifiedBankLabel={verifiedBankLabel}
          legalName={legalName}
          emailVerified={emailVerified}
          callbackUrl={safeCallbackUrl ?? "/wallet?tab=earnings"}
        />
      )}

      {setupMsg ? <p className="text-sm text-center text-muted-foreground">{setupMsg}</p> : null}
    </div>
  );
}
