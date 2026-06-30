import Link from "next/link";
import { Gamepad2, Radio, Sparkles, Tags } from "lucide-react";
import { cn } from "@/lib/utils";
import { isLiveFeatureEnabled } from "@/lib/live-feature";

const TILES = [
  {
    href: "/discover",
    label: "매칭",
    sub: "취향·거리",
    icon: Sparkles,
    className:
      "border-violet-500/30 bg-gradient-to-br from-violet-950/12 to-fuchsia-950/8 text-violet-900 dark:text-violet-100",
    iconClass: "text-violet-500",
  },
  {
    href: "/live",
    label: "라이브",
    sub: "실시간 시청",
    icon: Radio,
    className: "border-folk-terracotta/35 bg-folk-terracotta/8 text-folk-cobalt",
    iconClass: "text-folk-terracotta",
    liveOnly: true,
  },
  {
    href: "/games",
    label: "GAME",
    sub: "미니게임",
    icon: Gamepad2,
    className: "border-folk-cobalt/30 bg-folk-gold/15 text-folk-cobalt",
    iconClass: "text-folk-cobalt",
  },
  {
    href: "/used",
    label: "중고",
    sub: "전국 거래",
    icon: Tags,
    className: "border-border/70 bg-muted/30 text-foreground",
    iconClass: "text-muted-foreground",
  },
] as const;

export function ExploreQuickNav({ className }: { className?: string }) {
  const liveOn = isLiveFeatureEnabled();
  const tiles = TILES.filter((t) => !("liveOnly" in t && t.liveOnly) || liveOn);

  return (
    <nav
      className={cn("grid grid-cols-2 gap-2 sm:grid-cols-4 moco-stagger", className)}
      aria-label="빠른 이동"
    >
      {tiles.map(({ href, label, sub, icon: Icon, className: tileClass, iconClass }) => (
        <Link
          key={href}
          href={href}
          className={cn(
            "folk-card-interactive flex flex-col gap-1 rounded-2xl border-2 p-3 min-h-[4.5rem]",
            tileClass
          )}
        >
          <Icon className={cn("h-5 w-5", iconClass)} aria-hidden />
          <span className="font-display font-bold text-sm leading-tight">{label}</span>
          <span className="text-[10px] text-muted-foreground leading-tight">{sub}</span>
        </Link>
      ))}
    </nav>
  );
}
