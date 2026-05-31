"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateUsedListingStatus } from "@/actions/used-market";
import { USED_STATUS_OPTIONS, usedStatusLabel } from "@/lib/used-market";
import type { UsedListingStatus } from "@prisma/client";
import { ChevronDown } from "lucide-react";

export function UsedStatusSheet({
  listingId,
  currentStatus,
}: {
  listingId: string;
  currentStatus: UsedListingStatus;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function pick(status: UsedListingStatus) {
    if (status === currentStatus) {
      setOpen(false);
      return;
    }
    setBusy(true);
    await updateUsedListingStatus(listingId, status);
    setBusy(false);
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        disabled={busy}
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border bg-muted/50 text-sm font-semibold"
      >
        {usedStatusLabel(currentStatus) || "판매중"}
        <ChevronDown className="h-4 w-4" />
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            aria-label="닫기"
            onClick={() => setOpen(false)}
          />
          <div className="relative bg-card rounded-t-2xl border-t border-border p-4 pb-8 space-y-1 animate-in slide-in-from-bottom">
            {USED_STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                disabled={busy}
                onClick={() => void pick(opt.value)}
                className={`w-full text-left py-3.5 px-2 text-base font-medium rounded-lg hover:bg-muted ${
                  currentStatus === opt.value ? "text-primary" : ""
                }`}
              >
                {opt.label}
              </button>
            ))}
            <button
              type="button"
              className="w-full py-3 mt-2 text-center text-muted-foreground font-medium"
              onClick={() => setOpen(false)}
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </>
  );
}
