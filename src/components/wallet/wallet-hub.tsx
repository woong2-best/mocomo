"use client";

import { useEffect, useState } from "react";
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
  const [tab, setTab] = useState<Tab>("wallet");
  const [setupMsg, setSetupMsg] = useState("");

  useEffect(() => {
    const setup = params.get("setup");
    const sessionId = params.get("session_id");
    if (setup !== "success" || !sessionId) return;

    void (async () => {
      const res = await confirmPaymentMethodSetup(sessionId);
      if ("error" in res && res.error) setSetupMsg(res.error);
      else {
        setSetupMsg("결제 수단이 등록되었습니다.");
        setTab("wallet");
        router.replace("/wallet");
        router.refresh();
      }
    })();
  }, [params, router]);

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
        <PaymentMethodsPanel methods={paymentMethods} />
      ) : (
        <RevenueSettlementPanel
          data={data}
          earnings={earnings}
          bankVerified={bankVerified}
          verifiedBankLabel={verifiedBankLabel}
          legalName={legalName}
          emailVerified={emailVerified}
        />
      )}

      {setupMsg ? <p className="text-sm text-center text-muted-foreground">{setupMsg}</p> : null}
    </div>
  );
}
