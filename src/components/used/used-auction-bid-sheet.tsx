"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { placeUsedAuctionBid, buyNowUsedAuction } from "@/actions/used-auction";
import { formatUsedPrice } from "@/lib/used-market";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Gavel, Zap } from "lucide-react";

export function UsedAuctionBidSheet({
  listingId,
  minBid,
  buyNowPrice,
  quickBids,
}: {
  listingId: string;
  minBid: number;
  buyNowPrice?: number | null;
  quickBids?: number[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(String(minBid));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submitBid(bidAmount: number) {
    setBusy(true);
    setError("");
    const res = await placeUsedAuctionBid(listingId, bidAmount);
    setBusy(false);
    if ("error" in res && res.error) {
      if (res.error.includes("휴대폰")) {
        router.push(`/used/verify?callbackUrl=/used/${listingId}`);
        return;
      }
      setError(res.error);
      return;
    }
    setOpen(false);
    router.refresh();
  }

  async function buyNow() {
    if (!buyNowPrice) return;
    if (!confirm(`${formatUsedPrice(buyNowPrice)}에 즉시구매하시겠습니까?`)) return;
    setBusy(true);
    setError("");
    const res = await buyNowUsedAuction(listingId);
    setBusy(false);
    if ("error" in res && res.error) {
      if (res.error.includes("휴대폰")) {
        router.push(`/used/verify?callbackUrl=/used/${listingId}`);
        return;
      }
      setError(res.error);
      return;
    }
    setOpen(false);
    router.refresh();
  }

  const presets = quickBids ?? [
    minBid,
    minBid + 1000,
    minBid + 5000,
    minBid + 10000,
  ].filter((v, i, a) => a.indexOf(v) === i);

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        size="lg"
        className="flex-1 h-12 rounded-xl font-semibold gap-2 bg-orange-600 hover:bg-orange-700 text-white"
        onClick={() => {
          setAmount(String(minBid));
          setOpen(true);
        }}
      >
        <Gavel className="h-5 w-5" />
        입찰하기
      </Button>

      {open && (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end">
          <button
            type="button"
            className="absolute inset-0 bg-black/55"
            aria-label="닫기"
            onClick={() => setOpen(false)}
          />
          <div className="relative bg-card rounded-t-2xl border-t p-4 pb-8 space-y-4 max-h-[85dvh] overflow-y-auto">
            <h3 className="text-lg font-bold">입찰</h3>
            <p className="text-sm text-muted-foreground">
              최소 입찰가 <span className="font-bold text-foreground">{formatUsedPrice(minBid)}</span>
            </p>

            <div className="flex flex-wrap gap-2">
              {presets.slice(0, 4).map((p) => (
                <button
                  key={p}
                  type="button"
                  className="px-3 py-1.5 rounded-full text-xs font-medium border bg-muted hover:bg-muted/80"
                  onClick={() => setAmount(String(p))}
                >
                  {formatUsedPrice(p)}
                </button>
              ))}
            </div>

            <Input
              type="number"
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="rounded-xl h-12 text-lg font-bold tabular-nums"
              min={minBid}
            />

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button
              type="button"
              className="w-full h-12 rounded-xl font-semibold"
              disabled={busy}
              onClick={() => void submitBid(Number(amount) || 0)}
            >
              {busy ? "처리 중…" : `${formatUsedPrice(Number(amount) || minBid)} 입찰`}
            </Button>

            {buyNowPrice != null && buyNowPrice > 0 && (
              <Button
                type="button"
                variant="outline"
                className="w-full h-12 rounded-xl font-semibold gap-2 border-amber-500/50"
                disabled={busy}
                onClick={() => void buyNow()}
              >
                <Zap className="h-5 w-5 text-amber-500" />
                즉시구매 {formatUsedPrice(buyNowPrice)}
              </Button>
            )}

            <button
              type="button"
              className="w-full py-2 text-muted-foreground text-sm"
              onClick={() => setOpen(false)}
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </>
  );
}
