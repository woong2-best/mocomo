import { SupportTierLevel } from "@prisma/client";
import { OreTierBadge } from "@/components/support/ore-tier-button";
import { getTierInfo, getNextTierInfo, formatTierAmount } from "@/lib/tiers";
import Link from "next/link";

export function PlatformSupportCard({
  sentTotal,
  sentTier,
  receivedTotal,
  receivedTier,
  compact,
}: {
  sentTotal: number;
  sentTier: SupportTierLevel;
  receivedTotal: number;
  receivedTier: SupportTierLevel;
  compact?: boolean;
}) {
  const sentNext = getNextTierInfo(sentTotal);
  const recvNext = getNextTierInfo(receivedTotal);

  if (compact) {
    return (
      <div className="flex flex-wrap gap-2 text-xs">
        <span className="text-muted-foreground">전체 후원</span>
        <OreTierBadge tier={sentTier} size="sm" />
        <span className="text-muted-foreground">·</span>
        <span className="text-muted-foreground">받은</span>
        <OreTierBadge tier={receivedTier} size="sm" />
      </div>
    );
  }

  return (
    <div className="grid sm:grid-cols-2 gap-3 px-4 py-3 border-b border-border/60 bg-muted/15">
      <div className="rounded-xl border border-border/50 p-3 space-y-2">
        <p className="text-xs font-medium text-muted-foreground">사이트 전체 누적 후원 (보낸 금액)</p>
        <p className="text-lg font-bold">{sentTotal.toLocaleString()}원</p>
        <OreTierBadge tier={sentTier} size="md" />
        {sentNext && (
          <p className="text-[11px] text-muted-foreground">
            다음 {sentNext.label}까지 {formatTierAmount(sentNext.remaining)}원
          </p>
        )}
      </div>
      <div className="rounded-xl border border-border/50 p-3 space-y-2">
        <p className="text-xs font-medium text-muted-foreground">사이트 전체 누적 (받은 금액)</p>
        <p className="text-lg font-bold">{receivedTotal.toLocaleString()}원</p>
        <OreTierBadge tier={receivedTier} size="md" />
        {recvNext && (
          <p className="text-[11px] text-muted-foreground">
            다음 {recvNext.label}까지 {formatTierAmount(recvNext.remaining)}원
          </p>
        )}
        <Link href="/support?tab=tiers" className="text-[11px] text-primary hover:underline block">
          등급표 보기 →
        </Link>
      </div>
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
      <p className="text-base font-bold">{totalAmount.toLocaleString()}원</p>
      <OreTierBadge tier={tier} size="md" />
      {next && (
        <p className="text-[11px] text-muted-foreground">
          {info.label} → {next.label}까지 {formatTierAmount(next.remaining)}원
        </p>
      )}
    </div>
  );
}
