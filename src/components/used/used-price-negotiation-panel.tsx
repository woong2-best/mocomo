"use client";

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
      setError(res.error);
      return;
    }
    setAmount("");
    router.refresh();
  }

  async function accept(offerId: string) {
    setBusy(true);
    const res = await acceptUsedAuctionPrice(offerId);
    setBusy(false);
    if ("error" in res && res.error) setError(res.error);
    else router.refresh();
  }

  async function reject(offerId: string) {
    setBusy(true);
    const res = await rejectUsedAuctionPrice(offerId);
    setBusy(false);
    if ("error" in res && res.error) setError(res.error);
    else router.refresh();
  }

  async function declineDeal() {
    if (!confirm("거래를 거절할까요?")) return;
    setBusy(true);
    const res = await declineUsedAuctionNegotiation(listingId);
    setBusy(false);
    if ("error" in res && res.error) setError(res.error);
    else router.refresh();
  }

  return (
    <section className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold">가격 협상</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            최고 입찰 {formatUsedPrice(currentTopBid)} (미결제)
            {secondBidAmount != null && ` · 차순위 ${formatUsedPrice(secondBidAmount)}`}
          </p>
        </div>
        {negotiationDueAt && (
          <div className="text-right">
            <p className="text-[10px] text-muted-foreground">협상 남은 시간</p>
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
            님의 제안: <span className="font-bold">{formatUsedPrice(pending.amount)}</span>
          </p>
          {pending.proposerId !== viewerId && (
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                disabled={busy}
                onClick={() => void accept(pending.id)}
              >
                수락
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => void reject(pending.id)}
              >
                거절
              </Button>
            </div>
          )}
          {pending.proposerId === viewerId && (
            <p className="text-xs text-muted-foreground">상대의 응답을 기다리는 중…</p>
          )}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">진행 중인 제안이 없습니다. 가격을 제안해 보세요.</p>
      )}

      <div className="flex gap-2">
        <Input
          type="number"
          inputMode="numeric"
          placeholder="제안 가격 (원)"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="h-10"
        />
        <Button type="button" disabled={busy} onClick={() => void submitProposal()}>
          제안
        </Button>
      </div>

      {isBuyer && (
        <Button type="button" variant="ghost" size="sm" className="text-destructive" disabled={busy} onClick={() => void declineDeal()}>
          거래 거절
        </Button>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}

      <p className="text-[10px] text-muted-foreground">
        양측이 동일 가격에 동의하면 거래가 확정됩니다. 24시간 내 합의하지 않으면 자동 종료됩니다.
      </p>
    </section>
  );
}
