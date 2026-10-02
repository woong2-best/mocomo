"use client";


import { errorText } from "@/lib/i18n/error-text";
import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Loader2, ShieldCheck, X } from "lucide-react";
import { useWalletPay } from "@/components/wallet/wallet-pay-context";
import type { AtmScreenOverlay } from "@/components/wallet/wallet-payment-types";
import { payGemTopupWithSavedCard } from "@/actions/gems";
import { confirmCheckoutPayment } from "@/actions/checkout-payment";
import {
  MOCO_PURCHASE_PG_FEE_NOTE,
  MOCO_PURCHASE_TERMS_COPY,
  MOCO_TOPUP_INPUT_MAX_DIGITS,
  parseMocoTopupCount,
  quoteGemTopup,
  sanitizeMocoTopupInput,
} from "@/lib/gems/constants";
import { MocoEarthTransferHero } from "@/components/moco/moco-earth-transfer-hero";
import { formatMocoDisplay } from "@/lib/gems/display";
import type { SavedPaymentMethod } from "@/lib/stripe-payment-methods";
import { stripePaymentIntentReturnUrlClient } from "@/lib/stripe-payment-return-url";
import { cn } from "@/lib/utils";
import { useLocale } from "@/components/providers/locale-provider";

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
  selectedCardId?: string | null;
  atmOverlay?: AtmScreenOverlay;
  onPaymentResult?: (result: "success" | "failure") => void;
  onPaymentProcessing?: () => void;
};

function formatUsdCents(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function AtmNumKey({
  label,
  disabled,
  onPress,
  className,
}: {
  label: string;
  disabled?: boolean;
  onPress: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onPress}
      className={cn(
        "relative flex h-[3.25rem] items-center justify-center rounded-md border border-[#8a9199]",
        "bg-gradient-to-b from-[#f4f5f7] via-[#e3e6ea] to-[#caced4]",
        "text-2xl font-bold tabular-nums text-[#1a1f26]",
        "shadow-[0_4px_0_#9aa1a9,0_6px_12px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.85)]",
        "transition-transform active:translate-y-[2px] active:shadow-[0_1px_0_#9aa1a9,inset_0_2px_4px_rgba(0,0,0,0.15)]",
        "disabled:opacity-45 disabled:pointer-events-none",
        className,
      )}
    >
      {label}
    </button>
  );
}

function AtmActionKey({
  label,
  subLabel,
  tone,
  disabled,
  onPress,
  className,
}: {
  label: string;
  subLabel?: string;
  tone: "clear" | "confirm";
  disabled?: boolean;
  onPress: () => void;
  className?: string;
}) {
  const isConfirm = tone === "confirm";
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onPress}
      className={cn(
        "relative flex flex-col items-center justify-center rounded-md border font-black",
        isConfirm
          ? "border-[#1f6b3f] bg-gradient-to-b from-[#3ecf7a] via-[#2db868] to-[#1a9a52] text-[#0b2e18] shadow-[0_4px_0_#157a42,0_6px_12px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.35)]"
          : "border-[#9a7a12] bg-gradient-to-b from-[#ffe08a] via-[#f5c842] to-[#d9a820] text-[#5c3d00] shadow-[0_4px_0_#b8890f,0_6px_12px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.45)]",
        "transition-transform active:translate-y-[2px]",
        isConfirm
          ? "active:shadow-[0_1px_0_#157a42,inset_0_2px_4px_rgba(0,0,0,0.2)]"
          : "active:shadow-[0_1px_0_#b8890f,inset_0_2px_4px_rgba(0,0,0,0.15)]",
        "disabled:opacity-45 disabled:pointer-events-none",
        className,
      )}
    >
      <span className="text-base leading-none tracking-tight">{label}</span>
      {subLabel ? <span className="mt-1 text-[10px] font-bold opacity-70">{subLabel}</span> : null}
    </button>
  );
}

export function GemBalancePanel({
  balance,
  minTopupMoco,
  paymentMethods,
  purchases,
  lowBalanceNotice,
  userImageUrl,
  selectedCardId = null,
  atmOverlay = null,
  onPaymentResult,
  onPaymentProcessing,
}: Props) {
  const { locale, t } = useLocale();
  const termsErrorMsg = t("wallet.topup.acceptTerms");
  const router = useRouter();
  const { registerInsertHandler } = useWalletPay();
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const [statusLine, setStatusLine] = useState(() =>
    t("wallet.topup.enterAmount")
  );
  const [awaitingInsert, setAwaitingInsert] = useState(false);
  const [pending, startTransition] = useTransition();
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null);

  const defaultCard = useMemo(() => {
    if (selectedCardId) {
      return paymentMethods.find((m) => m.id === selectedCardId) ?? null;
    }
    return paymentMethods.find((m) => m.isDefault) ?? paymentMethods[0] ?? null;
  }, [paymentMethods, selectedCardId]);

  useEffect(() => {
    const pk = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    if (pk) setStripePromise(loadStripe(pk));
  }, []);

  const parsedPreview = parseMocoTopupCount(amount);
  const displayAmount = amount ? Number(amount).toLocaleString() : "0";
  const topupQuote =
    parsedPreview != null && parsedPreview >= minTopupMoco ? quoteGemTopup(parsedPreview) : null;
  const feeBreakdown = topupQuote && topupQuote.ok ? topupQuote : null;
  const singleUnitQuote = quoteGemTopup(1);
  const tenUnitQuote = quoteGemTopup(10);
  const bulkSaveCents =
    singleUnitQuote.ok && tenUnitQuote.ok
      ? singleUnitQuote.pgFeeCents * 10 - tenUnitQuote.pgFeeCents
      : 0;

  const handle3ds = useCallback(
    async (secret: string, orderId: string) => {
      if (!stripePromise) {
        setError(t("wallet.topup.stripeLoadFailed"));
        return;
      }
      const stripe = await stripePromise;
      if (!stripe) {
        setError(t("wallet.topup.stripeLoadFailed"));
        return;
      }
      const returnUrl = stripePaymentIntentReturnUrlClient(orderId, "/wallet");
      const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(secret, {
        return_url: returnUrl,
      });
      if (confirmError) {
        setError(confirmError.message ?? t("wallet.topup.cardAuthFailed"));
        setStatusLine(confirmError.message ?? t("wallet.topup.cardAuthFailed"));
        onPaymentResult?.("failure");
        return;
      }
      if (paymentIntent?.status !== "succeeded") {
        setError(t("wallet.topup.paymentIncomplete"));
        setStatusLine(t("wallet.topup.paymentIncomplete"));
        onPaymentResult?.("failure");
        return;
      }
      const done = await confirmCheckoutPayment(orderId);
      if ("error" in done && done.error) {
        setError(errorText(done.error));
        setStatusLine(errorText(done.error));
        onPaymentResult?.("failure");
        return;
      }
      if ("success" in done && done.success) {
        setAmount("");
        setAwaitingInsert(false);
        setStatusLine(t("wallet.topup.complete"));
        onPaymentResult?.("success");
        router.refresh();
      }
    },
    [onPaymentResult, router, stripePromise],
  );

  const runTopup = useCallback(() => {
    if (!termsAccepted) {
      setError(termsErrorMsg);
      setStatusLine(t("wallet.topup.acceptTermsRetry"));
      onPaymentResult?.("failure");
      return;
    }
    const moco = parseMocoTopupCount(amount);
    if (moco == null || moco < minTopupMoco) {
      setError(t("wallet.topup.minAmount", { min: String(minTopupMoco) }));
      setStatusLine(t("wallet.topup.minOneMoco"));
      onPaymentResult?.("failure");
      return;
    }
    if (!defaultCard) {
      setError(
        t("wallet.topup.noSavedCardHint")
      );
      setStatusLine(t("wallet.topup.noSavedCard"));
      onPaymentResult?.("failure");
      return;
    }
    setError("");
    setStatusLine(t("wallet.topup.payingSavedCard"));
    onPaymentProcessing?.();
    startTransition(async () => {
      const res = await payGemTopupWithSavedCard(moco, defaultCard.id, true);
      if ("error" in res && res.error) {
        setError(errorText(res.error));
        setStatusLine(errorText(res.error));
        onPaymentResult?.("failure");
        return;
      }
      if ("requiresAction" in res && res.requiresAction && res.clientSecret && res.orderId) {
        await handle3ds(res.clientSecret, res.orderId);
        return;
      }
      if ("success" in res && res.success) {
        setAmount("");
        setAwaitingInsert(false);
        setStatusLine(t("wallet.topup.complete"));
        onPaymentResult?.("success");
        router.refresh();
        return;
      }
      setError(t("wallet.topup.paymentFailed"));
      setStatusLine(t("wallet.topup.paymentFailShort"));
      onPaymentResult?.("failure");
    });
  }, [
    amount,
    handle3ds,
    minTopupMoco,
    onPaymentProcessing,
    onPaymentResult,
    defaultCard,
    router,
    termsAccepted,
  ]);

  useEffect(() => {
    registerInsertHandler(() => {
      if (!awaitingInsert) {
        setStatusLine(t("wallet.topup.atmInsertCard"));
        return;
      }
      runTopup();
    });
    return () => registerInsertHandler(null);
  }, [awaitingInsert, registerInsertHandler, runTopup]);

  function appendDigit(digit: string) {
    if (pending) return;
    const next = sanitizeMocoTopupInput(amount + digit);
    if (next.length > MOCO_TOPUP_INPUT_MAX_DIGITS) return;
    const normalized = next.replace(/^0+(?=\d)/, "");
    setAmount(normalized);
    setAwaitingInsert(false);
    if (error) setError("");
    setStatusLine(t("wallet.topup.confirmAmount"));
  }

  function backspace() {
    if (pending || !amount) return;
    setAmount(amount.slice(0, -1));
    setAwaitingInsert(false);
    if (error) setError("");
    setStatusLine(t("wallet.topup.enterAmount"));
  }

  function confirmAmountForCardInsert() {
    if (!termsAccepted) {
      setError(termsErrorMsg);
      setStatusLine(t("wallet.topup.acceptTermsRetry"));
      return;
    }
    const moco = parseMocoTopupCount(amount);
    if (moco == null || moco < minTopupMoco) {
      setError(t("wallet.topup.minAmount", { min: String(minTopupMoco) }));
      setStatusLine(t("wallet.topup.minOneMoco"));
      return;
    }
    if (!defaultCard) {
      setError(
        t("wallet.topup.noSavedCardHint")
      );
      setStatusLine(t("wallet.topup.noSavedCard"));
      return;
    }
    setError("");
    setAwaitingInsert(true);
    setStatusLine(t("wallet.topup.swipeCard"));
  }

  return (
    <div className="overflow-hidden rounded-[1.35rem] border-2 border-[#6b7280] bg-gradient-to-b from-[#d1d5db] via-[#aeb4bd] to-[#8b939e] p-1.5 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.5)]">
      {/* ATM body */}
      <div className="overflow-hidden rounded-[1.1rem] border border-[#4b5563] bg-gradient-to-b from-[#111827] to-[#0b1018]">
        {/* Top fascia */}
        <div className="flex items-center justify-between border-b border-[#374151] bg-gradient-to-r from-[#1f2937] via-[#111827] to-[#1f2937] px-4 py-2">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/30" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
            </span>
            <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-400">MoCoMo ATM</span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-500">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
            SECURE
          </div>
        </div>

        <div className="relative mx-4 mt-4">
          <AnimatePresence>
            {atmOverlay ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className={cn(
                  "absolute inset-0 z-20 flex flex-col items-center justify-center rounded-lg backdrop-blur-sm",
                  atmOverlay === "success" ? "bg-emerald-500/15" : "bg-red-500/15",
                )}
              >
                <div
                  className={cn(
                    "flex h-16 w-16 items-center justify-center rounded-full border-4",
                    atmOverlay === "success"
                      ? "border-emerald-400 bg-emerald-500/20 text-emerald-300"
                      : "border-red-400 bg-red-500/20 text-red-300",
                  )}
                >
                  {atmOverlay === "success" ? (
                    <Check className="h-9 w-9" strokeWidth={3} />
                  ) : (
                    <X className="h-9 w-9" strokeWidth={3} />
                  )}
                </div>
                <p
                  className={cn(
                    "mt-3 text-lg font-black tracking-tight",
                    atmOverlay === "success" ? "text-emerald-200" : "text-red-200",
                  )}
                >
                  {atmOverlay === "success"
                    ? t("wallet.topup.paymentSuccess")
                    : t("wallet.topup.paymentFailShort")}
                </p>
              </motion.div>
            ) : null}
          </AnimatePresence>
          <MocoEarthTransferHero userImageUrl={userImageUrl} transferActive={pending}>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-500">
              {t("wallet.topup.currentBalance")}
            </p>
            <p className="mt-0.5 font-mono text-xl font-bold tabular-nums text-neutral-900">
              {formatMocoDisplay(balance)}
            </p>
            <div className="mt-3 flex items-baseline justify-between gap-3 rounded-md border-2 border-[#1B3A6B] bg-white px-3 py-2">
              <p
                id="moco-topup-amount"
                className="min-w-0 flex-1 truncate font-mono text-3xl font-bold tabular-nums text-neutral-900"
                aria-live="polite"
              >
                {displayAmount}
              </p>
              <span className="shrink-0 text-sm font-black text-[#E85D04]">MOCO</span>
            </div>
            {feeBreakdown ? (
              <dl className="mt-3 space-y-1 text-[11px] text-neutral-600">
                <div className="flex justify-between gap-2">
                  <dt>{t("wallet.topup.mocoPrice")}</dt>
                  <dd className="font-mono font-semibold tabular-nums">{formatUsdCents(feeBreakdown.basePriceCents)}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt>{t("wallet.topup.pgFee")}</dt>
                  <dd className="font-mono font-semibold tabular-nums text-neutral-800">
                    +{formatUsdCents(feeBreakdown.pgFeeCents)}
                  </dd>
                </div>
                <div className="flex justify-between gap-2 border-t border-neutral-200 pt-1 text-neutral-900">
                  <dt className="font-bold">{t("wallet.topup.totalCharge")}</dt>
                  <dd className="font-mono text-sm font-black tabular-nums">
                    {formatUsdCents(feeBreakdown.usdCents)}
                  </dd>
                </div>
              </dl>
            ) : (
              <p className="mt-2 text-[11px] text-neutral-500">
                {t("wallet.topup.wholeUnitsMin")} {minTopupMoco} MOCO
              </p>
            )}
            {bulkSaveCents > 0 ? (
              <p className="mt-2 rounded-md bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-800">
                {t("wallet.topup.bulkSaveHint", { amount: formatUsdCents(bulkSaveCents) })}
              </p>
            ) : null}
            {defaultCard ? (
              <p className="mt-2 text-[11px] text-neutral-500">
                {t("wallet.topup.cardLabel")} · {defaultCard.brand.toUpperCase()} ···{defaultCard.last4}
                {defaultCard.isDefault ? t("wallet.topup.cardDefault") : ""}
              </p>
            ) : (
              <p className="mt-2 text-[11px] text-amber-700">
                {t("wallet.topup.noSavedCardHint")}
              </p>
            )}
          </MocoEarthTransferHero>
        </div>

        {/* Status ticker — ATM footer style */}
        <div className="mx-4 mt-3 rounded-md border border-amber-900/40 bg-[#1a1205] px-3 py-2">
          <p className="font-mono text-xs font-semibold text-amber-300" role="status">
            {pending ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                {t("wallet.topup.openingPayment")}
              </span>
            ) : (
              statusLine
            )}
          </p>
        </div>

        {lowBalanceNotice ? (
          <div className="mx-4 mt-3 rounded-md border border-amber-500/35 bg-amber-500/10 px-3 py-2">
            <p className="text-sm font-semibold text-amber-200">
              {t("wallet.topup.lowBalance")}
            </p>
            <p className="mt-0.5 text-xs text-amber-200/70">
              {t("wallet.topup.keypadHint")}
            </p>
          </div>
        ) : null}

        {/* Keypad well */}
        <div className="mx-4 my-4 rounded-xl border border-[#6b7280] bg-gradient-to-b from-[#b8bcc4] to-[#9ca3af] p-3 shadow-[inset_0_3px_8px_rgba(0,0,0,0.25)]">
          <div className="grid grid-cols-4 grid-rows-4 gap-2">
            <AtmNumKey label="1" disabled={pending} onPress={() => appendDigit("1")} className="col-start-1 row-start-1" />
            <AtmNumKey label="2" disabled={pending} onPress={() => appendDigit("2")} className="col-start-2 row-start-1" />
            <AtmNumKey label="3" disabled={pending} onPress={() => appendDigit("3")} className="col-start-3 row-start-1" />
            <AtmActionKey
              label={t("wallet.topup.clear")}
              subLabel="←"
              tone="clear"
              disabled={pending || !amount}
              onPress={backspace}
              className="col-start-4 row-start-1 row-span-2 h-full min-h-[6.9rem]"
            />

            <AtmNumKey label="4" disabled={pending} onPress={() => appendDigit("4")} className="col-start-1 row-start-2" />
            <AtmNumKey label="5" disabled={pending} onPress={() => appendDigit("5")} className="col-start-2 row-start-2" />
            <AtmNumKey label="6" disabled={pending} onPress={() => appendDigit("6")} className="col-start-3 row-start-2" />

            <AtmNumKey label="7" disabled={pending} onPress={() => appendDigit("7")} className="col-start-1 row-start-3" />
            <AtmNumKey label="8" disabled={pending} onPress={() => appendDigit("8")} className="col-start-2 row-start-3" />
            <AtmNumKey label="9" disabled={pending} onPress={() => appendDigit("9")} className="col-start-3 row-start-3" />
            <AtmActionKey
              label={t("wallet.topup.ok")}
              subLabel="OK"
              tone="confirm"
              disabled={
                pending ||
                !defaultCard ||
                !amount ||
                parsedPreview == null ||
                parsedPreview < minTopupMoco
              }
              onPress={confirmAmountForCardInsert}
              className="col-start-4 row-start-3 row-span-2 h-full min-h-[6.9rem]"
            />

            <AtmNumKey
              label="0"
              disabled={pending}
              onPress={() => appendDigit("0")}
              className="col-span-3 col-start-1 row-start-4"
            />
          </div>
        </div>

        <div className="space-y-3 px-4 pb-4">
          <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-slate-700/60 bg-slate-900/50 px-3 py-2.5">
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={(e) => {
                setTermsAccepted(e.target.checked);
                if (e.target.checked && error === termsErrorMsg) {
                  setError("");
                  setStatusLine(t("wallet.topup.confirmAmount"));
                }
              }}
              className="mt-0.5 accent-emerald-500"
            />
            <span className="text-[11px] leading-relaxed text-slate-400">{MOCO_PURCHASE_TERMS_COPY}</span>
          </label>
          <p className="text-[10px] leading-relaxed text-slate-500">{MOCO_PURCHASE_PG_FEE_NOTE}</p>
          <a
            href="/contribution-tower"
            className="block text-center text-[11px] font-bold text-emerald-400/90 underline"
          >
            {t("wallet.viewContributionTower")}
          </a>

          {purchases.length > 0 ? (
            <div className="space-y-2 border-t border-slate-700/50 pt-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                {t("wallet.topup.history")}
              </p>
              <ul className="max-h-36 space-y-1.5 overflow-y-auto">
                {purchases.map((p) => (
                  <li
                    key={p.id}
                    className="rounded-lg border border-slate-700/50 bg-slate-900/40 px-3 py-2 text-sm"
                  >
                    <p className="font-mono font-semibold tabular-nums text-slate-200">
                      {formatMocoDisplay(p.gems)}
                      {p.remainingGems < p.gems ? t("wallet.topup.partiallyUsed") : ""}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {new Date(p.createdAt).toLocaleDateString("en-US")} ·{" "}
                      {t("wallet.topup.remaining")}{" "}
                      {formatMocoDisplay(p.remainingGems)}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {error ? (
            <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
