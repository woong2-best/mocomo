"use client";

import { useState, type ReactNode } from "react";
import { Gem, Heart } from "lucide-react";
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
import { OreTierBadge } from "@/components/support/ore-tier-button";
import { OreIcon } from "@/components/support/ore-icon";
import { getTierInfo, tierFromAmount } from "@/lib/tiers";
import { SupportTierLevel } from "@prisma/client";
import { calcPlatformFee } from "@/lib/utils";
import { tipMetadataForCheckout } from "@/lib/donation-metadata";

const PRESETS = [1_000, 5_000, 10_000, 30_000, 50_000, 100_000];

export function TipCreatorDialog({
  creatorId,
  username,
  displayName,
  currentTier,
  currentTotal,
  paymentsEnabled,
  channelId,
  returnPath,
  triggerVariant = "default",
  triggerSize = "default",
  triggerClassName,
  triggerIcon,
  iconOnly = false,
}: {
  creatorId: string;
  username: string;
  displayName: string;
  currentTier?: SupportTierLevel | null;
  currentTotal?: number;
  paymentsEnabled: boolean;
  /** 라이브 방송 중 후원 시 채널 ID */
  channelId?: string;
  /** 결제 완료 후 돌아올 경로 (예: /u/name, /voice/xxx) */
  returnPath?: string;
  triggerVariant?: "default" | "outline" | "secondary" | "ghost";
  triggerSize?: "default" | "sm" | "icon";
  triggerClassName?: string;
  triggerIcon?: ReactNode;
  iconOnly?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(10_000);
  const [custom, setCustom] = useState("");
  const [message, setMessage] = useState("");

  const effectiveAmount = custom ? parseInt(custom.replace(/\D/g, ""), 10) || 0 : amount;
  const fee = calcPlatformFee(effectiveAmount, 0.1);
  const creatorGets = effectiveAmount - fee;
  const projectedTotal = (currentTotal ?? 0) + effectiveAmount;

  const triggerClass = [
    triggerVariant === "default"
      ? "rounded-full font-bold gap-1.5 bg-gradient-to-r from-pink-500 to-violet-500 hover:opacity-90 text-white border-0"
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
        title="Stripe 키가 설정되지 않았습니다"
      >
        <Gem className="h-4 w-4" />
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
              <Gem className="h-4 w-4" />
              후원
            </>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-pink-500" />
            {displayName} 후원
          </DialogTitle>
          <DialogDescription>
            @{username} · 플랫폼 수수료 10% (크리에이터 수령 {creatorGets.toLocaleString()}원)
          </DialogDescription>
        </DialogHeader>

        {(currentTier || (currentTotal ?? 0) > 0) && (
          <p className="text-sm flex flex-wrap items-center gap-2">
            <span className="text-muted-foreground">이 크리에이터 개별</span>
            <OreTierBadge tier={currentTier ?? "PEBBLE"} />
            <span className="text-muted-foreground">{(currentTotal ?? 0).toLocaleString()}원</span>
          </p>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {PRESETS.map((p) => {
            const tier = tierFromAmount((currentTotal ?? 0) + p);
            return (
              <Button
                key={p}
                type="button"
                variant={amount === p && !custom ? "default" : "outline"}
                className="rounded-xl text-sm h-auto py-2 flex items-center justify-center gap-1.5"
                onClick={() => {
                  setAmount(p);
                  setCustom("");
                }}
              >
                <OreIcon tier={tier} size={18} />
                {p >= 10_000 ? `${p / 10_000}만` : p.toLocaleString()}
              </Button>
            );
          })}
        </div>

        <Input
          placeholder="직접 입력 (원)"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          className="rounded-xl"
        />

        <textarea
          placeholder="응원 메시지 (선택)"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={200}
          className="w-full min-h-[72px] rounded-xl border border-border bg-background p-3 text-sm"
        />

        {effectiveAmount >= 100 && (
          <p className="text-xs flex items-center gap-2 text-muted-foreground">
            개별 후원 후 예상:
            <OreTierBadge tier={tierFromAmount(projectedTotal)} />
            ({getTierInfo(tierFromAmount(projectedTotal)).label})
          </p>
        )}

        <PayButton
          type="TIP"
          amount={effectiveAmount}
          orderName={`${displayName} 후원`}
          metadata={tipMetadataForCheckout({
            receiverId: creatorId,
            message: message.trim(),
            username,
            channelId,
            returnPath,
          })}
          disabled={effectiveAmount < 100}
          className="w-full rounded-xl gap-2 h-11"
        >
          <span className="inline-flex items-center gap-2">
            <OreIcon tier={tierFromAmount(projectedTotal)} size={20} />
            {effectiveAmount.toLocaleString()}원 결제하기
          </span>
        </PayButton>
      </DialogContent>
    </Dialog>
  );
}
