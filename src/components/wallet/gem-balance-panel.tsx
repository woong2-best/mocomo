"use client";

import { useState, useTransition } from "react";
import { Gem, Loader2 } from "lucide-react";
import { createGemTopupCheckout } from "@/actions/gems";
import { MOCO_PURCHASE_TERMS_COPY } from "@/lib/gems/constants";
import { formatMocoDisplay, formatMocoUsdEquivalent } from "@/lib/gems/display";
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
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

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

  return (
    <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
      <div className="px-4 py-4 border-b border-border/40 bg-gradient-to-br from-primary/8 to-transparent">
        <div className="flex items-center gap-2">
          <Gem className="h-5 w-5 text-primary" />
          <p className="font-black text-lg">구매 MOCO</p>
        </div>
        <p className="text-3xl font-black mt-2 tabular-nums">{formatMocoDisplay(balance)}</p>
        <p className="text-xs text-muted-foreground mt-1">
          ≈ {formatMocoUsdEquivalent(balance)} · 후원·유료 미디어 · 환불·인출 불가
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
              <p className="font-bold text-sm">{formatMocoDisplay(pack.gems)}</p>
              <p className="text-xs text-muted-foreground">{formatMocoUsdEquivalent(pack.gems)}</p>
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
          <span className="text-[11px] text-muted-foreground leading-relaxed">{MOCO_PURCHASE_TERMS_COPY}</span>
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
                      {formatMocoDisplay(p.gems)}
                      {p.remainingGems < p.gems ? " · 일부 사용" : ""}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {new Date(p.createdAt).toLocaleDateString("ko-KR")} · 잔여{" "}
                      {formatMocoDisplay(p.remainingGems)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {pending ? (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            처리 중…
          </div>
        ) : null}
      </div>
    </div>
  );
}
