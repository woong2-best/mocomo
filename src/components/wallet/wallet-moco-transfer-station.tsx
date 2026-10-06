"use client";


import { errorText } from "@/lib/i18n/error-text";
import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Loader2, ShieldCheck, X } from "lucide-react";
import { lookupMocoRecipient, transferMocoToUser } from "@/actions/moco-transfer";
import {
  CREATOR_PAYOUT_BLOCKED_KO,
  CREATOR_PAYOUT_BLOCKED_TOAST_KO,
  STRIPE_ACCOUNT_NOT_READY,
} from "@/lib/creator-payout-ready";
import { pushErrorToast } from "@/lib/published-toast-store";
import { ATM_LETTER_MESSAGE_MAX } from "@/lib/chat-atm-letter";
import { formatMocoDisplay } from "@/lib/gems/display";
import {
  appendMocoDecimalChar,
  mocoCovers,
  parseSpendableMoco,
} from "@/lib/moco/decimal-amount";
import { MocoEarthTransferHero } from "@/components/moco/moco-earth-transfer-hero";
import { cn } from "@/lib/utils";

type Props = {
  purchasedMoco: number;
  userImageUrl?: string | null;
};

type AtmOverlay = "success" | "failure" | null;

function formatTypingMoco(raw: string): string {
  if (!raw) return "0";
  if (raw.endsWith(".")) {
    const head = Number(raw.slice(0, -1) || "0");
    return `${Number.isFinite(head) ? head.toLocaleString() : "0"}.`;
  }
  const n = Number(raw);
  if (!Number.isFinite(n)) return raw;
  return n.toLocaleString(undefined, { maximumFractionDigits: 1 });
}

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
        "disabled:pointer-events-none disabled:opacity-45",
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
        "disabled:pointer-events-none disabled:opacity-45",
        className,
      )}
    >
      <span className="text-base leading-none tracking-tight">{label}</span>
      {subLabel ? <span className="mt-1 text-[10px] font-bold opacity-70">{subLabel}</span> : null}
    </button>
  );
}

export function WalletMocoTransferStation({ purchasedMoco, userImageUrl }: Props) {
  const router = useRouter();
  const [balance, setBalance] = useState(purchasedMoco);
  const [username, setUsername] = useState("");
  const [recipientLabel, setRecipientLabel] = useState("");
  const [recipientPayoutsEnabled, setRecipientPayoutsEnabled] = useState<boolean | null>(null);
  const [amount, setAmount] = useState("");
  const [letter, setLetter] = useState("");
  const [error, setError] = useState("");
  const [statusLine, setStatusLine] = useState(t("wallet.transferStatusEnterRecipient"));
  const [atmOverlay, setAtmOverlay] = useState<AtmOverlay>(null);
  const [pending, startTransition] = useTransition();

  const parsed = parseSpendableMoco(amount);
  const displayAmount = formatTypingMoco(amount);
  const blocked = recipientPayoutsEnabled === false;

  function lookup() {
    const raw = username.trim();
    if (raw.length < 3) {
      setRecipientLabel("");
      setRecipientPayoutsEnabled(null);
      return;
    }
    startTransition(async () => {
      const res = await lookupMocoRecipient(raw);
      if ("error" in res && res.error) {
        setRecipientLabel("");
        setRecipientPayoutsEnabled(null);
        setError(errorText(res.error));
        return;
      }
      if ("username" in res && res.username) {
        setError("");
        setRecipientPayoutsEnabled(res.payoutsEnabled === true);
        setRecipientLabel(
          res.name && res.name !== res.username ? `${res.name} · @${res.username}` : `@${res.username}`,
        );
        setStatusLine(res.payoutsEnabled === true ? "" : CREATOR_PAYOUT_BLOCKED_KO);
      }
    });
  }

  function appendDigit(digit: string) {
    if (pending || atmOverlay) return;
    const next = appendMocoDecimalChar(amount, digit);
    if (next === amount) return;
    setAmount(next);
    if (error) setError("");
    setStatusLine(t("wallet.sceowmi"));
  }

  function backspace() {
    if (pending || atmOverlay || !amount) return;
    setAmount(amount.slice(0, -1));
    setStatusLine(t("wallet.moco_6"));
  }

  function send() {
    if (pending || atmOverlay) return;
    if (!username.trim() || parsed == null || parsed < 0.1) {
      const msg = t("wallet.1_moco");
      setError(msg);
      setStatusLine(msg);
      setAtmOverlay("failure");
      return;
    }
    if (!mocoCovers(balance, parsed)) {
      const msg = t("wallet.moco_moco");
      setError(msg);
      setStatusLine(msg);
      setAtmOverlay("failure");
      return;
    }
    if (blocked) {
      setError(CREATOR_PAYOUT_BLOCKED_KO);
      setStatusLine(CREATOR_PAYOUT_BLOCKED_KO);
      setAtmOverlay("failure");
      return;
    }
    setError("");
    setStatusLine(t("wallet.s58so4x"));
    startTransition(async () => {
      const res = await transferMocoToUser(username, parsed, letter);
      if ("error" in res && res.error) {
        if ("code" in res && res.code === STRIPE_ACCOUNT_NOT_READY) {
          pushErrorToast({ message: CREATOR_PAYOUT_BLOCKED_TOAST_KO });
          setError(CREATOR_PAYOUT_BLOCKED_KO);
          setStatusLine(CREATOR_PAYOUT_BLOCKED_KO);
        } else {
          setError(errorText(res.error));
          setStatusLine(errorText(res.error));
        }
        setAtmOverlay("failure");
        return;
      }
      if ("success" in res && res.success) {
        setBalance(res.senderPurchasedAfter);
        setAmount("");
        setLetter("");
        setStatusLine(t("wallet.moco_7", { v0: res.recipientUsername, v1: res.amount.toLocaleString() }));
        setAtmOverlay("success");
        router.refresh();
        return;
      }
      setError(t("wallet.ss8i0cp"));
      setStatusLine(t("wallet.ss8i0cp"));
      setAtmOverlay("failure");
    });
  }

  useEffect(() => {
    setBalance(purchasedMoco);
  }, [purchasedMoco]);

  return (
    <div className="space-y-3">
      <p className="text-sm leading-relaxed text-muted-foreground">
        {t("wallet.moco_4")}
      </p>

      <div className="overflow-hidden rounded-[1.35rem] border-2 border-[#6b7280] bg-gradient-to-b from-[#d1d5db] via-[#aeb4bd] to-[#8b939e] p-1.5 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.5)]">
        <div className="overflow-hidden rounded-[1.1rem] border border-[#4b5563] bg-gradient-to-b from-[#111827] to-[#0b1018]">
          <div className="flex items-center justify-between border-b border-[#374151] bg-gradient-to-r from-[#1f2937] via-[#111827] to-[#1f2937] px-4 py-2">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/30" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
              </span>
              <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-400">MoCoMo ATM</span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-slate-500">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
              TRANSFER
            </div>
          </div>

          <div className="relative mx-4 mt-4">
            <AnimatePresence>
              {atmOverlay ? (
                <motion.button
                  type="button"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setAtmOverlay(null)}
                  className={cn(
                    "absolute inset-0 z-20 flex flex-col items-center justify-center rounded-lg backdrop-blur-sm",
                    atmOverlay === "success" ? "bg-emerald-500/15" : "bg-red-500/15",
                  )}
                >
                  <div
                    className={cn(
                      "flex h-16 w-16 items-center justify-center rounded-full border-4",
                      atmOverlay === "success"
                        ? "border-emerald-400 bg-emerald-500/20 text-emerald-300"
                        : "border-red-400 bg-red-500/20 text-red-300",
                    )}
                  >
                    {atmOverlay === "success" ? (
                      <Check className="h-9 w-9" strokeWidth={3} />
                    ) : (
                      <X className="h-9 w-9" strokeWidth={3} />
                    )}
                  </div>
                  <p
                    className={cn(
                      "mt-3 text-lg font-black tracking-tight",
                      atmOverlay === "success" ? "text-emerald-200" : "text-red-200",
                    )}
                  >
                    {atmOverlay === "success" ? t("wallet.snb72dc") : t("wallet.snb6mws")}
                  </p>
                  <p className="mt-2 text-xs text-slate-400">{t("common.close")}</p>
                </motion.button>
              ) : null}
            </AnimatePresence>

            <MocoEarthTransferHero userImageUrl={userImageUrl} transferActive={pending}>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-500">{t("wallet.moco_5")}</p>
              <p className="mt-0.5 font-mono text-xl font-bold tabular-nums text-neutral-900">
                {formatMocoDisplay(balance)}
              </p>

              <label className="mt-3 block space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-neutral-500">{t("wallet.s1s4qtn")}</span>
                <input
                  value={username}
                  disabled={pending || !!atmOverlay}
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  placeholder="@username"
                  onChange={(e) => {
                    setUsername(e.target.value.replace(/\s/g, ""));
                    setRecipientLabel("");
                    setRecipientPayoutsEnabled(null);
                    if (error) setError("");
                  }}
                  onBlur={lookup}
                  className="w-full rounded-md border-2 border-[#1B3A6B] bg-white px-3 py-2 font-mono text-sm font-bold text-neutral-900 placeholder:text-neutral-400 outline-none focus:border-[#E85D04]"
                />
              </label>
              {recipientLabel ? <p className="text-xs font-semibold text-[#1B3A6B]">{recipientLabel}</p> : null}
              {blocked ? (
                <p className="text-xs font-semibold text-amber-700">{CREATOR_PAYOUT_BLOCKED_KO}</p>
              ) : null}

              <label className="mt-2 block space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-neutral-500">{t("wallet.s114aw")}</span>
                <textarea
                  value={letter}
                  disabled={pending || !!atmOverlay}
                  maxLength={ATM_LETTER_MESSAGE_MAX}
                  rows={2}
                  placeholder={t("wallet.s18gtinf")}
                  onChange={(e) => {
                    setLetter(e.target.value.slice(0, ATM_LETTER_MESSAGE_MAX));
                    if (error) setError("");
                  }}
                  className="w-full resize-none rounded-md border-2 border-[#1B3A6B] bg-white px-3 py-2 text-sm leading-relaxed text-neutral-900 placeholder:text-neutral-400 outline-none focus:border-[#E85D04]"
                />
                <span className="block text-right text-[10px] tabular-nums text-neutral-500">
                  {letter.length}/{ATM_LETTER_MESSAGE_MAX}
                </span>
              </label>

              <div className="mt-2 flex items-baseline justify-between gap-3 rounded-md border-2 border-[#1B3A6B] bg-white px-3 py-2">
                <p className="min-w-0 flex-1 truncate font-mono text-3xl font-bold tabular-nums text-neutral-900" aria-live="polite">
                  {displayAmount}
                </p>
                <span className="shrink-0 text-sm font-black text-[#E85D04]">MOCO</span>
              </div>
            </MocoEarthTransferHero>
          </div>

          <div className="mx-4 mt-3 rounded-md border border-amber-900/40 bg-[#1a1205] px-3 py-2">
            <p className="font-mono text-xs font-semibold text-amber-300" role="status">
              {pending ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  {t("post.menu.blockReportSubmitting")}
                </span>
              ) : (
                statusLine
              )}
            </p>
          </div>

          <div className="mx-4 my-4 rounded-xl border border-[#6b7280] bg-gradient-to-b from-[#b8bcc4] to-[#9ca3af] p-3 shadow-[inset_0_3px_8px_rgba(0,0,0,0.25)]">
            <div className="grid grid-cols-4 grid-rows-4 gap-2">
              <AtmNumKey label="1" disabled={pending || !!atmOverlay} onPress={() => appendDigit("1")} className="col-start-1 row-start-1" />
              <AtmNumKey label="2" disabled={pending || !!atmOverlay} onPress={() => appendDigit("2")} className="col-start-2 row-start-1" />
              <AtmNumKey label="3" disabled={pending || !!atmOverlay} onPress={() => appendDigit("3")} className="col-start-3 row-start-1" />
              <AtmActionKey
                label={t("wallet.suikow")}
                subLabel="←"
                tone="clear"
                disabled={pending || !!atmOverlay || !amount}
                onPress={backspace}
                className="col-start-4 row-start-1 row-span-2 h-full min-h-[6.9rem]"
              />

              <AtmNumKey label="4" disabled={pending || !!atmOverlay} onPress={() => appendDigit("4")} className="col-start-1 row-start-2" />
              <AtmNumKey label="5" disabled={pending || !!atmOverlay} onPress={() => appendDigit("5")} className="col-start-2 row-start-2" />
              <AtmNumKey label="6" disabled={pending || !!atmOverlay} onPress={() => appendDigit("6")} className="col-start-3 row-start-2" />

              <AtmNumKey label="7" disabled={pending || !!atmOverlay} onPress={() => appendDigit("7")} className="col-start-1 row-start-3" />
              <AtmNumKey label="8" disabled={pending || !!atmOverlay} onPress={() => appendDigit("8")} className="col-start-2 row-start-3" />
              <AtmNumKey label="9" disabled={pending || !!atmOverlay} onPress={() => appendDigit("9")} className="col-start-3 row-start-3" />
              <AtmActionKey
                label={t("wallet.sz04o")}
                subLabel="SEND"
                tone="confirm"
                disabled={
                  pending ||
                  !!atmOverlay ||
                  !username.trim() ||
                  parsed == null ||
                  parsed < 0.1 ||
                  blocked
                }
                onPress={send}
                className="col-start-4 row-start-3 row-span-2 h-full min-h-[6.9rem]"
              />

              <AtmNumKey
                label="."
                disabled={pending || !!atmOverlay}
                onPress={() => appendDigit(".")}
                className="col-start-1 row-start-4"
              />
              <AtmNumKey
                label="0"
                disabled={pending || !!atmOverlay}
                onPress={() => appendDigit("0")}
                className="col-span-2 col-start-2 row-start-4"
              />
            </div>
          </div>

          <div className="space-y-2 px-4 pb-4">
            {error ? (
              <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300" role="alert">
                {error}
              </p>
            ) : (
              <p className="text-[11px] leading-relaxed text-slate-500">
                {t("wallet.100_moco_100_moco")}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
