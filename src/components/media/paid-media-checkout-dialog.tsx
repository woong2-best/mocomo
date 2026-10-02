"use client";

import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { Lock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PurchasePostMediaButton } from "@/components/profile/purchase-post-media-button";
type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mediaId?: string | null;
  priceKrw: number;
  paymentsEnabled: boolean;
  username?: string;
  postId?: string;
  lockReason?: string;
  authorId?: string;
  subscriptionPriceKrw?: number;
  subscribed?: boolean;
  variant?: "photo" | "preview-ended";
  onPurchaseSuccess?: () => void | Promise<void>;
};

export function PaidMediaCheckoutDialog({
  open,
  onOpenChange,
  mediaId,
  priceKrw,
  paymentsEnabled,
  username,
  postId,
  lockReason,
  authorId,
  subscriptionPriceKrw: _subscriptionPriceKrw,
  subscribed: _subscribed = false,
  variant = "preview-ended",
  onPurchaseSuccess,
}: Props) {
  const isSub =
    lockReason === "subscription" && authorId && (_subscriptionPriceKrw ?? 0) > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm text-center sm:text-center">
        <DialogHeader className="items-center text-center">
          <div className="mb-1 flex h-14 w-14 items-center justify-center rounded-full bg-folk-cobalt/10">
            <Lock className="h-7 w-7 text-folk-cobalt" strokeWidth={2.25} />
          </div>
          <DialogTitle>{isSub ? t("media.sftu5j4") : t("media.se0kmzt")}</DialogTitle>
          <DialogDescription>
            {isSub
              ? t("media.s17oy9lc")
              : variant === "photo"
                ? t("media.s1jrc1ta")
                : t("media.sbiwbci")}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center gap-3 pt-1">
          {isSub ? (
            <p className="text-sm text-muted-foreground">{t("media.s1red94v")}</p>
          ) : mediaId && priceKrw > 0 ? (
            <PurchasePostMediaButton
              mediaId={mediaId}
              priceKrw={priceKrw}
              paymentsEnabled={paymentsEnabled}
              username={username}
              postId={postId}
              label={t("profile.smmgb44")}
              variant="button"
              onPurchaseSuccess={async () => {
                await onPurchaseSuccess?.();
                onOpenChange(false);
              }}
            />
          ) : (
            <p className="text-sm text-muted-foreground">{t("media.s1red94v")}</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
