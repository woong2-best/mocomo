import { cn } from "@/lib/utils";

export function TierBadge({ level, tier }: { level?: number; tier?: string }) {
  if (tier) {
    return (
      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-folk-cobalt/10 text-folk-cobalt font-medium">
        {tier}
      </span>
    );
  }
  return (
    <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground font-medium")}>
      Lv.{level ?? 1}
    </span>
  );
}
