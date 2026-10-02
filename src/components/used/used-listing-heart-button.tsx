"use client";

import { useState, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { toggleUsedFavorite } from "@/actions/used-market";
import { cn } from "@/lib/utils";
import { useLocale } from "@/components/providers/locale-provider";

export function UsedListingHeartButton({
  listingId,
  initialFavorited,
  className,
  size = "md",
}: {
  listingId: string;
  initialFavorited: boolean;
  className?: string;
  size?: "md" | "sm";
}) {
  const { locale } = useLocale();
  const router = useRouter();
  const [favorited, setFavorited] = useState(initialFavorited);
  const [busy, setBusy] = useState(false);

  async function toggle(e?: MouseEvent) {
    e?.preventDefault();
    e?.stopPropagation();
    if (busy) return;
    setBusy(true);
    try {
      const res = await toggleUsedFavorite(listingId);
      if (!res || "error" in res) {
        router.push(`/auth/signin?callbackUrl=/market/${listingId}`);
        return;
      }
      setFavorited(res.favorited);
    } catch {
      router.push(`/auth/signin?callbackUrl=/market/${listingId}`);
    } finally {
      setBusy(false);
    }
  }

  const icon = size === "sm" ? "h-[22px] w-[22px]" : "h-6 w-6";

  return (
    <button
      type="button"
      onClick={(e) => void toggle(e)}
      disabled={busy}
      className={cn("p-1 rounded-full", className)}
      aria-label={
        favorited
          ? t("ui.remove_favorite")
          : t("ui.add_favorite")
      }
      aria-pressed={favorited}
    >
      <Heart
        className={cn(icon, favorited ? "fill-folk-terracotta text-folk-terracotta" : "text-muted-foreground")}
      />
    </button>
  );
}
