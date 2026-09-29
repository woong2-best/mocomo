"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { lookupMocoRecipient, transferMocoToUser } from "@/actions/moco-transfer";
import { CREATOR_PAYOUT_BLOCKED_KO, CREATOR_PAYOUT_BLOCKED_TOAST_KO, STRIPE_ACCOUNT_NOT_READY } from "@/lib/creator-payout-ready";
import { pushErrorToast } from "@/lib/published-toast-store";
import { ATM_LETTER_MESSAGE_MAX } from "@/lib/chat-atm-letter";
import { formatMocoDisplay } from "@/lib/gems/display";
import { sanitizeMocoTopupInput } from "@/lib/gems/constants";

type Props = {
  purchasedMoco: number;
  userImageUrl?: string | null;
};

export function WalletMocoTransferStation({ purchasedMoco }: Props) {
  const router = useRouter();
  const [balance, setBalance] = useState(purchasedMoco);
  const [username, setUsername] = useState("");
  const [recipientLabel, setRecipientLabel] = useState("");
  const [recipientPayoutsEnabled, setRecipientPayoutsEnabled] = useState<boolean | null>(null);
  const [amount, setAmount] = useState("");
  const [letter, setLetter] = useState("");
  const [error, setError] = useState("");
  const [statusLine, setStatusLine] = useState("");
  const [pending, startTransition] = useTransition();

  const parsed = /^\d+$/.test(amount) ? Number(amount) : null;

  function lookup() {
    const raw = username.trim();
    if (raw.length < 3) {
      setRecipientLabel("");
      return;
    }
    startTransition(async () => {
      const res = await lookupMocoRecipient(raw);
      if ("error" in res && res.error) {
        setRecipientLabel("");
        setRecipientPayoutsEnabled(null);
        setError(res.error);
        return;
      }
      if ("username" in res && res.username) {
        setError("");
        setRecipientPayoutsEnabled(res.payoutsEnabled === true);
        setRecipientLabel(res.name && res.name !== res.username ? `${res.name} · @${res.username}` : `@${res.username}`);
        setStatusLine(res.payoutsEnabled === true ? "" : CREATOR_PAYOUT_BLOCKED_KO);
      }
    });
  }

  function send() {
    if (parsed == null || parsed < 1) {
      setError("1 MOCO 이상 입력해 주세요.");
      return;
    }
    if (parsed > balance) {
      setError("보유 MOCO가 부족합니다. 결제로 충전한 MOCO만 보낼 수 있습니다.");
      return;
    }
    setError("");
    startTransition(async () => {
      const res = await transferMocoToUser(username, parsed, letter);
      if ("error" in res && res.error) {
        if ("code" in res && res.code === STRIPE_ACCOUNT_NOT_READY) {
          pushErrorToast({ message: CREATOR_PAYOUT_BLOCKED_TOAST_KO });
          setError(CREATOR_PAYOUT_BLOCKED_KO);
        } else {
          setError(res.error);
        }
        return;
      }
      if ("success" in res && res.success) {
        setBalance(res.senderPurchasedAfter);
        setAmount("");
        setLetter("");
        setStatusLine(`@${res.recipientUsername}의 정산에 ${res.amount.toLocaleString()} MOCO를 기록했습니다.`);
        router.refresh();
        return;
      }
      setError("전달에 실패했습니다.");
    });
  }

  return (
    <section className="space-y-4 rounded-2xl border border-border/70 bg-card p-4">
      <div>
        <p className="text-sm text-muted-foreground">보낼 수 있는 보유 MOCO</p>
        <p className="text-3xl font-black tabular-nums">{formatMocoDisplay(balance)}</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          결제로 충전한 MOCO만 보낼 수 있습니다. 받는 사람의 정산에 기록되고, 메시지에는 편지가 도착합니다.
        </p>
      </div>

      <label className="block space-y-1.5">
        <span className="text-sm font-bold">받는 사람 아이디</span>
        <input
          value={username}
          disabled={pending}
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
          className="w-full rounded-xl border border-border bg-background px-3 py-3 font-mono text-lg font-bold outline-none focus:border-primary"
        />
      </label>
      {recipientLabel ? <p className="text-sm font-semibold text-primary">{recipientLabel}</p> : null}
      {recipientPayoutsEnabled === false ? (
        <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">{CREATOR_PAYOUT_BLOCKED_KO}</p>
      ) : null}

      <label className="block space-y-1.5">
        <span className="text-sm font-bold">편지</span>
        <textarea
          value={letter}
          disabled={pending}
          maxLength={ATM_LETTER_MESSAGE_MAX}
          rows={3}
          placeholder="편지에 적을 말"
          onChange={(e) => {
            setLetter(e.target.value.slice(0, ATM_LETTER_MESSAGE_MAX));
            if (error) setError("");
          }}
          className="w-full resize-none rounded-xl border border-border bg-background px-3 py-3 text-sm leading-relaxed outline-none focus:border-primary"
        />
        <span className="block text-right text-[11px] tabular-nums text-muted-foreground">
          {letter.length}/{ATM_LETTER_MESSAGE_MAX}
        </span>
      </label>

      <label className="block space-y-1.5">
        <span className="text-sm font-bold">보낼 MOCO</span>
        <input
          inputMode="numeric"
          autoComplete="off"
          value={amount}
          disabled={pending}
          placeholder="0"
          onChange={(e) => {
            setAmount(sanitizeMocoTopupInput(e.target.value).replace(/^0+(?=\d)/, "").slice(0, 7));
            if (error) setError("");
          }}
          className="w-full rounded-xl border border-border bg-background px-3 py-3 text-2xl font-black tabular-nums outline-none focus:border-primary"
        />
      </label>

      {statusLine ? <p className="text-sm text-muted-foreground">{statusLine}</p> : null}
      {error ? (
        <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm" role="alert">
          {error}
        </p>
      ) : (
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          예: 보유 100 MOCO를 보내면 상대 정산에 100이 바로 쌓입니다. 상대 보유 MOCO는 그대로입니다.
        </p>
      )}

      <button
        type="button"
        onClick={send}
        disabled={pending || !username.trim() || parsed == null || parsed < 1 || recipientPayoutsEnabled === false}
        className="flex w-full items-center justify-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-black text-primary-foreground disabled:opacity-45"
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        전달하기
      </button>
    </section>
  );
}
