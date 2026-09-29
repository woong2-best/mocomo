"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import { placeUsedAuctionBid, buyNowUsedAuction } from "@/actions/used-auction";
import {
  payUsedAuctionBidHoldAction,
  prepareUsedAuctionBidHoldAction,
} from "@/actions/used-auction-bid-hold";
import { formatUsedPrice, parseUsedAmountInput, usedAmountInputValue } from "@/lib/used-market";
import { usedAdultVerifyUrl } from "@/lib/used-youth-protection";
import type { UsedRestrictedKind } from "@prisma/client";
import type { SavedPaymentMethod } from "@/lib/stripe-payment-methods";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Gavel, Zap } from "lucide-react";
import { USED_AUCTION_BID_CONSENT_LABEL } from "@/lib/used-auction-legal";
import {
  AUCTION_MIN_WALLET_MOCO,
  INSUFFICIENT_DEPOSIT_ERROR,
} from "@/lib/auction-deposit/constants";
import { stripePaymentIntentReturnUrlClient } from "@/lib/stripe-payment-return-url";
import Link from "next/link";
import { useLocale } from "@/components/providers/locale-provider";
import { uiText } from "@/lib/i18n/ui-text";

const BID_CONSENT_KO = USED_AUCTION_BID_CONSENT_LABEL;
const BID_CONSENT_EN =
  "I agree that failing to pay within the deadline after winning may restrict my access to used goods and auctions.";

function needsPhoneVerification(error: string) {
  return error.includes("휴대폰") || error.includes("phone verification");
}

export function UsedAuctionBidSheet({
  listingId,
  minBid,
  buyNowPrice,
  quickBids,
  restrictedKind = "NONE",
  currency,
  availableMocoBalance,
}: {
  listingId: string;
  minBid: number;
  buyNowPrice?: number | null;
  quickBids?: number[];
  restrictedKind?: UsedRestrictedKind | string;
  currency?: string | null;
  /** 로그인 사용자 available MOCO (mocoPoints + gemBalance) */
  availableMocoBalance?: number | null;
}) {
  const router = useRouter();
  const { locale } = useLocale();
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
  const [walletWarning, setWalletWarning] = useState("");

  function tryOpenBidSheet() {
    if (
      availableMocoBalance != null &&
      availableMocoBalance < AUCTION_MIN_WALLET_MOCO
    ) {
      setWalletWarning(
        uiText(
          locale,
          INSUFFICIENT_DEPOSIT_ERROR,
          "You need at least 2 MOCO in your wallet to join an auction. Top up MOCO and try again."
        )
      );
      return;
    }
    setWalletWarning("");
    setAmount(usedAmountInputValue(minBid, currency));
    setBidConsent(false);
    setBuyNowConsent(false);
    setHoldOrderId(null);
    setMethods([]);
    setOpen(true);
  }

  const finishBid = useCallback(
    async (bidAmount: number, paymentIntentDbId?: string) => {
      const res = await placeUsedAuctionBid(listingId, bidAmount, true, {
        paymentIntentDbId,
      });
      if ("error" in res && res.error) {
        if (needsPhoneVerification(res.error)) {
          router.push(`/market/verify?callbackUrl=${encodeURIComponent(`/market/${listingId}`)}`);
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
      setError(uiText(locale, "카드를 선택해 주세요.", "Select a card."));
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
        setError(uiText(locale, "Stripe 설정이 없습니다.", "Stripe is not configured."));
        return;
      }
      const stripe = await loadStripe(pk);
      if (!stripe) {
        setBusy(false);
        setError(uiText(locale, "Stripe를 불러오지 못했습니다.", "Could not load Stripe."));
        return;
      }
      const returnUrl = stripePaymentIntentReturnUrlClient(pay.orderId, `/market/${listingId}`);
      const { error: confirmError } = await stripe.confirmCardPayment(pay.clientSecret, {
        return_url: returnUrl,
      });
      setBusy(false);
      if (confirmError) {
        setError(
          confirmError.message ?? uiText(locale, "카드 인증에 실패했습니다.", "Card verification failed.")
        );
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
      setError(
        uiText(
          locale,
          "입찰 전 결제 의무 및 이용 제한 안내에 동의해 주세요.",
          "Agree to the payment obligation and restriction notice before bidding."
        )
      );
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
      setError(
        uiText(
          locale,
          "즉시구매 전 결제 의무 및 이용 제한 안내에 동의해 주세요.",
          "Agree to the payment obligation and restriction notice before buying now."
        )
      );
      return;
    }
    setBusy(true);
    setError("");
    setConfirmBuyNow(false);
    const res = await buyNowUsedAuction(listingId, true);
    setBusy(false);
    if ("error" in res && res.error) {
      if (needsPhoneVerification(res.error)) {
        router.push(`/market/verify?callbackUrl=${encodeURIComponent(`/market/${listingId}`)}`);
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

  const usdBid = (currency ?? "").toLowerCase() === "usd";
  const step = usdBid ? 100 : 1000;
  const presets = quickBids ?? [0, 1, 2, 4]
    .map((n) => minBid + n * step)
    .filter((v, i, a) => a.indexOf(v) === i);

  const bidAmountNum = parseUsedAmountInput(amount, currency) || minBid;

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        size="lg"
        className="h-12 w-full rounded-[10px] bg-folk-terracotta font-bold text-white hover:bg-folk-terracotta/90 gap-2"
        onClick={tryOpenBidSheet}
      >
        <Gavel className="h-5 w-5" />
        {uiText(locale, "입찰하기", "Place bid")}
      </Button>

      {walletWarning ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/55"
            aria-label={uiText(locale, "닫기", "Close")}
            onClick={() => setWalletWarning("")}
          />
          <div className="relative z-10 w-full max-w-sm rounded-2xl border border-border bg-card p-5 space-y-4 shadow-xl">
            <h3 className="text-lg font-bold">{uiText(locale, "경매 참여 불가", "Cannot join auction")}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{walletWarning}</p>
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1" asChild>
                <Link href="/wallet">{uiText(locale, "MOCO 충전", "Top up MOCO")}</Link>
              </Button>
              <Button type="button" className="flex-1" onClick={() => setWalletWarning("")}>
                {uiText(locale, "확인", "OK")}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {open && (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end">
          <button
            type="button"
            className="absolute inset-0 bg-black/55"
            aria-label={uiText(locale, "닫기", "Close")}
            onClick={() => setOpen(false)}
          />
          <div className="relative bg-card rounded-t-2xl border-t p-4 pb-8 space-y-4 max-h-[85dvh] overflow-y-auto">
            <h3 className="text-lg font-bold">
              {holdOrderId
                ? uiText(locale, "카드 hold 승인", "Authorize card hold")
                : uiText(locale, "입찰", "Bid")}
            </h3>
            {!holdOrderId ? (
              <p className="text-sm text-muted-foreground">
                {uiText(locale, "최소 입찰가", "Minimum bid")}{" "}
                <span className="font-bold text-foreground">{formatUsedPrice(minBid, currency)}</span>
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                {uiText(locale, "입찰가", "Bid")}{" "}
                <span className="font-bold text-foreground">
                  {formatUsedPrice(bidAmountNum, currency)}
                </span>
                {" · "}
                {uiText(locale, "카드 hold", "Card hold")}{" "}
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
                      onClick={() => setAmount(usedAmountInputValue(p, currency))}
                    >
                      {formatUsedPrice(p, currency)}
                    </button>
                  ))}
                </div>

                <Input
                  type="number"
                  inputMode={usdBid ? "decimal" : "numeric"}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="rounded-xl h-12 text-lg font-bold tabular-nums"
                  min={usdBid ? minBid / 100 : minBid}
                  step={usdBid ? "0.01" : "1"}
                  placeholder={
                    usdBid
                      ? uiText(locale, "달러로 입력", "Amount in USD")
                      : uiText(locale, "원으로 입력", "Amount in KRW")
                  }
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
                    {pm.isDefault ? uiText(locale, " · 기본", " · default") : ""}
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
                  {uiText(locale, BID_CONSENT_KO, BID_CONSENT_EN)}{" "}
                  <Link href="/legal/terms" className="text-primary hover:underline" target="_blank">
                    {uiText(locale, "(이용약관)", "(Terms)")}
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
                ? uiText(locale, "처리 중…", "Processing…")
                : holdOrderId
                  ? uiText(locale, "카드 승인 후 입찰", "Authorize card & bid")
                  : uiText(
                      locale,
                      `${formatUsedPrice(bidAmountNum, currency)} 입찰`,
                      `Bid ${formatUsedPrice(bidAmountNum, currency)}`
                    )}
            </Button>

            {buyNowPrice != null && buyNowPrice > 0 && !holdOrderId && (
              confirmBuyNow ? (
                <div className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-3 space-y-2">
                  <p className="text-sm font-medium">
                    {uiText(
                      locale,
                      `${formatUsedPrice(buyNowPrice, currency)}에 즉시구매하시겠습니까?`,
                      `Buy now for ${formatUsedPrice(buyNowPrice, currency)}?`
                    )}
                  </p>
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      className="mt-0.5 h-4 w-4 rounded border-input"
                      checked={buyNowConsent}
                      onChange={(e) => setBuyNowConsent(e.target.checked)}
                    />
                    <span className="text-[11px] text-muted-foreground leading-relaxed">
                      {uiText(locale, BID_CONSENT_KO, BID_CONSENT_EN)}
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
                      {uiText(locale, "즉시구매", "Buy now")}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-10 rounded-xl"
                      disabled={busy}
                      onClick={() => setConfirmBuyNow(false)}
                    >
                      {uiText(locale, "취소", "Cancel")}
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
                  {uiText(locale, "즉시구매", "Buy now")} {formatUsedPrice(buyNowPrice, currency)}
                </Button>
              )
            )}

            <button
              type="button"
              className="w-full py-2 text-muted-foreground text-sm"
              onClick={() => setOpen(false)}
            >
              {uiText(locale, "닫기", "Close")}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
