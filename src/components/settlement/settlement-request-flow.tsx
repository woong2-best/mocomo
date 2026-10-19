"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type Quote = {
  withdrawMoco: number;
  balanceBeforeMoco: number;
  balanceAfterMoco: number;
  payoutTier: string;
  netTransferCents: number;
  transfer: { netMinor: number; currency: string };
};

type Readiness = {
  tax: { formType: "W9" | "W8BEN"; status: "PENDING" | "VERIFIED" | "REJECTED" } | null;
  method: { kind: string; hint: string } | null;
  canRequest: boolean;
  code: string | null;
};

type Receipt = {
  payoutRequestId: string;
  tier: string;
  withdrawMoco: number;
  usd: string;
  balanceAfterMoco: number;
};

function formatUsdFromCents(cents: number) {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function payoutLabel(quote: Quote) {
  const cents = quote.transfer.currency === "usd" ? quote.transfer.netMinor : quote.netTransferCents;
  return formatUsdFromCents(cents);
}

const fieldClass =
  "w-full rounded-xl border border-black/20 bg-white px-3 py-2.5 text-sm text-black placeholder:text-black/40 dark:border-white/25 dark:bg-black dark:text-white dark:placeholder:text-white/40";

export function SettlementRequestFlow() {
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [readiness, setReadiness] = useState<Readiness | null>(null);
  const [loading, setLoading] = useState(true);
  const [formType, setFormType] = useState<"W9" | "W8BEN">("W9");
  const [file, setFile] = useState<File | null>(null);
  const [kind, setKind] = useState<"PAYONEER" | "WISE" | "BANK">("PAYONEER");
  const [email, setEmail] = useState("");
  const [accountHolder, setAccountHolder] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [countryCode, setCountryCode] = useState("US");
  const [routingNumber, setRoutingNumber] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [editingDetails, setEditingDetails] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [quoteRes, readyRes] = await Promise.all([
        fetch("/api/settlements/on-demand-withdraw/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{}",
        }),
        fetch("/api/settlements/payout-readiness", { cache: "no-store" }),
      ]);
      const quoteBody = (await quoteRes.json()) as Quote | { error?: string };
      if (!quoteRes.ok) {
        setQuote(null);
        setQuoteError("error" in quoteBody && quoteBody.error ? quoteBody.error : "Quote failed");
      } else {
        setQuote(quoteBody as Quote);
        setQuoteError(null);
      }
      if (readyRes.ok) {
        const ready = (await readyRes.json()) as Readiness;
        setReadiness(ready);
        if (ready.tax?.formType) setFormType(ready.tax.formType);
        if (ready.method?.kind === "PAYONEER" || ready.method?.kind === "WISE" || ready.method?.kind === "BANK") {
          setKind(ready.method.kind);
        }
      }
    } catch {
      setQuoteError("Could not load this payout.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const detailsComplete = readiness?.canRequest === true;
  const showForms = !detailsComplete || editingDetails;

  async function uploadTax() {
    if (!file) {
      setError("Choose a W-9 or W-8BEN file.");
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const body = new FormData();
      body.set("taxFormType", formType);
      body.set("file", file);
      const res = await fetch("/api/settlements/tax-form", { method: "POST", body });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Upload failed.");
        return;
      }
      setFile(null);
      setNotice("Tax form uploaded. Requests open after MoCoMo verifies it.");
      await load();
    } catch {
      setError("Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  async function saveMethod() {
    setBusy(true);
    setError(null);
    setNotice(null);
    const destination =
      kind === "BANK"
        ? { kind, accountHolder, bankName, accountNumber, countryCode, routingNumber }
        : { kind, email };
    try {
      const res = await fetch("/api/settlements/payout-method", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(destination),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Could not save the payout destination.");
        return;
      }
      setAccountNumber("");
      setNotice("Payout destination saved.");
      await load();
    } catch {
      setError("Could not save the payout destination.");
    } finally {
      setBusy(false);
    }
  }

  async function submitRequest() {
    if (!quote || !detailsComplete) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/settlements/on-demand-withdraw", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Idempotency-Key": crypto.randomUUID(),
        },
        body: "{}",
      });
      const data = (await res.json()) as { payoutRequestId?: string; error?: string };
      if (!res.ok || !data.payoutRequestId) {
        setError(data.error ?? "Could not request this payout.");
        return;
      }
      setReceipt({
        payoutRequestId: data.payoutRequestId,
        tier: quote.payoutTier,
        withdrawMoco: quote.withdrawMoco,
        usd: payoutLabel(quote),
        balanceAfterMoco: quote.balanceAfterMoco,
      });
    } catch {
      setError("Could not request this payout.");
    } finally {
      setBusy(false);
    }
  }

  if (receipt) {
    return (
      <article className="overflow-hidden rounded-3xl border border-black bg-white text-black dark:border-white dark:bg-black dark:text-white">
        <Wordmark />
        <div className="space-y-6 px-5 py-6 sm:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-black/50 dark:text-white/50">
              Request received
            </p>
            <h1 className="mt-2 font-display text-3xl font-bold leading-tight">Payout requested</h1>
            <p className="mt-2 text-sm leading-relaxed text-black/70 dark:text-white/70">
              MoCoMo will send this manually after review. Stripe Connect is not used.
            </p>
          </div>
          <dl className="divide-y divide-black/10 border-y border-black/10 dark:divide-white/15 dark:border-white/15">
            <Row label="Tier" value={receipt.tier} />
            <Row label="MOCO paid out" value={`${receipt.withdrawMoco.toLocaleString()} MOCO`} />
            <Row label="Amount" value={receipt.usd} strong />
            <Row label="Stays in balance" value={`${receipt.balanceAfterMoco.toLocaleString()} MOCO`} />
            <Row label="Reference" value={receipt.payoutRequestId} />
          </dl>
          <Link
            href="/wallet?tab=earnings"
            className="inline-flex h-12 w-full items-center justify-center rounded-full bg-black text-sm font-bold text-white dark:bg-white dark:text-black"
          >
            Back to earnings
          </Link>
        </div>
      </article>
    );
  }

  const taxStatus = readiness?.tax?.status;

  return (
    <article className="overflow-hidden rounded-3xl border border-black bg-white text-black dark:border-white dark:bg-black dark:text-white">
      <Wordmark />
      <div className="space-y-8 px-5 py-6 sm:px-8">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="font-display text-3xl font-bold leading-tight">Reward payout</h1>
            <p className="mt-2 text-sm leading-relaxed text-black/70 dark:text-white/70">
              Your current tier sets the amount. Nothing is typed in by hand.
            </p>
          </div>
          <Link href="/wallet?tab=earnings" className="shrink-0 text-sm font-semibold underline underline-offset-4">
            Earnings
          </Link>
        </div>

        <section className="space-y-3">
          <SectionLabel index="1" title="Payout summary" />
          <div className="rounded-2xl border border-black/15 p-4 dark:border-white/20">
            {loading ? <p className="text-sm text-black/60 dark:text-white/60">Calculating…</p> : null}
            {quoteError ? <p className="text-sm leading-relaxed">{quoteError}</p> : null}
            {quote ? (
              <dl className="space-y-3">
                <SummaryLine label="Tier" value={quote.payoutTier} />
                <SummaryLine label="MOCO paid out" value={`${quote.withdrawMoco.toLocaleString()} MOCO`} />
                <SummaryLine label="Amount" value={payoutLabel(quote)} strong />
                <SummaryLine label="Stays in balance" value={`${quote.balanceAfterMoco.toLocaleString()} MOCO`} />
              </dl>
            ) : null}
          </div>
        </section>

        <section className="space-y-3">
          <SectionLabel index="2" title="Tax form and destination" />
          <div className="space-y-3 rounded-2xl border border-black/15 p-4 dark:border-white/20">
            <StatusLine
              label="Tax form"
              value={
                readiness?.tax
                  ? `${readiness.tax.formType === "W9" ? "W-9" : "W-8BEN"} · ${statusLabel(taxStatus)}`
                  : "Not uploaded"
              }
              done={taxStatus === "VERIFIED"}
            />
            <StatusLine
              label="Destination"
              value={readiness?.method ? readiness.method.hint : "Not saved"}
              done={Boolean(readiness?.method)}
            />
            {taxStatus === "VERIFIED" && readiness?.method ? (
              <p className="text-sm font-semibold">Verified. This payout can be requested.</p>
            ) : null}
            {taxStatus === "PENDING" ? (
              <p className="text-sm leading-relaxed text-black/70 dark:text-white/70">
                Your tax form is waiting for review. The request button opens after it is verified.
              </p>
            ) : null}
            {taxStatus === "REJECTED" ? (
              <p className="text-sm leading-relaxed">Your tax form was rejected. Upload a corrected W-9 or W-8BEN.</p>
            ) : null}
            {detailsComplete ? (
              <button
                type="button"
                className="text-sm font-semibold underline underline-offset-4"
                onClick={() => setEditingDetails((open) => !open)}
              >
                {editingDetails ? "Hide details" : "Update details"}
              </button>
            ) : null}
          </div>

          {showForms ? (
            <div className="space-y-5 rounded-2xl border border-black/15 p-4 dark:border-white/20">
              <div className="space-y-3">
                <p className="text-sm font-bold">Tax form</p>
                <div className="grid grid-cols-2 gap-2">
                  <Choice label="W-9" hint="US person" selected={formType === "W9"} onClick={() => setFormType("W9")} />
                  <Choice
                    label="W-8BEN"
                    hint="Non-US person"
                    selected={formType === "W8BEN"}
                    onClick={() => setFormType("W8BEN")}
                  />
                </div>
                <input
                  type="file"
                  accept="application/pdf,image/jpeg,image/png"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  className="block w-full text-sm"
                />
                <ActionButton disabled={busy} onClick={() => void uploadTax()}>
                  Upload tax form
                </ActionButton>
              </div>

              <div className="space-y-3 border-t border-black/10 pt-5 dark:border-white/15">
                <p className="text-sm font-bold">Where to send it</p>
                <div className="grid grid-cols-3 gap-2">
                  <Choice label="Payoneer" selected={kind === "PAYONEER"} onClick={() => setKind("PAYONEER")} />
                  <Choice label="Wise" selected={kind === "WISE"} onClick={() => setKind("WISE")} />
                  <Choice label="Bank" selected={kind === "BANK"} onClick={() => setKind("BANK")} />
                </div>
                {kind === "BANK" ? (
                  <div className="grid gap-2">
                    <input className={fieldClass} placeholder="Account holder" value={accountHolder} onChange={(e) => setAccountHolder(e.target.value)} />
                    <input className={fieldClass} placeholder="Bank name" value={bankName} onChange={(e) => setBankName(e.target.value)} />
                    <input className={fieldClass} placeholder="Account number" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} autoComplete="off" />
                    <input className={fieldClass} placeholder="Country (US)" value={countryCode} onChange={(e) => setCountryCode(e.target.value.toUpperCase())} maxLength={2} />
                    <input className={fieldClass} placeholder="Routing number (optional)" value={routingNumber} onChange={(e) => setRoutingNumber(e.target.value)} />
                  </div>
                ) : (
                  <input
                    type="email"
                    className={fieldClass}
                    placeholder={kind === "PAYONEER" ? "Payoneer email" : "Wise email"}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="off"
                  />
                )}
                <ActionButton disabled={busy} onClick={() => void saveMethod()}>
                  Save destination
                </ActionButton>
              </div>
            </div>
          ) : null}
        </section>

        <section className="space-y-3">
          <SectionLabel index="3" title="Submit request" />
          {notice ? <p className="text-sm leading-relaxed">{notice}</p> : null}
          {error ? <p className="text-sm leading-relaxed">{error}</p> : null}
          <button
            type="button"
            disabled={!quote || !detailsComplete || busy}
            onClick={() => void submitRequest()}
            className="inline-flex h-12 w-full items-center justify-center rounded-full bg-black text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-35 dark:bg-white dark:text-black"
          >
            {busy ? "Working…" : "Submit request"}
          </button>
          <p className="text-xs leading-relaxed text-black/60 dark:text-white/60">
            Pulse (10 MOCO, $47.25) is the minimum. The button stays off until the tax form is verified and a destination is saved.
          </p>
        </section>
      </div>
    </article>
  );
}

function Wordmark() {
  return (
    <div className="bg-white px-5 py-4 sm:px-8">
      <p className="font-display text-2xl font-bold leading-none text-black">MoCoMo</p>
    </div>
  );
}

function SectionLabel({ index, title }: { index: string; title: string }) {
  return (
    <div className="flex items-baseline gap-3">
      <span className="font-display text-sm font-bold tabular-nums text-black/40 dark:text-white/40">{index}</span>
      <h2 className="text-base font-bold">{title}</h2>
    </div>
  );
}

function SummaryLine({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-sm text-black/60 dark:text-white/60">{label}</dt>
      <dd className={strong ? "text-right text-lg font-bold tabular-nums" : "text-right text-sm font-semibold tabular-nums"}>
        {value}
      </dd>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-3">
      <dt className="text-sm text-black/60 dark:text-white/60">{label}</dt>
      <dd className={strong ? "max-w-[60%] break-all text-right text-lg font-bold" : "max-w-[60%] break-all text-right text-sm font-semibold"}>
        {value}
      </dd>
    </div>
  );
}

function StatusLine({ label, value, done }: { label: string; value: string; done: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <p className="text-sm text-black/60 dark:text-white/60">{label}</p>
      <p className="max-w-[65%] text-right text-sm font-semibold">
        {done ? "✓ " : ""}
        {value}
      </p>
    </div>
  );
}

function Choice({
  label,
  hint,
  selected,
  onClick,
}: {
  label: string;
  hint?: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        selected
          ? "rounded-xl border border-black bg-black px-2 py-2 text-center text-sm font-bold text-white dark:border-white dark:bg-white dark:text-black"
          : "rounded-xl border border-black/20 bg-white px-2 py-2 text-center text-sm font-semibold text-black dark:border-white/25 dark:bg-black dark:text-white"
      }
    >
      <span className="block">{label}</span>
      {hint ? <span className="mt-0.5 block text-[11px] font-medium opacity-70">{hint}</span> : null}
    </button>
  );
}

function ActionButton({
  children,
  disabled,
  onClick,
}: {
  children: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="inline-flex h-11 w-full items-center justify-center rounded-full border border-black text-sm font-bold text-black disabled:opacity-40 dark:border-white dark:text-white"
    >
      {children}
    </button>
  );
}

function statusLabel(status: "PENDING" | "VERIFIED" | "REJECTED" | null | undefined) {
  if (status === "VERIFIED") return "Verified";
  if (status === "PENDING") return "Pending review";
  if (status === "REJECTED") return "Rejected";
  return "Not uploaded";
}
