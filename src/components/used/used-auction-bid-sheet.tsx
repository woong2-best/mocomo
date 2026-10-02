"use client";


import { isPhoneVerificationError, isUsedMarketBannedError } from "@/lib/error-codes";
import { errorText } from "@/lib/i18n/error-text";
import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

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
import {
  AUCTION_MIN_WALLET_MOCO,
  INSUFFICIENT_DEPOSIT_ERROR,
} from "@/lib/auction-deposit/constants";
import { stripePaymentIntentReturnUrlClient } from "@/lib/stripe-payment-return-url";
import Link from "next/link";
import { useLocale } from "@/components/providers/locale-provider";



function displayAuctionError(error: string, t: (key: string, vars?: Record<string, string>) => string) {
  if (error.includes(".")) return t(error);
  return error;
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
  const { t } = useLocale();
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
      setWalletWarning(t(INSUFFICIENT_DEPOSIT_ERROR));
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
        if (isPhoneVerificationError(res.error)) {
          router.push(`/market/verify?callbackUrl=${encodeURIComponent(`/market/${listingId}`)}`);
          return;
        }
        if (isUsedMarketBannedError(res.error)) {
          setError(errorText(res.error));
          return;
        }
        if ("needsAdultVerify" in res && res.needsAdultVerify) {
          router.push(usedAdultVerifyUrl(listingId, restrictedKind));
          return;
        }
        if ("needsBidHold" in res && res.needsBidHold) {
          const prepared = await prepareUsedAuctionBidHoldAction(listingId, bidAmount);
          if ("error" in prepared && prepared.error) {
            setError(errorText(prepared.error));
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
        setError(errorText(res.error));
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
      setError(t("ui.select_a_card"));
      return;
    }
    setBusy(true);
    setError("");
    const pay = await payUsedAuctionBidHoldAction(listingId, holdOrderId, selectedPm);
    if ("error" in pay && pay.error) {
      setBusy(false);
      setError(errorText(pay.error));
      return;
    }
    if ("requiresAction" in pay && pay.requiresAction && pay.clientSecret) {
      const pk = publishableKey || process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
      if (!pk) {
        setBusy(false);
        setError(t("ui.stripe_is_not_configured"));
        return;
      }
      const stripe = await loadStripe(pk);
      if (!stripe) {
        setBusy(false);
        setError(t("ui.could_not_load_stripe"));
        return;
      }
      const returnUrl = stripePaymentIntentReturnUrlClient(pay.orderId, `/market/${listingId}`);
      const { error: confirmError } = await stripe.confirmCardPayment(pay.clientSecret, {
        return_url: returnUrl,
      });
      setBusy(false);
      if (confirmError) {
        setError(
          confirmError.message ?? t("wallet.topup.cardAuthFailed")
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
        t("ui.agree_to_the_payment_obligation_and")
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
        t("ui.agree_to_the_payment_obligation_and_2")
      );
      return;
    }
    setBusy(true);
    setError("");
    setConfirmBuyNow(false);
    const res = await buyNowUsedAuction(listingId, true);
    setBusy(false);
    if ("error" in res && res.error) {
      if (isPhoneVerificationError(res.error)) {
        router.push(`/market/verify?callbackUrl=${encodeURIComponent(`/market/${listingId}`)}`);
        return;
      }
      if (isUsedMarketBannedError(res.error)) {
        setError(errorText(res.error));
        return;
      }
      if ("needsAdultVerify" in res && res.needsAdultVerify) {
        router.push(usedAdultVerifyUrl(listingId, restrictedKind));
        return;
      }
      setError(errorText(res.error));
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
        {t("ui.place_bid")}
      </Button>

      {walletWarning ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/55"
            aria-label={t("common.close")}
            onClick={() => setWalletWarning("")}
          />
          <div className="relative z-10 w-full max-w-sm rounded-2xl border border-border bg-card p-5 space-y-4 shadow-xl">
            <h3 className="text-lg font-bold">{t("ui.cannot_join_auction")}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{walletWarning}</p>
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1" asChild>
                <Link href="/wallet">{t("tower.emptyTopUp")}</Link>
              </Button>
              <Button type="button" className="flex-1" onClick={() => setWalletWarning("")}>
                {t("wallet.topup.ok")}
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
            aria-label={t("common.close")}
            onClick={() => setOpen(false)}
          />
          <div className="relative bg-card rounded-t-2xl border-t p-4 pb-8 space-y-4 max-h-[85dvh] overflow-y-auto">
            <h3 className="text-lg font-bold">
              {holdOrderId
                ? t("ui.authorize_card_hold")
                : t("ui.bid")}
            </h3>
            {!holdOrderId ? (
              <p className="text-sm text-muted-foreground">
                {t("ui.minimum_bid")}{" "}
                <span className="font-bold text-foreground">{formatUsedPrice(minBid, currency)}</span>
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                {t("ui.bid")}{" "}
                <span className="font-bold text-foreground">
                  {formatUsedPrice(bidAmountNum, currency)}
                </span>
                {" · "}
                {t("ui.card_hold")}{" "}
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
                      ? t("ui.amount_in_usd")
                      : t("ui.amount_in_krw")
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
                    {pm.isDefault ? t("ui.default") : ""}
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
                  {t("auction.bidConsent")}{" "}
                  <Link href="/legal/terms" className="text-primary hover:underline" target="_blank">
                    {t("ui.terms")}
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
                ? t("ui.processing")
                : holdOrderId
                  ? t("ui.authorize_card_bid")
                  : t("used.bidAmount", {
                      amount: formatUsedPrice(bidAmountNum, currency),
                    })}
            </Button>

            {buyNowPrice != null && buyNowPrice > 0 && !holdOrderId && (
              confirmBuyNow ? (
                <div className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-3 space-y-2">
                  <p className="text-sm font-medium">
                    {t("used.buyNowConfirm", {
                      amount: formatUsedPrice(buyNowPrice, currency),
                    })}
                  </p>
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      className="mt-0.5 h-4 w-4 rounded border-input"
                      checked={buyNowConsent}
                      onChange={(e) => setBuyNowConsent(e.target.checked)}
                    />
                    <span className="text-[11px] text-muted-foreground leading-relaxed">
                      {t("auction.bidConsent")}
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
                      {t("ui.buy_now")}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-10 rounded-xl"
                      disabled={busy}
                      onClick={() => setConfirmBuyNow(false)}
                    >
                      {t("calendar.cancel")}
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
                  {t("ui.buy_now")} {formatUsedPrice(buyNowPrice, currency)}
                </Button>
              )
            )}

            <button
              type="button"
              className="w-full py-2 text-muted-foreground text-sm"
              onClick={() => setOpen(false)}
            >
              {t("common.close")}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
