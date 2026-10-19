"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { AdminStepUpDialog } from "@/components/admin/admin-step-up-dialog";

type RequestRow = {
  id: string;
  userId: string;
  username: string;
  mocoAmount: number;
  usdCents: number;
  amountMinor: number;
  currency: string;
  source: string;
  payoutMethodKind: string;
  payoutMethodHint: string;
  taxStatus: string | null;
  taxFormType: string | null;
  createdAt: string;
};

type TaxRow = {
  userId: string;
  username: string;
  taxFormType: string;
  createdAt: string;
};

function money(minor: number, currency: string) {
  const amount = minor / 100;
  try {
    return amount.toLocaleString("en-US", { style: "currency", currency: currency.toUpperCase() });
  } catch {
    return `${amount.toFixed(2)} ${currency.toUpperCase()}`;
  }
}

export function ManualPayoutQueue({
  requests,
  taxReviews,
}: {
  requests: RequestRow[];
  taxReviews: TaxRow[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [stepUp, setStepUp] = useState(false);
  const [pendingRetry, setPendingRetry] = useState<(() => void) | null>(null);
  const [revealed, setRevealed] = useState<Record<string, string>>({});
  const [refs, setRefs] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});

  function run(action: () => Promise<void>) {
    void action().catch(() => setError("Request failed."));
  }

  async function callJson(url: string, body: Record<string, unknown>) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string; destination?: unknown; notice?: string };
    if (data.error === "ADMIN_STEPUP_REQUIRED") {
      setPendingRetry(() => () => run(() => callJson(url, body).then(() => undefined)));
      setStepUp(true);
      return data;
    }
    if (!res.ok) {
      setError(data.error ?? "Request failed.");
      return data;
    }
    setError(null);
    router.refresh();
    return data;
  }

  return (
    <div className="space-y-8">
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <section className="space-y-3">
        <h2 className="text-lg font-bold">Tax forms waiting for review</h2>
        {taxReviews.length === 0 ? <p className="text-sm text-muted-foreground">None pending.</p> : null}
        {taxReviews.map((row) => (
          <div key={row.userId} className="rounded-2xl border border-border p-4 space-y-2">
            <p className="font-semibold">
              @{row.username} · {row.taxFormType}
            </p>
            <p className="text-xs text-muted-foreground">{new Date(row.createdAt).toLocaleString()}</p>
            <div className="flex flex-wrap gap-2">
              <a className="text-sm font-semibold underline" href={`/api/admin/creator-tax/${row.userId}`}>
                Download form
              </a>
              <Button type="button" size="sm" onClick={() => run(() => callJson(`/api/admin/creator-tax/${row.userId}`, { decision: "VERIFIED" }).then(() => undefined))}>
                Verify
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  const rejectionNote = window.prompt("Rejection reason") ?? "";
                  if (rejectionNote.trim().length < 3) return;
                  run(() => callJson(`/api/admin/creator-tax/${row.userId}`, { decision: "REJECTED", rejectionNote }).then(() => undefined));
                }}
              >
                Reject
              </Button>
            </div>
          </div>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold">Payouts waiting to be sent</h2>
        {requests.length === 0 ? <p className="text-sm text-muted-foreground">No pending payouts.</p> : null}
        {requests.map((row) => (
          <div key={row.id} className="rounded-2xl border border-border p-4 space-y-2">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-semibold">@{row.username}</p>
              <p className="text-sm tabular-nums">
                {row.mocoAmount.toLocaleString()} MOCO · USD {(row.usdCents / 100).toFixed(2)} · send {money(row.amountMinor, row.currency)}
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              {row.source} · {row.payoutMethodKind} · {row.payoutMethodHint} · tax {row.taxFormType ?? "none"} {row.taxStatus ?? ""}
            </p>
            {revealed[row.id] ? (
              <pre className="whitespace-pre-wrap rounded-xl bg-muted/50 p-3 text-xs">{revealed[row.id]}</pre>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  run(async () => {
                    const data = await callJson(`/api/admin/creator-payouts/${row.id}`, { action: "reveal" });
                    if (data.destination) setRevealed((prev) => ({ ...prev, [row.id]: JSON.stringify(data.destination, null, 2) }));
                  })
                }
              >
                Show destination
              </Button>
              <a className="text-sm font-semibold underline self-center" href={`/api/admin/creator-tax/${row.userId}`}>
                Tax file
              </a>
            </div>
            <input
              value={refs[row.id] ?? ""}
              onChange={(e) => setRefs((prev) => ({ ...prev, [row.id]: e.target.value }))}
              placeholder="Payoneer / Wise / bank transaction reference"
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
            />
            <input
              value={notes[row.id] ?? ""}
              onChange={(e) => setNotes((prev) => ({ ...prev, [row.id]: e.target.value }))}
              placeholder="Internal note (optional)"
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
            />
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                onClick={() =>
                  run(() =>
                    callJson(`/api/admin/creator-payouts/${row.id}`, {
                      action: "complete",
                      txReference: refs[row.id] ?? "",
                      adminNote: notes[row.id] ?? "",
                    }).then(() => undefined),
                  )
                }
              >
                Mark as completed
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  run(() =>
                    callJson(`/api/admin/creator-payouts/${row.id}`, {
                      action: "reject",
                      adminNote: notes[row.id] || "Rejected",
                    }).then(() => undefined),
                  )
                }
              >
                Reject
              </Button>
            </div>
          </div>
        ))}
      </section>

      <AdminStepUpDialog
        open={stepUp}
        onClose={() => setStepUp(false)}
        onVerified={() => {
          setStepUp(false);
          const retry = pendingRetry;
          setPendingRetry(null);
          retry?.();
        }}
      />
    </div>
  );
}
