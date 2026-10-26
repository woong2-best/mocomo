import type { SupportTierLevel } from "@prisma/client";
import { OreTierBadge, OreTierBadgeLink } from "@/components/support/ore-tier-button";
import { UserProfileLink } from "@/components/user/user-profile-link";
import { getTierInfo } from "@/lib/tiers";
import { resolveProfileDisplayTier } from "@/lib/settlement-moco/balance";
import { cn } from "@/lib/utils";

/** 닉네임 옆 후원 등급. live 채팅은 해당 스트리머에게 준 금액만 표시하며, null이면 뱃지를 숨긴다. */
export function DisplayNameWithSupportTier({
  name,
  tier,
  earnedMocoTier,
  className,
  nameClassName,
  compact = false,
  tierInteractive = false,
  as = "span",
  profileUsername,
  idHandle,
  liveHostBadge = false,
}: {
  name: React.ReactNode;
  /** undefined = 프로필 기본 Seed. null = 뱃지 숨김 (해당 스트리머에게 후원 없음) */
  tier?: SupportTierLevel | null;
  /** earned MOCO 정산 등급 — 있으면 tier와 비교해 높은 쪽 표시 */
  earnedMocoTier?: SupportTierLevel;
  className?: string;
  nameClassName?: string;
  /** true면 광석 아이콘만 (채팅·목록) */
  compact?: boolean;
  /** true면 등급 뱃지 클릭 시 광석 등급 페이지 (프로필 등) */
  tierInteractive?: boolean;
  as?: "span" | "p" | "div";
  /** 있으면 닉네임을 프로필 링크로 (채팅 등) */
  profileUsername?: string;
  /** DC 갤러리식 — 닉네임 옆에 (아이디) */
  idHandle?: string;
  /** 라이브 채팅: 이 방송 호스트에게 후원한 등급 */
  liveHostBadge?: boolean;
}) {
  const resolved = tier === undefined ? "SEED" : tier;
  const displayTier =
    resolved == null
      ? null
      : earnedMocoTier
        ? resolveProfileDisplayTier(resolved, earnedMocoTier)
        : resolved;
  const info = displayTier ? getTierInfo(displayTier) : null;
  const Comp = as;
  const nameEl = profileUsername ? (
    <UserProfileLink
      username={profileUsername}
      className={cn("truncate hover:underline", nameClassName)}
    >
      {name}
    </UserProfileLink>
  ) : (
    <span className={cn("truncate", nameClassName)}>{name}</span>
  );

  const tierBadge =
    displayTier && info ? (
      tierInteractive ? (
        <OreTierBadgeLink tier={displayTier} size="sm" showLabel={!compact} stopPropagation />
      ) : (
        <OreTierBadge tier={displayTier} size="sm" showLabel={!compact} className="shrink-0" />
      )
    ) : null;

  return (
    <Comp
      className={cn("inline-flex items-center gap-1.5 min-w-0 max-w-full", className)}
      title={
        tierInteractive || !info
          ? undefined
          : liveHostBadge
            ? `이 방송 후원 등급 · ${info.labelKo} (${info.label})`
            : `총 후원 등급 · ${info.labelKo} (${info.label})`
      }
    >
      {nameEl}
      {idHandle ? (
        <span className="shrink-0 text-[11px] font-medium text-muted-foreground">({idHandle})</span>
      ) : null}
      {tierBadge}
    </Comp>
  );
}
