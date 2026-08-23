"use client";

import { Lock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PurchasePostMediaButton } from "@/components/profile/purchase-post-media-button";
import {
  SubscribeCreatorButton,
  SubscribeCreatorHint,
} from "@/components/monetization/subscribe-creator-button";

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
  subscriptionPriceKrw,
  subscribed = false,
  variant = "preview-ended",
  onPurchaseSuccess,
}: Props) {
  const isSub = lockReason === "subscription" && authorId && (subscriptionPriceKrw ?? 0) > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm text-center sm:text-center">
        <DialogHeader className="items-center text-center">
          <div className="mb-1 flex h-14 w-14 items-center justify-center rounded-full bg-folk-cobalt/10">
            <Lock className="h-7 w-7 text-folk-cobalt" strokeWidth={2.25} />
          </div>
          <DialogTitle>{isSub ? "구독이 필요합니다" : "결제가 필요합니다"}</DialogTitle>
          <DialogDescription>
            {isSub
              ? "이 콘텐츠는 구독자만 볼 수 있습니다."
              : variant === "photo"
                ? "전체 사진을 보려면 결제해 주세요."
                : "미리보기가 끝났습니다. 이어서 보려면 결제해 주세요."}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center gap-3 pt-1">
          {isSub ? (
            <>
              <SubscribeCreatorButton
                creatorId={authorId!}
                username={username ?? ""}
                priceKrw={subscriptionPriceKrw!}
                paymentsEnabled={paymentsEnabled}
                subscribed={subscribed}
              />
              <SubscribeCreatorHint priceKrw={subscriptionPriceKrw!} />
            </>
          ) : mediaId && priceKrw > 0 ? (
            <PurchasePostMediaButton
              mediaId={mediaId}
              priceKrw={priceKrw}
              paymentsEnabled={paymentsEnabled}
              username={username}
              postId={postId}
              label="결제하기"
              variant="button"
              onPurchaseSuccess={async () => {
                await onPurchaseSuccess?.();
                onOpenChange(false);
              }}
            />
          ) : (
            <p className="text-sm text-muted-foreground">열람 권한이 없습니다.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
