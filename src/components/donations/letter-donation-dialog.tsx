"use client";

import { useState, type ReactNode } from "react";
import Image from "next/image";
import { Mail } from "lucide-react";
import type { SupportTierLevel } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PayButton } from "@/components/payments/pay-button";
import { calcPlatformFee } from "@/lib/utils";
import { tipMetadataForCheckout } from "@/lib/donation-metadata";
import {
  LETTER_DONATION_MESSAGE_MAX,
  LETTER_DONATION_MIN_KRW,
} from "@/lib/chat-letter-donation";
import { formatUsd } from "@/lib/money";

const PRESETS = [5_000, 10_000, 30_000, 50_000, 100_000, 300_000];

export function LetterDonationDialog({
  creatorId,
  username,
  displayName,
  paymentsEnabled,
  channelId,
  roomId,
  returnPath,
  triggerVariant = "default",
  triggerSize = "default",
  triggerClassName,
  triggerIcon,
  iconOnly = false,
  triggerLabel = "편지 후원",
  currentTier: _currentTier,
  currentTotal: _currentTotal,
}: {
  creatorId: string;
  username: string;
  displayName: string;
  paymentsEnabled: boolean;
  channelId?: string;
  roomId?: string;
  returnPath?: string;
  triggerVariant?: "default" | "outline" | "secondary" | "ghost";
  triggerSize?: "default" | "sm" | "icon";
  triggerClassName?: string;
  triggerIcon?: ReactNode;
  iconOnly?: boolean;
  triggerLabel?: string;
  /** Legacy tier display from old tip dialog — ignored */
  currentTier?: SupportTierLevel | null;
  currentTotal?: number;
}) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(10_000);
  const [custom, setCustom] = useState("");
  const [message, setMessage] = useState("");

  const effectiveAmount = custom ? parseInt(custom.replace(/\D/g, ""), 10) || 0 : amount;
  const fee = calcPlatformFee(effectiveAmount, 0.1);
  const creatorGets = effectiveAmount - fee;
  const trimmedMessage = message.trim();
  const canPay =
    effectiveAmount >= LETTER_DONATION_MIN_KRW && trimmedMessage.length > 0 && paymentsEnabled;

  const triggerClass = [
    triggerVariant === "default"
      ? "rounded-full font-bold gap-1.5 bg-gradient-to-r from-amber-700 to-red-800 hover:opacity-90 text-white border-0"
      : "rounded-full font-bold gap-1.5",
    triggerClassName,
  ]
    .filter(Boolean)
    .join(" ");

  if (!paymentsEnabled) {
    return (
      <Button
        disabled
        variant={triggerVariant}
        size={triggerSize}
        className={`${triggerClass} opacity-60`}
        title="결제 준비 중"
      >
        <Mail className="h-4 w-4" />
        후원 준비 중
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={triggerVariant} size={triggerSize} className={triggerClass}>
          {iconOnly && triggerIcon ? (
            triggerIcon
          ) : (
            <>
              <Mail className="h-4 w-4" />
              {triggerLabel}
            </>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden">
        <div className="relative bg-gradient-to-b from-[#f5efe3] to-background p-6 pb-4">
          <div className="mx-auto w-[200px] aspect-[4/3] relative rounded-lg overflow-hidden shadow-md mb-4 ring-1 ring-black/5">
            <Image src="/donations/wax-envelope.png" alt="" fill className="object-cover" sizes="200px" />
          </div>
          <DialogHeader className="text-center sm:text-center">
            <DialogTitle className="flex items-center justify-center gap-2">
              <Mail className="h-5 w-5 text-red-800" />
              {displayName}에게 편지 보내기
            </DialogTitle>
            <DialogDescription>
              @{username} · 최소 {formatUsd(LETTER_DONATION_MIN_KRW)} · 수수료 10% (정산{" "}
              {formatUsd(creatorGets)})
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="px-6 pb-6 space-y-4">
          <div className="grid grid-cols-3 gap-2">
            {PRESETS.map((p) => (
              <Button
                key={p}
                type="button"
                variant={amount === p && !custom ? "default" : "outline"}
                className="rounded-xl text-sm h-auto py-2"
                onClick={() => {
                  setAmount(p);
                  setCustom("");
                }}
              >
                {formatUsd(p)}
              </Button>
            ))}
          </div>

          <Input
            placeholder={`금액 직접 입력 (최소 ${formatUsd(LETTER_DONATION_MIN_KRW)})`}
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            className="rounded-xl"
            inputMode="numeric"
          />

          <textarea
            placeholder="편지 내용을 적어 주세요…"
            value={message}
            onChange={(e) => setMessage(e.target.value.slice(0, LETTER_DONATION_MESSAGE_MAX))}
            maxLength={LETTER_DONATION_MESSAGE_MAX}
            className="w-full min-h-[120px] rounded-xl border border-border bg-background p-3 text-sm leading-relaxed"
          />
          <p className="text-[11px] text-muted-foreground text-right">
            {trimmedMessage.length}/{LETTER_DONATION_MESSAGE_MAX}
          </p>

          <PayButton
            type="TIP"
            amount={effectiveAmount}
            orderName={`${displayName} 편지 후원`}
            metadata={tipMetadataForCheckout({
              receiverId: creatorId,
              message: trimmedMessage,
              username,
              channelId,
              roomId,
              returnPath,
              tipKind: "letter",
            })}
            disabled={!canPay}
            className="w-full rounded-xl h-11 font-bold"
          >
            {formatUsd(effectiveAmount)} · 편지 보내기
          </PayButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** @deprecated Use LetterDonationDialog — kept for existing imports */
export const TipCreatorDialog = LetterDonationDialog;
