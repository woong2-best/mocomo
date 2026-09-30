import { Ban } from "lucide-react";
import { QUOTED_POST_BLOCKED_MESSAGE } from "@/lib/user-block";
import { cn } from "@/lib/utils";

export function BlockedQuotedPostCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "mt-3 rounded-xl border border-border/70 bg-muted/40 px-4 py-3 text-sm text-muted-foreground flex items-start gap-2",
        className
      )}
    >
      <Ban className="h-4 w-4 shrink-0 mt-0.5 opacity-70" aria-hidden />
      <p>{QUOTED_POST_BLOCKED_MESSAGE}</p>
    </div>
  );
}
