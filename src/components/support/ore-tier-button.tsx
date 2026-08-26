"use client";

import Link from "next/link";
import { SupportTierLevel } from "@prisma/client";
import { getTierInfo, supportTierPath } from "@/lib/tiers";
import { formatUsd } from "@/lib/money";
import { OreIcon } from "@/components/support/ore-icon";
import { SupportTierInfoPopover } from "@/components/support/support-tier-info-popover";
import { cn } from "@/lib/utils";
/** 등급 안내·선택용 — 버튼 안에 광석 + 글자 */
export function OreTierButton({
  tier,
  active,
  onClick,
  showAmount,
  linkToDetail,
  className,
}: {
  tier: SupportTierLevel;
  active?: boolean;
  onClick?: () => void;
  showAmount?: boolean;
  /** true면 등급 상세 페이지로 이동 */
  linkToDetail?: boolean;
  className?: string;
}) {
  const info = getTierInfo(tier);
  const body = (
    <>
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
    </>
  );

  const sharedClass = cn(
    "inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-left transition-all",
    active
      ? "border-primary bg-primary/10 shadow-md scale-[1.02]"
      : "border-border/60 bg-muted/30 hover:bg-muted/50 hover:border-primary/30",
    (onClick || linkToDetail) && "cursor-pointer",
    className
  );

  const sharedStyle = active ? { boxShadow: `0 0 0 1px ${info.color}40` } : undefined;

  if (linkToDetail) {
    return (
      <Link href={supportTierPath(tier)} className={sharedClass} style={sharedStyle}>
        {body}
      </Link>
    );
  }

  const Comp = onClick ? "button" : "div";

  return (
    <Comp
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={sharedClass}
      style={sharedStyle}
    >
      {body}
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

/** 클릭 시 등급 안내 팝업 (페이지 이동 없음) */
export function OreTierBadgePopover({
  tier,
  showLabel = true,
  size = "sm",
  className,
  align = "start",
  side = "bottom",
}: {
  tier: SupportTierLevel;
  showLabel?: boolean;
  size?: "sm" | "md";
  className?: string;
  align?: "start" | "center" | "end";
  side?: "top" | "bottom" | "left" | "right";
}) {
  const info = getTierInfo(tier);

  return (
    <SupportTierInfoPopover align={align} side={side}>
      <button
        type="button"
        className={cn(
          "inline-flex shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          className
        )}
        title={`${info.labelKo} (${info.label}) · 등급 안내`}
        onClick={(e) => e.stopPropagation()}
      >
        <OreTierBadge tier={tier} showLabel={showLabel} size={size} />
      </button>
    </SupportTierInfoPopover>
  );
}
