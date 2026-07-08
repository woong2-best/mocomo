"use client";

import Link from "next/link";
import { Crown, Mic, MoreHorizontal, Video } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CommunityPresenceStatus, CommunityRoleType } from "@prisma/client";
import type { CommunityMemberView } from "@/lib/community-server/types";
import { ROLE_GROUP_LABELS, ROLE_GROUP_ORDER } from "@/lib/community-server/rbac-defaults";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MemberModerationMenu } from "@/components/community-server/member-moderation-menu";
import { useCommunityMembership } from "@/components/community-server/community-membership-context";
import { hasPermission } from "@/lib/community-server/permissions";

const PRESENCE_DOT: Record<CommunityPresenceStatus, string> = {
  ONLINE: "bg-emerald-500",
  IDLE: "bg-amber-400",
  DND: "bg-red-500",
  OFFLINE: "bg-muted-foreground/40",
};

const PRESENCE_EMOJI: Record<CommunityPresenceStatus, string> = {
  ONLINE: "🟢",
  IDLE: "🟡",
  DND: "🔴",
  OFFLINE: "⚫",
};

function MemberRow({
  member,
  communityId,
  canModerate,
  compact,
}: {
  member: CommunityMemberView;
  communityId: string;
  canModerate: boolean;
  compact?: boolean;
}) {
  const displayName = member.nickname ?? member.name ?? member.username;
  const topRole = member.roles[0];

  return (
    <div className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted/80 group">
      <Link href={`/u/${member.username}`} className="flex items-center gap-2 min-w-0 flex-1">
        <div className="relative shrink-0">
          <Avatar className={cn(compact ? "h-8 w-8" : "h-9 w-9")}>
            <AvatarImage src={member.image ?? undefined} />
            <AvatarFallback>{member.username[0]?.toUpperCase()}</AvatarFallback>
          </Avatar>
          <span
            className={cn(
              "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background",
              PRESENCE_DOT[member.presence]
            )}
          />
        </div>
        <div className="min-w-0 flex-1">
          <p
            className="text-sm truncate font-medium flex items-center gap-1"
            style={topRole?.color ? { color: topRole.color } : undefined}
          >
            <span className="text-[10px] shrink-0" aria-hidden>
              {PRESENCE_EMOJI[member.presence]}
            </span>
            <span className="truncate">{displayName}</span>
            {member.voiceActivity === "VOICE" && (
              <Mic className="h-3 w-3 text-muted-foreground shrink-0" />
            )}
            {member.voiceActivity === "VIDEO" && (
              <Video className="h-3 w-3 text-muted-foreground shrink-0" />
            )}
          </p>
          {!compact && topRole && (
            <p className="text-[10px] text-muted-foreground truncate">{topRole.name}</p>
          )}
        </div>
      </Link>
      {member.isOwner && <Crown className="h-3.5 w-3.5 text-amber-500 shrink-0" />}
      {canModerate && !member.isOwner && (
        <MemberModerationMenu member={member} communityId={communityId}>
          <button
            type="button"
            className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-muted"
            aria-label="멤버 관리"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </MemberModerationMenu>
      )}
    </div>
  );
}

export function MemberListContent({
  members,
  communityId,
  memberCount,
  onHeaderClick,
  welcomePending,
  compact,
}: {
  members: CommunityMemberView[];
  communityId: string;
  memberCount?: number;
  onHeaderClick?: () => void;
  welcomePending?: boolean;
  compact?: boolean;
}) {
  const { permissions } = useCommunityMembership();
  const canModerate =
    hasPermission(permissions, "kickMembers") ||
    hasPermission(permissions, "banMembers") ||
    hasPermission(permissions, "timeoutMembers");

  const grouped = ROLE_GROUP_ORDER.map((roleType: CommunityRoleType) => ({
    roleType,
    label: ROLE_GROUP_LABELS[roleType],
    items: members.filter((m) => m.primaryRoleType === roleType),
  })).filter((g) => g.items.length > 0);

  const count = memberCount ?? members.length;

  return (
    <>
      <button
        type="button"
        className="shrink-0 px-3 py-3 border-b border-border/50 text-left w-full hover:bg-muted/40 transition-colors"
        onClick={onHeaderClick}
      >
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
          멤버 — {count}
          {welcomePending && (
            <span className="inline-flex h-2 w-2 rounded-full bg-red-500" aria-label="환영 알림" />
          )}
        </h2>
      </button>
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="p-2 space-y-4">
          {grouped.length === 0 ? (
            <p className="px-2 text-xs text-muted-foreground">
              {count > 0 && members.length === 0
                ? "멤버 목록을 불러오는 중…"
                : "표시할 멤버가 없습니다."}
            </p>
          ) : (
            grouped.map((group) => (
              <div key={group.roleType}>
                <p className="px-2 text-[11px] font-semibold text-muted-foreground mb-1">
                  {group.label} — {group.items.length}
                </p>
                <ul className="space-y-0.5">
                  {group.items.map((m) => (
                    <li key={m.id}>
                      <MemberRow
                        member={m}
                        communityId={communityId}
                        canModerate={canModerate}
                        compact={compact}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
