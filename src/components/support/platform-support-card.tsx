import { SupportTierLevel } from "@prisma/client";
import { OreTierBadgePopover } from "@/components/support/ore-tier-button";
import { getNextTierInfo, getTierInfo } from "@/lib/tiers";
import { formatUsd } from "@/lib/money";

export function PlatformSupportCard({
  sentTotal,
  sentTier,
  compact,
}: {
  sentTotal: number;
  sentTier: SupportTierLevel;
  compact?: boolean;
}) {
  const sentNext = getNextTierInfo(sentTotal);

  if (compact) {
    return (
      <div className="flex flex-wrap gap-2 text-xs">
        <span className="text-muted-foreground">전체 후원</span>
        <OreTierBadgePopover tier={sentTier} size="sm" />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border/50 bg-muted/15 p-4 space-y-2">
      <p className="text-xs font-medium text-muted-foreground">사이트 전체 누적 후원 (보낸 금액)</p>
      <p className="text-lg font-bold">{formatUsd(sentTotal)}</p>
      <OreTierBadgePopover tier={sentTier} size="md" />
      {sentNext && (
        <p className="text-[11px] text-muted-foreground">
          다음 {sentNext.label}까지 {formatUsd(sentNext.remaining)}
        </p>
      )}
    </div>
  );
}

/** 개별 크리에이터 후원 등급 */
export function CreatorSupportTierCard({
  creatorName,
  totalAmount,
  tier,
}: {
  creatorName: string;
  totalAmount: number;
  tier: SupportTierLevel;
}) {
  const info = getTierInfo(tier);
  const next = getNextTierInfo(totalAmount);

  return (
    <div className="rounded-xl border border-border/50 p-3 space-y-2 bg-background/80">
      <p className="text-xs text-muted-foreground">
        <span className="font-medium text-foreground">{creatorName}</span>에게 개별 후원
      </p>
      <p className="text-base font-bold">{formatUsd(totalAmount)}</p>
      <OreTierBadgePopover tier={tier} size="md" />
      {next && (
        <p className="text-[11px] text-muted-foreground">
          {info.label} → {next.label}까지 {formatUsd(next.remaining)}
        </p>
      )}
    </div>
  );
}
