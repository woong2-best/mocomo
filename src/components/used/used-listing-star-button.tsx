"use client";

import { useState, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";
import { toggleUsedListingStar } from "@/actions/used-market";
import { notifyStarChanged } from "@/lib/post-engage-client";
import { cn } from "@/lib/utils";

export function UsedListingStarButton({
  listingId,
  initialStarred,
  className,
  variant = "plain",
}: {
  listingId: string;
  initialStarred: boolean;
  className?: string;
  variant?: "plain" | "overlay";
}) {
  const router = useRouter();
  const [starred, setStarred] = useState(initialStarred);
  const [busy, setBusy] = useState(false);

  async function toggle(e?: MouseEvent) {
    e?.preventDefault();
    e?.stopPropagation();
    if (busy) return;
    setBusy(true);
    try {
      const res = await toggleUsedListingStar(listingId);
      if (!res) {
        router.push(`/auth/signin?callbackUrl=/market/${listingId}`);
        return;
      }
      if ("error" in res) {
        const msg = res.error ?? "";
        if (msg.includes("로그인") || msg.includes("인증")) {
          router.push(`/auth/signin?callbackUrl=/market/${listingId}`);
          return;
        }
        window.alert(msg || "STAR에 저장하지 못했습니다.");
        return;
      }
      setStarred(res.starred);
      notifyStarChanged(listingId, res.starred);
    } catch {
      router.push(`/auth/signin?callbackUrl=/market/${listingId}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={(e) => void toggle(e)}
      disabled={busy}
      className={cn(
        variant === "overlay"
          ? "rounded-full bg-black/45 p-1.5 text-white shadow-sm backdrop-blur-[2px] hover:bg-black/60"
          : "rounded-lg p-2 hover:bg-muted",
        className
      )}
      aria-label={starred ? "STAR 해제" : "STAR 저장"}
      aria-pressed={starred}
    >
      <Star
        className={cn(
          variant === "overlay" ? "h-[18px] w-[18px]" : "h-5 w-5",
          starred ? "fill-yellow-400 text-yellow-400" : variant === "overlay" ? "text-white" : ""
        )}
      />
    </button>
  );
}
