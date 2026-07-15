"use client";

import { useState, useTransition } from "react";
import { reportMarketplaceListing } from "@/actions/marketplace-admin";
import { MARKETPLACE_REPORT_REASONS } from "@/lib/marketplace/protection-config";
import type { MarketplaceReportReason } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function MarketplaceReportButton({ listingId }: { listingId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<MarketplaceReportReason>("FRAUD");
  const [details, setDetails] = useState("");
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();

  if (!open) {
    return (
      <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(true)}>
        신고
      </Button>
    );
  }

  return (
    <div className="rounded-xl border border-border/60 p-3 space-y-2 text-sm">
      <p className="font-semibold">상품·판매자 신고</p>
      <select
        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
        value={reason}
        onChange={(e) => setReason(e.target.value as MarketplaceReportReason)}
      >
        {MARKETPLACE_REPORT_REASONS.map((r) => (
          <option key={r.id} value={r.id}>
            {r.label}
          </option>
        ))}
      </select>
      <Input
        value={details}
        onChange={(e) => setDetails(e.target.value)}
        placeholder="상세 (선택)"
      />
      {msg && <p className="text-xs text-muted-foreground">{msg}</p>}
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const res = await reportMarketplaceListing({ listingId, reason, details });
              setMsg(res.error ?? "신고가 접수되었습니다.");
              if (!res.error) setOpen(false);
            })
          }
        >
          제출
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
          닫기
        </Button>
      </div>
    </div>
  );
}
