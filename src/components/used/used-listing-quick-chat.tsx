"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MessageSquare } from "lucide-react";
import { startUsedTradeChat } from "@/actions/used-market";
import { usedAdultVerifyUrl } from "@/lib/used-youth-protection";
import type { UsedRestrictedKind } from "@prisma/client";
import { cn } from "@/lib/utils";

function needsPhoneVerification(error: string) {
  return error.includes("휴대폰") || error.includes("phone verification");
}

/** Listing card overlay — opens seller DM in /messages without navigating to detail. */
export function UsedListingQuickChat({
  listingId,
  restrictedKind = "NONE",
  className,
}: {
  listingId: string;
  restrictedKind?: UsedRestrictedKind | string;
  className?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onChat(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (loading) return;
    setLoading(true);
    const res = await startUsedTradeChat(listingId);
    setLoading(false);
    if ("error" in res && res.error) {
      if (needsPhoneVerification(res.error)) {
        router.push(`/market/verify?callbackUrl=${encodeURIComponent(`/market/${listingId}`)}`);
        return;
      }
      if ("needsAdultVerify" in res && res.needsAdultVerify) {
        router.push(usedAdultVerifyUrl(listingId, restrictedKind));
        return;
      }
      return;
    }
    if ("roomId" in res && res.roomId) router.push(`/messages/${res.roomId}`);
  }

  return (
    <button
      type="button"
      aria-label="판매자에게 메시지"
      disabled={loading}
      onClick={(e) => void onChat(e)}
      className={cn(
        "inline-flex items-center justify-center rounded-full bg-background/90 text-foreground shadow-sm ring-1 ring-border/60 backdrop-blur-sm transition-opacity hover:bg-background disabled:opacity-60",
        className
      )}
    >
      <MessageSquare className="h-4 w-4" />
    </button>
  );
}
