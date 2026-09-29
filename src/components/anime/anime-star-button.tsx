"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";
import { toggleAnimeStar } from "@/actions/anime";
import { STAR_CHANGED_EVENT } from "@/lib/post-engage-client";
import { cn } from "@/lib/utils";

export function AnimeStarButton({
  animeId,
  initialStarred,
  className,
}: {
  animeId: string;
  initialStarred: boolean;
  className?: string;
}) {
  const router = useRouter();
  const [starred, setStarred] = useState(initialStarred);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (busy) return;
    setBusy(true);
    try {
      const res = await toggleAnimeStar(animeId);
      if (!res || "error" in res) return;
      setStarred(res.starred);
      window.dispatchEvent(new Event(STAR_CHANGED_EVENT));
    } catch {
      router.push(`/auth/signin?callbackUrl=${encodeURIComponent(window.location.pathname)}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void toggle()}
      disabled={busy}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-bold transition-colors",
        starred
          ? "border-amber-400/60 bg-amber-400/15 text-amber-200"
          : "border-border bg-background/70 text-foreground hover:bg-muted",
        className
      )}
      aria-label={starred ? "STAR 해제" : "STAR 저장"}
      aria-pressed={starred}
    >
      <Star className={cn("h-4 w-4", starred && "fill-amber-400 text-amber-400")} />
      STAR
    </button>
  );
}
