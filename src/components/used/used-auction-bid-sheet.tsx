"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import { placeUsedAuctionBid, buyNowUsedAuction } from "@/actions/used-auction";
import {
  payUsedAuctionBidHoldAction,
  prepareUsedAuctionBidHoldAction,
} from "@/actions/used-auction-bid-hold";
import { formatUsedPrice } from "@/lib/used-market";
import { walletSettlementPath, SETTLEMENT_ACCOUNT_REQUIRED_MSG } from "@/lib/settlement-account";
import { USED_BANK_REQUIRED_MSG } from "@/lib/used-bank-auth";
import { usedAdultVerifyUrl } from "@/lib/used-youth-protection";
import type { UsedRestrictedKind } from "@prisma/client";
import type { SavedPaymentMethod } from "@/lib/stripe-payment-methods";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Gavel, Zap } from "lucide-react";
import { USED_AUCTION_BID_CONSENT_LABEL } from "@/lib/used-auction-legal";
import { stripePaymentIntentReturnUrlClient } from "@/lib/stripe-payment-return-url";
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
  const [holdOrderId, setHoldOrderId] = useState<string | null>(null);
  const [holdAmount, setHoldAmount] = useState(0);
  const [methods, setMethods] = useState<SavedPaymentMethod[]>([]);
  const [selectedPm, setSelectedPm] = useState<string | null>(null);
  const [publishableKey, setPublishableKey] = useState("");

  const finishBid = useCallback(
    async (bidAmount: number, paymentIntentDbId?: string) => {
      const res = await placeUsedAuctionBid(listingId, bidAmount, true, {
        paymentIntentDbId,
      });
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
        if ("needsBidHold" in res && res.needsBidHold) {
          const prepared = await prepareUsedAuctionBidHoldAction(listingId, bidAmount);
          if ("error" in prepared && prepared.error) {
            setError(prepared.error);
            return;
          }
          if (!("orderId" in prepared)) return;
          setHoldOrderId(prepared.orderId);
          setHoldAmount(prepared.holdAmount);
          setMethods(prepared.methods ?? []);
          setSelectedPm(prepared.methods?.find((m) => m.isDefault)?.id ?? prepared.methods?.[0]?.id ?? null);
          setPublishableKey(prepared.publishableKey);
          setError("");
          return;
        }
        setError(res.error);
        return;
      }
      setHoldOrderId(null);
      setOpen(false);
      router.refresh();
    },
    [listingId, restrictedKind, router]
  );

  async function authorizeHold(bidAmount: number) {
    if (!holdOrderId || !selectedPm) {
      setError("카드를 선택해 주세요.");
      return;
    }
    setBusy(true);
    setError("");
    const pay = await payUsedAuctionBidHoldAction(listingId, holdOrderId, selectedPm);
    if ("error" in pay && pay.error) {
      setBusy(false);
      setError(pay.error);
      return;
    }
    if ("requiresAction" in pay && pay.requiresAction && pay.clientSecret) {
      const pk = publishableKey || process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
      if (!pk) {
        setBusy(false);
        setError("Stripe 설정이 없습니다.");
        return;
      }
      const stripe = await loadStripe(pk);
      if (!stripe) {
        setBusy(false);
        setError("Stripe를 불러오지 못했습니다.");
        return;
      }
      const returnUrl = stripePaymentIntentReturnUrlClient(pay.orderId, `/used/${listingId}`);
      const { error: confirmError } = await stripe.confirmCardPayment(pay.clientSecret, {
        return_url: returnUrl,
      });
      setBusy(false);
      if (confirmError) {
        setError(confirmError.message ?? "카드 인증에 실패했습니다.");
        return;
      }
      await finishBid(bidAmount, pay.orderId);
      return;
    }
    setBusy(false);
    await finishBid(bidAmount, holdOrderId);
  }

  async function submitBid(bidAmount: number) {
    if (!bidConsent) {
      setError("입찰 전 결제 의무 및 이용 제한 안내에 동의해 주세요.");
      return;
    }
    setBusy(true);
    setError("");
    if (holdOrderId) {
      await authorizeHold(bidAmount);
      setBusy(false);
      return;
    }
    await finishBid(bidAmount);
    setBusy(false);
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

  const bidAmountNum = Number(amount) || minBid;

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
          setHoldOrderId(null);
          setMethods([]);
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
            <h3 className="text-lg font-bold">{holdOrderId ? "카드 hold 승인" : "입찰"}</h3>
            {!holdOrderId ? (
              <p className="text-sm text-muted-foreground">
                최소 입찰가{" "}
                <span className="font-bold text-foreground">{formatUsedPrice(minBid, currency)}</span>
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                입찰가{" "}
                <span className="font-bold text-foreground">
                  {formatUsedPrice(bidAmountNum, currency)}
                </span>
                {" · "}카드 hold{" "}
                <span className="font-bold text-foreground">{formatUsedPrice(holdAmount, "usd")}</span>
              </p>
            )}

            {!holdOrderId && (
              <>
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
              </>
            )}

            {holdOrderId && methods.length > 0 && (
              <div className="space-y-2">
                {methods.map((pm) => (
                  <button
                    key={pm.id}
                    type="button"
                    onClick={() => setSelectedPm(pm.id)}
                    className={`w-full text-left rounded-xl border px-3 py-2.5 text-sm ${
                      selectedPm === pm.id ? "border-primary bg-primary/5" : "border-border"
                    }`}
                  >
                    {pm.brand} •••• {pm.last4}
                    {pm.isDefault ? " · 기본" : ""}
                  </button>
                ))}
              </div>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}

            {!holdOrderId && (
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
            )}

            <Button
              type="button"
              className="w-full h-12 rounded-xl font-semibold"
              disabled={busy || (!holdOrderId && !bidConsent)}
              onClick={() => void submitBid(bidAmountNum)}
            >
              {busy
                ? "처리 중…"
                : holdOrderId
                  ? "카드 승인 후 입찰"
                  : `${formatUsedPrice(bidAmountNum, currency)} 입찰`}
            </Button>

            {buyNowPrice != null && buyNowPrice > 0 && !holdOrderId && (
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
