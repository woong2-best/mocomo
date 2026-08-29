"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { placeUsedAuctionBid, buyNowUsedAuction } from "@/actions/used-auction";
import { formatUsedPrice } from "@/lib/used-market";
import { walletSettlementPath, SETTLEMENT_ACCOUNT_REQUIRED_MSG } from "@/lib/settlement-account";
import { USED_BANK_REQUIRED_MSG } from "@/lib/used-bank-auth";
import { usedAdultVerifyUrl } from "@/lib/used-youth-protection";
import type { UsedRestrictedKind } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Gavel, Zap } from "lucide-react";
import { USED_AUCTION_BID_CONSENT_LABEL } from "@/lib/used-auction-legal";
import Link from "next/link";

function needsSettlementAccount(error: string) {
  return (
    error === USED_BANK_REQUIRED_MSG ||
    error === SETTLEMENT_ACCOUNT_REQUIRED_MSG ||
    error.includes("입금 계좌") ||
    error.includes("계좌 1원")
  );
}

export function UsedAuctionBidSheet({
  listingId,
  minBid,
  buyNowPrice,
  quickBids,
  restrictedKind = "NONE",
  currency,
}: {
  listingId: string;
  minBid: number;
  buyNowPrice?: number | null;
  quickBids?: number[];
  restrictedKind?: UsedRestrictedKind | string;
  currency?: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(String(minBid));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmBuyNow, setConfirmBuyNow] = useState(false);
  const [bidConsent, setBidConsent] = useState(false);
  const [buyNowConsent, setBuyNowConsent] = useState(false);

  async function submitBid(bidAmount: number) {
    if (!bidConsent) {
      setError("입찰 전 결제 의무 및 이용 제한 안내에 동의해 주세요.");
      return;
    }
    setBusy(true);
    setError("");
    const res = await placeUsedAuctionBid(listingId, bidAmount, true);
    setBusy(false);
    if ("error" in res && res.error) {
      if (needsSettlementAccount(res.error)) {
        router.push(walletSettlementPath(`/used/${listingId}`));
        return;
      }
      if (res.error.includes("중고거래 이용이 제한")) {
        setError(res.error);
        return;
      }
      if ("needsAdultVerify" in res && res.needsAdultVerify) {
        router.push(usedAdultVerifyUrl(listingId, restrictedKind));
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
    if (!buyNowConsent) {
      setError("즉시구매 전 결제 의무 및 이용 제한 안내에 동의해 주세요.");
      return;
    }
    setBusy(true);
    setError("");
    setConfirmBuyNow(false);
    const res = await buyNowUsedAuction(listingId, true);
    setBusy(false);
    if ("error" in res && res.error) {
      if (needsSettlementAccount(res.error)) {
        router.push(walletSettlementPath(`/used/${listingId}`));
        return;
      }
      if (res.error.includes("중고거래 이용이 제한")) {
        setError(res.error);
        return;
      }
      if ("needsAdultVerify" in res && res.needsAdultVerify) {
        router.push(usedAdultVerifyUrl(listingId, restrictedKind));
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
          setBidConsent(false);
          setBuyNowConsent(false);
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
              최소 입찰가 <span className="font-bold text-foreground">{formatUsedPrice(minBid, currency)}</span>
            </p>

            <div className="flex flex-wrap gap-2">
              {presets.slice(0, 4).map((p) => (
                <button
                  key={p}
                  type="button"
                  className="px-3 py-1.5 rounded-full text-xs font-medium border bg-muted hover:bg-muted/80"
                  onClick={() => setAmount(String(p))}
                >
                  {formatUsedPrice(p, currency)}
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

            <label className="flex items-start gap-2.5 cursor-pointer rounded-lg border border-border/60 p-3">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded border-input"
                checked={bidConsent}
                onChange={(e) => setBidConsent(e.target.checked)}
              />
              <span className="text-[11px] text-muted-foreground leading-relaxed">
                {USED_AUCTION_BID_CONSENT_LABEL}{" "}
                <Link href="/legal/terms" className="text-primary hover:underline" target="_blank">
                  (이용약관)
                </Link>
              </span>
            </label>

            <Button
              type="button"
              className="w-full h-12 rounded-xl font-semibold"
              disabled={busy || !bidConsent}
              onClick={() => void submitBid(Number(amount) || 0)}
            >
              {busy ? "처리 중…" : `${formatUsedPrice(Number(amount) || minBid, currency)} 입찰`}
            </Button>

            {buyNowPrice != null && buyNowPrice > 0 && (
              confirmBuyNow ? (
                <div className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-3 space-y-2">
                  <p className="text-sm font-medium">
                    {formatUsedPrice(buyNowPrice, currency)}에 즉시구매하시겠습니까?
                  </p>
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      className="mt-0.5 h-4 w-4 rounded border-input"
                      checked={buyNowConsent}
                      onChange={(e) => setBuyNowConsent(e.target.checked)}
                    />
                    <span className="text-[11px] text-muted-foreground leading-relaxed">
                      {USED_AUCTION_BID_CONSENT_LABEL}
                    </span>
                  </label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      className="flex-1 h-10 rounded-xl font-semibold gap-2 bg-amber-600 hover:bg-amber-700"
                      disabled={busy || !buyNowConsent}
                      onClick={() => void buyNow()}
                    >
                      <Zap className="h-4 w-4" />
                      즉시구매
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-10 rounded-xl"
                      disabled={busy}
                      onClick={() => setConfirmBuyNow(false)}
                    >
                      취소
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-12 rounded-xl font-semibold gap-2 border-amber-500/50"
                  disabled={busy}
                  onClick={() => setConfirmBuyNow(true)}
                >
                  <Zap className="h-5 w-5 text-amber-500" />
                  즉시구매 {formatUsedPrice(buyNowPrice, currency)}
                </Button>
              )
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
