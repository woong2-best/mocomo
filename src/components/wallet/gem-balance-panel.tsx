"use client";

import { useState, useTransition } from "react";
import { Gem, Loader2 } from "lucide-react";
import { createGemTopupCheckout } from "@/actions/gems";
import { MOCO_PURCHASE_TERMS_COPY } from "@/lib/gems/constants";
import { formatMocoDisplay } from "@/lib/gems/display";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
  minTopupMoco: number;
  maxTopupMoco: number;
  purchases: GemPurchaseRow[];
  lowBalanceNotice?: boolean;
};

export function GemBalancePanel({
  balance,
  minTopupMoco,
  maxTopupMoco,
  purchases,
  lowBalanceNotice,
}: Props) {
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [amount, setAmount] = useState(String(minTopupMoco));
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function submitTopup() {
    if (!termsAccepted) {
      setError("충전 전 약관에 동의해 주세요.");
      return;
    }
    const moco = Number.parseInt(amount, 10);
    if (!Number.isFinite(moco)) {
      setError("충전할 MOCO 개수를 입력해 주세요.");
      return;
    }
    setError("");
    startTransition(async () => {
      const res = await createGemTopupCheckout(moco, true);
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
        <p className="text-xs text-muted-foreground mt-1">후원·유료 미디어 · 환불·인출 불가</p>
      </div>

      {lowBalanceNotice ? (
        <div className="mx-4 mt-4 rounded-xl border border-amber-500/35 bg-amber-500/10 px-3 py-2.5 text-sm">
          <p className="font-semibold text-foreground">MOCO 잔액이 부족합니다</p>
          <p className="text-muted-foreground text-xs mt-0.5 leading-relaxed">
            결제를 계속하려면 아래에서 충전해 주세요.
          </p>
        </div>
      ) : null}

      <div className="p-4 space-y-3">
        <div className="space-y-2">
          <label htmlFor="moco-topup-amount" className="text-sm font-bold">
            충전할 MOCO
          </label>
          <Input
            id="moco-topup-amount"
            type="number"
            min={minTopupMoco}
            max={maxTopupMoco}
            step={1}
            inputMode="numeric"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              if (error) setError("");
            }}
            disabled={pending}
            className="rounded-xl tabular-nums"
          />
          <p className="text-[11px] text-muted-foreground">
            {minTopupMoco.toLocaleString()}~{maxTopupMoco.toLocaleString()} MOCO
          </p>
        </div>

        <label className="flex items-start gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={termsAccepted}
            onChange={(e) => {
              setTermsAccepted(e.target.checked);
              if (e.target.checked && error === "충전 전 약관에 동의해 주세요.") {
                setError("");
              }
            }}
            className="mt-0.5"
          />
          <span className="text-[11px] text-muted-foreground leading-relaxed">{MOCO_PURCHASE_TERMS_COPY}</span>
        </label>

        <Button
          type="button"
          className="w-full rounded-xl"
          disabled={pending}
          onClick={submitTopup}
        >
          {pending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Stripe로 이동 중…
            </>
          ) : (
            "MOCO 충전"
          )}
        </Button>

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
      </div>
    </div>
  );
}
