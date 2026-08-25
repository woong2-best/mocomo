import type { SupportTierLevel } from "@prisma/client";
import { OreTierBadge, OreTierBadgePopover } from "@/components/support/ore-tier-button";
import { UserProfileLink } from "@/components/user/user-profile-link";
import { getTierInfo } from "@/lib/tiers";
import { cn } from "@/lib/utils";

/** 닉네임 옆 총 후원금액(누적 후원) 등급 — 참여 제한 없이 표시만 */
export function DisplayNameWithSupportTier({
  name,
  tier = "SEED",
  className,
  nameClassName,
  compact = false,
  tierInteractive = false,
  as = "span",
  profileUsername,
}: {
  name: React.ReactNode;
  tier?: SupportTierLevel;
  className?: string;
  nameClassName?: string;
  /** true면 광석 아이콘만 (채팅·목록) */
  compact?: boolean;
  /** true면 등급 뱃지 클릭 시 팝업 (프로필 등) */
  tierInteractive?: boolean;
  as?: "span" | "p" | "div";
  /** 있으면 닉네임을 프로필 링크로 (채팅 등) */
  profileUsername?: string;
}) {
  const info = getTierInfo(tier);
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

  const tierBadge = tierInteractive ? (
    <OreTierBadgePopover tier={tier} size="sm" showLabel={!compact} />
  ) : (
    <OreTierBadge tier={tier} size="sm" showLabel={!compact} className="shrink-0" />
  );

  return (
    <Comp
      className={cn("inline-flex items-center gap-1.5 min-w-0 max-w-full", className)}
      title={tierInteractive ? undefined : `총 후원 등급 · ${info.labelKo} (${info.label})`}
    >
      {nameEl}
      {tierBadge}
    </Comp>
  );
}
