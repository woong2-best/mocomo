"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { Loader2, ShieldCheck } from "lucide-react";
import { payGemTopupWithSavedCard } from "@/actions/gems";
import { confirmCheckoutPayment } from "@/actions/checkout-payment";
import {
  MOCO_PURCHASE_TERMS_COPY,
  MOCO_TOPUP_INPUT_MAX_DIGITS,
  parseMocoTopupCount,
  sanitizeMocoTopupInput,
} from "@/lib/gems/constants";
import { formatMocoDisplay } from "@/lib/gems/display";
import type { SavedPaymentMethod } from "@/lib/stripe-payment-methods";
import { stripePaymentIntentReturnUrlClient } from "@/lib/stripe-payment-return-url";
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
  paymentMethods: SavedPaymentMethod[];
  purchases: GemPurchaseRow[];
  lowBalanceNotice?: boolean;
};

function AtmNumKey({
  label,
  disabled,
  onPress,
  className,
}: {
  label: string;
  disabled?: boolean;
  onPress: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onPress}
      className={cn(
        "relative flex h-[3.25rem] items-center justify-center rounded-md border border-[#8a9199]",
        "bg-gradient-to-b from-[#f4f5f7] via-[#e3e6ea] to-[#caced4]",
        "text-2xl font-bold tabular-nums text-[#1a1f26]",
        "shadow-[0_4px_0_#9aa1a9,0_6px_12px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.85)]",
        "transition-transform active:translate-y-[2px] active:shadow-[0_1px_0_#9aa1a9,inset_0_2px_4px_rgba(0,0,0,0.15)]",
        "disabled:opacity-45 disabled:pointer-events-none",
        className,
      )}
    >
      {label}
    </button>
  );
}

function AtmActionKey({
  label,
  subLabel,
  tone,
  disabled,
  onPress,
  className,
}: {
  label: string;
  subLabel?: string;
  tone: "clear" | "confirm";
  disabled?: boolean;
  onPress: () => void;
  className?: string;
}) {
  const isConfirm = tone === "confirm";
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onPress}
      className={cn(
        "relative flex flex-col items-center justify-center rounded-md border font-black",
        isConfirm
          ? "border-[#1f6b3f] bg-gradient-to-b from-[#3ecf7a] via-[#2db868] to-[#1a9a52] text-[#0b2e18] shadow-[0_4px_0_#157a42,0_6px_12px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.35)]"
          : "border-[#9a7a12] bg-gradient-to-b from-[#ffe08a] via-[#f5c842] to-[#d9a820] text-[#5c3d00] shadow-[0_4px_0_#b8890f,0_6px_12px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.45)]",
        "transition-transform active:translate-y-[2px]",
        isConfirm
          ? "active:shadow-[0_1px_0_#157a42,inset_0_2px_4px_rgba(0,0,0,0.2)]"
          : "active:shadow-[0_1px_0_#b8890f,inset_0_2px_4px_rgba(0,0,0,0.15)]",
        "disabled:opacity-45 disabled:pointer-events-none",
        className,
      )}
    >
      <span className="text-base leading-none tracking-tight">{label}</span>
      {subLabel ? <span className="mt-1 text-[10px] font-bold opacity-70">{subLabel}</span> : null}
    </button>
  );
}

export function GemBalancePanel({
  balance,
  minTopupMoco,
  paymentMethods,
  purchases,
  lowBalanceNotice,
}: Props) {
  const router = useRouter();
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const [statusLine, setStatusLine] = useState("충전할 MOCO 수량을 입력해 주세요.");
  const [pending, startTransition] = useTransition();
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null);

  const defaultCard = useMemo(
    () => paymentMethods.find((m) => m.isDefault) ?? paymentMethods[0] ?? null,
    [paymentMethods],
  );

  useEffect(() => {
    const pk = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    if (pk) setStripePromise(loadStripe(pk));
  }, []);

  const parsedPreview = parseMocoTopupCount(amount);
  const displayAmount = amount ? Number(amount).toLocaleString() : "0";

  const handle3ds = useCallback(
    async (secret: string, orderId: string) => {
      if (!stripePromise) {
        setError("Stripe를 불러오지 못했습니다.");
        return;
      }
      const stripe = await stripePromise;
      if (!stripe) {
        setError("Stripe를 불러오지 못했습니다.");
        return;
      }
      const returnUrl = stripePaymentIntentReturnUrlClient(orderId, "/wallet");
      const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(secret, {
        return_url: returnUrl,
      });
      if (confirmError) {
        setError(confirmError.message ?? "카드 인증에 실패했습니다.");
        setStatusLine(confirmError.message ?? "카드 인증에 실패했습니다.");
        return;
      }
      if (paymentIntent?.status !== "succeeded") {
        setError("결제가 완료되지 않았습니다.");
        setStatusLine("결제가 완료되지 않았습니다.");
        return;
      }
      const done = await confirmCheckoutPayment(orderId);
      if ("error" in done && done.error) {
        setError(done.error);
        setStatusLine(done.error);
        return;
      }
      if ("success" in done && done.success) {
        setAmount("");
        setStatusLine("충전이 완료되었습니다.");
        router.refresh();
      }
    },
    [router, stripePromise],
  );

  function appendDigit(digit: string) {
    if (pending) return;
    const next = sanitizeMocoTopupInput(amount + digit);
    if (next.length > MOCO_TOPUP_INPUT_MAX_DIGITS) return;
    const normalized = next.replace(/^0+(?=\d)/, "");
    setAmount(normalized);
    if (error) setError("");
    setStatusLine("수량을 확인한 뒤 [확인]을 눌러 주세요.");
  }

  function backspace() {
    if (pending || !amount) return;
    setAmount(amount.slice(0, -1));
    if (error) setError("");
    setStatusLine("충전할 MOCO 수량을 입력해 주세요.");
  }

  function submitTopup() {
    if (!termsAccepted) {
      setError("충전 전 약관에 동의해 주세요.");
      setStatusLine("약관에 동의한 뒤 다시 시도해 주세요.");
      return;
    }
    const moco = parseMocoTopupCount(amount);
    if (moco == null || moco < minTopupMoco) {
      setError(`최소 ${minTopupMoco} MOCO부터 충전할 수 있습니다.`);
      setStatusLine("1 MOCO 이상 입력해 주세요.");
      return;
    }
    if (!defaultCard) {
      setError("등록된 카드가 없습니다. 아래에서 카드를 추가해 주세요.");
      setStatusLine("등록된 카드가 없습니다.");
      return;
    }
    setError("");
    setStatusLine("등록된 카드로 결제 중…");
    startTransition(async () => {
      const res = await payGemTopupWithSavedCard(moco, defaultCard.id, true);
      if ("error" in res && res.error) {
        setError(res.error);
        setStatusLine(res.error);
        return;
      }
      if ("requiresAction" in res && res.requiresAction && res.clientSecret && res.orderId) {
        await handle3ds(res.clientSecret, res.orderId);
        return;
      }
      if ("success" in res && res.success) {
        setAmount("");
        setStatusLine("충전이 완료되었습니다.");
        router.refresh();
        return;
      }
      setError("결제에 실패했습니다. 다시 시도해 주세요.");
      setStatusLine("결제에 실패했습니다.");
    });
  }

  return (
    <div className="overflow-hidden rounded-[1.35rem] border-2 border-[#6b7280] bg-gradient-to-b from-[#d1d5db] via-[#aeb4bd] to-[#8b939e] p-1.5 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.5)]">
      {/* ATM body */}
      <div className="overflow-hidden rounded-[1.1rem] border border-[#4b5563] bg-gradient-to-b from-[#111827] to-[#0b1018]">
        {/* Top fascia */}
        <div className="flex items-center justify-between border-b border-[#374151] bg-gradient-to-r from-[#1f2937] via-[#111827] to-[#1f2937] px-4 py-2">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/30" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
            </span>
            <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-400">MoCoMo ATM</span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-500">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
            SECURE
          </div>
        </div>

        {/* Screen bezel */}
        <div className="mx-4 mt-4 rounded-xl border-2 border-[#374151] bg-[#030712] p-1 shadow-[inset_0_2px_8px_rgba(0,0,0,0.8)]">
          <div className="rounded-lg border border-[#1f2937] bg-gradient-to-b from-[#0a1628] to-[#060d18] px-4 py-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-400/80">현재 잔액</p>
            <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-emerald-300 drop-shadow-[0_0_12px_rgba(110,231,183,0.35)]">
              {formatMocoDisplay(balance)}
            </p>

            <div className="my-3 h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent" />

            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-400/80">충전 수량</p>
            <div
              className={cn(
                "mt-1.5 flex items-baseline justify-between gap-3 rounded-md border bg-[#020617] px-3 py-2.5",
                error ? "border-red-500/50" : "border-slate-700",
              )}
            >
              <p
                id="moco-topup-amount"
                className="min-w-0 flex-1 truncate font-mono text-4xl font-bold tabular-nums tracking-tight text-white"
                aria-live="polite"
              >
                {displayAmount}
              </p>
              <span className="shrink-0 text-sm font-bold text-slate-400">MOCO</span>
            </div>
            <p className="mt-1.5 text-[11px] text-slate-500">1 단위 정수 · 최소 {minTopupMoco} MOCO</p>
            {defaultCard ? (
              <p className="mt-2 text-[11px] text-slate-400">
                결제 카드 · {defaultCard.brand.toUpperCase()} ···{defaultCard.last4}
                {defaultCard.isDefault ? " (기본)" : ""}
              </p>
            ) : (
              <p className="mt-2 text-[11px] text-amber-400/90">등록된 카드가 없습니다. 아래에서 카드를 추가해 주세요.</p>
            )}
          </div>
        </div>

        {/* Status ticker — ATM footer style */}
        <div className="mx-4 mt-3 rounded-md border border-amber-900/40 bg-[#1a1205] px-3 py-2">
          <p className="font-mono text-xs font-semibold text-amber-300" role="status">
            {pending ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                결제 화면으로 이동 중…
              </span>
            ) : (
              statusLine
            )}
          </p>
        </div>

        {lowBalanceNotice ? (
          <div className="mx-4 mt-3 rounded-md border border-amber-500/35 bg-amber-500/10 px-3 py-2">
            <p className="text-sm font-semibold text-amber-200">MOCO 잔액이 부족합니다</p>
            <p className="mt-0.5 text-xs text-amber-200/70">키패드로 충전 수량을 입력해 주세요.</p>
          </div>
        ) : null}

        {/* Keypad well */}
        <div className="mx-4 my-4 rounded-xl border border-[#6b7280] bg-gradient-to-b from-[#b8bcc4] to-[#9ca3af] p-3 shadow-[inset_0_3px_8px_rgba(0,0,0,0.25)]">
          <div className="grid grid-cols-4 grid-rows-4 gap-2">
            <AtmNumKey label="1" disabled={pending} onPress={() => appendDigit("1")} className="col-start-1 row-start-1" />
            <AtmNumKey label="2" disabled={pending} onPress={() => appendDigit("2")} className="col-start-2 row-start-1" />
            <AtmNumKey label="3" disabled={pending} onPress={() => appendDigit("3")} className="col-start-3 row-start-1" />
            <AtmActionKey
              label="지우기"
              subLabel="←"
              tone="clear"
              disabled={pending || !amount}
              onPress={backspace}
              className="col-start-4 row-start-1 row-span-2 h-full min-h-[6.9rem]"
            />

            <AtmNumKey label="4" disabled={pending} onPress={() => appendDigit("4")} className="col-start-1 row-start-2" />
            <AtmNumKey label="5" disabled={pending} onPress={() => appendDigit("5")} className="col-start-2 row-start-2" />
            <AtmNumKey label="6" disabled={pending} onPress={() => appendDigit("6")} className="col-start-3 row-start-2" />

            <AtmNumKey label="7" disabled={pending} onPress={() => appendDigit("7")} className="col-start-1 row-start-3" />
            <AtmNumKey label="8" disabled={pending} onPress={() => appendDigit("8")} className="col-start-2 row-start-3" />
            <AtmNumKey label="9" disabled={pending} onPress={() => appendDigit("9")} className="col-start-3 row-start-3" />
            <AtmActionKey
              label="확인"
              subLabel="OK"
              tone="confirm"
              disabled={
                pending ||
                !defaultCard ||
                !amount ||
                parsedPreview == null ||
                parsedPreview < minTopupMoco
              }
              onPress={submitTopup}
              className="col-start-4 row-start-3 row-span-2 h-full min-h-[6.9rem]"
            />

            <AtmNumKey
              label="0"
              disabled={pending}
              onPress={() => appendDigit("0")}
              className="col-span-3 col-start-1 row-start-4"
            />
          </div>
        </div>

        <div className="space-y-3 px-4 pb-4">
          <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-slate-700/60 bg-slate-900/50 px-3 py-2.5">
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={(e) => {
                setTermsAccepted(e.target.checked);
                if (e.target.checked && error === "충전 전 약관에 동의해 주세요.") {
                  setError("");
                  setStatusLine("수량을 확인한 뒤 [확인]을 눌러 주세요.");
                }
              }}
              className="mt-0.5 accent-emerald-500"
            />
            <span className="text-[11px] leading-relaxed text-slate-400">{MOCO_PURCHASE_TERMS_COPY}</span>
          </label>

          {purchases.length > 0 ? (
            <div className="space-y-2 border-t border-slate-700/50 pt-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">충전 내역</p>
              <ul className="max-h-36 space-y-1.5 overflow-y-auto">
                {purchases.map((p) => (
                  <li
                    key={p.id}
                    className="rounded-lg border border-slate-700/50 bg-slate-900/40 px-3 py-2 text-sm"
                  >
                    <p className="font-mono font-semibold tabular-nums text-slate-200">
                      {formatMocoDisplay(p.gems)}
                      {p.remainingGems < p.gems ? " · 일부 사용" : ""}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {new Date(p.createdAt).toLocaleDateString("ko-KR")} · 잔여{" "}
                      {formatMocoDisplay(p.remainingGems)}
                    </p>
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
    </div>
  );
}
