"use client";

import { useState, useTransition } from "react";
import { Gem, Loader2, ShieldCheck } from "lucide-react";
import { createGemTopupCheckout } from "@/actions/gems";
import {
  MOCO_PURCHASE_TERMS_COPY,
  parseMocoTopupCount,
  sanitizeMocoTopupInput,
} from "@/lib/gems/constants";
import { formatMocoDisplay } from "@/lib/gems/display";
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
  minTopupMoco: number;
  maxTopupMoco: number;
  purchases: GemPurchaseRow[];
  lowBalanceNotice?: boolean;
};

const QUICK_AMOUNTS = [1, 5, 10, 25, 50, 100] as const;

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

  const displayAmount = amount || "0";
  const parsedPreview = parseMocoTopupCount(amount);

  function setQuickAmount(n: number) {
    setAmount(String(Math.min(maxTopupMoco, Math.max(minTopupMoco, n))));
    if (error) setError("");
  }

  function submitTopup() {
    if (!termsAccepted) {
      setError("충전 전 약관에 동의해 주세요.");
      return;
    }
    const moco = parseMocoTopupCount(amount);
    if (moco == null) {
      setError("MOCO는 1 단위 정수로만 입력할 수 있습니다.");
      return;
    }
    if (moco < minTopupMoco) {
      setError(`최소 ${minTopupMoco} MOCO부터 충전할 수 있습니다.`);
      return;
    }
    if (moco > maxTopupMoco) {
      setError(`1회 충전은 최대 ${maxTopupMoco.toLocaleString()} MOCO까지 가능합니다.`);
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
    <div className="overflow-hidden rounded-2xl border border-slate-700/80 bg-gradient-to-b from-[#0c1220] to-[#111827] shadow-[0_24px_48px_-12px_rgba(0,0,0,0.45)]">
      {/* ATM header strip */}
      <div className="flex items-center justify-between border-b border-slate-700/60 bg-[#0a0f18] px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/40" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
          </span>
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
            MOCO 충전 터미널
          </span>
        </div>
        <ShieldCheck className="h-4 w-4 text-slate-500" aria-hidden />
      </div>

      {/* Balance display — LED-style */}
      <div className="border-b border-slate-700/50 px-4 py-5">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">현재 잔액</p>
        <div className="mt-2 rounded-xl border border-slate-700/70 bg-[#060a12] px-4 py-3 shadow-inner">
          <p className="font-mono text-3xl font-bold tabular-nums tracking-tight text-emerald-300">
            {formatMocoDisplay(balance)}
          </p>
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
          후원·유료 미디어 전용 · 환불·인출 불가
        </p>
      </div>

      {lowBalanceNotice ? (
        <div className="mx-4 mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2.5">
          <p className="text-sm font-semibold text-amber-200">MOCO 잔액이 부족합니다</p>
          <p className="mt-0.5 text-xs leading-relaxed text-amber-200/70">
            결제를 계속하려면 아래에서 충전해 주세요.
          </p>
        </div>
      ) : null}

      <div className="space-y-4 p-4">
        {/* Amount entry screen */}
        <div>
          <label htmlFor="moco-topup-amount" className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            충전 수량 (정수 단위)
          </label>
          <div
            className={cn(
              "mt-2 rounded-xl border bg-[#060a12] px-4 py-3 shadow-inner transition-colors",
              error && parsedPreview == null
                ? "border-red-500/50"
                : "border-slate-600/80 focus-within:border-emerald-500/50",
            )}
          >
            <div className="flex items-baseline justify-between gap-3">
              <input
                id="moco-topup-amount"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="off"
                spellCheck={false}
                value={displayAmount}
                onChange={(e) => {
                  setAmount(sanitizeMocoTopupInput(e.target.value));
                  if (error) setError("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "." || e.key === "," || e.key === "e" || e.key === "E" || e.key === "-") {
                    e.preventDefault();
                  }
                }}
                disabled={pending}
                className="min-w-0 flex-1 bg-transparent font-mono text-4xl font-bold tabular-nums tracking-tight text-white outline-none placeholder:text-slate-600"
                placeholder="1"
                aria-describedby="moco-topup-hint"
              />
              <span className="shrink-0 text-sm font-bold text-slate-400">MOCO</span>
            </div>
          </div>
          <p id="moco-topup-hint" className="mt-1.5 text-[11px] text-slate-500">
            {minTopupMoco.toLocaleString()}~{maxTopupMoco.toLocaleString()} MOCO · 1 단위 정수만 가능
          </p>
        </div>

        {/* Quick amount keypad */}
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">빠른 선택</p>
          <div className="grid grid-cols-3 gap-2">
            {QUICK_AMOUNTS.filter((n) => n <= maxTopupMoco).map((n) => (
              <button
                key={n}
                type="button"
                disabled={pending}
                onClick={() => setQuickAmount(n)}
                className={cn(
                  "rounded-lg border py-2.5 font-mono text-sm font-bold tabular-nums transition-colors",
                  parsedPreview === n
                    ? "border-emerald-500/60 bg-emerald-500/15 text-emerald-300"
                    : "border-slate-700 bg-slate-800/60 text-slate-200 hover:border-slate-500 hover:bg-slate-800",
                )}
              >
                {n}
              </button>
            ))}
            <button
              type="button"
              disabled={pending}
              onClick={() => setQuickAmount(maxTopupMoco)}
              className="rounded-lg border border-slate-700 bg-slate-800/60 py-2.5 font-mono text-sm font-bold text-slate-200 transition-colors hover:border-slate-500 hover:bg-slate-800"
            >
              MAX
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                setAmount("");
                if (error) setError("");
              }}
              className="rounded-lg border border-slate-700 bg-slate-800/40 py-2.5 text-sm font-bold text-slate-400 transition-colors hover:border-slate-500 hover:text-slate-200"
            >
              CLEAR
            </button>
          </div>
        </div>

        <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-slate-700/50 bg-slate-900/40 px-3 py-2.5">
          <input
            type="checkbox"
            checked={termsAccepted}
            onChange={(e) => {
              setTermsAccepted(e.target.checked);
              if (e.target.checked && error === "충전 전 약관에 동의해 주세요.") {
                setError("");
              }
            }}
            className="mt-0.5 accent-emerald-500"
          />
          <span className="text-[11px] leading-relaxed text-slate-400">{MOCO_PURCHASE_TERMS_COPY}</span>
        </label>

        <Button
          type="button"
          className="h-12 w-full rounded-xl bg-emerald-600 text-base font-bold text-white shadow-lg shadow-emerald-900/30 hover:bg-emerald-500 disabled:opacity-50"
          disabled={pending || !amount || parsedPreview == null || parsedPreview < minTopupMoco}
          onClick={submitTopup}
        >
          {pending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              결제 화면으로 이동 중…
            </>
          ) : (
            <>
              <Gem className="mr-2 h-4 w-4" />
              MOCO 충전 확인
            </>
          )}
        </Button>

        {purchases.length > 0 ? (
          <div className="space-y-2 border-t border-slate-700/50 pt-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">충전 내역</p>
            <ul className="max-h-40 space-y-1.5 overflow-y-auto">
              {purchases.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-slate-700/50 bg-slate-900/30 px-3 py-2 text-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate font-mono font-semibold tabular-nums text-slate-200">
                      {formatMocoDisplay(p.gems)}
                      {p.remainingGems < p.gems ? " · 일부 사용" : ""}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {new Date(p.createdAt).toLocaleDateString("ko-KR")} · 잔여{" "}
                      {formatMocoDisplay(p.remainingGems)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {error ? (
          <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
