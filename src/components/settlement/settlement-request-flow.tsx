"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { isTaxFormEnglishText, isValidForeignTin } from "@/lib/creator-payout/tax-form-input";
import { ALLOWED_COUNTRIES } from "@/lib/i18n/countries";
import { SignatureCanvas, type SignatureCanvasHandle } from "@/components/settlement/signature-canvas";

type Quote = {
  withdrawMoco: number;
  balanceBeforeMoco: number;
  balanceAfterMoco: number;
  payoutTier: string;
  netTransferCents: number;
  transfer: { netMinor: number; currency: string };
};

type TaxStatus = "PENDING" | "VERIFIED" | "REJECTED" | "EXPIRED";

type Readiness = {
  tax: {
    formType: "W9" | "W8BEN";
    status: TaxStatus;
    expiresAt: string | null;
    countryCode: string | null;
  } | null;
  method: { kind: string; hint: string; countryCode: string | null } | null;
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

const COUNTRY_OPTIONS = [...ALLOWED_COUNTRIES].sort((a, b) => a.nameEn.localeCompare(b.nameEn));
const W8BEN_COUNTRY_OPTIONS = COUNTRY_OPTIONS.filter((country) => country.code !== "US");

const FOREIGN_TIN_INFO =
  "Your home-country taxpayer ID is required for IRS withholding and treaty relief on U.S. payments.";

type ForeignTinKind = "INDIVIDUAL" | "BUSINESS";

function foreignTinCopy(kind: ForeignTinKind) {
  if (kind === "BUSINESS") {
    return {
      label: "Foreign TIN (business registration no.)",
      placeholder: "e.g. 000-00-00000",
      helper: "Enter your business or corporate registration number.",
    };
  }
  return {
    label: "Foreign TIN (national ID / resident ID)",
    placeholder: "National ID for non-U.S. residents",
    helper: "Enter your national ID or resident registration number from your country of residence.",
  };
}

function pickW8benCountry(code: string): string {
  return code === "US" ? "KR" : code;
}

function formatUsdFromCents(cents: number) {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function payoutLabel(quote: Quote) {
  const cents = quote.transfer.currency === "usd" ? quote.transfer.netMinor : quote.netTransferCents;
  return formatUsdFromCents(cents);
}

function statusLabel(status: TaxStatus | null | undefined) {
  if (status === "VERIFIED") return "Verified";
  if (status === "PENDING") return "Pending review";
  if (status === "REJECTED") return "Rejected";
  if (status === "EXPIRED") return "Expired";
  return "Not submitted";
}

const fieldClass =
  "w-full rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm text-black placeholder:text-neutral-400";

export function SettlementRequestFlow() {
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [readiness, setReadiness] = useState<Readiness | null>(null);
  const [loading, setLoading] = useState(true);
  const [formType, setFormType] = useState<"W9" | "W8BEN">("W9");
  const [fullName, setFullName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [tinKind, setTinKind] = useState<"SSN" | "EIN">("SSN");
  const [tin, setTin] = useState("");
  const [citizenshipCode, setCitizenshipCode] = useState("KR");
  const [residenceCountryCode, setResidenceCountryCode] = useState("KR");
  const [foreignTinKind, setForeignTinKind] = useState<ForeignTinKind>("INDIVIDUAL");
  const [foreignTin, setForeignTin] = useState("");
  const [signaturePng, setSignaturePng] = useState<string | null>(null);
  const [signatureKey, setSignatureKey] = useState(0);
  const signatureRef = useRef<SignatureCanvasHandle>(null);
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
  const [renewalNotice, setRenewalNotice] = useState(false);
  const [editingTax, setEditingTax] = useState(false);
  const [receipt, setReceipt] = useState<Receipt | null>(null);

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
        if (ready.method?.countryCode) setCountryCode(ready.method.countryCode);
        setRenewalNotice(ready.code === "TAX_FORM_EXPIRED");
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

  useEffect(() => {
    if (formType !== "W8BEN") return;
    if (citizenshipCode === "US") setCitizenshipCode("KR");
    if (residenceCountryCode === "US") setResidenceCountryCode("KR");
  }, [formType, citizenshipCode, residenceCountryCode]);

  const taxReady = readiness?.tax?.status === "VERIFIED" && !editingTax;
  const taxLatinFieldsValid = useMemo(() => {
    const required = [fullName, street, city, state, postalCode];
    const optional = formType === "W9" ? [businessName] : [];
    return [...required, ...optional].every((value) => isTaxFormEnglishText(value));
  }, [businessName, city, formType, fullName, postalCode, state, street]);
  const canSubmitTax = useMemo(() => {
    const base =
      taxLatinFieldsValid &&
      fullName.trim().length >= 2 &&
      street.trim().length >= 3 &&
      city.trim().length >= 2 &&
      state.trim().length >= 1 &&
      postalCode.trim().length >= 3 &&
      Boolean(signaturePng);
    if (!base) return false;
    if (formType === "W9") return tin.replace(/\D/g, "").length === 9;
    return (
      citizenshipCode !== "US" &&
      residenceCountryCode !== "US" &&
      citizenshipCode.length === 2 &&
      residenceCountryCode.length === 2 &&
      isValidForeignTin(foreignTin)
    );
  }, [
    citizenshipCode,
    city,
    foreignTin,
    formType,
    fullName,
    postalCode,
    residenceCountryCode,
    signaturePng,
    state,
    street,
    taxLatinFieldsValid,
    tin,
  ]);

  const signatureDate = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date());

  async function submitTax() {
    if (!canSubmitTax || !signaturePng) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    const payload =
      formType === "W9"
        ? { formType, fullName, businessName, street, city, state, postalCode, tinKind, tin, signaturePng }
        : {
            formType,
            fullName,
            street,
            city,
            state,
            postalCode,
            citizenshipCode,
            residenceCountryCode,
            foreignTin,
            signaturePng,
          };
    try {
      const res = await fetch("/api/settlements/tax-form", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { error?: string };
      setTin("");
      setForeignTin("");
      setSignaturePng(null);
      setSignatureKey((key) => key + 1);
      if (!res.ok) {
        setError(data.error ?? "Could not save the tax form.");
        return;
      }
      setEditingTax(false);
      setRenewalNotice(false);
      setNotice("Tax form saved and verified.");
      await load();
    } catch {
      setError("Could not save the tax form.");
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
        : { kind, email, countryCode };
    try {
      const res = await fetch("/api/settlements/payout-method", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(destination),
      });
      const data = (await res.json()) as { error?: string; taxExpired?: boolean };
      if (!res.ok) {
        setError(data.error ?? "Could not save the payout destination.");
        return;
      }
      setAccountNumber("");
      setRenewalNotice(Boolean(data.taxExpired));
      setNotice(data.taxExpired ? "Payout country changed. Submit a new tax form." : "Payout destination saved.");
      if (data.taxExpired) setEditingTax(true);
      await load();
    } catch {
      setError("Could not save the payout destination.");
    } finally {
      setBusy(false);
    }
  }

  async function submitRequest() {
    if (!quote || !readiness?.canRequest) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/settlement/request", {
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
      <PageFrame>
        <h1 className="mt-6 font-display text-4xl font-bold">Payout requested</h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-neutral-600">
          MoCoMo will send this manually. The amount has been moved out of your earned balance.
        </p>
        <dl className="mt-8 max-w-xl divide-y divide-neutral-200 border border-neutral-300">
          <Line label="Tier" value={receipt.tier} />
          <Line label="MOCO paid out" value={`${receipt.withdrawMoco.toLocaleString()} MOCO`} />
          <Line label="Amount" value={receipt.usd} strong />
          <Line label="Stays in balance" value={`${receipt.balanceAfterMoco.toLocaleString()} MOCO`} />
          <Line label="Reference" value={receipt.payoutRequestId} />
        </dl>
      </PageFrame>
    );
  }

  const taxStatus = readiness?.tax?.status;

  return (
    <PageFrame>
      <div className="mt-6">
        <h1 className="font-display text-4xl font-bold tracking-tight">Reward payout</h1>
        <p className="mt-2 text-sm text-neutral-600">
          Your current tier sets the amount. Nothing is typed in by hand.
        </p>
      </div>

      {renewalNotice ? (
        <p className="mt-6 rounded-lg border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm leading-relaxed">
          Your tax form no longer matches this payout, or its term has ended. Submit a new form before requesting a payout.
        </p>
      ) : null}
      {notice ? <p className="mt-4 text-sm">{notice}</p> : null}
      {error ? <p className="mt-4 text-sm">{error}</p> : null}

      <div className="mt-8 grid grid-cols-1 items-start gap-6 xl:grid-cols-3">
        <div className="min-w-0 space-y-6">
          <Panel title="1 Payout summary">
            <div className="divide-y divide-neutral-200">
              {loading ? <p className="px-4 py-3 text-sm text-neutral-500">Calculating…</p> : null}
              {quoteError ? <p className="px-4 py-3 text-sm">{quoteError}</p> : null}
              {quote ? (
                <>
                  <Line label="Tier" value={quote.payoutTier} />
                  <Line label="MOCO paid out" value={`${quote.withdrawMoco.toLocaleString()} MOCO`} />
                  <Line label="Amount" value={payoutLabel(quote)} strong />
                  <Line label="Stays in balance" value={`${quote.balanceAfterMoco.toLocaleString()} MOCO`} />
                </>
              ) : null}
            </div>
          </Panel>

          <Panel title="Section status">
            <div className="divide-y divide-neutral-200">
              <Line
                label="Tax form"
                value={
                  loading
                    ? "…"
                    : readiness?.tax
                      ? `${readiness.tax.formType === "W9" ? "W-9" : "W-8BEN"} · ${statusLabel(taxStatus)}`
                      : "Not submitted"
                }
              />
              <Line label="Destination" value={loading ? "…" : (readiness?.method?.hint ?? "Not saved")} />
            </div>
          </Panel>

          <Panel title="3 Submit request">
            <div className="p-4">
              <button
                type="button"
                disabled={!quote || !readiness?.canRequest || busy}
                onClick={() => void submitRequest()}
                className={`inline-flex h-12 w-full items-center justify-center rounded-lg text-sm font-bold disabled:cursor-not-allowed ${
                  quote && readiness?.canRequest ? "bg-black text-white" : "bg-neutral-200 text-neutral-500"
                }`}
              >
                {busy ? "Working…" : "Submit request"}
              </button>
              <p className="mt-3 text-center text-xs leading-relaxed text-neutral-500">
                Pulse (10 MOCO, $47.25) is the minimum. The button stays off until the tax form is verified and a destination is saved.
              </p>
            </div>
          </Panel>
        </div>

        <div className="min-w-0">
          <Panel title="2 Tax form">
            <div className="space-y-3 p-4">
              {taxReady ? (
                <>
                  <p className="text-sm font-semibold">Verified tax form on file.</p>
                  <p className="text-sm text-neutral-600">
                    {readiness?.tax?.formType === "W8BEN" ? "W-8BEN" : "W-9"}
                    {readiness?.tax?.expiresAt
                      ? ` · valid through ${readiness.tax.expiresAt.slice(0, 10)}`
                      : " · no expiry"}
                  </p>
                  <button
                    type="button"
                    className="inline-flex h-11 w-full items-center justify-center rounded-lg border border-black px-4 text-sm font-bold"
                    onClick={() => setEditingTax(true)}
                  >
                    Update tax form
                  </button>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <Choice label="W-9 (US person)" selected={formType === "W9"} onClick={() => setFormType("W9")} />
                    <Choice
                      label="W-8BEN (Non-US person)"
                      selected={formType === "W8BEN"}
                      onClick={() => {
                        setFormType("W8BEN");
                        setCitizenshipCode((code) => pickW8benCountry(code));
                        setResidenceCountryCode((code) => pickW8benCountry(code));
                      }}
                    />
                  </div>
                  <LatinField
                    label={formType === "W9" ? "Full name" : "Full legal name"}
                    value={fullName}
                    onChange={setFullName}
                    autoComplete="name"
                  />
                  {formType === "W9" ? (
                    <LatinField
                      label="Business name (optional)"
                      value={businessName}
                      onChange={setBusinessName}
                    />
                  ) : (
                    <label className="block space-y-1 text-sm">
                      <span className="font-semibold">Country of citizenship</span>
                      <CountrySelect value={citizenshipCode} onChange={setCitizenshipCode} w8benOnly />
                    </label>
                  )}
                  <LatinField
                    label={formType === "W9" ? "Address" : "Permanent residence address"}
                    value={street}
                    onChange={setStreet}
                    autoComplete="address-line1"
                  />
                  <LatinField
                    label="City"
                    value={city}
                    onChange={setCity}
                    autoComplete="address-level2"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <LatinField
                      label={formType === "W9" ? "State" : "State / province"}
                      value={state}
                      onChange={setState}
                      autoComplete="address-level1"
                    />
                    <LatinField
                      label={formType === "W9" ? "ZIP" : "Postal"}
                      value={postalCode}
                      onChange={setPostalCode}
                      autoComplete="postal-code"
                    />
                  </div>
                  {formType === "W8BEN" ? (
                    <label className="block space-y-1 text-sm">
                      <span className="font-semibold">Country of residence</span>
                      <CountrySelect value={residenceCountryCode} onChange={setResidenceCountryCode} w8benOnly />
                    </label>
                  ) : null}
                  {formType === "W9" ? (
                    <>
                      <div className="grid grid-cols-2 gap-2">
                        <Choice label="SSN" selected={tinKind === "SSN"} onClick={() => setTinKind("SSN")} />
                        <Choice label="EIN" selected={tinKind === "EIN"} onClick={() => setTinKind("EIN")} />
                      </div>
                      <label className="block space-y-1 text-sm">
                        <span className="font-semibold">SSN or EIN</span>
                        <input
                          className={fieldClass}
                          inputMode="numeric"
                          autoComplete="off"
                          value={tin}
                          onChange={(e) => setTin(e.target.value)}
                          placeholder="9 digits"
                        />
                      </label>
                    </>
                  ) : (
                    <ForeignTinFields
                      kind={foreignTinKind}
                      value={foreignTin}
                      onKindChange={setForeignTinKind}
                      onChange={setForeignTin}
                    />
                  )}
                </>
              )}
            </div>
          </Panel>
        </div>

        <div className="min-w-0 space-y-6">
          {!taxReady ? (
            <Panel
              title="Signature"
              action={
                <button
                  type="button"
                  className="text-sm font-semibold underline underline-offset-4"
                  onClick={() => signatureRef.current?.clear()}
                >
                  Clear
                </button>
              }
            >
              <div className="space-y-3 p-4">
                <SignatureCanvas key={signatureKey} ref={signatureRef} onChange={setSignaturePng} />
                <label className="block space-y-1 text-sm">
                  <span className="font-semibold">Signature date</span>
                  <input className={fieldClass} value={signatureDate} readOnly />
                </label>
                <button
                  type="button"
                  disabled={!canSubmitTax || busy}
                  onClick={() => void submitTax()}
                  className="inline-flex h-11 w-full items-center justify-center rounded-lg border border-black text-sm font-bold disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Save tax form
                </button>
                <p className="text-xs leading-relaxed text-neutral-500">
                  Draw a signature to turn the save button on.
                </p>
              </div>
            </Panel>
          ) : null}

          <Panel title="Where to send it">
            <div className="space-y-3 p-4">
              <div className="grid grid-cols-3 gap-2">
                <Choice label="Payoneer" selected={kind === "PAYONEER"} onClick={() => setKind("PAYONEER")} />
                <Choice label="Wise" selected={kind === "WISE"} onClick={() => setKind("WISE")} />
                <Choice label="Bank" selected={kind === "BANK"} onClick={() => setKind("BANK")} />
              </div>
              <label className="block space-y-1 text-sm">
                <span className="font-semibold">Payout country</span>
                <CountrySelect value={countryCode} onChange={setCountryCode} />
              </label>
              {kind === "BANK" ? (
                <div className="grid gap-2">
                  <input className={fieldClass} placeholder="Account holder" value={accountHolder} onChange={(e) => setAccountHolder(e.target.value)} />
                  <input className={fieldClass} placeholder="Bank name" value={bankName} onChange={(e) => setBankName(e.target.value)} />
                  <input className={fieldClass} placeholder="Account number" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} autoComplete="off" />
                  <input className={fieldClass} placeholder="Routing or SWIFT (optional)" value={routingNumber} onChange={(e) => setRoutingNumber(e.target.value)} />
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
              <button
                type="button"
                disabled={busy}
                onClick={() => void saveMethod()}
                className="inline-flex h-11 w-full items-center justify-center rounded-lg border border-black text-sm font-bold disabled:opacity-40"
              >
                Save destination
              </button>
            </div>
          </Panel>
        </div>
      </div>
    </PageFrame>
  );
}

function PageFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-white text-black" style={{ colorScheme: "light" }}>
      <div className="mx-auto max-w-7xl px-5 py-6 sm:px-8 sm:py-8">
        <header className="flex items-center justify-between">
          <Link href="/wallet?tab=earnings" className="text-sm font-semibold text-black">
            Back
          </Link>
          <Link href="/wallet?tab=earnings" className="border-b-2 border-black pb-0.5 text-sm font-semibold">
            Earnings
          </Link>
        </header>
        <p className="mt-5 font-display text-2xl font-bold leading-none text-black">MoCoMo</p>
        {children}
      </div>
    </div>
  );
}

function Panel({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-none border border-neutral-300">
      <div className="flex items-center justify-between gap-3 border-b border-neutral-300 px-4 py-3">
        <h2 className="text-base font-bold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function Line({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 px-4 py-3">
      <dt className="text-sm text-neutral-700">{label}</dt>
      <dd className={strong ? "max-w-[60%] break-all text-right text-base font-bold" : "max-w-[60%] break-all text-right text-sm font-semibold"}>
        {value}
      </dd>
    </div>
  );
}

function Choice({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        selected
          ? "rounded-lg border border-black bg-white px-2 py-2 text-center text-sm font-bold text-black shadow-[inset_0_0_0_1px_#000]"
          : "rounded-lg border border-neutral-300 bg-neutral-100 px-2 py-2 text-center text-sm font-semibold text-neutral-700"
      }
    >
      {label}
    </button>
  );
}

function LatinField({
  label,
  value,
  onChange,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
}) {
  return (
    <label className="block space-y-1 text-sm">
      <span className="font-semibold">{label}</span>
      <input
        className={fieldClass}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        spellCheck={false}
      />
    </label>
  );
}

function CountrySelect({
  value,
  onChange,
  w8benOnly = false,
}: {
  value: string;
  onChange: (code: string) => void;
  w8benOnly?: boolean;
}) {
  const options = w8benOnly ? W8BEN_COUNTRY_OPTIONS : COUNTRY_OPTIONS;
  const safeValue = w8benOnly && value === "US" ? "KR" : value;
  return (
    <select className={fieldClass} value={safeValue} onChange={(e) => onChange(e.target.value)}>
      {options.map((country) => (
        <option key={country.code} value={country.code}>
          {country.nameEn}
        </option>
      ))}
    </select>
  );
}

function ForeignTinFields({
  kind,
  value,
  onKindChange,
  onChange,
}: {
  kind: ForeignTinKind;
  value: string;
  onKindChange: (kind: ForeignTinKind) => void;
  onChange: (value: string) => void;
}) {
  const copy = foreignTinCopy(kind);
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <Choice label="Individual" selected={kind === "INDIVIDUAL"} onClick={() => onKindChange("INDIVIDUAL")} />
        <Choice label="Business / entity" selected={kind === "BUSINESS"} onClick={() => onKindChange("BUSINESS")} />
      </div>
      <label className="block space-y-1 text-sm">
        <span className="inline-flex items-center gap-2 font-semibold">
          {copy.label}
          <button
            type="button"
            className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-neutral-400 text-[11px] font-bold leading-none text-neutral-600"
            title={FOREIGN_TIN_INFO}
            aria-label={FOREIGN_TIN_INFO}
          >
            i
          </button>
        </span>
        <input
          className={fieldClass}
          autoComplete="off"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={copy.placeholder}
        />
        <p className="text-xs leading-relaxed text-neutral-500">{copy.helper}</p>
      </label>
    </div>
  );
}
