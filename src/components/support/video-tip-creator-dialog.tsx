"use client";

import { useState, type ReactNode } from "react";
import { Film, Loader2 } from "lucide-react";
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
import { OreIcon } from "@/components/support/ore-icon";
import { tierFromAmount } from "@/lib/tiers";
import { tipMetadataForCheckout } from "@/lib/donation-metadata";
import { VIDEO_TIP_MIN_KRW } from "@/lib/video-donation";
import { calcPlatformFee } from "@/lib/utils";
import type { SupportTierLevel } from "@prisma/client";

const PRESETS = [5_000, 10_000, 30_000, 50_000];

export function VideoTipCreatorDialog({
  creatorId,
  username,
  displayName,
  channelId,
  returnPath,
  paymentsEnabled,
  triggerVariant = "outline",
  triggerSize = "sm",
}: {
  creatorId: string;
  username: string;
  displayName: string;
  channelId: string;
  returnPath?: string;
  paymentsEnabled: boolean;
  triggerVariant?: "default" | "outline" | "secondary" | "ghost";
  triggerSize?: "default" | "sm" | "icon";
  triggerClassName?: string;
  triggerIcon?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(10_000);
  const [custom, setCustom] = useState("");
  const [message, setMessage] = useState("");

  const effectiveAmount = custom ? parseInt(custom.replace(/\D/g, ""), 10) || 0 : amount;
  const fee = calcPlatformFee(effectiveAmount, 0.1);
  const creatorGets = effectiveAmount - fee;

  if (!paymentsEnabled) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant={triggerVariant}
          size={triggerSize}
          className="rounded-full font-bold gap-1.5 bg-gradient-to-r from-red-500 to-orange-500 hover:opacity-90 text-white border-0"
        >
          <Film className="h-4 w-4" />
          영상 후원
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Film className="h-5 w-5 text-red-500" />
            {displayName} 영상 후원
          </DialogTitle>
          <DialogDescription>
            결제 후 YouTube 링크를 입력하면 방송 대기열에 등록됩니다. 호스트 검수 후 재생됩니다.
            (최소 {VIDEO_TIP_MIN_KRW.toLocaleString()}원)
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-2">
          {PRESETS.map((p) => (
            <Button
              key={p}
              type="button"
              variant={amount === p && !custom ? "default" : "outline"}
              className="rounded-xl text-sm h-auto py-2 gap-1.5"
              onClick={() => {
                setAmount(p);
                setCustom("");
              }}
            >
              <OreIcon tier={tierFromAmount(p)} size={18} />
              {p >= 10_000 ? `${p / 10_000}만` : p.toLocaleString()}
            </Button>
          ))}
        </div>

        <Input
          placeholder="직접 입력 (원)"
          value={custom}
          onChange={(e) => setCustom(e.target.value.replace(/\D/g, "").slice(0, 8))}
          className="rounded-xl tabular-nums"
        />

        <Input
          placeholder="메시지 (선택)"
          value={message}
          onChange={(e) => setMessage(e.target.value.slice(0, 100))}
          className="rounded-xl"
        />

        <p className="text-xs text-muted-foreground">
          수수료 10% · 크리에이터 수령 {creatorGets.toLocaleString()}원
        </p>

        <PayButton
          type="TIP"
          amount={effectiveAmount}
          orderName={`${displayName} 영상 후원`}
          metadata={tipMetadataForCheckout({
            receiverId: creatorId,
            message: message.trim(),
            username,
            channelId,
            returnPath,
            tipKind: "video",
          })}
          disabled={effectiveAmount < VIDEO_TIP_MIN_KRW}
          className="w-full rounded-xl gap-2 h-11"
        >
          {effectiveAmount.toLocaleString()}원 결제 후 링크 입력
        </PayButton>
      </DialogContent>
    </Dialog>
  );
}
