"use client";

import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
type Quote = {
  withdrawMoco: number;
  balanceBeforeMoco: number;
  balanceAfterMoco: number;
  activeTierBefore: string;
  activeTierAfter: string;
  platformFeePercent: number;
  activeTierBeforeFeePercent: number;
  activeTierAfterFeePercent: number;
  tierDowngrade: boolean;
  faceValueCents: number;
  platformMarginCents: number;
  transfer: { netMinor: number; currency: string };
};

function formatUsdFromCents(cents: number) {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

type Props = {
  settlementMoco: number;
  payoutsEnabled: boolean;
  onSuccess?: () => void;
};

export function OnDemandWithdrawalPanel({ settlementMoco, payoutsEnabled, onSuccess }: Props) {
  const [amount, setAmount] = useState("");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [loadingQuote, setLoadingQuote] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successTransferId, setSuccessTransferId] = useState<string | null>(null);
  const [tierConfirm, setTierConfirm] = useState(false);
  const [showTierModal, setShowTierModal] = useState(false);

  const requestedMoco = useMemo(() => {
    const n = Number(amount.replace(/\D/g, ""));
    return Number.isFinite(n) ? Math.floor(n) : 0;
  }, [amount]);

  const debouncedMoco = useDebouncedValue(requestedMoco, 300);

  useEffect(() => {
    setSuccessTransferId(null);
    if (debouncedMoco <= 0) {
      setQuote(null);
      setQuoteError(null);
      return;
    }
    let cancelled = false;
    setLoadingQuote(true);
    void fetch("/api/settlements/on-demand-withdraw/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ withdrawMoco: debouncedMoco }),
    })
      .then(async (res) => {
        const data = (await res.json()) as Quote | { error?: string };
        if (cancelled) return;
        if (!res.ok) {
          setQuote(null);
          setQuoteError("error" in data && data.error ? data.error : "Quote failed");
          return;
        }
        setQuote(data as Quote);
        setQuoteError(null);
      })
      .catch(() => {
        if (!cancelled) setQuoteError("Could not load quote.");
      })
      .finally(() => {
        if (!cancelled) setLoadingQuote(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedMoco]);

  useEffect(() => {
    setTierConfirm(false);
  }, [debouncedMoco]);

  const runWithdraw = useCallback(async () => {
    if (requestedMoco <= 0) return;
    setSubmitting(true);
    setSubmitError(null);
    const idempotencyKey = crypto.randomUUID();
    try {
      const res = await fetch("/api/settlements/on-demand-withdraw", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify({ withdrawMoco: requestedMoco }),
      });
      const data = (await res.json()) as { stripeTransferId?: string; error?: string };
      if (!res.ok) {
        setSubmitError(data.error ?? "Withdrawal failed");
        return;
      }
      setSuccessTransferId(data.stripeTransferId ?? null);
      setAmount("");
      setQuote(null);
      onSuccess?.();
    } catch {
      setSubmitError("Withdrawal failed");
    } finally {
      setSubmitting(false);
      setShowTierModal(false);
    }
  }, [requestedMoco, onSuccess]);

  function onSubmitClick() {
    if (!quote || !payoutsEnabled) return;
    if (quote.tierDowngrade && !tierConfirm) {
      setShowTierModal(true);
      return;
    }
    void runWithdraw();
  }

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4 space-y-3">
      <div>
        <p className="font-bold">{t("wallet.onDemand.title")}</p>
        <p className="text-xs text-muted-foreground mt-1">
          Available {settlementMoco.toLocaleString()} MOCO · partial or full withdrawal
        </p>
      </div>

      <input
        type="text"
        inputMode="numeric"
        value={amount}
        onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))}
        placeholder="MOCO amount"
        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm font-semibold tabular-nums"
      />

      {loadingQuote ? <p className="text-xs text-muted-foreground">Calculating quote…</p> : null}
      {quoteError ? <p className="text-xs text-destructive">{quoteError}</p> : null}

      {quote ? (
        <div className="rounded-xl bg-muted/40 p-3 text-sm space-y-1 tabular-nums">
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">Gross</span>
            <span>{formatUsdFromCents(quote.faceValueCents)}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">Platform fee</span>
            <span>
              −{quote.platformFeePercent}% ({formatUsdFromCents(quote.platformMarginCents)})
            </span>
          </div>
          <div className="flex justify-between gap-2 font-bold">
            <span>Net to Connect</span>
            <span>
              {quote.transfer.currency === "usd"
                ? formatUsdFromCents(quote.transfer.netMinor)
                : `${quote.transfer.netMinor.toLocaleString()} ${quote.transfer.currency.toUpperCase()}`}
            </span>
          </div>
          {quote.tierDowngrade ? (
            <p className="text-xs text-amber-700 dark:text-amber-400 pt-1">
              Tier {quote.activeTierBefore} → {quote.activeTierAfter} after withdrawal
            </p>
          ) : null}
        </div>
      ) : null}

      {successTransferId ? (
        <p className="text-xs text-emerald-700 dark:text-emerald-400">
          Payout submitted · Transfer {successTransferId}
        </p>
      ) : null}
      {submitError ? <p className="text-xs text-destructive">{submitError}</p> : null}

      <Button
        type="button"
        className="w-full"
        disabled={!quote || submitting || !payoutsEnabled || requestedMoco <= 0}
        onClick={onSubmitClick}
      >
        {submitting ? "Processing…" : "Withdraw to Connect"}
      </Button>

      {!payoutsEnabled ? (
        <p className="text-xs text-muted-foreground">Complete Stripe Connect setup to withdraw.</p>
      ) : null}

      {showTierModal && quote?.tierDowngrade ? (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4">
          <div className="max-w-md w-full rounded-2xl bg-card border border-border p-4 space-y-3 shadow-xl">
            <p className="font-bold text-amber-700 dark:text-amber-400">Tier downgrade warning</p>
            <p className="text-sm leading-relaxed">
              Withdrawing <strong>{quote.withdrawMoco.toLocaleString()} MOCO</strong> will lower your
              balance to <strong>{quote.balanceAfterMoco.toLocaleString()} MOCO</strong>, reducing your
              rank from <strong>{quote.activeTierBefore}</strong> to{" "}
              <strong>{quote.activeTierAfter}</strong> (platform fee for future payouts increases from{" "}
              {quote.activeTierBeforeFeePercent}% to {quote.activeTierAfterFeePercent}%).
            </p>
            <label className="flex items-start gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={tierConfirm}
                onChange={(e) => setTierConfirm(e.target.checked)}
                className="mt-1"
              />
              <span>I understand my reward tier will downgrade</span>
            </label>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="ghost" onClick={() => setShowTierModal(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                disabled={!tierConfirm || submitting}
                onClick={() => void runWithdraw()}
              >
                Confirm withdrawal
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function useDebouncedValue<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(value), ms);
    return () => window.clearTimeout(t);
  }, [value, ms]);
  return debounced;
}
