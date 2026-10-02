"use client";


import { errorText } from "@/lib/i18n/error-text";
import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { confirmPaymentMethodSetup } from "@/actions/payment-methods";
import { WalletStripeTopup } from "@/components/wallet/wallet-stripe-topup";
import { WalletMocoTransferStation } from "@/components/wallet/wallet-moco-transfer-station";
import { PaymentHistoryPanel } from "@/components/wallet/payment-history-panel";
import { RevenueSettlementPanel } from "@/components/wallet/revenue-settlement-panel";
import type { SavedPaymentMethod } from "@/lib/stripe-payment-methods";
import type { WalletEarningsAnalytics } from "@/lib/wallet-analytics";
import type { PaymentHistoryItem } from "@/lib/payment-history";
import type { TipHistory } from "@/actions/support";
import { cn } from "@/lib/utils";
type WalletData = Awaited<ReturnType<typeof import("@/actions/wallet").getMyWallet>>;

type Props = {
  data: WalletData;
  earnings: WalletEarningsAnalytics;
  paymentMethods: SavedPaymentMethod[];
  tipHistory: TipHistory;
  paymentHistory: PaymentHistoryItem[];
  gemBalance: number;
  minTopupMoco: number;
  lowBalanceNotice?: boolean;
  gemPurchases: {
    id: string;
    gems: number;
    remainingGems: number;
    krwAmount: number;
    refunded: boolean;
    refundedUsd: number | null;
    createdAt: Date;
  }[];
  userImageUrl?: string | null;
  settlement: Awaited<
    ReturnType<typeof import("@/actions/settlement-register").getCreatorSettlementStatus>
  >;
};

type Tab = "wallet" | "earnings" | "transfer";

function tabFromParams(params: URLSearchParams): Tab {
  const tab = params.get("tab");
  if (tab === "earnings") return "earnings";
  if (tab === "transfer") return "transfer";
  return "wallet";
}

export function WalletHub({
  data,
  earnings,
  tipHistory,
  paymentHistory,
  minTopupMoco,
  lowBalanceNotice,
  userImageUrl,
  settlement,
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
      if (next !== "wallet") nextParams.set("tab", next);
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

    let cancelled = false;
    void (async () => {
      try {
        const res = await confirmPaymentMethodSetup(sessionId);
        if (cancelled) return;
        if ("error" in res && res.error) {
          setSetupMsg(errorText(res.error));
        } else {
          setSetupMsg(t("wallet.hub.paymentMethodRegistered"));
          router.refresh();
        }
      } catch (e) {
        if (!cancelled) {
          console.error("[wallet] confirmPaymentMethodSetup", e);
          setSetupMsg(t("wallet.hub.cardConfirmFailed"));
        }
      } finally {
        if (!cancelled) {
          router.replace("/wallet", { scroll: false });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [params, router]);

  const tabs = [
    { id: "wallet" as const, label: t("wallet.hub.tabWallet") },
    { id: "earnings" as const, label: t("wallet.hub.tabEarnings") },
    { id: "transfer" as const, label: t("wallet.hub.tabTransfer") },
  ] as const;

  return (
    <div className="mx-auto max-w-lg space-y-5 overflow-x-visible pb-8 px-0.5">
      {safeCallbackUrl && !settlement.payoutsEnabled ? (
        <div className="rounded-2xl border border-primary/25 bg-primary/5 px-4 py-3 text-sm space-y-1">
          <p className="font-bold text-foreground">{t("wallet.hub.rewardRegistrationTitle")}</p>
          <p className="text-muted-foreground leading-relaxed">{t("wallet.hub.rewardRegistrationDesc")}</p>
          <Link href={safeCallbackUrl} className="text-primary font-semibold text-xs underline">
            {t("wallet.hub.rewardLater")}
          </Link>
        </div>
      ) : null}

      <div className="flex flex-wrap items-end gap-x-6 gap-y-1 px-1">
        {tabs.map((row) => (
          <button
            key={row.id}
            type="button"
            onClick={() => selectTab(row.id)}
            className={cn(
              "text-2xl font-black tracking-tight transition-colors min-[400px]:text-3xl",
              tab === row.id ? "text-foreground" : "text-muted-foreground/50 hover:text-muted-foreground"
            )}
          >
            {row.label}
          </button>
        ))}
      </div>

      {tab === "wallet" ? (
        <>
          <WalletStripeTopup
            purchasedMoco={settlement.purchasedMocoPoints}
            minTopupMoco={minTopupMoco}
            lowBalanceNotice={lowBalanceNotice}
          />
          <PaymentHistoryPanel items={paymentHistory} />
        </>
      ) : tab === "transfer" ? (
        <WalletMocoTransferStation
          purchasedMoco={settlement.purchasedMocoPoints}
          userImageUrl={userImageUrl}
        />
      ) : (
        <RevenueSettlementPanel
          data={data}
          earnings={earnings}
          settlement={settlement}
          receivedTips={tipHistory.receivedTips}
          callbackUrl={safeCallbackUrl ?? "/wallet?tab=earnings"}
        />
      )}

      {setupMsg ? <p className="text-sm text-center text-muted-foreground">{setupMsg}</p> : null}
    </div>
  );
}
