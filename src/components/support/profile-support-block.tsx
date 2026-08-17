import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { Gem } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { OreTierBadge } from "@/components/support/ore-tier-button";
import { DisplayNameWithSupportTier } from "@/components/user/display-name-with-support-tier";
import { CreatorSupportTierCard } from "@/components/support/platform-support-card";
import { SupportTierLevel } from "@prisma/client";
import type { getCreatorSupportSummary, getViewerSupportForCreator } from "@/actions/support";
import { formatUsd } from "@/lib/money";
import { TipCreatorDialog } from "@/components/support/tip-creator-dialog";

export function ProfileSupportBlock({
  creatorId,
  username,
  displayName,
  isSelf,
  summary,
  viewerSupport,
  profileReceivedTotal,
  profileReceivedTier,
  paymentsEnabled,
}: {
  creatorId: string;
  username: string;
  displayName: string;
  isSelf: boolean;
  summary: Awaited<ReturnType<typeof getCreatorSupportSummary>>;
  viewerSupport: Awaited<ReturnType<typeof getViewerSupportForCreator>>;
  profileReceivedTotal: number;
  profileReceivedTier: SupportTierLevel;
  paymentsEnabled: boolean;
}) {
  if (summary.totalAmount === 0 && summary.topSupporters.length === 0 && isSelf) {
    return (
      <div className="px-4 py-4 border-b border-border/60 bg-muted/20">
        <p className="text-sm text-muted-foreground flex items-center gap-2">
          <Gem className="h-4 w-4" />
          아직 받은 후원이 없습니다. 팬들이 후원하면 여기에 표시됩니다.
        </p>
        <Link href="/support" className="text-sm text-primary mt-2 inline-block hover:underline">
          후원 현황 보기 →
        </Link>
      </div>
    );
  }

  return (
    <div className="border-b border-border/60">
      <div className="px-4 py-3 space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-sm flex-wrap">
            <Gem className="h-4 w-4 text-pink-500" />
            <span className="font-semibold">{formatUsd(summary.totalAmount)}</span>
            <span className="text-muted-foreground">
              · {summary.supporterCount}명 · {summary.tipCount}회
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {!isSelf && (
              <TipCreatorDialog
                creatorId={creatorId}
                username={username}
                displayName={displayName}
                currentTier={viewerSupport?.tier}
                currentTotal={viewerSupport?.totalAmount}
                paymentsEnabled={paymentsEnabled}
                returnPath={`/u/${username}`}
              />
            )}
            {isSelf && (
              <Link href="/support?tab=received" className="text-sm text-primary hover:underline">
                관리 →
              </Link>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-muted-foreground">전체 누적 (받은)</span>
          <span className="font-medium">{formatUsd(profileReceivedTotal)}</span>
          <OreTierBadge tier={profileReceivedTier} size="sm" />
        </div>
      </div>

      {viewerSupport && !isSelf && (
        <div className="px-4 pb-3">
          <CreatorSupportTierCard
            creatorName={displayName}
            totalAmount={viewerSupport.totalAmount}
            tier={viewerSupport.tier}
          />
        </div>
      )}

      {summary.topSupporters.length > 0 && (
        <div className="px-4 pb-4">
          <p className="text-xs font-medium text-muted-foreground mb-2">상위 서포터</p>
          <div className="flex flex-wrap gap-2">
            {summary.topSupporters.map((s) => (
              <Link
                key={s.id}
                href={`/u/${s.supporter.username}`}
                className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-full border border-border/60 hover:bg-muted/40 text-sm"
              >
                <Avatar className="h-7 w-7">
                  <AvatarImage src={s.supporter.image ?? undefined} />
                  <AvatarFallback>{s.supporter.username[0]}</AvatarFallback>
                </Avatar>
                <DisplayNameWithSupportTier
                  name={s.supporter.name || s.supporter.username}
                  tier={s.supporter.supportTierSent ?? "PEBBLE"}
                  nameClassName="font-medium truncate max-w-[80px]"
                  compact
                />
              </Link>
            ))}
          </div>
        </div>
      )}

      {summary.recentTips.length > 0 && (
        <div className="px-4 pb-4 space-y-2">
          <p className="text-xs font-medium text-muted-foreground">최근 후원</p>
          {summary.recentTips.slice(0, 5).map((t) => (
            <div key={t.id} className="text-sm flex gap-2 items-start">
              <Link href={`/u/${t.sender.username}`} className="shrink-0">
                <DisplayNameWithSupportTier
                  name={`@${t.sender.username}`}
                  tier={t.sender.supportTierSent ?? "PEBBLE"}
                  nameClassName="font-medium text-primary"
                  compact
                />
              </Link>
              <span className="text-muted-foreground shrink-0">
                {formatUsd(t.amount)} ·{" "}
                {formatDistanceToNow(t.createdAt, { addSuffix: true, locale: ko })}
              </span>
              {t.message && (
                <span className="text-muted-foreground line-clamp-1">— {t.message}</span>
              )}
            </div>
          ))}
        </div>
      )}

      {isSelf && (
        <div className="px-4 pb-4">
          <Link href="/support?tab=received" className="text-sm text-primary hover:underline">
            받은 후원 전체 보기 →
          </Link>
        </div>
      )}
    </div>
  );
}
