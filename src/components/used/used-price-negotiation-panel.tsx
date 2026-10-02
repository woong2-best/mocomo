"use client";


import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { errorText } from "@/lib/i18n/error-text";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  acceptUsedAuctionPrice,
  declineUsedAuctionNegotiation,
  proposeUsedAuctionPrice,
  rejectUsedAuctionPrice,
} from "@/actions/used-auction-negotiation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UsedAuctionPaymentCountdown } from "@/components/used/used-auction-payment-countdown";
import { formatUsedPrice } from "@/lib/used-market";
import type { UsedAuctionState } from "@prisma/client";

type Offer = {
  id: string;
  amount: number;
  status: string;
  proposerId: string;
  proposer: { username: string; name: string | null };
};

export function UsedPriceNegotiationPanel({
  listingId,
  roomId,
  viewerId,
  sellerId,
  negotiationBuyerId,
  negotiationDueAt,
  auctionState,
  currentTopBid,
  secondBidAmount,
  offers,
  currency,
}: {
  listingId: string;
  roomId: string;
  viewerId: string;
  sellerId: string;
  negotiationBuyerId: string | null;
  negotiationDueAt: Date | string | null;
  auctionState: UsedAuctionState | null;
  currentTopBid: number;
  secondBidAmount?: number | null;
  offers: Offer[];
  currency?: string | null;
}) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (auctionState !== "PRICE_NEGOTIATION") return null;

  const isSeller = viewerId === sellerId;
  const isBuyer = viewerId === negotiationBuyerId;
  if (!isSeller && !isBuyer) return null;

  const pending = offers.find((o) => o.status === "PENDING");

  async function submitProposal() {
    const price = Math.floor(Number(amount));
    if (!price) return;
    setBusy(true);
    setError("");
    const res = await proposeUsedAuctionPrice(listingId, price);
    setBusy(false);
    if ("error" in res && res.error) {
      setError(errorText(res.error));
      return;
    }
    setAmount("");
    router.refresh();
  }

  async function accept(offerId: string) {
    setBusy(true);
    const res = await acceptUsedAuctionPrice(offerId);
    setBusy(false);
    if ("error" in res && res.error) setError(errorText(res.error));
    else router.refresh();
  }

  async function reject(offerId: string) {
    setBusy(true);
    const res = await rejectUsedAuctionPrice(offerId);
    setBusy(false);
    if ("error" in res && res.error) setError(errorText(res.error));
    else router.refresh();
  }

  async function declineDeal() {
    if (!confirm(t("used.sxzmscb"))) return;
    setBusy(true);
    const res = await declineUsedAuctionNegotiation(listingId);
    setBusy(false);
    if ("error" in res && res.error) setError(errorText(res.error));
    else router.refresh();
  }

  return (
    <section className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold">{t("used.s1j1lx2f")}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            최고 입찰 {formatUsedPrice(currentTopBid, currency)} (미결제)
            {secondBidAmount != null && t("used.s3o1ehz", { v0: formatUsedPrice(secondBidAmount, currency) })}
          </p>
        </div>
        {negotiationDueAt && (
          <div className="text-right">
            <p className="text-[10px] text-muted-foreground">{t("used.s1xermxs")}</p>
            <UsedAuctionPaymentCountdown dueAt={negotiationDueAt} className="text-sm" />
          </div>
        )}
      </div>

      {pending ? (
        <div className="rounded-lg bg-background border p-3 space-y-2">
          <p className="text-sm">
            <span className="font-semibold">
              {pending.proposer.name || pending.proposer.username}
            </span>
            {t("used.sc1l2em")} <span className="font-bold">{formatUsedPrice(pending.amount, currency)}</span>
          </p>
          {pending.proposerId !== viewerId && (
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                disabled={busy}
                onClick={() => void accept(pending.id)}
              >
                {t("collab.accept")}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => void reject(pending.id)}
              >
                {t("collab.reject")}
              </Button>
            </div>
          )}
          {pending.proposerId === viewerId && (
            <p className="text-xs text-muted-foreground">{t("used.s1dp3f82")}</p>
          )}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">{t("used.s107qbn2")}</p>
      )}

      <div className="flex gap-2">
        <Input
          type="number"
          inputMode="numeric"
          placeholder={t("used.usd")}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="h-10"
        />
        <Button type="button" disabled={busy} onClick={() => void submitProposal()}>
          {t("used.sz4bw")}
        </Button>
      </div>

      {isBuyer && (
        <Button type="button" variant="ghost" size="sm" className="text-destructive" disabled={busy} onClick={() => void declineDeal()}>
          {t("used.s1m4n2c0")}
        </Button>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}

      <p className="text-[10px] text-muted-foreground">
        {t("used.s42flby")}
      </p>
    </section>
  );
}
