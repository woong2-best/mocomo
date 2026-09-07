"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Gem, Loader2 } from "lucide-react";
import {
  createGemTopupCheckout,
  requestGemRefund,
} from "@/actions/gems";
import { GEM_PURCHASE_TERMS_COPY } from "@/lib/gems/constants";
import { formatGemDisplay, formatGemUsdEquivalent } from "@/lib/gems/display";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
  packages: readonly { gems: number; usdCents: number; label: string }[];
  purchases: GemPurchaseRow[];
};

export function GemBalancePanel({ balance, packages, purchases }: Props) {
  const router = useRouter();
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const [refundingId, setRefundingId] = useState<string | null>(null);

  function topUp(gems: number) {
    if (!termsAccepted) {
      setError("충전 전 약관에 동의해 주세요.");
      return;
    }
    setError("");
    startTransition(async () => {
      const res = await createGemTopupCheckout(gems, true);
      if ("error" in res && res.error) {
        setError(res.error);
        return;
      }
      if ("checkoutUrl" in res && res.checkoutUrl) {
        window.location.href = res.checkoutUrl;
      }
    });
  }

  function refund(purchaseId: string) {
    setRefundingId(purchaseId);
    setError("");
    startTransition(async () => {
      const res = await requestGemRefund(purchaseId);
      setRefundingId(null);
      if ("error" in res && res.error) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
      <div className="px-4 py-4 border-b border-border/40 bg-gradient-to-br from-primary/8 to-transparent">
        <div className="flex items-center gap-2">
          <Gem className="h-5 w-5 text-primary" />
          <p className="font-black text-lg">젬 (Gems)</p>
        </div>
        <p className="text-3xl font-black mt-2 tabular-nums">{formatGemDisplay(balance)}</p>
        <p className="text-xs text-muted-foreground mt-1">
          ≈ {formatGemUsdEquivalent(balance)} · 후원·유료 미디어에 사용
        </p>
      </div>

      <div className="p-4 space-y-3">
        <p className="text-sm font-bold">충전 패키지</p>
        <div className="grid grid-cols-2 gap-2">
          {packages.map((pack) => (
            <button
              key={pack.gems}
              type="button"
              disabled={pending}
              onClick={() => topUp(pack.gems)}
              className={cn(
                "rounded-xl border border-border/60 px-3 py-3 text-left hover:bg-muted/40 transition-colors",
                pending && "opacity-60"
              )}
            >
              <p className="font-bold text-sm">{formatGemDisplay(pack.gems)}</p>
              <p className="text-xs text-muted-foreground">{formatGemUsdEquivalent(pack.gems)}</p>
            </button>
          ))}
        </div>

        <label className="flex items-start gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={termsAccepted}
            onChange={(e) => setTermsAccepted(e.target.checked)}
            className="mt-0.5"
          />
          <span className="text-[11px] text-muted-foreground leading-relaxed">{GEM_PURCHASE_TERMS_COPY}</span>
        </label>

        {purchases.length > 0 ? (
          <div className="space-y-2 pt-2">
            <p className="text-sm font-bold">충전 내역</p>
            <ul className="space-y-2 max-h-48 overflow-y-auto">
              {purchases.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between gap-2 rounded-xl border border-border/50 px-3 py-2 text-sm"
                >
                  <div className="min-w-0">
                    <p className="font-semibold truncate">
                      {formatGemDisplay(p.gems)}
                      {p.refunded ? " · 환불됨" : p.remainingGems < p.gems ? " · 일부 사용" : ""}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {new Date(p.createdAt).toLocaleDateString("ko-KR")} · 잔여{" "}
                      {formatGemDisplay(p.remainingGems)}
                    </p>
                  </div>
                  {!p.refunded && p.remainingGems > 0 ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="shrink-0 text-xs h-8"
                      disabled={pending && refundingId === p.id}
                      onClick={() => refund(p.id)}
                    >
                      {refundingId === p.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "환불"}
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {pending && !refundingId ? (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            처리 중…
          </div>
        ) : null}
      </div>
    </div>
  );
}
