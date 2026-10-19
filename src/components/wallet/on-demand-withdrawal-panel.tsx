"use client";

import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type Quote = {
  withdrawMoco: number;
  balanceBeforeMoco: number;
  balanceAfterMoco: number;
  payoutTier: string;
  netTransferCents: number;
  transfer: { netMinor: number; currency: string };
};

function formatUsdFromCents(cents: number) {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

type Props = {
  settlementMoco: number;
  /** @deprecated Stripe Connect is no longer required for creator payouts. */
  payoutsEnabled?: boolean;
  onSuccess?: () => void;
};

export function OnDemandWithdrawalPanel({ settlementMoco, onSuccess }: Props) {
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [loadingQuote, setLoadingQuote] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successRequestId, setSuccessRequestId] = useState<string | null>(null);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoadingQuote(true);
    void fetch("/api/settlements/on-demand-withdraw/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
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
  }, [settlementMoco, refreshKey]);

  const runWithdraw = useCallback(async () => {
    if (!quote) return;
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
        body: "{}",
      });
      const data = (await res.json()) as {
        payoutRequestId?: string;
        error?: string;
        code?: string;
      };
      if (!res.ok) {
        if (
          data.code === "TAX_FORM_REQUIRED" ||
          data.code === "TAX_FORM_PENDING" ||
          data.code === "TAX_FORM_REJECTED" ||
          data.code === "PAYOUT_METHOD_REQUIRED"
        ) {
          setShowSetupModal(true);
          setSubmitError(null);
          return;
        }
        setSubmitError(data.error ?? "Withdrawal failed");
        return;
      }
      setSuccessRequestId(data.payoutRequestId ?? null);
      setRefreshKey((n) => n + 1);
      onSuccess?.();
    } catch {
      setSubmitError("Withdrawal failed");
    } finally {
      setSubmitting(false);
    }
  }, [quote, onSuccess]);

  const payoutUsd = quote
    ? quote.transfer.currency === "usd"
      ? formatUsdFromCents(quote.transfer.netMinor)
      : formatUsdFromCents(quote.netTransferCents)
    : null;

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4 space-y-3">
      <div>
        <p className="font-bold">{t("wallet.onDemand.title")}</p>
        <p className="text-xs text-muted-foreground mt-1">
          Available {settlementMoco.toLocaleString()} MOCO
        </p>
      </div>

      {loadingQuote ? <p className="text-xs text-muted-foreground">Calculating quote…</p> : null}
      {quoteError ? <p className="text-xs text-destructive">{quoteError}</p> : null}

      {quote && payoutUsd ? (
        <div className="rounded-xl bg-muted/40 p-3 text-sm space-y-1 tabular-nums">
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">Reward tier</span>
            <span className="font-semibold">{quote.payoutTier}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">MOCO paid out</span>
            <span>{quote.withdrawMoco.toLocaleString()} MOCO</span>
          </div>
          <div className="flex justify-between gap-2 font-bold">
            <span>Payout</span>
            <span>{payoutUsd}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">Stays in balance</span>
            <span>{quote.balanceAfterMoco.toLocaleString()} MOCO</span>
          </div>
        </div>
      ) : null}

      {successRequestId ? (
        <p className="text-xs text-emerald-700 dark:text-emerald-400">
          Payout request received. MoCoMo will send it manually. Reference {successRequestId}
        </p>
      ) : null}
      {submitError ? <p className="text-xs text-destructive">{submitError}</p> : null}

      <Button
        type="button"
        className="w-full"
        disabled={!quote || submitting}
        onClick={() => void runWithdraw()}
      >
        {submitting ? "Processing…" : "Request payout"}
      </Button>

      <p className="text-xs text-muted-foreground">
        Pulse (10 MOCO, $47.25) is the minimum. Only your current tier is paid, and the rest stays in your balance. Payouts are sent manually after your tax form is verified. Stripe Connect is not used.
      </p>

      {showSetupModal ? (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4">
          <div className="max-w-md w-full rounded-2xl bg-card border border-border p-4 space-y-3 shadow-xl">
            <p className="font-bold">Payout details required</p>
            <p className="text-sm leading-relaxed">
              To request a payout, upload a tax form (W-9 or W-8BEN) and register a payout email (Payoneer, Wise, or bank). Requests open after the form is verified.
            </p>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="ghost" onClick={() => setShowSetupModal(false)}>
                Close
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setShowSetupModal(false);
                  document.getElementById("manual-payout-setup")?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                Add details
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
