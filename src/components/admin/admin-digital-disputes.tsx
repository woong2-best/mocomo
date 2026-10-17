"use client";

import { useState } from "react";
import { forceApproveDigitalDelivery } from "@/actions/digital-delivery";
import { Button } from "@/components/ui/button";

type DisputeRow = {
  id: string;
  brief: string;
  disputeReason: string | null;
  listingId: string | null;
  buyer: { username: string };
  seller: { username: string };
};

export function AdminDigitalDisputes({ items }: { items: DisputeRow[] }) {
  const [rows, setRows] = useState(items);
  const [busy, setBusy] = useState<string | null>(null);

  if (rows.length === 0) return null;

  return (
    <section className="space-y-3 rounded-2xl border p-4">
      <h2 className="text-lg font-extrabold">Digital disputes</h2>
      {rows.map((item) => (
        <div key={item.id} className="space-y-2 rounded-xl border p-3">
          <p className="text-sm font-bold">
            {item.seller.username} → {item.buyer.username}
          </p>
          <p className="text-sm">{item.brief}</p>
          {item.disputeReason ? <p className="text-xs text-muted-foreground">{item.disputeReason}</p> : null}
          {item.listingId ? (
            <Button
              type="button"
              disabled={busy === item.id}
              onClick={() => {
                setBusy(item.id);
                void forceApproveDigitalDelivery(item.listingId!).then(() => {
                  setRows((prev) => prev.filter((row) => row.id !== item.id));
                  setBusy(null);
                });
              }}
            >
              Force approve
            </Button>
          ) : null}
        </div>
      ))}
    </section>
  );
}
