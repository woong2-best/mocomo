"use client";

import { useEffect, useState } from "react";
import type { SavedPaymentMethod } from "@/lib/stripe-payment-methods";
import { GemBalancePanel } from "@/components/wallet/gem-balance-panel";
import { MocomoCardReader } from "@/components/wallet/mocomo-card-reader";
import { WalletZeroPaymentCards } from "@/components/wallet/wallet-zero-payment-cards";
import type { AtmScreenOverlay, ReaderLightState } from "@/components/wallet/wallet-payment-types";

type GemPurchaseRow = {
  id: string;
  gems: number;
  remainingGems: number;
  krwAmount: number;
  refunded: boolean;
  refundedUsd: number | null;
  createdAt: Date;
};

type Props = {
  balance: number;
  minTopupMoco: number;
  paymentMethods: SavedPaymentMethod[];
  purchases: GemPurchaseRow[];
  lowBalanceNotice?: boolean;
  userImageUrl?: string | null;
};

export function WalletPaymentStation({
  balance,
  minTopupMoco,
  paymentMethods: initialMethods,
  purchases,
  lowBalanceNotice,
  userImageUrl,
}: Props) {
  const [methods, setMethods] = useState(initialMethods);
  const [selectedId, setSelectedId] = useState<string | null>(
    () => initialMethods.find((m) => m.isDefault)?.id ?? initialMethods[0]?.id ?? null,
  );
  const [readerLight, setReaderLight] = useState<ReaderLightState>("idle");
  const [atmOverlay, setAtmOverlay] = useState<AtmScreenOverlay>(null);
  const [readerActive, setReaderActive] = useState(false);

  useEffect(() => {
    setMethods(initialMethods);
    setSelectedId((prev) => {
      if (prev && initialMethods.some((m) => m.id === prev)) return prev;
      return initialMethods.find((m) => m.isDefault)?.id ?? initialMethods[0]?.id ?? null;
    });
  }, [initialMethods]);

  useEffect(() => {
    if (readerLight === "idle") return;
    const t = window.setTimeout(() => {
      setReaderLight("idle");
      setAtmOverlay(null);
      setReaderActive(false);
    }, 3200);
    return () => window.clearTimeout(t);
  }, [readerLight]);

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="min-w-0 flex-1">
          <GemBalancePanel
            balance={balance}
            minTopupMoco={minTopupMoco}
            paymentMethods={methods}
            purchases={purchases}
            lowBalanceNotice={lowBalanceNotice}
            userImageUrl={userImageUrl}
            selectedCardId={selectedId}
            atmOverlay={atmOverlay}
            onPaymentResult={(result) => {
              if (result === "success") {
                setReaderLight("success");
                setAtmOverlay("success");
              } else if (result === "failure") {
                setReaderLight("failure");
                setAtmOverlay("failure");
              }
              setReaderActive(false);
            }}
            onPaymentProcessing={() => setReaderActive(true)}
          />
        </div>

        <div className="flex shrink-0 flex-col items-center gap-3 sm:pt-8">
          <WalletZeroPaymentCards
            methods={methods}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onMethodsChange={setMethods}
            onInsertStart={() => setReaderActive(true)}
            insertDisabled={atmOverlay != null}
            className="w-full max-w-[17rem] sm:max-w-none"
          />
          <MocomoCardReader light={readerLight} active={readerActive} />
        </div>
      </div>
    </div>
  );
}
