"use client";

import { useEffect, useState } from "react";
import type { SavedPaymentMethod } from "@/lib/stripe-payment-methods";
import { GemBalancePanel } from "@/components/wallet/gem-balance-panel";
import { MocomoCardReader } from "@/components/wallet/mocomo-card-reader";
import { WalletZeroPaymentCards } from "@/components/wallet/wallet-zero-payment-cards";
import type { AtmScreenOverlay, ReaderLightState } from "@/components/wallet/wallet-payment-types";
import { cn } from "@/lib/utils";

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
    <div className="space-y-4">
      {/* ATM 본체 크기 유지 — 리더기만 오른쪽에 밀착 */}
      <div className="relative mx-auto w-full max-w-lg overflow-visible pr-0 min-[440px]:pr-[5.75rem]">
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

        <div
          className={cn(
            "z-20 mt-3 flex justify-end min-[440px]:mt-0",
            "min-[440px]:absolute min-[440px]:right-0 min-[440px]:top-[5.25rem]",
          )}
        >
          <MocomoCardReader
            light={readerLight}
            active={readerActive}
            className="min-[440px]:-ml-px min-[440px]:rounded-l-none min-[440px]:border-l-0"
          />
        </div>
      </div>

      <WalletZeroPaymentCards
        methods={methods}
        selectedId={selectedId}
        onSelect={setSelectedId}
        onMethodsChange={setMethods}
        onInsertStart={() => setReaderActive(true)}
        insertDisabled={atmOverlay != null}
      />
    </div>
  );
}
