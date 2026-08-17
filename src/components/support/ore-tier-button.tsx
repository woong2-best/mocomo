"use client";

import { SupportTierLevel } from "@prisma/client";
import { getTierInfo } from "@/lib/tiers";
import { formatUsd } from "@/lib/money";
import { OreIcon } from "@/components/support/ore-icon";
import { cn } from "@/lib/utils";

/** 등급 안내·선택용 — 버튼 안에 광석 + 글자 */
export function OreTierButton({
  tier,
  active,
  onClick,
  showAmount,
  className,
}: {
  tier: SupportTierLevel;
  active?: boolean;
  onClick?: () => void;
  showAmount?: boolean;
  className?: string;
}) {
  const info = getTierInfo(tier);
  const Comp = onClick ? "button" : "div";

  return (
    <Comp
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-left transition-all",
        active
          ? "border-primary bg-primary/10 shadow-md scale-[1.02]"
          : "border-border/60 bg-muted/30 hover:bg-muted/50 hover:border-primary/30",
        onClick && "cursor-pointer",
        className
      )}
      style={
        active
          ? { boxShadow: `0 0 0 1px ${info.color}40` }
          : undefined
      }
    >
      <OreIcon tier={tier} size={22} />
      <span className="flex flex-col min-w-0">
        <span className="font-bold text-sm leading-tight" style={{ color: info.color }}>
          {info.label}
        </span>
        {showAmount && (
          <span className="text-[10px] text-muted-foreground">
            {info.minAmount === 0 ? `${formatUsd(0)}~` : `${formatUsd(info.minAmount)}~`}
          </span>
        )}
      </span>
    </Comp>
  );
}

/** 작은 뱃지 (프로필·목록) */
export function OreTierBadge({
  tier,
  showLabel = true,
  size = "sm",
  className,
}: {
  tier: SupportTierLevel;
  showLabel?: boolean;
  size?: "sm" | "md";
  className?: string;
}) {
  const info = getTierInfo(tier);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-semibold",
        size === "sm" ? "text-xs px-2 py-0.5" : "text-sm px-2.5 py-1",
        className
      )}
      style={{
        color: info.color,
        borderColor: `${info.color}50`,
        backgroundColor: `${info.color}12`,
      }}
    >
      <OreIcon tier={tier} size={size === "sm" ? 14 : 18} />
      {showLabel && <span>{info.label}</span>}
    </span>
  );
}
