"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type Readiness = {
  tax: { formType: "W9" | "W8BEN"; status: "PENDING" | "VERIFIED" | "REJECTED" } | null;
  method: { kind: string; hint: string } | null;
  canRequest: boolean;
};

export function ManualPayoutSetup() {
  const [readiness, setReadiness] = useState<Readiness | null>(null);
  const [formType, setFormType] = useState<"W9" | "W8BEN">("W9");
  const [file, setFile] = useState<File | null>(null);
  const [kind, setKind] = useState<"PAYONEER" | "WISE" | "BANK">("PAYONEER");
  const [email, setEmail] = useState("");
  const [accountHolder, setAccountHolder] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [countryCode, setCountryCode] = useState("US");
  const [routingNumber, setRoutingNumber] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function reload() {
    const res = await fetch("/api/settlements/payout-readiness", { cache: "no-store" });
    if (!res.ok) return;
    const data = (await res.json()) as Readiness;
    setReadiness(data);
    if (data.tax?.formType) setFormType(data.tax.formType);
  }

  useEffect(() => {
    void reload();
  }, []);

  async function uploadTax() {
    if (!file) {
      setError("Choose a W-9 or W-8BEN file.");
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
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
      setMessage("Tax form uploaded. It stays pending until MoCoMo verifies it.");
      await reload();
    } catch {
      setError("Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  async function saveMethod() {
    setBusy(true);
    setError(null);
    setMessage(null);
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
      setMessage("Payout destination saved.");
      await reload();
    } catch {
      setError("Could not save the payout destination.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section id="manual-payout-setup" className="rounded-2xl border border-border/60 bg-card p-4 space-y-4">
      <div>
        <p className="font-bold">Tax form and payout destination</p>
        <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
          To request a payout, upload a tax form (W-9 or W-8BEN) and register a payout email (Payoneer, Wise, or bank).
          MoCoMo pays creator rewards manually. The file is stored privately and is not public.
        </p>
      </div>

      <div className="text-xs text-muted-foreground">
        Tax form: {readiness?.tax ? `${readiness.tax.formType} · ${readiness.tax.status}` : "not uploaded"}
        {" · "}
        Destination: {readiness?.method ? readiness.method.hint : "not saved"}
      </div>

      <div className="space-y-2">
        <p className="text-sm font-semibold">1. Tax form</p>
        <div className="flex gap-3 text-sm">
          <label className="flex items-center gap-2">
            <input type="radio" checked={formType === "W9"} onChange={() => setFormType("W9")} />
            W-9 (US person)
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" checked={formType === "W8BEN"} onChange={() => setFormType("W8BEN")} />
            W-8BEN (non-US person)
          </label>
        </div>
        <input
          type="file"
          accept="application/pdf,image/jpeg,image/png"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="block w-full text-sm"
        />
        <Button type="button" variant="outline" disabled={busy} onClick={() => void uploadTax()}>
          Upload tax form
        </Button>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-semibold">2. Where to send the payout</p>
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value as "PAYONEER" | "WISE" | "BANK")}
          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
        >
          <option value="PAYONEER">Payoneer email</option>
          <option value="WISE">Wise email</option>
          <option value="BANK">Bank account</option>
        </select>
        {kind === "BANK" ? (
          <div className="grid gap-2">
            <input className="rounded-xl border border-border bg-background px-3 py-2 text-sm" placeholder="Account holder" value={accountHolder} onChange={(e) => setAccountHolder(e.target.value)} />
            <input className="rounded-xl border border-border bg-background px-3 py-2 text-sm" placeholder="Bank name" value={bankName} onChange={(e) => setBankName(e.target.value)} />
            <input className="rounded-xl border border-border bg-background px-3 py-2 text-sm" placeholder="Account number" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} autoComplete="off" />
            <input className="rounded-xl border border-border bg-background px-3 py-2 text-sm" placeholder="Country (US)" value={countryCode} onChange={(e) => setCountryCode(e.target.value)} maxLength={2} />
            <input className="rounded-xl border border-border bg-background px-3 py-2 text-sm" placeholder="Routing number (optional)" value={routingNumber} onChange={(e) => setRoutingNumber(e.target.value)} />
          </div>
        ) : (
          <input
            type="email"
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
            placeholder={kind === "PAYONEER" ? "Payoneer email" : "Wise email"}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="off"
          />
        )}
        <Button type="button" variant="outline" disabled={busy} onClick={() => void saveMethod()}>
          Save payout destination
        </Button>
      </div>

      {message ? <p className="text-sm text-emerald-700 dark:text-emerald-400">{message}</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </section>
  );
}
