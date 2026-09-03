"use client";

import { useState, type ReactNode } from "react";
import { useSession } from "next-auth/react";
import { DollarSign } from "lucide-react";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PayButton } from "@/components/payments/pay-button";
import { calcPlatformFee } from "@/lib/utils";
import { tipMetadataForCheckout } from "@/lib/donation-metadata";
import {
  COMMENT_DONATION_MESSAGE_MAX,
  COMMENT_DONATION_PRESETS,
  commentDonationTier,
} from "@/lib/comment-donation";
import { formatUsd, MIN_TIP_USD_CENTS } from "@/lib/money";

export function CommentDonationDialog({
  creatorId,
  username,
  displayName,
  paymentsEnabled,
  channelId,
  returnPath,
  trigger,
  triggerVariant = "default",
  triggerSize = "sm",
  triggerClassName,
  triggerLabel = "댓글 후원",
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: {
  creatorId: string;
  username: string;
  displayName: string;
  paymentsEnabled?: boolean;
  channelId: string;
  returnPath?: string;
  trigger?: ReactNode;
  triggerVariant?: "default" | "outline" | "secondary" | "ghost";
  triggerSize?: "default" | "sm" | "icon";
  triggerClassName?: string;
  triggerLabel?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const { data: session } = useSession();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = controlledOnOpenChange ?? setInternalOpen;
  const [amount, setAmount] = useState<number>(COMMENT_DONATION_PRESETS[1] ?? 500);
  const [custom, setCustom] = useState("");
  const [message, setMessage] = useState("");

  const effectiveAmount = custom ? parseInt(custom.replace(/\D/g, ""), 10) || 0 : amount;
  const fee = calcPlatformFee(effectiveAmount, 0.1);
  const creatorGets = effectiveAmount - fee;
  const trimmedMessage = message.trim();
  const tier = commentDonationTier(effectiveAmount);
  const viewerName =
    session?.user?.username ?? session?.user?.name?.replace(/^@/, "") ?? "me";
  const canPay =
    effectiveAmount >= MIN_TIP_USD_CENTS &&
    trimmedMessage.length > 0 &&
    !!paymentsEnabled &&
    !!channelId;

  const triggerClass = [
    triggerVariant === "default"
      ? "rounded-full font-bold gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-90 text-white border-0"
      : "rounded-full font-bold gap-1.5",
    triggerClassName,
  ]
    .filter(Boolean)
    .join(" ");

  if (!paymentsEnabled) {
    if (trigger) return null;
    return (
      <Button
        disabled
        variant={triggerVariant}
        size={triggerSize}
        className={`${triggerClass} opacity-60`}
        title="결제 준비 중"
      >
        <DollarSign className="h-4 w-4" />
        후원 준비 중
      </Button>
    );
  }

  const dialogBody = (
    <>
      <DialogHeader>
        <DialogTitle>{displayName}에게 감사를 전하세요</DialogTitle>
        <DialogDescription>
          댓글 후원을 구매하면 채팅에 하이라이트 댓글이 자동으로 게시됩니다.
        </DialogDescription>
      </DialogHeader>

      <div className="overflow-hidden rounded-lg border border-border/60">
        <div
          className="flex items-start gap-2 px-3 py-2.5"
          style={{ backgroundColor: tier.headerBg }}
        >
          <Avatar className="h-8 w-8 shrink-0 ring-2 ring-white/30">
            <AvatarImage src={session?.user?.image ?? undefined} />
            <AvatarFallback className="bg-white/20 text-white text-xs">
              {viewerName[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-sm font-semibold text-white/90">@{viewerName}</span>
              <span
                className="inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-bold tabular-nums text-white"
                style={{ backgroundColor: "rgba(0,0,0,0.25)" }}
              >
                <DollarSign className="h-3 w-3" />
                {formatUsd(effectiveAmount)}
              </span>
            </div>
            <p className="mt-1 text-sm text-white/95 break-words">
              {trimmedMessage || "후원 메시지 미리보기…"}
            </p>
          </div>
        </div>
        <div className="px-3 py-2 text-[11px] text-muted-foreground bg-muted/30">
          결제 후 위 댓글이 라이브 채팅에 표시됩니다.
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {COMMENT_DONATION_PRESETS.map((p) => (
          <Button
            key={p}
            type="button"
            variant={!custom && amount === p ? "default" : "outline"}
            className="rounded-lg text-sm h-auto py-2 tabular-nums"
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
        placeholder={`금액 직접 입력 (최소 ${formatUsd(MIN_TIP_USD_CENTS)})`}
        value={custom}
        onChange={(e) => setCustom(e.target.value.replace(/\D/g, "").slice(0, 7))}
        className="rounded-lg tabular-nums"
        inputMode="numeric"
      />

      <textarea
        placeholder="채팅에 표시할 메시지 (필수)"
        value={message}
        onChange={(e) => setMessage(e.target.value.slice(0, COMMENT_DONATION_MESSAGE_MAX))}
        maxLength={COMMENT_DONATION_MESSAGE_MAX}
        rows={3}
        className="w-full rounded-lg border border-border bg-background p-3 text-sm leading-relaxed resize-none"
      />
      <p className="text-[11px] text-muted-foreground text-right -mt-2">
        {trimmedMessage.length}/{COMMENT_DONATION_MESSAGE_MAX}
      </p>

      <p className="text-xs text-muted-foreground">
        수수료 10% · 크리에이터 정산 {formatUsd(creatorGets)}
      </p>

      <PayButton
        type="TIP"
        amount={effectiveAmount}
        orderName={`${displayName} 댓글 후원`}
        metadata={tipMetadataForCheckout({
          receiverId: creatorId,
          message: trimmedMessage,
          username,
          channelId,
          returnPath,
          tipKind: "superchat",
        })}
        disabled={!canPay}
        returnPath={returnPath}
        className="w-full rounded-lg h-11 font-bold"
        onPurchaseSuccess={() => setOpen(false)}
      >
        구매 후 보내기 · {formatUsd(effectiveAmount)}
      </PayButton>
    </>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? (
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      ) : controlledOpen === undefined ? (
        <DialogTrigger asChild>
          <Button variant={triggerVariant} size={triggerSize} className={triggerClass}>
            <DollarSign className="h-4 w-4" />
            {triggerLabel}
          </Button>
        </DialogTrigger>
      ) : null}
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        {dialogBody}
      </DialogContent>
    </Dialog>
  );
}

/** 채팅 입력 옆 $ 아이콘 트리거 */
export function CommentDonationIconButton({
  creatorId,
  username,
  displayName,
  paymentsEnabled,
  channelId,
  returnPath,
}: {
  creatorId: string;
  username: string;
  displayName: string;
  paymentsEnabled?: boolean;
  channelId: string;
  returnPath?: string;
}) {
  const [open, setOpen] = useState(false);
  if (!paymentsEnabled) return null;

  return (
    <CommentDonationDialog
      creatorId={creatorId}
      username={username}
      displayName={displayName}
      paymentsEnabled={paymentsEnabled}
      channelId={channelId}
      returnPath={returnPath}
      open={open}
      onOpenChange={setOpen}
      trigger={
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-9 w-9 shrink-0 rounded-lg text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-700"
          title="댓글 후원"
        >
          <DollarSign className="h-4 w-4" />
        </Button>
      }
    />
  );
}
